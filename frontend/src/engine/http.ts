// Lớp HTTP ảo: cùng mã lỗi và thông điệp như FastAPI để giao diện không phân biệt được hai bản.
import type { Store } from "./store";

export class HttpError extends Error {
  constructor(public status: number, public detail: unknown) {
    super(typeof detail === "string" ? detail : JSON.stringify(detail));
  }
}

export const notFound = (detail: string) => new HttpError(404, detail);
export const unprocessable = (detail: string | unknown) => new HttpError(422, detail);

/** Kết quả văn bản (báo cáo Markdown) kèm header. */
export class TextResult {
  constructor(public text: string, public headers: Record<string, string> = {}) {}
}

/** Bọc kết quả để trả mã 201 (tạo mới), như `status_code=201` của FastAPI. */
export class Created {
  constructor(public value: unknown) {}
}

export interface Ctx {
  store: Store;
  params: Record<string, string>;
  query: URLSearchParams;
  body: unknown;
}

export type Handler = (ctx: Ctx) => unknown;

const INT_RE = /^\s*[+-]?\d+\s*$/;

export function parseInt422(raw: string, where = "path"): number {
  if (!INT_RE.test(raw)) throw unprocessable([{ type: "int_parsing", loc: [where], msg: "Input should be a valid integer" }]);
  return Number(raw);
}

export function queryInt(q: URLSearchParams, name: string, opts: { min?: number; max?: number; def?: number } = {}): number | undefined {
  const raw = q.get(name);
  if (raw === null) return opts.def;
  const v = parseInt422(raw, "query");
  if ((opts.min !== undefined && v < opts.min) || (opts.max !== undefined && v > opts.max)) {
    throw unprocessable([{ type: "range", loc: ["query", name], msg: "Input out of range" }]);
  }
  return v;
}

export function pathInt(ctx: Ctx, name: string): number {
  return parseInt422(ctx.params[name], "path");
}

/** Lấy body JSON dạng đối tượng, nếu không thì 422 như FastAPI. */
export function bodyObject(ctx: Ctx): Record<string, unknown> {
  if (typeof ctx.body !== "object" || ctx.body === null || Array.isArray(ctx.body)) {
    throw unprocessable([{ type: "missing", loc: ["body"], msg: "Field required" }]);
  }
  return ctx.body as Record<string, unknown>;
}

/** Số nguyên tùy chọn trong body (null/thiếu -> null); sai kiểu -> 422. */
export function bodyOptInt(obj: Record<string, unknown>, key: string): number | null {
  const v = obj[key];
  if (v === undefined || v === null) return null;
  if (typeof v === "number" && Number.isInteger(v)) return v;
  if (typeof v === "string" && INT_RE.test(v)) return Number(v);
  throw unprocessable([{ type: "int_parsing", loc: ["body", key], msg: "Input should be a valid integer" }]);
}

// ---- kiểm tra body như pydantic (thông điệp 422 cùng dạng {type, loc, msg}) ----
const missing = (key: string) => unprocessable([{ type: "missing", loc: ["body", key], msg: "Field required" }]);
const invalid = (key: string, type: string, msg: string) => unprocessable([{ type, loc: ["body", key], msg }]);

export function fieldInt(obj: Record<string, unknown>, key: string, opts: { min?: number; max?: number } = {}): number {
  const v = obj[key];
  if (v === undefined) throw missing(key);
  let n: number | null = null;
  if (typeof v === "number" && Number.isInteger(v)) n = v;
  else if (typeof v === "string" && INT_RE.test(v)) n = Number(v);
  if (n === null) throw invalid(key, "int_parsing", "Input should be a valid integer");
  if (opts.min !== undefined && n < opts.min) throw invalid(key, "greater_than_equal", `Input should be greater than or equal to ${opts.min}`);
  if (opts.max !== undefined && n > opts.max) throw invalid(key, "less_than_equal", `Input should be less than or equal to ${opts.max}`);
  return n;
}

export function fieldStr(obj: Record<string, unknown>, key: string, opts: { min?: number; max?: number; optional?: boolean } = {}): string | null {
  const v = obj[key];
  if (v === undefined || (v === null && opts.optional)) {
    if (opts.optional) return null;
    throw missing(key);
  }
  if (typeof v !== "string") throw invalid(key, "string_type", "Input should be a valid string");
  const len = [...v].length;
  if (opts.min !== undefined && len < opts.min) throw invalid(key, "string_too_short", `String should have at least ${opts.min} character${opts.min === 1 ? "" : "s"}`);
  if (opts.max !== undefined && len > opts.max) throw invalid(key, "string_too_long", `String should have at most ${opts.max} characters`);
  return v;
}

export function fieldDate(obj: Record<string, unknown>, key: string): string | null {
  const v = obj[key];
  if (v === undefined || v === null) return null;
  const ok = typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`)) && new Date(`${v}T00:00:00Z`).toISOString().startsWith(v);
  if (!ok) throw invalid(key, "date_from_datetime_parsing", "Input should be a valid date or datetime");
  return v as string;
}

export function fieldBool(obj: Record<string, unknown>, key: string): boolean | null {
  const v = obj[key];
  if (v === undefined || v === null) return null;
  if (typeof v === "boolean") return v;
  if (v === 1 || v === "true" || v === "1") return true;
  if (v === 0 || v === "false" || v === "0") return false;
  throw invalid(key, "bool_parsing", "Input should be a valid boolean");
}

/** Số nguyên bắt buộc trong query (thiếu -> 422 như `Query(...)`). */
export function requiredQueryInt(q: URLSearchParams, name: string): number {
  const raw = q.get(name);
  if (raw === null) throw unprocessable([{ type: "missing", loc: ["query", name], msg: "Field required" }]);
  return parseInt422(raw, "query");
}
