// "Máy chủ ảo" chạy trong trình duyệt: nhận (method, đường dẫn, body) và trả JSON đúng như API FastAPI của backend.
import { Created, HttpError, TextResult, type Ctx, type Handler } from "./http";
import * as home from "./routes/home";
import * as read from "./routes/read";
import type { Store } from "./store";

interface Route { method: string; pattern: RegExp; keys: string[]; handler: Handler }
const routes: Route[] = [];

function route(method: string, path: string, handler: Handler): void {
  const keys: string[] = [];
  const src = path.replace(/\{(\w+)\}/g, (_, k: string) => { keys.push(k); return "([^/]+)"; });
  routes.push({ method, pattern: new RegExp(`^${src}$`), keys, handler });
}

route("GET", "/health", () => ({ status: "ok" }));
route("GET", "/meta", home.getMeta);
route("PUT", "/settings/user-team", home.putUserTeam);
route("PUT", "/settings/opponent", home.putOpponent);
route("GET", "/next-match", home.getNextMatch);
route("GET", "/leagues", read.listLeagues);
route("GET", "/teams", read.listTeams);
route("GET", "/teams/{team_id}", read.getTeam);
route("GET", "/teams/{team_id}/overview", read.teamOverview);
route("GET", "/players", read.listPlayers);
route("GET", "/players/{player_id}", read.getPlayer);
route("GET", "/players/{player_id}/analysis", read.playerAnalysis);
route("GET", "/formations", read.listFormations);

export interface ApiResponse { status: number; json?: unknown; text?: string; headers: Record<string, string> }

export function registerRoute(method: string, path: string, handler: Handler): void {
  route(method, path, handler);
}

/** Xử lý một yêu cầu như FastAPI: 404 cho đường dẫn lạ, 405 sai phương thức, lỗi nghiệp vụ -> {detail}. */
export function handleRequest(store: Store, method: string, rawPath: string, body?: unknown): ApiResponse {
  const url = new URL(rawPath, "http://engine.local");
  const path = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, "") : url.pathname;
  let pathMatched = false;
  for (const r of routes) {
    const m = r.pattern.exec(path);
    if (!m) continue;
    pathMatched = true;
    if (r.method !== method.toUpperCase()) continue;
    const params: Record<string, string> = {};
    r.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1])));
    const ctx: Ctx = { store, params, query: url.searchParams, body };
    try {
      const out = r.handler(ctx);
      if (out instanceof TextResult) return { status: 200, text: out.text, headers: { "content-type": "text/markdown; charset=utf-8", ...out.headers } };
      if (out instanceof Created) return { status: 201, json: out.value, headers: {} };
      return { status: 200, json: out, headers: {} };
    } catch (e) {
      if (e instanceof HttpError) return { status: e.status, json: { detail: e.detail }, headers: {} };
      throw e;
    }
  }
  return pathMatched ? { status: 405, json: { detail: "Method Not Allowed" }, headers: {} } : { status: 404, json: { detail: "Not Found" }, headers: {} };
}
