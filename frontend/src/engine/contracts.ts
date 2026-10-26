// Hợp đồng (lương, thời hạn) và cầu thủ đang cho mượn, đọc từ career_playercontract.csv và playerloans.csv của Live Editor.
// Chỉ TypeScript (không có bản Python): cột đã đối chiếu với một bản xuất thật (FC26, 55 hợp đồng của đội người chơi và đội dự bị).
import extraFiles from "./data/extra-files.json";
import type { Store } from "./store";
import type { Contract, Loan } from "./types";
import { daysToDate, parseCsv } from "./util";

export const CONTRACT_FILE = extraFiles.contracts;
export const LOANS_FILE = extraFiles.loans;

export class ContractsError extends Error {}

type Csv = { index: Map<string, number>; rows: string[][] };
function read(files: Map<string, string>, name: string, needed: string[]): Csv | null {
  const text = files.get(name.toLowerCase());
  if (text === undefined) return null;
  const { header, rows } = parseCsv(text);
  const index = new Map(header.map((h, i) => [h, i]));
  const missing = needed.filter((c) => !index.has(c));
  if (missing.length) throw new ContractsError(`${name}: thiếu cột ${missing.join(", ")}`);
  return { index, rows };
}

const int = (raw: string | undefined): number | null => {
  if (raw === undefined || raw.trim() === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.trunc(n) : null;
};

/** Ngày dạng YYYYMMDD (số nguyên) -> "YYYY-MM-DD"; giá trị lạ -> null. */
export function ymdToDate(v: number | null): string | null {
  if (v === null || v < 19000101 || v > 29991231) return null;
  const s = String(v);
  const [m, d] = [Number(s.slice(4, 6)), Number(s.slice(6, 8))];
  return m >= 1 && m <= 12 && d >= 1 && d <= 31 ? `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}` : null;
}

/** Cộng `months` tháng vào ngày "YYYY-MM-DD" (giữ ngày trong tháng, kẹp về ngày cuối tháng nếu tháng đích ngắn hơn). */
export function addMonths(iso: string, months: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const idx = y * 12 + (m - 1) + months;
  const [ny, nm] = [Math.floor(idx / 12), (idx % 12) + 1];
  const last = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
  return `${String(ny).padStart(4, "0")}-${String(nm).padStart(2, "0")}-${String(Math.min(d, last)).padStart(2, "0")}`;
}

export interface ContractsPrepared { contracts: Contract[] | null; loans: Loan[] | null }

/** Đọc và kiểm tra (chưa ghi). File thiếu thì bỏ qua; sai cấu trúc ném ContractsError. */
export function prepareContracts(files: Map<string, string>): ContractsPrepared {
  const c = read(files, CONTRACT_FILE, ["playerid", "teamid", "wage", "duration_months", "contract_date"]);
  let contracts: Contract[] | null = null;
  if (c) {
    const g = (r: string[], col: string) => r[c.index.get(col)!];
    contracts = [];
    for (const r of c.rows) {
      const player_id = int(g(r, "playerid")), team_id = int(g(r, "teamid")), wage = int(g(r, "wage")), months = int(g(r, "duration_months"));
      if (player_id === null || team_id === null || wage === null || months === null) throw new ContractsError(`${CONTRACT_FILE}: dòng không đọc được (${r.join(",").slice(0, 80)})`);
      const start = ymdToDate(int(g(r, "contract_date")));
      contracts.push({
        player_id, team_id, wage, duration_months: months, start_date: start, end_date: start ? addMonths(start, months) : null,
        signon_bonus: c.index.has("signon_bonus") ? int(g(r, "signon_bonus")) : null,
        status: c.index.has("contract_status") ? int(g(r, "contract_status")) : null,
        loan_wage_split: c.index.has("loan_wage_split") ? int(g(r, "loan_wage_split")) : null,
      });
    }
  }
  const l = read(files, LOANS_FILE, ["playerid", "teamidloanedfrom", "loandateend"]);
  let loans: Loan[] | null = null;
  if (l) {
    const g = (r: string[], col: string) => r[l.index.get(col)!];
    loans = [];
    for (const r of l.rows) {
      const player_id = int(g(r, "playerid")), from = int(g(r, "teamidloanedfrom")), end = int(g(r, "loandateend"));
      if (player_id === null || from === null) throw new ContractsError(`${LOANS_FILE}: dòng không đọc được (${r.join(",").slice(0, 80)})`);
      loans.push({ player_id, from_team_id: from, ends_on: end !== null && end > 0 ? daysToDate(end) : null, to_buy: l.index.has("isloantobuy") ? int(g(r, "isloantobuy")) === 1 : false });
    }
  }
  return { contracts, loans };
}

/** Ghi vào store (thay toàn bộ, vì mỗi lần xuất là ảnh chụp đầy đủ). Trả về số dòng đã ghi. */
export function applyContracts(store: Store, prep: ContractsPrepared): { contracts: number | null; loans: number | null } {
  if (prep.contracts) store.data.contracts = new Map(prep.contracts.map((c) => [c.player_id, c]));
  if (prep.loans) store.data.loans = new Map(prep.loans.map((l) => [l.player_id, l]));
  return { contracts: prep.contracts?.length ?? null, loans: prep.loans?.length ?? null };
}

/** Số tháng còn lại tới `end_date` tính từ `ref` (âm nếu đã hết hạn). */
export function monthsLeft(endDate: string | null, ref: string): number | null {
  if (!endDate) return null;
  const [a, b] = [ref.split("-").map(Number), endDate.split("-").map(Number)];
  return (b[0] - a[0]) * 12 + (b[1] - a[1]) + (b[2] >= a[2] ? 0 : -1);
}

/** Quỹ lương của một đội theo hợp đồng trong save. Cầu thủ đang cho mượn đi nơi khác vẫn tính (chưa rõ cách game chia lương mượn). */
export function wageBill(store: Store, teamId: number) {
  const rows = [...store.data.contracts.values()].filter((c) => c.team_id === teamId);
  return { players: rows.length, total: rows.reduce((s, c) => s + c.wage, 0), rows };
}
