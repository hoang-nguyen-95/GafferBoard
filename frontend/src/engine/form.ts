// Phong độ gần đây (khớp backend/app/services/form.py). Chuỗi phong độ của game chưa được kiểm chứng: luôn verified=false.
import type { Store } from "./store";
import type { MatchResult } from "./types";

export const FORM_MATCHES = 5;
const POINTS: Record<string, number> = { W: 3, D: 1, L: 0 };
const GAME_FORM_DIGITS: Record<string, string> = { "0": "L", "1": "D", "2": "W" };

export const outcome = (gf: number, ga: number): string => (gf > ga ? "W" : gf === ga ? "D" : "L");
const count = (letters: string[], l: string) => letters.filter((x) => x === l).length;

export interface FormInfo {
  source: "manual" | "game"; verified: boolean; matches: number; sequence: string | null;
  wins: number; draws: number; losses: number; points: number; max_points: number;
  goals_for: number | null; goals_against: number | null; goal_difference: number | null;
  results: { id: number; opponent_name: string | null; goals_for: number; goals_against: number; played_on: string | null; is_home: boolean | null }[];
}

export function formFromResults(results: MatchResult[]): FormInfo {
  const last = results.slice(0, FORM_MATCHES);
  const letters = last.map((r) => outcome(r.goals_for, r.goals_against));
  return {
    source: "manual", verified: true, matches: last.length, sequence: letters.join(""),
    wins: count(letters, "W"), draws: count(letters, "D"), losses: count(letters, "L"),
    points: letters.reduce((a, l) => a + POINTS[l], 0), max_points: POINTS.W * last.length,
    goals_for: last.reduce((a, r) => a + r.goals_for, 0), goals_against: last.reduce((a, r) => a + r.goals_against, 0),
    goal_difference: last.reduce((a, r) => a + r.goals_for - r.goals_against, 0),
    results: last.map((r) => ({
      id: r.id, opponent_name: r.opponent_name, goals_for: r.goals_for, goals_against: r.goals_against,
      played_on: r.played_on, is_home: r.is_home,
    })),
  };
}

export function formFromGame(raw: string | null): FormInfo | null {
  if (!raw || raw === "0" || [...raw].some((c) => !(c in GAME_FORM_DIGITS))) return null;
  const letters = [...raw].map((c) => GAME_FORM_DIGITS[c]);
  return {
    source: "game", verified: false, matches: letters.length, sequence: null,
    wins: count(letters, "W"), draws: count(letters, "D"), losses: count(letters, "L"),
    points: letters.reduce((a, l) => a + POINTS[l], 0), max_points: POINTS.W * letters.length,
    goals_for: null, goals_against: null, goal_difference: null, results: [],
  };
}

/** Kết quả của đội: ngày mới nhất trước, ngày không rõ xếp cuối, rồi id lớn trước. */
export function teamResults(store: Store, teamId: number): MatchResult[] {
  return store.user.results
    .filter((r) => r.team_id === teamId)
    .sort((a, b) => {
      if (a.played_on !== b.played_on) {
        if (a.played_on === null) return 1;
        if (b.played_on === null) return -1;
        return a.played_on < b.played_on ? 1 : -1;
      }
      return b.id - a.id;
    });
}

export function teamForm(store: Store, teamId: number): FormInfo | null {
  const results = teamResults(store, teamId);
  if (results.length) return formFromResults(results);
  return formFromGame(store.data.standings.get(teamId)?.form_raw ?? null);
}
