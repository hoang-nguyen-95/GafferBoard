// Đội hình đối thủ nhập tay (khớp backend/app/routers/manual.py).
import { advise } from "../advice";
import { analyzeManual, buildLineup } from "../manual";
import { bodyObject, Created, fieldInt, fieldStr, notFound, pathInt, queryInt, unprocessable, HttpError, TextResult, type Ctx } from "../http";
import { positionName } from "../positions";
import { referenceDate, slotOut, todayLocal } from "../serialize";
import { renderReport } from "../report";
import type { Store } from "../store";
import type { ManualLineup } from "../types";
import { nowIso } from "../util";
import { counterPayload, mineOf, reportResponse, reportToDict } from "./analysis";
import { nextId } from "./notes";

const SLOTS = 11;

interface ManualIn { name: string; formation_id: number; player_ids: (number | null)[]; league_id: number | null }

function parseBody(ctx: Ctx): ManualIn {
  const body = bodyObject(ctx);
  const name = fieldStr(body, "name", { min: 1, max: 60 })!;
  const formationId = fieldInt(body, "formation_id");
  const raw = body.player_ids;
  if (raw === undefined) throw unprocessable([{ type: "missing", loc: ["body", "player_ids"], msg: "Field required" }]);
  if (!Array.isArray(raw)) throw unprocessable([{ type: "list_type", loc: ["body", "player_ids"], msg: "Input should be a valid list" }]);
  if (raw.length !== SLOTS) {
    throw unprocessable([{ type: raw.length < SLOTS ? "too_short" : "too_long", loc: ["body", "player_ids"], msg: `List should have ${raw.length < SLOTS ? "at least" : "at most"} ${SLOTS} items after validation, not ${raw.length}` }]);
  }
  const playerIds = raw.map((v, i) => {
    if (v === null) return null;
    if (typeof v === "number" && Number.isInteger(v)) return v;
    if (typeof v === "string" && /^\s*[+-]?\d+\s*$/.test(v)) return Number(v);
    throw unprocessable([{ type: "int_parsing", loc: ["body", "player_ids", i], msg: "Input should be a valid integer" }]);
  });
  const leagueRaw = body.league_id;
  const leagueId = leagueRaw === undefined || leagueRaw === null ? null : fieldInt(body, "league_id");
  return { name, formation_id: formationId, player_ids: playerIds, league_id: leagueId };
}

function validate(store: Store, body: ManualIn): void {
  if (!store.data.formations.has(body.formation_id)) throw notFound("Không tìm thấy sơ đồ");
  const chosen = body.player_ids.filter((p): p is number => p !== null);
  if (!chosen.length) throw new HttpError(422, "Cần chọn ít nhất một cầu thủ");
  if (chosen.length !== new Set(chosen).size) throw new HttpError(422, "Một cầu thủ không thể đứng hai vị trí");
  const missing = chosen.filter((p) => !store.data.players.has(p));
  if (missing.length) throw notFound(`Không tìm thấy cầu thủ: ${missing.join(", ")}`);
  if (body.league_id !== null && !store.data.leagues.has(body.league_id)) throw notFound("Không tìm thấy giải");
}

function getManual(store: Store, id: number): ManualLineup {
  const m = store.user.manual.find((x) => x.id === id);
  if (!m) throw notFound("Không tìm thấy đội hình nhập tay");
  return m;
}

function detail(store: Store, manual: ManualLineup) {
  const view = buildLineup(store, manual);
  const formation = store.data.formations.get(manual.formation_id);
  const ref = referenceDate(store);
  return {
    id: manual.id, name: manual.name, league_id: manual.league_id,
    formation: { id: manual.formation_id, name: formation ? formation.name : null, positions: formation ? formation.positions.map(positionName) : [] },
    slots: view.slots.map((sv) => slotOut(sv, ref)),
    updated_at: manual.updated_at,
  };
}

export function listManual(ctx: Ctx) {
  const { store } = ctx;
  return [...store.user.manual].sort((a, b) => (a.updated_at < b.updated_at ? 1 : a.updated_at > b.updated_at ? -1 : 0)).map((m) => ({
    id: m.id, name: m.name, formation_name: store.data.formations.get(m.formation_id)?.name ?? null,
    players: m.slots.filter((s) => s.player_id !== null).length, updated_at: m.updated_at,
  }));
}

export function createManual(ctx: Ctx) {
  const { store } = ctx;
  const body = parseBody(ctx);
  validate(store, body);
  const now = nowIso();
  const manual: ManualLineup = {
    id: nextId(store.user.manual), name: body.name.trim(), formation_id: body.formation_id, league_id: body.league_id,
    slots: body.player_ids.map((player_id, slot) => ({ slot, player_id })), created_at: now, updated_at: now,
  };
  store.user.manual.push(manual);
  store.touch();
  return new Created(detail(store, manual));
}

export const getManualDetail = (ctx: Ctx) => detail(ctx.store, getManual(ctx.store, pathInt(ctx, "lineup_id")));

export function updateManual(ctx: Ctx) {
  const { store } = ctx;
  const id = pathInt(ctx, "lineup_id");
  const body = parseBody(ctx);
  const manual = getManual(store, id);
  validate(store, body);
  manual.name = body.name.trim();
  manual.formation_id = body.formation_id;
  manual.league_id = body.league_id;
  manual.slots = body.player_ids.map((player_id, slot) => ({ slot, player_id }));
  manual.updated_at = nowIso();
  store.touch();
  return detail(store, manual);
}

export function deleteManual(ctx: Ctx) {
  const { store } = ctx;
  const manual = getManual(store, pathInt(ctx, "lineup_id"));
  store.user.manual.splice(store.user.manual.indexOf(manual), 1);
  store.touch();
  return { deleted: manual.id };
}

const reportOf = (ctx: Ctx) => analyzeManual(ctx.store, getManual(ctx.store, pathInt(ctx, "lineup_id")));

export const manualAnalysis = (ctx: Ctx) => reportToDict(reportOf(ctx), ctx.store);
export const manualSuggestions = (ctx: Ctx) => advise(ctx.store, reportOf(ctx), mineOf(ctx));

export function manualCounterLineups(ctx: Ctx) {
  const report = reportOf(ctx);
  const limit = queryInt(ctx.query, "limit", { min: 1, max: 5, def: 3 })!;
  return counterPayload(ctx.store, report, mineOf(ctx), limit);
}

export function manualReportMd(ctx: Ctx): TextResult {
  const report = reportOf(ctx);
  const mineId = mineOf(ctx);
  const counter = mineId !== null ? counterPayload(ctx.store, report, mineId) : null;
  const text = renderReport(reportToDict(report, ctx.store), advise(ctx.store, report, mineId), counter, null, todayLocal());
  return reportResponse(report.name, text);
}
