// Trang chủ: meta, cài đặt, trận kế tiếp (khớp backend/app/routers/home.py).
import { bodyObject, bodyOptInt, notFound, type Ctx } from "../http";
import { opponentOf, upcomingFixtures } from "../schedule";
import { referenceDate } from "../serialize";
import { OPPONENT_TEAM, USER_TEAM, effectiveUserTeam, getInt, setInt } from "../settings";
import type { Store } from "../store";
import type { Fixture } from "../types";

function teamBrief(store: Store, teamId: number | null) {
  const team = teamId !== null ? store.data.teams.get(teamId) : undefined;
  if (!team) return null;
  return { team_id: team.team_id, name: team.name, league_id: store.data.standings.get(team.team_id)?.league_id ?? null, overall: team.overall };
}

function fixtureDict(store: Store, f: Fixture, userTeamId: number) {
  return {
    fixture_id: f.fixture_id, date: f.fixture_date, time_seconds: f.fixture_time, competition_id: f.competition_id,
    is_home: f.home_team_id === userTeamId, home: teamBrief(store, f.home_team_id), away: teamBrief(store, f.away_team_id),
    opponent: teamBrief(store, opponentOf(f, userTeamId)),
  };
}

export function getMeta(ctx: Ctx) {
  const { store } = ctx;
  const runs = store.user.importRuns;
  const { teamId, source } = effectiveUserTeam(store);
  const brief = teamBrief(store, teamId);
  return {
    teams: store.data.teams.size, players: store.data.players.size, fixtures: store.data.fixtures.size,
    last_import_at: runs.length ? runs[runs.length - 1].finished_at : null,
    reference_date: referenceDate(store),
    user_team: brief, user_team_source: brief ? source : null,
  };
}

function setTeamSetting(ctx: Ctx, key: string): void {
  const teamId = bodyOptInt(bodyObject(ctx), "team_id");
  if (teamId !== null && !ctx.store.data.teams.has(teamId)) throw notFound("Không tìm thấy đội");
  setInt(ctx.store, key, teamId);
}

export function putUserTeam(ctx: Ctx) {
  setTeamSetting(ctx, USER_TEAM);
  return getMeta(ctx);
}

export function putOpponent(ctx: Ctx) {
  setTeamSetting(ctx, OPPONENT_TEAM);
  return getNextMatch(ctx);
}

export function getNextMatch(ctx: Ctx) {
  const { store } = ctx;
  const { teamId, source: userSource } = effectiveUserTeam(store);
  const userTeam = teamBrief(store, teamId);
  const result: Record<string, unknown> = {
    user_team: userTeam, user_team_source: userTeam ? userSource : null, source: "none", opponent: null,
    fixture: null, upcoming: [], reason: null,
  };
  if (userTeam === null) {
    result.reason = "no_user_team";
    return result;
  }
  const fixtures = upcomingFixtures(store, teamId!);
  const upcoming = fixtures.map((f) => fixtureDict(store, f, teamId!));
  result.upcoming = upcoming;
  const manual = teamBrief(store, getInt(store, OPPONENT_TEAM));
  if (manual) {
    result.source = "manual";
    result.opponent = manual;
    return result;
  }
  if (fixtures.length) {
    result.source = "fixture";
    result.opponent = upcoming[0].opponent;
    result.fixture = upcoming[0];
    return result;
  }
  result.reason = "no_fixtures";
  return result;
}
