// Gợi ý gia hạn hợp đồng cho đội của bạn, dựa trên hợp đồng thật trong save (lương, ngày hết hạn) cùng chỉ số, tuổi, tiềm năng.
//
// LƯU Ý: game KHÔNG xuất mức lương mà cầu thủ sẽ đòi khi gia hạn. "Mức tham chiếu" ở đây là lương trung vị của các đồng đội cùng
// tầm OVR trong chính đội bạn (số thật của save); các hệ số trần đề nghị và số năm là kinh nghiệm chung, chưa kiểm chứng với game,
// để bạn dùng làm điểm khởi đầu khi mở màn hình đàm phán, không phải số của game.
import { monthsLeft } from "./contracts";
import { roleOfPlayer } from "./positions";
import { referenceDate } from "./serialize";
import type { Store } from "./store";
import { resolveLineup, squadPlayers } from "./teams";
import { ageOn, avg, pyRound } from "./util";

export const RENEWAL = {
  /** Số tháng còn lại để xếp mức khẩn cấp (đã hết hạn tính là gấp). */
  urgentMonths: 6, soonMonths: 12, laterMonths: 24,
  /** Đồng đội "cùng tầm": chênh OVR tối đa; thiếu người thì nới rộng. */
  peerOverall: 2, peerOverallWide: 4, minPeers: 3,
  /** Trần đề nghị so với lương tham chiếu, theo vai trò trong đội. */
  capMultiplier: { starter: 1.25, prospect: 1.15, rotation: 1.05 },
  /** Cầu thủ trẻ có tiềm năng: tuổi tối đa và mức POT - OVR tối thiểu. */
  prospectMaxAge: 23, prospectMinGrowth: 4,
  /** Dự bị hữu ích: OVR thấp hơn trung bình đội hình chính tối đa bấy nhiêu điểm. */
  rotationGap: 6,
} as const;

export type SquadRole = "starter" | "prospect" | "rotation" | "surplus";
export type RenewalAction = "renew" | "renew_short" | "sell" | "hold" | "none";
export type Urgency = "urgent" | "soon" | "later" | "none";

/** Số năm gia hạn nên đề nghị theo tuổi (tới 23 tuổi: dài để khóa tiềm năng, càng già càng ngắn). */
export function suggestedYears(age: number | null): number {
  if (age === null) return 2;
  if (age <= 23) return 5;
  if (age <= 28) return 4;
  if (age <= 30) return 2;
  return 1;
}

function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

const round500 = (n: number) => Math.round(n / 500) * 500;

export function urgencyOf(left: number | null): Urgency {
  if (left === null) return "none";
  if (left <= RENEWAL.urgentMonths) return "urgent";
  if (left <= RENEWAL.soonMonths) return "soon";
  if (left <= RENEWAL.laterMonths) return "later";
  return "none";
}

export function renewalPlan(store: Store, teamId: number) {
  const ref = referenceDate(store);
  const squad = squadPlayers(store, teamId);
  const lineup = resolveLineup(store, teamId, squad);
  const xiIds = new Set(lineup.slots.filter((s) => s.player).map((s) => s.player!.player_id));
  const xiAvg = avg(lineup.slots.filter((s) => s.player).map((s) => s.player!.overall)) ?? 0;
  const budgetWage = store.user.manager.budget.wage;

  const withContract = squad.flatMap((e) => {
    const c = store.data.contracts.get(e.player.player_id);
    return c && c.team_id === teamId ? [{ p: e.player, c }] : [];
  });
  const refWage = (overall: number, selfId: number) => {
    for (const range of [RENEWAL.peerOverall, RENEWAL.peerOverallWide]) {
      const peers = withContract.filter((x) => x.p.player_id !== selfId && Math.abs(x.p.overall - overall) <= range).map((x) => x.c.wage);
      if (peers.length >= RENEWAL.minPeers) return { wage: median(peers)!, peers: peers.length };
    }
    return { wage: null, peers: 0 };
  };

  const rows = withContract.map(({ p, c }) => {
    const age = ageOn(p.birth_date, ref);
    const left = monthsLeft(c.end_date, ref);
    const growth = p.potential !== null ? p.potential - p.overall : 0;
    const role: SquadRole = xiIds.has(p.player_id) ? "starter"
      : age !== null && age <= RENEWAL.prospectMaxAge && growth >= RENEWAL.prospectMinGrowth ? "prospect"
      : p.overall >= xiAvg - RENEWAL.rotationGap ? "rotation" : "surplus";
    const urgency = urgencyOf(left);
    const years = suggestedYears(age);

    let action: RenewalAction;
    let reason: string;
    if (urgency === "none") {
      action = "none"; reason = "Hợp đồng còn dài, chưa cần gia hạn.";
    } else if (role === "surplus") {
      action = urgency === "later" ? "hold" : "sell";
      reason = urgency === "later" ? "Ít đóng góp cho đội hình; chưa cần quyết định ngay." : "Ít đóng góp và sắp hết hợp đồng: bán hoặc cho đi trước khi mất trắng, không gia hạn.";
    } else if (role === "rotation" && age !== null && age >= 31) {
      action = "sell"; reason = `Dự bị ${age} tuổi, sắp hết hợp đồng: cân nhắc bán; nếu giữ thì chỉ gia hạn 1 năm.`;
    } else if (age !== null && age >= 31) {
      action = "renew_short"; reason = `Trụ cột ${age} tuổi: gia hạn ngắn (${years} năm) để không gánh lương khi xuống sức.`;
    } else if (role === "prospect") {
      action = "renew"; reason = `Trẻ có tiềm năng (OVR ${p.overall} → POT ${p.potential}): gia hạn dài ${years} năm khi còn rẻ.`;
    } else if (role === "starter") {
      action = "renew"; reason = `Đá chính, ${age ?? "?"} tuổi: gia hạn ${years} năm.`;
    } else {
      action = "renew"; reason = `Dự bị hữu ích, ${age ?? "?"} tuổi: gia hạn ${years} năm nếu quỹ lương cho phép.`;
    }

    // Bậc lương: mở = giữ nguyên lương hiện tại; mục tiêu = lương tham chiếu (không thấp hơn hiện tại); trần = tham chiếu × hệ số.
    const reference = refWage(p.overall, p.player_id);
    const mult = RENEWAL.capMultiplier[role === "surplus" ? "rotation" : role];
    let wageLadder: { open: number; target: number; walk: number } | null = null;
    let wageNote = "";
    if (reference.wage !== null) {
      const cap = Math.max(c.wage, reference.wage * mult);
      wageLadder = { open: c.wage, target: round500(Math.min(cap, Math.max(c.wage, reference.wage))), walk: round500(cap) };
      const diff = (c.wage - reference.wage) / reference.wage;
      wageNote = diff <= -0.15 ? `Đang được trả thấp hơn mặt bằng đội ${pyRound(-diff * 100, 0)}%: dễ đòi tăng khi gia hạn.`
        : diff >= 0.15 ? `Đã được trả cao hơn mặt bằng đội ${pyRound(diff * 100, 0)}%: nên giữ nguyên lương, không tăng.` : "Lương xấp xỉ mặt bằng đội.";
    } else {
      wageNote = "Không đủ đồng đội cùng tầm để so lương.";
    }

    return {
      player_id: p.player_id, name: p.name || `Cầu thủ #${p.player_id}`, age, overall: p.overall, potential: p.potential,
      role: roleOfPlayer(p.positions, p.primary_position), squad_role: role, in_xi: xiIds.has(p.player_id),
      wage: c.wage, end_date: c.end_date, months_left: left, urgency, action, reason,
      suggested_years: action === "renew" || action === "renew_short" ? years : null,
      reference_wage: reference.wage === null ? null : round500(reference.wage), reference_peers: reference.peers,
      wage_ladder: action === "renew" || action === "renew_short" ? wageLadder : null, wage_note: wageNote,
    };
  });

  const URGENCY_ORDER: Record<Urgency, number> = { urgent: 0, soon: 1, later: 2, none: 3 };
  rows.sort((a, b) => URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency] || b.overall - a.overall || a.player_id - b.player_id);

  const renewing = rows.filter((r) => r.wage_ladder);
  const extraTarget = renewing.reduce((s, r) => s + (r.wage_ladder!.target - r.wage), 0);
  const extraMax = renewing.reduce((s, r) => s + (r.wage_ladder!.walk - r.wage), 0);
  const warnings: string[] = [];
  if (budgetWage !== null && extraMax > budgetWage) warnings.push(`Nếu mọi gia hạn đều lên tới mức trần, quỹ lương tăng thêm ${extraMax.toLocaleString("vi-VN")} vượt số còn trống bạn đã nhập (${budgetWage.toLocaleString("vi-VN")})`);
  if (budgetWage === null && renewing.length) warnings.push("Chưa nhập quỹ lương còn trống ở tab Ngân sách nên chưa so được mức tăng với trần lương");
  if (rows.some((r) => r.urgency === "urgent")) warnings.push("Có hợp đồng còn dưới 6 tháng (hoặc đã hết hạn): dễ bị CLB khác ký trước, nên xử lý trước tiên");

  return {
    reference_date: ref, players: rows.length, xi_average: pyRound(xiAvg, 1),
    totals: {
      to_renew: renewing.length, to_sell: rows.filter((r) => r.action === "sell").length,
      wage_total: rows.reduce((s, r) => s + r.wage, 0), extra_wage_target: extraTarget, extra_wage_max: extraMax, budget_wage: budgetWage,
    },
    warnings, rows,
  };
}
