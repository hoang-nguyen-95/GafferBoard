// Chế độ Manager: nhu cầu đội hình, mục tiêu chuyển nhượng, kế hoạch ngân sách và gợi ý đàm phán.
//
// LƯU Ý QUAN TRỌNG: dữ liệu xuất hiện tại KHÔNG có giá trị cầu thủ, lương, ngân sách hay hợp đồng chi tiết. Phần "tiền" ở đây
// dựa trên số bạn tự nhập từ màn hình của game; phần chọn mục tiêu dựa trên chỉ số, tuổi, tiềm năng và năm hết hợp đồng
// (contract_until, giả định là năm dương lịch hợp đồng kết thúc). Mọi hệ số bên dưới là kinh nghiệm chung, chưa kiểm chứng
// với game, được xuất ra để cẩm nang nêu đúng như vậy và để bạn chỉnh khi có số liệu thật.
import { clubOfPlayer } from "./analysis";
import { LINE_OF_ROLE, ROLE_LABELS_VI, ROLE_POSITIONS, roleOfPlayer, roleOfPosition, type Role } from "./positions";
import { referenceDate } from "./serialize";
import type { Store } from "./store";
import { resolveLineup, squadPlayers } from "./teams";
import type { Player } from "./types";
import { ageOn, avg, pyRound } from "./util";

// ---- giả định (kinh nghiệm chung, chỉnh được) ----
export const PRIME_END_AGE = 30;      // hết tuổi đỉnh cao: sau đó giá trị sử dụng giảm dần
export const OLD_AGE = 31;            // từ tuổi này coi là "sắp xuống sức"
export const GROWTH_MAX_AGE = 23;     // chỉ tính tiềm năng tăng trưởng cho cầu thủ trẻ tới tuổi này
export const MAX_PRIME_SEASONS = 8;
export const DEFAULT_MAX_AGE = 40;    // mặc định không gợi ý cầu thủ quá tuổi này (người huyền thoại, cầu thủ đã giải nghệ)
/** Giải chứa cầu thủ huyền thoại (Classic League): không mua được trong Career, nên loại khỏi mục tiêu. ID lấy từ save đã kiểm tra. */
export const LEGEND_LEAGUE_IDS: ReadonlySet<number> = new Set([2255]);
/** Giải chứa cầu thủ tự do: thường ký được không mất phí chuyển nhượng, chỉ tốn lương. ID lấy từ save đã kiểm tra. */
export const FREE_AGENT_LEAGUE_IDS: ReadonlySet<number> = new Set([382]);
export const TARGET_WEIGHTS = { upgrade: 3, growth: 1.5, prime: 1, expiring: 4 } as const;
export const NEED_WEIGHTS = { quality: 2, quality_cap: 10, no_depth: 3, thin_depth: 1.5, old: 2, expiring: 2 } as const;
export const NEGOTIATION = {
  base: { open: 0.8, target: 0.95, walk: 1.1 }, // so với "Giá trị" hiển thị trong game
  adjust: { expiring: -0.12, two_seasons: -0.04, long_contract: 0.05, old: -0.08, young_high_potential: 0.1 },
  bounds: [0.3, 2.0],
} as const;

/** Năm kết thúc mùa giải hiện tại: số bạn đặt, hoặc suy từ ngày tham chiếu (từ tháng 7 trở đi thuộc mùa kết thúc năm sau). */
export function seasonEndYear(store: Store): number {
  const set = store.user.manager.season_end_year;
  if (set !== null) return set;
  const [y, m] = referenceDate(store).split("-").map(Number);
  return m >= 7 ? y + 1 : y;
}

/** Số mùa còn lại tính cả mùa hiện tại (1 = hết hạn vào cuối mùa này); null nếu không biết. */
export function seasonsLeft(p: Player, endYear: number): number | null {
  return p.contract_until === null ? null : Math.max(0, p.contract_until - endYear + 1);
}

const nameOf = (p: Player) => p.name || `Cầu thủ #${p.player_id}`;

function brief(p: Player, ref: string, endYear: number) {
  return {
    player_id: p.player_id, name: nameOf(p), overall: p.overall, potential: p.potential, age: ageOn(p.birth_date, ref),
    positions: p.positions, role: roleOfPlayer(p.positions, p.primary_position), contract_until: p.contract_until,
    seasons_left: seasonsLeft(p, endYear), international_rep: p.international_rep,
  };
}

// ---------------------------------------------------------------- nhu cầu đội hình

export function squadNeeds(store: Store, teamId: number) {
  const ref = referenceDate(store), endYear = seasonEndYear(store);
  const squad = squadPlayers(store, teamId);
  const lineup = resolveLineup(store, teamId, squad);
  const xi = lineup.slots.filter((s) => s.player);
  const xiIds = new Set(xi.map((s) => s.player!.player_id));
  const xiAvg = avg(xi.map((s) => s.player!.overall)) ?? 0;
  const healthyBench = squad.filter((e) => !xiIds.has(e.player.player_id) && !e.member.injury).map((e) => e.player);

  const needs = [];
  for (const role of Object.keys(ROLE_POSITIONS) as Role[]) {
    const slots = xi.filter((s) => roleOfPosition(s.position) === role);
    if (!slots.length) continue;
    const starters = slots.map((s) => s.player!);
    const backups = healthyBench.filter((p) => roleOfPlayer(p.positions, p.primary_position) === role).sort((a, b) => b.overall - a.overall);
    const weakest = starters.reduce((m, p) => (p.overall < m.overall ? p : m), starters[0]);
    const issues: string[] = [];
    let priority = 0;
    const gap = xiAvg - weakest.overall;
    if (gap >= 3) {
      issues.push(`${nameOf(weakest)} (${weakest.overall}) thấp hơn mặt bằng đội hình chính (${pyRound(xiAvg, 1)}) ${pyRound(gap, 1)} điểm`);
      priority += Math.min(gap, NEED_WEIGHTS.quality_cap) * NEED_WEIGHTS.quality;
    }
    if (backups.length === 0) {
      issues.push("Không có cầu thủ dự bị cùng vai trò");
      priority += NEED_WEIGHTS.no_depth;
    } else if (backups[0].overall < weakest.overall - 8) {
      issues.push(`Dự bị tốt nhất (${nameOf(backups[0])}, ${backups[0].overall}) kém người đá chính yếu nhất tới ${weakest.overall - backups[0].overall} điểm`);
      priority += NEED_WEIGHTS.thin_depth;
    }
    for (const p of starters) {
      const age = ageOn(p.birth_date, ref), left = seasonsLeft(p, endYear);
      if (age !== null && age >= OLD_AGE) {
        issues.push(`${nameOf(p)} đã ${age} tuổi, cần tính người thay thế`);
        priority += NEED_WEIGHTS.old;
      }
      if (left !== null && left <= 1) {
        issues.push(`Hợp đồng của ${nameOf(p)} hết vào cuối mùa này`);
        priority += NEED_WEIGHTS.expiring;
      }
    }
    needs.push({
      role, role_label: ROLE_LABELS_VI[role], line: LINE_OF_ROLE[role], slots: slots.length,
      baseline_overall: weakest.overall, starters: starters.map((p) => brief(p, ref, endYear)),
      backups: backups.slice(0, 3).map((p) => brief(p, ref, endYear)), issues, priority: pyRound(priority, 1),
    });
  }
  needs.sort((a, b) => b.priority - a.priority);

  const all = squad.map((e) => e.player);
  const expiring = all.filter((p) => (seasonsLeft(p, endYear) ?? 99) <= 1).sort((a, b) => b.overall - a.overall);
  return {
    season_end_year: endYear, reference_date: ref, xi_average: pyRound(xiAvg, 1), squad_size: squad.length,
    xi_age_average: avg(xi.map((s) => ageOn(s.player!.birth_date, ref))), squad_age_average: avg(all.map((p) => ageOn(p.birth_date, ref))),
    old_players: all.filter((p) => (ageOn(p.birth_date, ref) ?? 0) >= OLD_AGE).length,
    needs, expiring: expiring.slice(0, 15).map((p) => ({ ...brief(p, ref, endYear), in_xi: xiIds.has(p.player_id) })),
  };
}

// ---------------------------------------------------------------- mục tiêu chuyển nhượng

/** Điểm "đáng mua" của một cầu thủ so với người đá chính yếu nhất cùng vai trò của đội bạn. */
export function scoreTarget(p: Player, baseline: number, ref: string, endYear: number) {
  const age = ageOn(p.birth_date, ref);
  const left = seasonsLeft(p, endYear);
  const upgrade = p.overall - baseline;
  const growth = age !== null && age <= GROWTH_MAX_AGE && p.potential !== null ? Math.max(0, p.potential - p.overall) : 0;
  const prime = age !== null ? Math.min(MAX_PRIME_SEASONS, Math.max(0, PRIME_END_AGE - age)) : 0;
  const expiring = left !== null && left <= 1 ? 1 : 0;
  const parts = [
    { key: "upgrade", label: "Nâng cấp so với người đá chính yếu nhất", value: upgrade, points: upgrade * TARGET_WEIGHTS.upgrade },
    { key: "growth", label: "Tiềm năng còn lại (đến 23 tuổi)", value: growth, points: growth * TARGET_WEIGHTS.growth },
    { key: "prime", label: "Số mùa còn trong độ tuổi đỉnh cao", value: prime, points: prime * TARGET_WEIGHTS.prime },
    { key: "expiring", label: "Hợp đồng sắp hết (dễ mua rẻ)", value: expiring, points: expiring * TARGET_WEIGHTS.expiring },
  ];
  return { score: pyRound(parts.reduce((a, x) => a + x.points, 0), 1), breakdown: parts.map((x) => ({ ...x, points: pyRound(x.points, 1) })), age, seasons_left: left };
}

export interface TargetQuery { teamId: number; role: Role; maxAge?: number; minOverall?: number; maxSeasonsLeft?: number; leagueId?: number; limit?: number }

/** Mức OVR của người đá chính yếu nhất ở vai trò, hoặc yếu nhất cả đội hình nếu sơ đồ không có vai trò đó. */
export function roleBaseline(store: Store, teamId: number, role: Role): number {
  const lineup = resolveLineup(store, teamId);
  const xi = lineup.slots.filter((s) => s.player);
  const inRole = xi.filter((s) => roleOfPosition(s.position) === role).map((s) => s.player!.overall);
  const pool = inRole.length ? inRole : xi.map((s) => s.player!.overall);
  return pool.length ? Math.min(...pool) : 0;
}

export function findTargets(store: Store, q: TargetQuery) {
  const ref = referenceDate(store), endYear = seasonEndYear(store);
  const team = store.data.teams.get(q.teamId);
  const mine = new Set((store.idx.squadByTeam.get(q.teamId) ?? []).map((m) => m.player_id));
  const baseline = roleBaseline(store, q.teamId, q.role);
  const minOverall = q.minOverall ?? baseline + 1;
  const limit = Math.min(100, Math.max(1, q.limit ?? 30));
  const rows = [];
  for (const p of store.data.players.values()) {
    if (p.overall < minOverall || mine.has(p.player_id)) continue;
    if (team && team.gender !== null && p.gender !== null && p.gender !== team.gender) continue;
    if (roleOfPlayer(p.positions, p.primary_position) !== q.role) continue;
    const age = ageOn(p.birth_date, ref);
    if (age !== null && age > (q.maxAge ?? DEFAULT_MAX_AGE)) continue;
    const left = seasonsLeft(p, endYear);
    if (q.maxSeasonsLeft !== undefined && (left === null || left > q.maxSeasonsLeft)) continue;
    const club = clubOfPlayer(store, p.player_id);
    if (club?.leagueId != null && LEGEND_LEAGUE_IDS.has(club.leagueId)) continue;
    if (q.leagueId !== undefined && club?.leagueId !== q.leagueId) continue;
    const s = scoreTarget(p, baseline, ref, endYear);
    rows.push({ p, s, club });
  }
  rows.sort((a, b) => b.s.score - a.s.score || b.p.overall - a.p.overall || a.p.player_id - b.p.player_id);
  type ClubInfoT = ReturnType<typeof clubOfPlayer>;
  const flags = (age: number | null, left: number | null, club: ClubInfoT) => [
    ...(club?.leagueId != null && FREE_AGENT_LEAGUE_IDS.has(club.leagueId) ? ["Cầu thủ tự do: thường ký không mất phí chuyển nhượng, chỉ tốn lương"] : []),
    ...(left !== null && left <= 1 ? ["Hợp đồng sắp hết"] : []),
    ...(age !== null && age >= OLD_AGE ? ["Tuổi cao: giá trị sử dụng ngắn"] : []),
    ...(club === null ? ["Không thuộc CLB nào trong dữ liệu (có thể là cầu thủ tự do)"] : []),
  ];
  return {
    role: q.role, role_label: ROLE_LABELS_VI[q.role], baseline_overall: baseline, min_overall: minOverall, season_end_year: endYear,
    total_matches: rows.length,
    items: rows.slice(0, limit).map(({ p, s, club }) => ({
      ...brief(p, ref, endYear), score: s.score, breakdown: s.breakdown, upgrade: p.overall - baseline,
      club: club ? { team_id: club.team.team_id, name: club.team.name, league_name: club.leagueName } : null,
      flags: flags(s.age, s.seasons_left, club),
    })),
  };
}

// ---------------------------------------------------------------- ngân sách và shortlist

const sumNums = (xs: (number | null)[]) => xs.reduce<number>((a, x) => a + (x ?? 0), 0);

export function budgetSummary(store: Store, teamId: number | null) {
  const m = store.user.manager;
  const ref = referenceDate(store), endYear = seasonEndYear(store);
  const items = m.shortlist.map((it) => {
    const p = store.data.players.get(it.player_id);
    if (!p) return null;
    const role = roleOfPlayer(p.positions, p.primary_position);
    const baseline = teamId !== null ? roleBaseline(store, teamId, role) : 0;
    const s = scoreTarget(p, baseline, ref, endYear);
    const club = clubOfPlayer(store, p.player_id);
    return {
      ...it, player: brief(p, ref, endYear), club: club ? { team_id: club.team.team_id, name: club.team.name } : null,
      score: s.score, points_per_million: it.fee ? pyRound((s.score / it.fee) * 1_000_000, 2) : null,
    };
  }).filter((x): x is NonNullable<typeof x> => x !== null);
  const sales = m.sales.map((sl) => {
    const p = store.data.players.get(sl.player_id);
    return p ? { ...sl, player: brief(p, ref, endYear) } : null;
  }).filter((x): x is NonNullable<typeof x> => x !== null);

  const planned = sumNums(m.shortlist.map((i) => i.fee));
  const committed = sumNums(m.shortlist.filter((i) => i.status === "agreed").map((i) => i.fee));
  const income = sumNums(m.sales.map((s) => s.expected_fee));
  const wageAdded = sumNums(m.shortlist.map((i) => i.wage));
  const wageSaved = sumNums(m.sales.map((s) => s.wage));
  const transferAfter = m.budget.transfer === null ? null : m.budget.transfer - planned + income;
  const wageAfter = m.budget.wage === null ? null : m.budget.wage - wageAdded + wageSaved;
  const warnings: string[] = [];
  if (transferAfter !== null && transferAfter < 0) warnings.push(`Kế hoạch vượt ngân sách chuyển nhượng ${-transferAfter}`);
  if (wageAfter !== null && wageAfter < 0) warnings.push(`Kế hoạch vượt quỹ lương còn lại ${-wageAfter}`);
  if (m.budget.transfer === null) warnings.push("Chưa nhập ngân sách chuyển nhượng còn lại (đọc ở màn Tài chính của game)");
  if (items.some((i) => i.fee === null)) warnings.push("Một số cầu thủ trong shortlist chưa có giá: tổng chi đang bị thiếu");

  // gợi ý chia ngân sách theo mức cần thiết của từng vai trò (tỷ lệ với điểm ưu tiên)
  const pool = m.budget.transfer === null ? null : Math.max(0, m.budget.transfer + income);
  const needs = teamId !== null ? squadNeeds(store, teamId).needs.filter((n) => n.priority > 0).slice(0, 4) : [];
  const totalPriority = needs.reduce((a, n) => a + n.priority, 0);
  const allocation = pool === null || totalPriority === 0 ? [] : needs.map((n) => ({
    role: n.role, role_label: n.role_label, priority: n.priority, share: pyRound(n.priority / totalPriority, 3), amount: Math.round((pool * n.priority) / totalPriority),
  }));
  return {
    budget: m.budget, season_end_year: endYear, items, sales,
    totals: { planned_spend: planned, committed_spend: committed, sales_income: income, transfer_after: transferAfter, wage_added: wageAdded, wage_saved: wageSaved, wage_after: wageAfter },
    warnings, allocation,
  };
}

// ---------------------------------------------------------------- đàm phán

export interface NegotiationInput { value: number; asking: number | null; age: number | null; seasonsLeft: number | null; overall: number; potential: number | null }

export function negotiationPlan(i: NegotiationInput) {
  const A = NEGOTIATION.adjust;
  const factors: { text: string; effect: "buyer" | "seller"; adjust: number }[] = [];
  let adj = 0;
  const add = (text: string, effect: "buyer" | "seller", a: number) => { factors.push({ text, effect, adjust: a }); adj += a; };
  if (i.seasonsLeft !== null && i.seasonsLeft <= 1) add("Hợp đồng hết vào cuối mùa: bên bán sắp mất người mà không được gì, bạn có lợi thế", "buyer", A.expiring);
  else if (i.seasonsLeft === 2) add("Hợp đồng còn 2 mùa: bên bán chịu chút áp lực", "buyer", A.two_seasons);
  else if (i.seasonsLeft !== null && i.seasonsLeft >= 4) add("Hợp đồng còn dài (4 mùa trở lên): bên bán không cần vội, khó ép giá", "seller", A.long_contract);
  if (i.age !== null && i.age >= OLD_AGE) add(`${i.age} tuổi: giá trị sử dụng ngắn, thường mua được rẻ hơn`, "buyer", A.old);
  if (i.age !== null && i.age <= 21 && i.potential !== null && i.potential - i.overall >= 8)
    add("Cầu thủ trẻ còn nhiều tiềm năng: bên bán thường đòi giá cao", "seller", A.young_high_potential);

  const [lo, hi] = NEGOTIATION.bounds;
  const clamp = (x: number) => Math.min(hi, Math.max(lo, x));
  const mk = (step: string, base: number) => {
    const pct = pyRound(clamp(base + adj), 3);
    return { step, percent_of_value: pct, amount: Math.round(i.value * pct) };
  };
  const ladder = [mk("Mở giá", NEGOTIATION.base.open), mk("Mục tiêu chốt", NEGOTIATION.base.target), mk("Giá tối đa nên trả", NEGOTIATION.base.walk)];
  let verdict: string | null = null;
  if (i.asking !== null) {
    const ratio = pyRound(i.asking / i.value, 3);
    if (i.asking <= ladder[1].amount) verdict = `Giá đòi (${pyRound(ratio * 100, 1)}% giá trị) nằm trong vùng mục tiêu: có thể chấp nhận.`;
    else if (i.asking <= ladder[2].amount) verdict = `Giá đòi (${pyRound(ratio * 100, 1)}% giá trị) cao hơn mục tiêu nhưng chưa vượt mức tối đa: thử ép xuống gần mục tiêu trước khi chấp nhận.`;
    else verdict = `Giá đòi (${pyRound(ratio * 100, 1)}% giá trị) vượt mức tối đa nên trả: nên từ chối hoặc tìm lựa chọn khác.`;
  }
  const tips = [
    "Bán trước, mua sau: có tiền từ việc bán cầu thủ dư thừa thì bạn đỡ phải mua vội với giá cao.",
    "Đừng chốt ở lần đề nghị đầu tiên của bên bán; nâng giá từng bước nhỏ và dừng ở mức tối đa đã đặt.",
    "Kiểm tra quỹ lương còn lại trước khi đồng ý: tiền chuyển nhượng rẻ nhưng lương cao vẫn làm hỏng kế hoạch.",
    ...(i.seasonsLeft !== null && i.seasonsLeft <= 1 ? ["Cầu thủ sắp hết hợp đồng: cân nhắc chờ thêm hoặc đề nghị thấp hơn, vì áp lực nằm ở bên bán."] : []),
    ...(i.age !== null && i.age >= OLD_AGE ? ["Cầu thủ lớn tuổi: ưu tiên hợp đồng ngắn, đừng trả giá như cầu thủ ở độ tuổi đỉnh cao."] : []),
    ...(i.age !== null && i.age <= 21 && i.potential !== null && i.potential - i.overall >= 8 ? ["Cầu thủ trẻ tiềm năng cao: hợp đồng dài giữ được giá trị và giá bán lại sau này."] : []),
  ];
  return {
    value: i.value, asking: i.asking, adjust_total: pyRound(adj, 3), factors, ladder, verdict, tips,
    disclaimer: "Các mức phần trăm là hệ số kinh nghiệm chung, chưa được kiểm chứng với cách game định giá; hãy xem như điểm xuất phát và chỉnh theo thực tế bạn gặp.",
  };
}

