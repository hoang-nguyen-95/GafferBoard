// Các endpoint đọc cơ bản: giải, đội, cầu thủ, sơ đồ (khớp backend/app/routers/{teams,players}.py).
import { analyzePlayer, clubOfPlayer } from "../analysis";
import { HttpError, notFound, pathInt, queryInt, unprocessable, type Ctx } from "../http";
import { LINE_LABELS_VI, LINES, positionName } from "../positions";
import { playerSummary, referenceDate, slotOut, standingOut, teamOut } from "../serialize";
import type { Player, SquadMember } from "../types";
import { groupSquadByLine, lineAverages, resolveLineup, squadPlayers } from "../teams";
import { ageOn, foldText, pyRound } from "../util";

/** LIKE của SQLite: % = chuỗi bất kỳ, _ = một ký tự, không phân biệt hoa thường với ASCII. */
export function sqliteLike(text: string, pattern: string): boolean {
  const lower = (v: string) => v.replace(/[A-Z]/g, (c) => c.toLowerCase());
  const re = [...lower(pattern)].map((c) => (c === "%" ? ".*" : c === "_" ? "." : c.replace(/[.*+?^${}()|[\]\\/-]/g, "\\$&"))).join("");
  return new RegExp(`^${re}$`, "s").test(lower(text));
}

export function listLeagues(ctx: Ctx) {
  return [...ctx.store.data.leagues.values()].sort((a, b) => a.league_id - b.league_id).map((l) => ({
    league_id: l.league_id, name: l.name, country_id: l.country_id, level: l.level, is_international: l.is_international, is_women: l.is_women,
  }));
}

export function listTeams(ctx: Ctx) {
  const { store, query } = ctx;
  const leagueRaw = query.get("league");
  const league = leagueRaw === null ? null : queryInt(query, "league")!;
  const q = query.get("q");
  const limit = queryInt(query, "limit", { min: 1, max: 5000, def: 1000 })!;
  const offset = queryInt(query, "offset", { min: 0, def: 0 })!;
  let teams = [...store.data.teams.values()];
  if (league !== null) teams = teams.filter((t) => store.data.standings.get(t.team_id)?.league_id === league);
  if (q) teams = teams.filter((t) => sqliteLike(t.name, `%${q}%`));
  teams.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  return teams.slice(offset, offset + limit).map((t) => teamOut(store, t));
}

export function getTeam(ctx: Ctx) {
  const team = ctx.store.data.teams.get(pathInt(ctx, "team_id"));
  if (!team) throw notFound("Không tìm thấy đội");
  return teamOut(ctx.store, team);
}

export function teamOverview(ctx: Ctx) {
  const { store } = ctx;
  const teamId = pathInt(ctx, "team_id");
  const team = store.data.teams.get(teamId);
  if (!team) throw notFound("Không tìm thấy đội");
  const squad = squadPlayers(store, teamId);
  const lineup = resolveLineup(store, teamId, squad);
  const starterIds = new Set(lineup.slots.filter((s) => s.player).map((s) => s.player!.player_id));
  const standing = store.data.standings.get(teamId);
  const ref = referenceDate(store);
  const grouped = groupSquadByLine(squad, starterIds);
  const squadOut = {} as Record<string, unknown[]>;
  for (const line of LINES) squadOut[line] = grouped[line].map((e) => playerSummary(e.player, e.member, e.in_xi, ref));
  return {
    team: teamOut(store, team),
    standing: standing ? standingOut(standing) : null,
    lineup: {
      source: lineup.source, formation_id: lineup.formation_id, relative_formation_id: lineup.relative_formation_id,
      formation_name: lineup.formation_name, slots: lineup.slots.map((s) => slotOut(s, ref)),
    },
    squad: squadOut,
    line_averages: lineAverages(lineup.slots),
    line_labels: LINE_LABELS_VI,
  };
}

export function listPlayers(ctx: Ctx) {
  const { store, query } = ctx;
  const teamRaw = query.get("team");
  const team = teamRaw === null ? null : queryInt(query, "team")!;
  const q = query.get("q");
  const limit = queryInt(query, "limit", { min: 1, max: 1000, def: 100 })!;
  const offset = queryInt(query, "offset", { min: 0, def: 0 })!;
  const words = q && foldText(q) ? foldText(q).split(" ") : [];

  let rows: { player: Player; member: SquadMember | null }[];
  if (team !== null) {
    rows = (store.idx.squadByTeam.get(team) ?? []).flatMap((m) => {
      const p = store.data.players.get(m.player_id);
      return p ? [{ player: p, member: m }] : [];
    });
  } else {
    rows = [...store.data.players.values()].map((player) => ({ player, member: null }));
  }
  if (words.length) rows = rows.filter(({ player }) => player.name_search !== null && words.every((w) => player.name_search!.includes(w)));
  rows.sort((a, b) => b.player.overall - a.player.overall || a.player.player_id - b.player.player_id);
  const ref = referenceDate(store);
  return rows.slice(offset, offset + limit).map(({ player, member }) => playerSummary(player, member, null, ref));
}

export function getPlayer(ctx: Ctx) {
  const { store } = ctx;
  const player = store.data.players.get(pathInt(ctx, "player_id"));
  if (!player) throw notFound("Không tìm thấy cầu thủ");
  return { ...player, age: ageOn(player.birth_date, referenceDate(store)) };
}

export function playerAnalysis(ctx: Ctx) {
  const { store, query } = ctx;
  const playerId = pathInt(ctx, "player_id");
  const scope = query.get("scope") ?? "auto";
  if (!["auto", "league", "all"].includes(scope)) {
    throw unprocessable([{ type: "string_pattern_mismatch", loc: ["query", "scope"], msg: "String should match pattern" }]);
  }
  const player = store.data.players.get(playerId);
  if (!player) throw notFound("Không tìm thấy cầu thủ");
  const result = analyzePlayer(store, player, scope);
  const club = clubOfPlayer(store, playerId);
  return {
    ...result,
    club: club ? { team_id: club.team.team_id, name: club.team.name, league_id: club.leagueId, league_name: club.leagueName } : null,
    name: player.name,
  };
}

export function listFormations(ctx: Ctx) {
  return [...ctx.store.data.formations.values()]
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : a.formation_id - b.formation_id))
    .map((f) => ({ id: f.formation_id, name: f.name, positions: f.positions.map(positionName), position_codes: f.positions }));
}

export { HttpError, pyRound };
