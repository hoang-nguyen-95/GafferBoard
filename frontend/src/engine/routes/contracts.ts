// Hợp đồng và lương (chỉ TypeScript, không có bản Python): dữ liệu lấy từ career_playercontract.csv và playerloans.csv.
import { monthsLeft, wageBill } from "../contracts";
import { notFound, pathInt, type Ctx } from "../http";
import { renewalPlan } from "../renewals";
import { referenceDate } from "../serialize";
import { effectiveUserTeam } from "../settings";

const EXPIRING_MONTHS = 12;

export function playerContract(ctx: Ctx) {
  const { store } = ctx;
  const id = pathInt(ctx, "player_id");
  if (!store.data.players.has(id)) throw notFound("Không tìm thấy cầu thủ");
  const contract = store.data.contracts.get(id) ?? null;
  const loan = store.data.loans.get(id) ?? null;
  const ref = referenceDate(store);
  return {
    contract: contract ? { ...contract, months_left: monthsLeft(contract.end_date, ref) } : null,
    loan: loan ? { ...loan, from_team_name: store.data.teams.get(loan.from_team_id)?.name ?? null } : null,
  };
}

/** Quỹ lương hiện tại của đội bạn theo hợp đồng trong save, cùng hợp đồng sắp hết hạn và lương cao nhất. */
export function wages(ctx: Ctx) {
  const { store } = ctx;
  const { teamId } = effectiveUserTeam(store);
  const ref = referenceDate(store);
  if (teamId === null || store.data.contracts.size === 0) {
    return { available: false, team_id: teamId, ref_date: ref, players: 0, total: 0, expiring: [], top: [] };
  }
  const bill = wageBill(store, teamId);
  const row = (c: (typeof bill.rows)[number]) => ({
    player_id: c.player_id, name: store.data.players.get(c.player_id)?.name ?? `#${c.player_id}`, wage: c.wage,
    end_date: c.end_date, months_left: monthsLeft(c.end_date, ref), on_loan_from: store.data.loans.get(c.player_id)?.from_team_id ?? null,
  });
  const rows = bill.rows.map(row);
  return {
    available: true, team_id: teamId, ref_date: ref, players: bill.players, total: bill.total,
    expiring: rows.filter((r) => r.months_left !== null && r.months_left <= EXPIRING_MONTHS).sort((a, b) => (a.months_left! - b.months_left!) || b.wage - a.wage),
    top: [...rows].sort((a, b) => b.wage - a.wage).slice(0, 8),
  };
}

/** Gợi ý gia hạn hợp đồng cho từng cầu thủ đội bạn (cần hợp đồng trong save). */
export function renewals(ctx: Ctx) {
  const { store } = ctx;
  const { teamId } = effectiveUserTeam(store);
  if (teamId === null || store.data.contracts.size === 0) {
    return { available: false, reference_date: referenceDate(store), players: 0, xi_average: 0, totals: null, warnings: [], rows: [] };
  }
  return { available: true, ...renewalPlan(store, teamId) };
}
