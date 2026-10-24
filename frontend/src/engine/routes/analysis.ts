// Phân tích đối thủ, gợi ý, đội hình đáp trả, báo cáo (khớp backend/app/routers/{analysis,lineups}.py).
import { adviseFull, advise } from "../advice";
import { HttpError, notFound, pathInt, queryInt, TextResult, type Ctx } from "../http";
import { metricsList, analyzeTeam, type OpponentReport } from "../opponent";
import { optionScore, optionValid, recommendLineups, slotScore, type LineupOption } from "../optimizer";
import { LINE_LABELS_VI, lineOfPosition, positionName } from "../positions";
import { playerSummary, referenceDate, slotOut, todayLocal } from "../serialize";
import { effectiveUserTeam } from "../settings";
import { renderReport, slug } from "../report";
import type { Store } from "../store";
import { pyRound } from "../util";
import { teamNotes } from "./notes";

export function reportToDict(report: OpponentReport, store: Store) {
  const ref = referenceDate(store);
  const lineup = report.lineup;
  return {
    name: report.name,
    team_id: report.teamId,
    ratings: report.ratings,
    lineup: {
      source: lineup.source, formation_id: lineup.formation_id, relative_formation_id: lineup.relative_formation_id,
      formation_name: lineup.formation_name, slots: lineup.slots.map((sv) => slotOut(sv, ref)),
    },
    metrics: metricsList(report),
    extras: report.extras,
    benchmark: report.benchmark,
    dangerous: report.dangerous,
    weak_points: report.weakPoints,
    form: report.form,
    injuries: report.injuries,
    line_labels: LINE_LABELS_VI,
  };
}

export function optionToDict(option: LineupOption, ref: string) {
  const f = option.formation;
  return {
    formation: { id: f.formation_id, name: f.name, positions: f.positions.map(positionName) },
    score: pyRound(optionScore(option), 1),
    baseline_score: pyRound(option.baseline_score, 1),
    valid: optionValid(option),
    is_usual: option.is_usual,
    why_formation: option.why_formation,
    warnings: option.warnings,
    slots: option.slots.map((s) => ({
      slot: s.slot, position: s.position, position_name: positionName(s.position), line: lineOfPosition(s.position), inferred: false,
      player: s.player ? playerSummary(s.player, null, true, ref) : null,
      rating: pyRound(s.rating, 1), fit_penalty: s.fit_penalty, form_bonus: pyRound(s.form_bonus, 1), rule_bonus: pyRound(s.rule_bonus, 1),
      score: pyRound(slotScore(s), 1), reasons: s.reasons,
    })),
    added: option.added,
    removed: option.removed,
  };
}

/** Phương án đội hình đáp trả cho `report` (đội trong dữ liệu hoặc đội hình nhập tay). */
export function counterPayload(store: Store, report: OpponentReport, mineId: number | null, limit = 3) {
  if (mineId === null) throw new HttpError(409, "Chưa biết đội của bạn: chọn đội trên trang chủ trước");
  if (report.teamId !== null && mineId === report.teamId) throw new HttpError(422, "Đội của bạn trùng với đối thủ");
  const { suggestions, payload } = adviseFull(store, report, mineId);
  const result = recommendLineups(store, mineId, suggestions, payload.formation_counters as { formation: string; reason: string }[], limit);
  const ref = referenceDate(store);
  return {
    opponent: report.name, my_team_id: mineId, usual_formation: result.usual_formation, available_players: result.available,
    injured: result.injured, rules_applied: result.rules, options: result.options.map((o) => optionToDict(o, ref)),
  };
}

export const mineOf = (ctx: Ctx): number | null => {
  const mine = queryInt(ctx.query, "mine");
  return mine !== undefined ? mine : effectiveUserTeam(ctx.store).teamId;
};

function reportFor(ctx: Ctx): OpponentReport {
  const report = analyzeTeam(ctx.store, pathInt(ctx, "team_id"));
  if (!report) throw notFound("Không tìm thấy đội");
  return report;
}

export const reportResponse = (name: string, text: string) =>
  new TextResult(text, { "content-disposition": `attachment; filename="phan-tich-${slug(name)}.md"` });

export function teamAnalysis(ctx: Ctx) {
  return reportToDict(reportFor(ctx), ctx.store);
}

export function teamSuggestions(ctx: Ctx) {
  const report = reportFor(ctx);
  return advise(ctx.store, report, mineOf(ctx));
}

export function teamReportMd(ctx: Ctx) {
  const report = reportFor(ctx);
  const mineId = mineOf(ctx);
  const teamId = pathInt(ctx, "team_id");
  const counter = mineId !== null && mineId !== teamId ? counterPayload(ctx.store, report, mineId) : null;
  const text = renderReport(reportToDict(report, ctx.store), advise(ctx.store, report, mineId), counter, teamNotes(ctx.store, teamId), todayLocal());
  return reportResponse(report.name, text);
}

export function counterLineups(ctx: Ctx) {
  const report = reportFor(ctx);
  const limit = queryInt(ctx.query, "limit", { min: 1, max: 5, def: 3 })!;
  return counterPayload(ctx.store, report, mineOf(ctx), limit);
}
