"use client";

// Cầu nối giữa giao diện và engine chạy trong trình duyệt: máy chủ ảo trả về cùng JSON như API FastAPI.
// Mọi lời gọi fetch("/api/...") của các component được chuyển thẳng vào engine nên không cần máy chủ nào.
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { handleRequest, type ApiResponse } from "@/engine/api";
import { runImport, type FileMap, type TableReport } from "@/engine/importer";
import { restoreUser, serializeUser } from "@/engine/backup";
import { clearSaved, loadStore, saveGame, saveUser } from "@/engine/persist";
import "@/engine/routes/register";
import { Store } from "@/engine/store";

export const store = new Store();

type Phase = "loading" | "ready";
let phase: Phase = "loading";
let version = 0;
const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => (listeners.add(cb), () => void listeners.delete(cb));
const notify = () => {
  version++;
  listeners.forEach((l) => l());
};

// Lưu ngay sau mỗi thay đổi (không trì hoãn, tránh mất dữ liệu khi đóng tab ngay sau khi bấm lưu); gộp các lần đổi dồn dập.
let saving = false;
let dirty = false;
async function flushUser(): Promise<void> {
  if (saving) {
    dirty = true;
    return;
  }
  saving = true;
  do {
    dirty = false;
    await saveUser(store).catch(() => undefined);
  } while (dirty);
  saving = false;
}
store.onChange = () => void flushUser();

/** Gọi engine như gọi API: trả về {status, json|text}. Lỗi bất ngờ trong engine được đổi thành 500 thay vì làm sập trang. */
export function callApi(method: string, path: string, body?: unknown): ApiResponse {
  try {
    return handleRequest(store, method, path, body);
  } catch (e) {
    return { status: 500, json: { detail: e instanceof Error ? e.message : String(e) }, headers: {} };
  }
}

let installed = false;
function installFetchBridge(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;
  const original = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const m = /^(?:https?:\/\/[^/]+)?\/api(\/.*)$/.exec(url);
    if (!m) return original(input, init);
    const method = (init?.method ?? (typeof input === "object" && "method" in input ? input.method : "GET")).toUpperCase();
    let body: unknown;
    if (typeof init?.body === "string" && init.body) {
      try { body = JSON.parse(init.body); } catch { body = undefined; }
    }
    const res = callApi(method, m[1], body);
    if (method !== "GET" && res.status < 400) notify();
    if (res.text !== undefined) return new Response(res.text, { status: res.status, headers: res.headers });
    return new Response(JSON.stringify(res.json), { status: res.status, headers: { "content-type": "application/json", ...res.headers } });
  };
}

let booting: Promise<void> | null = null;
function boot(): Promise<void> {
  installFetchBridge();
  booting ??= loadStore(store).then(() => {
    phase = "ready";
    notify();
  });
  return booting;
}

/** Nhập các file CSV (tên file chữ thường -> nội dung), lưu lại vào trình duyệt, làm mới mọi trang đang mở. */
export async function importFiles(files: FileMap): Promise<TableReport[]> {
  const reports = runImport(store, files);
  await Promise.all([saveGame(store), saveUser(store)]);
  notify();
  return reports;
}

/** Xóa toàn bộ dữ liệu đã lưu trong trình duyệt (cả dữ liệu game lẫn ghi chú cá nhân). */
export async function wipeAll(): Promise<void> {
  await clearSaved();
  const fresh = new Store();
  store.data = fresh.data;
  store.user = fresh.user;
  store.reindex();
  notify();
}

/** Nội dung file sao lưu dữ liệu cá nhân. */
export const backupUserData = () => serializeUser(store);

/** Khôi phục dữ liệu cá nhân từ file sao lưu. */
export async function restoreUserData(text: string): Promise<void> {
  restoreUser(store, text);
  await saveUser(store);
  notify();
}

export const isEngineReady = () => phase === "ready";

export const hasData = () => store.data.teams.size > 0;

export function useDataVersion(): number {
  return useSyncExternalStore(subscribe, () => version, () => 0);
}

export type ApiState<T> = { status: number; data: T | null };

/** Đọc dữ liệu từ engine; tự tính lại khi dữ liệu đổi (nhập mới, ghi chú, kết quả...). */
export function useApi<T>(path: string | null): ApiState<T> | null {
  const v = useDataVersion();
  return useMemo(() => {
    if (path === null || phase !== "ready") return null;
    const res = callApi("GET", path);
    return { status: res.status, data: res.status < 400 ? ((res.json ?? res.text) as T) : null };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, v]);
}

const GateContext = createContext(false);
export const useEngineReady = () => useContext(GateContext);

/** Chờ nạp dữ liệu đã lưu rồi mới hiển thị trang; chưa có dữ liệu thì dẫn tới trang nhập. */
export function EngineGate({ children }: { children: ReactNode }) {
  const v = useDataVersion();
  const pathname = usePathname() ?? "/";
  useEffect(() => void boot(), []);
  if (phase !== "ready") return <p className="p-6 text-zinc-500">Đang mở dữ liệu…</p>;
  const open = pathname === "/" || pathname.startsWith("/import");
  if (!hasData() && !open) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12" data-v={v}>
        <p className="rounded border border-amber-500/50 bg-amber-500/10 p-4">
          Chưa có dữ liệu. <a href="/import" className="underline">Nhập file xuất từ game</a> trước nhé.
        </p>
      </main>
    );
  }
  return <GateContext.Provider value>{children}</GateContext.Provider>;
}
