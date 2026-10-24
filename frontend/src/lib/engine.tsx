"use client";

// Cầu nối giữa giao diện và engine chạy trong trình duyệt: máy chủ ảo trả về cùng JSON như API FastAPI.
// Mọi lời gọi fetch("/api/...") của các component được chuyển thẳng vào engine nên không cần máy chủ nào.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { handleRequest, type ApiResponse } from "@/engine/api";
import { loadDataset, type DatasetMeta, type PlayersDataset } from "@/engine/dataset";
import { runImport, type FileMap, type TableReport } from "@/engine/importer";
import { restoreUser, serializeUser } from "@/engine/backup";
import { clearSaved, loadStore, saveGame, saveUser } from "@/engine/persist";
import "@/engine/routes/register";
import { Store } from "@/engine/store";
import { IS_DESKTOP_BUILD } from "@/lib/target";

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

/** Bản web: nạp bộ dữ liệu cầu thủ công khai (public/data/players.json) vào cùng engine để dùng lại các route phân tích. */
let webLoading: Promise<DatasetMeta> | null = null;
function bootWeb(): Promise<DatasetMeta> {
  installFetchBridge();
  webLoading ??= (async () => {
    const res = await fetch("/data/players.json");
    if (!res.ok) throw new Error(`Không tải được dữ liệu cầu thủ (HTTP ${res.status})`);
    const meta = loadDataset(store, (await res.json()) as PlayersDataset);
    datasetMeta = meta;
    phase = "ready";
    notify();
    return meta;
  })().catch((e) => {
    webLoading = null;
    throw e;
  });
  return webLoading;
}

let datasetMeta: DatasetMeta | null = null;
/** Thông tin bộ dữ liệu công khai (ngày xuất, ngày tham chiếu); null nếu chưa nạp hoặc đang ở ứng dụng. */
export const getDatasetMeta = () => datasetMeta;

let nationsCache: Promise<Map<number, string>> | null = null;
/** Tên quốc gia theo id (public/data/nations.json); rỗng nếu không có file. */
export function loadNations(): Promise<Map<number, string>> {
  nationsCache ??= fetch("/data/nations.json")
    .then((r) => (r.ok ? (r.json() as Promise<Record<string, string>>) : {}))
    .catch(() => ({} as Record<string, string>))
    .then((o) => new Map(Object.entries(o).map(([k, v]) => [Number(k), v])));
  return nationsCache;
}

export function useNations(): Map<number, string> {
  const [m, setM] = useState<Map<number, string>>(new Map());
  useEffect(() => {
    let alive = true;
    void loadNations().then((n) => alive && setM(n));
    return () => void (alive = false);
  }, []);
  return m;
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

/** Bản web chỉ có cẩm nang và trang tải; mọi trang công cụ phân tích chỉ có trong ứng dụng Windows. */
const WEB_PATHS = ["/cam-nang", "/huong-dan", "/tai-ung-dung"];
/** Trang xem cầu thủ dùng bộ dữ liệu công khai nên cần nạp trước khi hiển thị. */
const DATASET_PATHS = ["/cau-thu", "/player"];
const inPaths = (paths: string[], pathname: string) => paths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
const isWebPath = (pathname: string) => pathname === "/" || inPaths(WEB_PATHS, pathname);

function DatasetGate({ children }: { children: ReactNode }) {
  const v = useDataVersion();
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    bootWeb().catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);
  if (error) return <p className="p-6 text-red-600">{error}</p>;
  if (phase !== "ready") return <p className="p-6 text-zinc-500" data-v={v}>Đang tải dữ liệu cầu thủ (vài MB, chỉ tải một lần)…</p>;
  return <GateContext.Provider value>{children}</GateContext.Provider>;
}

function WebGate({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  if (isWebPath(pathname)) return <>{children}</>;
  if (inPaths(DATASET_PATHS, pathname)) return <DatasetGate>{children}</DatasetGate>;
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <div className="rounded border border-zinc-200 p-6 dark:border-zinc-800">
        <h1 className="text-xl font-semibold">Tính năng này nằm trong ứng dụng Windows</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Trang web chỉ có cẩm nang. Việc phân tích đối thủ từ dữ liệu save của bạn do ứng dụng cài trên máy làm, để dữ liệu không rời máy bạn.
        </p>
        <p className="mt-4 flex flex-wrap gap-3 text-sm">
          <Link href="/tai-ung-dung" className="rounded bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700">Tải ứng dụng</Link>
          <Link href="/cam-nang" className="rounded border border-zinc-300 px-4 py-2 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900">Đọc cẩm nang</Link>
        </p>
      </div>
    </main>
  );
}

/** Chờ nạp dữ liệu đã lưu rồi mới hiển thị trang; chưa có dữ liệu thì dẫn tới trang nhập. */
function DesktopGate({ children }: { children: ReactNode }) {
  const v = useDataVersion();
  const pathname = usePathname() ?? "/";
  useEffect(() => void boot(), []);
  if (phase !== "ready") return <p className="p-6 text-zinc-500">Đang mở dữ liệu…</p>;
  const open = pathname === "/" || pathname.startsWith("/import") || isWebPath(pathname);
  if (!hasData() && !open) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12" data-v={v}>
        <p className="rounded border border-amber-500/50 bg-amber-500/10 p-4">
          Chưa có dữ liệu. <Link href="/import" className="underline">Nhập file xuất từ game</Link> trước nhé.
        </p>
      </main>
    );
  }
  return <GateContext.Provider value>{children}</GateContext.Provider>;
}

export function EngineGate({ children }: { children: ReactNode }) {
  return IS_DESKTOP_BUILD ? <DesktopGate>{children}</DesktopGate> : <WebGate>{children}</WebGate>;
}
