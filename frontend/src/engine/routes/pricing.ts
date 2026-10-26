// Ước tính giá/lương hợp lý và nhật ký đề nghị (chỉ TypeScript, không có bản Python).
import { bodyObject, Created, fieldInt, fieldStr, notFound, pathInt, queryInt, unprocessable, type Ctx } from "../http";
import { evaluatePackage, packageOptions, swapCandidates } from "../packages";
import { addObservation, addOffer, priceAnalysis } from "../pricing";
import { effectiveUserTeam } from "../settings";
import type { OfferKind, OfferResult, PackageBreakdown } from "../types";

const MAX_MONEY = 1e12;

function moneyField(body: Record<string, unknown>, key: string, required = false): number | null {
  const v = body[key];
  if (v === undefined || v === null || v === "") {
    if (required) throw unprocessable([{ type: "missing", loc: ["body", key], msg: "Field required" }]);
    return null;
  }
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n) || n <= 0 || n > MAX_MONEY) throw unprocessable([{ type: "number_range", loc: ["body", key], msg: `Phải là số dương tới ${MAX_MONEY}` }]);
  return Math.round(n);
}

function queryMoney(ctx: Ctx, key: string): number | null {
  const raw = ctx.query.get(key);
  if (raw === null || raw === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0 || n > MAX_MONEY) throw unprocessable([{ type: "number_range", loc: ["query", key], msg: "Phải là số dương" }]);
  return n;
}

function playerOr404(ctx: Ctx, id: number) {
  const p = ctx.store.data.players.get(id);
  if (!p) throw notFound("Không tìm thấy cầu thủ");
  return p;
}

export function pricing(ctx: Ctx) {
  const id = queryInt(ctx.query, "player_id");
  if (id === undefined) throw unprocessable([{ type: "missing", loc: ["query", "player_id"], msg: "Field required" }]);
  const p = playerOr404(ctx, id);
  return priceAnalysis(ctx.store, effectiveUserTeam(ctx.store).teamId, p, queryMoney(ctx, "asking_fee"), queryMoney(ctx, "asking_wage"));
}

/** Đánh giá một gói đề nghị (trao đổi, thưởng, % bán lại) và gợi ý các gói thay thế, kèm danh sách cầu thủ đội bạn có thể đưa vào trao đổi. */
export function packages(ctx: Ctx) {
  const id = queryInt(ctx.query, "player_id");
  if (id === undefined) throw unprocessable([{ type: "missing", loc: ["query", "player_id"], msg: "Field required" }]);
  const p = playerOr404(ctx, id);
  const { teamId } = effectiveUserTeam(ctx.store);
  const swapIds = (ctx.query.get("swap") ?? "").split(",").filter(Boolean).map((x) => Number(x)).filter((x) => Number.isInteger(x));
  if (swapIds.length > 3) throw unprocessable([{ type: "too_long", loc: ["query", "swap"], msg: "Tối đa 3 cầu thủ trao đổi" }]);
  const pct = Number(ctx.query.get("sell_on") ?? 0);
  if (!Number.isFinite(pct) || pct < 0 || pct > 50) throw unprocessable([{ type: "number_range", loc: ["query", "sell_on"], msg: "Phần trăm chia lại từ 0 tới 50" }]);
  const has = ctx.query.has("fee");
  const evaluation = has ? evaluatePackage(ctx.store, teamId, p, {
    cash: queryMoney(ctx, "fee") ?? 0, swapIds, addons: queryMoney(ctx, "addons") ?? 0, sellOnPercent: pct, signOn: queryMoney(ctx, "sign_on") ?? 0,
  }) : null;
  return { evaluation, options: packageOptions(ctx.store, teamId, p), squad: teamId === null ? [] : swapCandidates(ctx.store, teamId) };
}

export function postObservation(ctx: Ctx) {
  const body = bodyObject(ctx);
  const playerId = fieldInt(body, "player_id");
  playerOr404(ctx, playerId);
  const value = moneyField(body, "value"), wage = moneyField(body, "wage");
  if (value === null && wage === null) throw unprocessable([{ type: "missing", loc: ["body", "value"], msg: "Cần ít nhất một trong hai: value, wage" }]);
  return new Created(addObservation(ctx.store, { player_id: playerId, value, wage }));
}

export function deleteObservation(ctx: Ctx) {
  const id = pathInt(ctx, "observation_id");
  const m = ctx.store.user.manager;
  if (!m.observations.some((o) => o.id === id)) throw notFound("Không tìm thấy số hiệu chỉnh");
  m.observations = m.observations.filter((o) => o.id !== id);
  ctx.store.touch();
  return { ok: true };
}

const KINDS: OfferKind[] = ["fee", "wage"];
const RESULTS: OfferResult[] = ["accepted", "rejected", "counter"];

export function postOffer(ctx: Ctx) {
  const body = bodyObject(ctx);
  const playerId = fieldInt(body, "player_id");
  playerOr404(ctx, playerId);
  const kind = fieldStr(body, "kind") as OfferKind;
  if (!KINDS.includes(kind)) throw unprocessable([{ type: "enum", loc: ["body", "kind"], msg: `kind phải là một trong: ${KINDS.join(", ")}` }]);
  const result = fieldStr(body, "result") as OfferResult;
  if (!RESULTS.includes(result)) throw unprocessable([{ type: "enum", loc: ["body", "result"], msg: `result phải là một trong: ${RESULTS.join(", ")}` }]);
  const amount = moneyField(body, "amount", true)!;
  const counter = moneyField(body, "counter");
  if (result === "counter" && counter === null) throw unprocessable([{ type: "missing", loc: ["body", "counter"], msg: "Cần số tiền bên kia ra lại" }]);
  let pkg: PackageBreakdown | null = null;
  if (body.package !== undefined && body.package !== null) {
    const b = body.package as Record<string, unknown>;
    if (typeof b !== "object" || Array.isArray(b)) throw unprocessable([{ type: "dict_type", loc: ["body", "package"], msg: "package phải là một đối tượng" }]);
    const num = (k: string) => (typeof b[k] === "number" && Number.isFinite(b[k]) && (b[k] as number) >= 0 && (b[k] as number) <= MAX_MONEY ? Math.round(b[k] as number) : 0);
    const swap = Array.isArray(b.swap_ids) ? b.swap_ids.filter((x): x is number => Number.isInteger(x) && ctx.store.data.players.has(x)).slice(0, 3) : [];
    pkg = { cash: num("cash"), swap_ids: swap, addons: num("addons"), sell_on_percent: Math.min(50, num("sell_on_percent")), sign_on: num("sign_on") };
  }
  return new Created(addOffer(ctx.store, effectiveUserTeam(ctx.store).teamId, { player_id: playerId, kind, amount, result, counter: result === "counter" ? counter : null }, pkg));
}

export function deleteOffer(ctx: Ctx) {
  const id = pathInt(ctx, "offer_id");
  const m = ctx.store.user.manager;
  if (!m.offers.some((o) => o.id === id)) throw notFound("Không tìm thấy đề nghị");
  m.offers = m.offers.filter((o) => o.id !== id);
  ctx.store.touch();
  return { ok: true };
}
