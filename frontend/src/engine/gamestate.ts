// Trạng thái game (ngân sách chuyển nhượng, ngày, đội người chơi) do script tự động của Live Editor ghi vào cp_state.csv.
// Chỉ TypeScript (không có bản Python): các giá trị lấy từ hàm Lua GetTransferBudget/GetCurrentDate/GetUserTeamID của Live Editor.
import extraFiles from "./data/extra-files.json";
import type { Store } from "./store";
import type { GameState } from "./types";
import { parseCsv } from "./util";

export const STATE_FILE = extraFiles.state;

/** Năm nhỏ nhất coi là ngày thật trong game: career_calendar của save thử trả 2008-01-01 (giá trị mặc định), không phải ngày chơi. */
export const MIN_PLAUSIBLE_YEAR = 2020;

const int = (raw: string | undefined): number | null => {
  if (raw === undefined || raw.trim() === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.trunc(n) : null;
};

/** "YYYY-MM-DD" hợp lệ và đáng tin, nếu không thì null. */
export function plausibleDate(raw: string | undefined): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((raw ?? "").trim());
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (y < MIN_PLAUSIBLE_YEAR || y > 2100 || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return m[0];
}

/**
 * Đọc (chưa ghi). Không có file, file rỗng hoặc thiếu cột thì null: chỉ là thông tin bổ sung, không được làm hỏng cả đợt nhập
 * (khác với các bảng chính, nơi cột sai phải báo lỗi).
 */
export function prepareGameState(files: Map<string, string>): GameState | null {
  const text = files.get(STATE_FILE.toLowerCase());
  if (text === undefined) return null;
  const { header, rows } = parseCsv(text);
  const index = new Map(header.map((h, i) => [h, i]));
  if (!["user_team_id", "transfer_budget", "game_date"].every((c) => index.has(c))) return null;
  const r = rows[0];
  if (!r) return null; // file rỗng (script chưa ghi gì)
  const cell = (c: string) => (index.has(c) ? r[index.get(c)!] : undefined);
  const budget = int(cell("transfer_budget"));
  const exported = (cell("exported_at") ?? "").trim();
  return {
    user_team_id: int(cell("user_team_id")),
    transfer_budget: budget !== null && budget >= 0 ? budget : null,
    date: plausibleDate(cell("game_date")),
    last_event: int(cell("last_event")),
    exported_at: exported === "" ? null : exported,
  };
}

/** Ghi vào store; null (không có file) thì giữ trạng thái cũ. */
export function applyGameState(store: Store, state: GameState | null): number | null {
  if (state === null) return null;
  store.data.gameState = state;
  return 1;
}
