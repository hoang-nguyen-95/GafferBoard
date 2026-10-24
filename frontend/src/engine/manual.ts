// Đội hình đối thủ nhập tay: dựng lineup từ sơ đồ + cầu thủ rồi dùng chung pipeline phân tích (khớp services/manual.py).
import { clubOfPlayer } from "./analysis";
import { buildReport, type OpponentReport } from "./opponent";
import type { Store } from "./store";
import { emptyLineup, type LineupView, type SlotView } from "./teams";
import type { ManualLineup, Player } from "./types";

const MIN_SHARE_FOR_LEAGUE = 0.5;

export function buildLineup(store: Store, manual: ManualLineup): LineupView {
  const formation = store.data.formations.get(manual.formation_id);
  if (!formation) return emptyLineup("none");
  const slots: SlotView[] = formation.positions.map((position, i) => {
    const entry = manual.slots.find((s) => s.slot === i);
    const player = entry && entry.player_id !== null ? store.data.players.get(entry.player_id) ?? null : null;
    return { slot: i, position, player, inferred: false };
  });
  return {
    source: "manual", formation_id: formation.formation_id, relative_formation_id: formation.formation_id, formation_name: formation.name,
    captain_id: null, slots,
  };
}

/** Giải mà phần lớn cầu thủ đang chơi (để so phân vị); null nếu không đủ rõ. */
export function inferLeague(store: Store, players: Player[]): { id: number | null; name: string | null } {
  const counts = new Map<string, { id: number; name: string | null; n: number }>();
  for (const p of players) {
    const club = clubOfPlayer(store, p.player_id);
    if (club && club.leagueId !== null) {
      const key = `${club.leagueId}|${club.leagueName}`;
      const cur = counts.get(key);
      if (cur) cur.n++;
      else counts.set(key, { id: club.leagueId, name: club.leagueName, n: 1 });
    }
  }
  if (!players.length || !counts.size) return { id: null, name: null };
  let top: { id: number; name: string | null; n: number } | null = null;
  for (const c of counts.values()) if (top === null || c.n > top.n) top = c; // hòa: giữ cái xuất hiện trước, như Counter.most_common
  return top!.n / players.length >= MIN_SHARE_FOR_LEAGUE ? { id: top!.id, name: top!.name } : { id: null, name: null };
}

export function analyzeManual(store: Store, manual: ManualLineup): OpponentReport {
  const lineup = buildLineup(store, manual);
  const players = lineup.slots.filter((s) => s.player).map((s) => s.player!);
  let leagueId: number | null, leagueName: string | null;
  if (manual.league_id !== null) {
    leagueId = manual.league_id;
    leagueName = store.data.leagues.get(manual.league_id)?.name ?? null;
  } else {
    const inferred = inferLeague(store, players);
    leagueId = inferred.id;
    leagueName = inferred.name;
  }
  return buildReport(store, { name: manual.name, teamId: null, leagueId, leagueName, lineup, bench: [], form: null, injuries: [], ratings: {} });
}
