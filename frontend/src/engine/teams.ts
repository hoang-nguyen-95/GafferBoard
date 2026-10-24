// Dựng đội hình và số liệu tổng hợp của đội (khớp backend/app/services/teams.py).
import { assignPlayers } from "./lineup";
import { LINES, LINE_OF_ROLE, lineOfPosition, positionName, roleOfPlayer, type Line } from "./positions";
import type { Store } from "./store";
import type { FormationDef, Player, SquadMember } from "./types";
import { avg } from "./util";

export const LINE_METRICS = [
  "overall", "sprint_speed", "acceleration", "stamina", "strength", "jumping", "height", "defensive_awareness",
  "interceptions", "standing_tackle", "sliding_tackle", "heading_accuracy", "short_passing", "vision", "dribbling", "finishing",
] as const;

export interface SlotView { slot: number; position: number | null; player: Player | null; inferred: boolean }
export const slotName = (s: SlotView) => positionName(s.position);
export const slotLine = (s: SlotView): Line | null => lineOfPosition(s.position);

export interface LineupView {
  source: "teamsheet" | "inferred" | "none" | "manual";
  formation_id: number | null; relative_formation_id: number | null; formation_name: string | null;
  captain_id: number | null; slots: SlotView[];
}

export const emptyLineup = (source: LineupView["source"]): LineupView => ({
  source, formation_id: null, relative_formation_id: null, formation_name: null, captain_id: null, slots: [],
});

export type SquadEntry = { player: Player; member: SquadMember };

/** Cầu thủ của đội, OVR giảm dần rồi player_id tăng dần. */
export function squadPlayers(store: Store, teamId: number): SquadEntry[] {
  const out: SquadEntry[] = [];
  for (const member of store.idx.squadByTeam.get(teamId) ?? []) {
    const player = store.data.players.get(member.player_id);
    if (player) out.push({ player, member });
  }
  return out.sort((a, b) => b.player.overall - a.player.overall || a.player.player_id - b.player.player_id);
}

export function defaultFormation(store: Store): FormationDef | null {
  const all = [...store.data.formations.values()].sort((a, b) => a.formation_id - b.formation_id);
  for (const name of ["4-3-3", "4-4-2"]) {
    const f = all.find((x) => x.name === name);
    if (f) return f;
  }
  return all[0] ?? null;
}

export function resolveLineup(store: Store, teamId: number, squad?: SquadEntry[]): LineupView {
  const entries = squad ?? squadPlayers(store, teamId);
  const byId = new Map(entries.map((e) => [e.player.player_id, e.player]));
  const sheet = store.data.lineups.get(teamId);

  if (!sheet || sheet.slots.length === 0) {
    const formation = defaultFormation(store);
    if (!formation || entries.length === 0) return emptyLineup("none");
    const available = entries.filter((e) => !e.member.injury).map((e) => e.player);
    const picked = assignPlayers(formation.positions, available);
    return {
      source: "inferred", formation_id: formation.formation_id, relative_formation_id: formation.formation_id,
      formation_name: formation.name, captain_id: null,
      slots: picked.map((a) => ({ slot: a.slot, position: a.position, player: a.player, inferred: true })),
    };
  }

  const slots: SlotView[] = sheet.slots.map((s) => {
    let player: Player | null = s.player_id !== null ? byId.get(s.player_id) ?? null : null;
    if (player === null && s.player_id !== null) player = store.data.players.get(s.player_id) ?? null;
    return { slot: s.slot, position: s.position, player, inferred: false };
  });
  const missing = slots.filter((s) => s.player === null);
  if (missing.length) {
    const used = new Set(slots.filter((s) => s.player).map((s) => s.player!.player_id));
    const pool = entries.filter((e) => !used.has(e.player.player_id) && !e.member.injury).map((e) => e.player);
    const picked = assignPlayers(missing.map((s) => s.position), pool);
    missing.forEach((sv, i) => {
      if (picked[i].player !== null) { sv.player = picked[i].player; sv.inferred = true; }
    });
  }
  return {
    source: "teamsheet", formation_id: sheet.formation_id, relative_formation_id: sheet.relative_formation_id,
    formation_name: sheet.formation_name, captain_id: sheet.captain_id, slots,
  };
}

export type LineAverages = Record<Line, Record<string, number | null>>;

export function lineAverages(slots: SlotView[]): LineAverages {
  const out = {} as LineAverages;
  for (const line of LINES) {
    const players = slots.filter((s) => s.player && slotLine(s) === line).map((s) => s.player!);
    const row: Record<string, number | null> = { count: players.length };
    for (const metric of LINE_METRICS) row[metric] = avg(players.map((p) => p[metric]));
    out[line] = row;
  }
  return out;
}

export function groupSquadByLine(squad: SquadEntry[], starterIds: Set<number>): Record<Line, { player: Player; member: SquadMember; in_xi: boolean }[]> {
  const groups = { GK: [], DEF: [], MID: [], ATT: [] } as Record<Line, { player: Player; member: SquadMember; in_xi: boolean }[]>;
  for (const e of squad) {
    const line = LINE_OF_ROLE[roleOfPlayer(e.player.positions, e.player.primary_position)];
    groups[line].push({ ...e, in_xi: starterIds.has(e.player.player_id) });
  }
  return groups;
}
