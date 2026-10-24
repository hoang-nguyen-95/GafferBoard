// Ghép phân tích đối thủ với hồ sơ đội người dùng rồi chạy engine luật (khớp backend/app/services/advice.py).
import { computeMetrics, type OpponentReport } from "./opponent";
import { evaluate, formationCounters, suggestionDict, type Ctx, type Suggestion } from "./rules";
import type { Store } from "./store";
import { resolveLineup, squadPlayers } from "./teams";

export function myProfile(store: Store, teamId: number | null) {
  const team = teamId !== null ? store.data.teams.get(teamId) : undefined;
  if (!team) return { values: {}, extras: {}, name: null as string | null };
  const squad = squadPlayers(store, teamId!);
  const lineup = resolveLineup(store, teamId!, squad);
  const starters = new Set(lineup.slots.filter((s) => s.player).map((s) => s.player!.player_id));
  const bench = squad.filter((e) => !starters.has(e.player.player_id) && !e.member.injury).map((e) => e.player);
  const { values, extras } = computeMetrics(lineup.slots, bench);
  return { values, extras: extras as unknown as Record<string, unknown>, name: team.name as string | null };
}

export function contextFor(report: OpponentReport, mineValues: Ctx["mine_values"], mineExtras: Ctx["mine_extras"]): Ctx {
  const form = report.form && report.form.verified ? report.form : null;
  return {
    values: report.values, percentiles: report.percentiles, extras: report.extras as unknown as Ctx["extras"], injuries: report.injuries,
    dangerous: report.dangerous, formation_name: report.lineup.formation_name, mine_values: mineValues, mine_extras: mineExtras,
    verified_form: form as unknown as Ctx["verified_form"],
  };
}

export function adviseFull(store: Store, report: OpponentReport, mineTeamId: number | null): { suggestions: Suggestion[]; payload: Record<string, unknown> } {
  if (mineTeamId !== null && mineTeamId === report.teamId) mineTeamId = null;
  const mine = myProfile(store, mineTeamId);
  const suggestions = evaluate(contextFor(report, mine.values, mine.extras));
  const payload = {
    opponent: report.name,
    opponent_formation: report.lineup.formation_name,
    my_team: mine.name ? { team_id: mineTeamId, name: mine.name } : null,
    compared_with_league: report.benchmark !== null,
    suggestions: suggestions.map(suggestionDict),
    formation_counters: formationCounters(report.lineup.formation_name),
    notes: [
      ...(report.benchmark ? [] : ["Chưa đủ đội cùng giải để so phân vị: nhiều luật chỉ so với đội của bạn."]),
      ...(mine.name ? [] : ["Chưa biết đội của bạn: các luật so sánh với đội bạn không được xét."]),
    ],
  };
  return { suggestions, payload };
}

export const advise = (store: Store, report: OpponentReport, mineTeamId: number | null) => adviseFull(store, report, mineTeamId).payload;
