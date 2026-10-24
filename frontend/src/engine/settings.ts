// Cài đặt người dùng và đội của người dùng (khớp backend/app/services/settings.py).
import type { Store } from "./store";

export const USER_TEAM = "user_team_id";
export const OPPONENT_TEAM = "opponent_team_id";
export const LLM_ENABLED = "llm_enabled";

export function getInt(store: Store, key: string): number | null {
  const v = store.user.settings.get(key);
  return v === undefined ? null : Number(v);
}

export function setInt(store: Store, key: string, value: number | null): void {
  if (value === null) store.user.settings.delete(key);
  else store.user.settings.set(key, String(value));
  store.touch();
}

/** Đội của người dùng: lựa chọn thủ công thắng dữ liệu của game (career_users). */
export function effectiveUserTeam(store: Store): { teamId: number | null; source: "manual" | "game" | null } {
  const manual = getInt(store, USER_TEAM);
  if (manual !== null) return { teamId: manual, source: "manual" };
  const profiles = [...store.data.users.values()].sort((a, b) => a.user_id - b.user_id);
  const profile = profiles[0];
  if (profile && profile.user_team_id !== null) return { teamId: profile.user_team_id, source: "game" };
  return { teamId: null, source: null };
}
