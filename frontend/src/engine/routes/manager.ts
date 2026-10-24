// Chế độ Manager (không có bản Python tương ứng nên không nằm trong bộ đối chiếu).
import { bodyObject, HttpError, notFound, parseInt422, pathInt, queryInt, unprocessable, type Ctx } from "../http";
import {
  budgetSummary, findTargets, negotiationPlan, seasonEndYear, seasonsLeft, squadNeeds,
} from "../manager";
import { ROLE_POSITIONS, type Role } from "../positions";
import { referenceDate } from "../serialize";
import { effectiveUserTeam } from "../settings";
import type { ShortlistStatus } from "../types";
import { ageOn } from "../util";

const MAX_MONEY = 1e12;

function myTeam(ctx: Ctx): number {
  const { teamId } = effectiveUserTeam(ctx.store);
  if (teamId === null) throw new HttpError(409, "Chưa biết đội của bạn: chọn đội trên trang chủ trước");
  return teamId;
}

function money(body: Record<string, unknown>, key: string): number | null {
  const v = body[key];
  if (v === undefined || v === null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n) || n < 0 || n > MAX_MONEY) {
    throw unprocessable([{ type: "number_range", loc: ["body", key], msg: `Phải là số từ 0 tới ${MAX_MONEY}` }]);
  }
  return Math.round(n);
}

function queryMoney(ctx: Ctx, key: string, required: boolean): number | null {
  const raw = ctx.query.get(key);
  if (raw === null || raw === "") {
    if (required) throw unprocessable([{ type: "missing", loc: ["query", key], msg: "Field required" }]);
    return null;
  }
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0 || n > MAX_MONEY) throw unprocessable([{ type: "number_range", loc: ["query", key], msg: "Phải là số dương" }]);
  return n;
}

export function overview(ctx: Ctx) {
  const teamId = myTeam(ctx);
  const team = ctx.store.data.teams.get(teamId);
  if (!team) throw notFound("Không tìm thấy đội của bạn trong dữ liệu");
  return { user_team: { team_id: team.team_id, name: team.name }, ...squadNeeds(ctx.store, teamId), budget: ctx.store.user.manager.budget };
}

export function targets(ctx: Ctx) {
  const teamId = myTeam(ctx);
  const role = ctx.query.get("role") as Role | null;
  if (!role || !(role in ROLE_POSITIONS)) {
    throw unprocessable([{ type: "enum", loc: ["query", "role"], msg: `role phải là một trong: ${Object.keys(ROLE_POSITIONS).join(", ")}` }]);
  }
  return findTargets(ctx.store, {
    teamId, role, maxAge: queryInt(ctx.query, "max_age", { min: 14, max: 60 }), minOverall: queryInt(ctx.query, "min_overall", { min: 1, max: 99 }),
    maxSeasonsLeft: queryInt(ctx.query, "max_seasons", { min: 0, max: 10 }), leagueId: queryInt(ctx.query, "league"),
    limit: queryInt(ctx.query, "limit", { min: 1, max: 100, def: 30 }),
  });
}

export function shortlist(ctx: Ctx) {
  return budgetSummary(ctx.store, effectiveUserTeam(ctx.store).teamId);
}

export function putBudget(ctx: Ctx) {
  const body = bodyObject(ctx);
  const m = ctx.store.user.manager;
  if ("transfer" in body) m.budget.transfer = money(body, "transfer");
  if ("wage" in body) m.budget.wage = money(body, "wage");
  if ("season_end_year" in body) {
    const v = body.season_end_year;
    m.season_end_year = v === null || v === "" ? null : parseInt422(String(v), "body");
    if (m.season_end_year !== null && (m.season_end_year < 2000 || m.season_end_year > 2100)) {
      throw unprocessable([{ type: "number_range", loc: ["body", "season_end_year"], msg: "Năm phải từ 2000 tới 2100" }]);
    }
  }
  ctx.store.touch();
  return shortlist(ctx);
}

function requirePlayer(ctx: Ctx) {
  const id = pathInt(ctx, "player_id");
  if (!ctx.store.data.players.has(id)) throw notFound("Không tìm thấy cầu thủ");
  return id;
}

const STATUSES: ShortlistStatus[] = ["target", "negotiating", "agreed"];

export function putShortlist(ctx: Ctx) {
  const id = requirePlayer(ctx);
  const body = bodyObject(ctx);
  const status = (body.status ?? "target") as ShortlistStatus;
  if (!STATUSES.includes(status)) throw unprocessable([{ type: "enum", loc: ["body", "status"], msg: `status phải là một trong: ${STATUSES.join(", ")}` }]);
  const note = typeof body.note === "string" ? body.note.slice(0, 500) : "";
  const item = { player_id: id, fee: money(body, "fee"), wage: money(body, "wage"), note, status };
  const list = ctx.store.user.manager.shortlist;
  const idx = list.findIndex((x) => x.player_id === id);
  if (idx >= 0) list[idx] = item;
  else list.push(item);
  ctx.store.touch();
  return shortlist(ctx);
}

export function deleteShortlist(ctx: Ctx) {
  const id = pathInt(ctx, "player_id");
  const m = ctx.store.user.manager;
  m.shortlist = m.shortlist.filter((x) => x.player_id !== id);
  ctx.store.touch();
  return shortlist(ctx);
}

export function putSale(ctx: Ctx) {
  const id = requirePlayer(ctx);
  const body = bodyObject(ctx);
  const item = { player_id: id, expected_fee: money(body, "expected_fee"), wage: money(body, "wage") };
  const list = ctx.store.user.manager.sales;
  const idx = list.findIndex((x) => x.player_id === id);
  if (idx >= 0) list[idx] = item;
  else list.push(item);
  ctx.store.touch();
  return shortlist(ctx);
}

export function deleteSale(ctx: Ctx) {
  const id = pathInt(ctx, "player_id");
  const m = ctx.store.user.manager;
  m.sales = m.sales.filter((x) => x.player_id !== id);
  ctx.store.touch();
  return shortlist(ctx);
}

export function negotiation(ctx: Ctx) {
  const id = queryInt(ctx.query, "player_id");
  if (id === undefined) throw unprocessable([{ type: "missing", loc: ["query", "player_id"], msg: "Field required" }]);
  const p = ctx.store.data.players.get(id);
  if (!p) throw notFound("Không tìm thấy cầu thủ");
  const value = queryMoney(ctx, "value", true)!;
  const plan = negotiationPlan({
    value, asking: queryMoney(ctx, "asking", false), age: ageOn(p.birth_date, referenceDate(ctx.store)),
    seasonsLeft: seasonsLeft(p, seasonEndYear(ctx.store)), overall: p.overall, potential: p.potential,
  });
  return { player: { player_id: p.player_id, name: p.name || `Cầu thủ #${p.player_id}`, overall: p.overall, potential: p.potential }, ...plan };
}
