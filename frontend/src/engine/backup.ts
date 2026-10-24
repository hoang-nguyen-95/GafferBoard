// Sao lưu/khôi phục dữ liệu cá nhân (cài đặt, kết quả, ghi chú, đội hình nhập tay) ra file JSON, vì dữ liệu chỉ nằm trong trình duyệt.
import type { Store } from "./store";
import type { ManualLineup, MatchResult, Meeting, TeamNote } from "./types";

const FORMAT = "counterpick-fc-user-data";

export function serializeUser(store: Store): string {
  const u = store.user;
  return JSON.stringify({
    format: FORMAT, version: 1, exported_at: new Date().toISOString(),
    settings: [...u.settings], results: u.results, notes: [...u.notes.values()], meetings: u.meetings, manual: u.manual,
  });
}

const isArray = (v: unknown): v is unknown[] => Array.isArray(v);

/** Thay dữ liệu cá nhân bằng nội dung file sao lưu. Ném Error (thông điệp tiếng Việt) nếu file không đúng định dạng. */
export function restoreUser(store: Store, text: string): void {
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("File không phải JSON hợp lệ.");
  }
  if (data?.format !== FORMAT || !isArray(data.settings) || !isArray(data.results) || !isArray(data.notes) || !isArray(data.meetings) || !isArray(data.manual)) {
    throw new Error("Đây không phải file sao lưu của CounterPick FC.");
  }
  const results = data.results as MatchResult[], meetings = data.meetings as Meeting[], manual = data.manual as ManualLineup[];
  const notes = data.notes as TeamNote[];
  const settings = new Map<string, string>((data.settings as [string, string][]).map(([k, v]) => [String(k), String(v)]));
  store.user = {
    ...store.user, settings, results, meetings, manual, notes: new Map(notes.map((n) => [n.team_id, n])),
  };
  store.touch();
}
