"use client";

// Phần chỉ có ở ứng dụng desktop: tự nhập file khi thư mục xuất của Live Editor thay đổi.
import { useEffect, useSyncExternalStore } from "react";
import { hasData, importFiles, isEngineReady, useDataVersion } from "@/lib/engine";

export type SyncStatus = { kind: "idle" | "importing" | "ok" | "error"; message: string; at: number | null };

let status: SyncStatus = { kind: "idle", message: "", at: null };
const listeners = new Set<() => void>();
function setStatus(next: SyncStatus) {
  status = next;
  listeners.forEach((l) => l());
}
const subscribe = (cb: () => void) => (listeners.add(cb), () => void listeners.delete(cb));

export const useSyncStatus = (): SyncStatus => useSyncExternalStore(subscribe, () => status, () => status);

export function getDesktop(): DesktopApi | null {
  return typeof window !== "undefined" && window.desktop ? window.desktop : null;
}

let chain: Promise<void> = Promise.resolve();

/** Nhập tuần tự các lô file (không chồng nhau), báo kết quả cho tiến trình chính để file không đổi không bị nhập lại. */
function handleBatch(api: DesktopApi, batch: DesktopFile[]) {
  chain = chain.then(async () => {
    const names = batch.map((b) => b.name).join(", ");
    setStatus({ kind: "importing", message: `Đang nhập ${batch.length} file: ${names}`, at: Date.now() });
    await new Promise((r) => setTimeout(r, 30)); // cho giao diện kịp vẽ trạng thái trước khi tính toán nặng
    try {
      await importFiles(new Map(batch.map((b) => [b.name, b.text])));
      api.acknowledge(batch.map((b) => ({ name: b.name, sig: b.sig, ok: true })));
      setStatus({ kind: "ok", message: `Đã cập nhật từ ${batch.length} file (${names})`, at: Date.now() });
    } catch (e) {
      // Không nhập được (vd file ghi dở hoặc sai cấu trúc): KHÔNG báo thành công, chờ file đổi lần nữa hoặc bấm "Quét lại".
      api.acknowledge(batch.map((b) => ({ name: b.name, sig: b.sig, ok: false })));
      setStatus({ kind: "error", message: e instanceof Error ? e.message : "Không nhập được dữ liệu.", at: Date.now() });
    }
  });
}

/** Gắn một lần ở layout: chờ engine mở xong rồi bắt đầu nhận file từ thư mục xuất. */
export function DesktopSync() {
  useDataVersion();
  const ready = isEngineReady();
  useEffect(() => {
    const api = getDesktop();
    if (!api || !ready) return;
    const off = api.onFiles((batch) => handleBatch(api, batch));
    void api.ready(hasData());
    return off;
  }, [ready]);
  return null;
}
