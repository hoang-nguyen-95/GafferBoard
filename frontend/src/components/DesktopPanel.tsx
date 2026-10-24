"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { getDesktop, useSyncStatus } from "@/lib/desktop";

/** Cài đặt đồng bộ của ứng dụng desktop: thư mục xuất, thư mục Live Editor, cài script, trạng thái nhập. */
export function DesktopPanel() {
  const api = useSyncExternalStore(() => () => undefined, getDesktop, () => null);
  const [state, setState] = useState<DesktopState | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const sync = useSyncStatus();

  // đọc trạng thái lúc mở và đếm lại số file CSV mỗi khi việc nhập có tiến triển
  useEffect(() => {
    void api?.getState().then(setState);
  }, [api, sync.at]);

  if (!api) return null;
  const btn = "rounded border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900";
  const primary = "rounded bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700";
  return (
    <section className="space-y-4 rounded-lg border border-emerald-600/40 bg-emerald-500/5 p-5">
      <div>
        <h2 className="font-semibold">Tự động cập nhật từ Live Editor</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Chọn thư mục chứa file CSV xuất từ game. Ứng dụng tự nhập và phân tích mỗi khi có file mới, không cần kéo thả.
        </p>
      </div>

      <div className="space-y-1 text-sm">
        <p>
          <b>Thư mục xuất:</b> {state?.exportDir ? <code>{state.exportDir}</code> : <span className="text-zinc-500">chưa chọn</span>}
          {state?.exportDir && <span className="text-zinc-500"> · {state.csvCount} file CSV</span>}
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={state?.exportDir ? btn : primary} onClick={async () => setState(await api.chooseExportDir())}>
            {state?.exportDir ? "Đổi thư mục" : "Chọn thư mục xuất…"}
          </button>
          {state?.exportDir && <button type="button" className={btn} onClick={() => void api.openFolder()}>Mở thư mục</button>}
          {state?.exportDir && <button type="button" className={btn} onClick={async () => setState(await api.rescan())}>Nhập lại toàn bộ</button>}
        </div>
      </div>

      <div className="space-y-1 text-sm">
        <p>
          <b>Thư mục Live Editor:</b> {state?.leDir ? <code>{state.leDir}</code> : <span className="text-zinc-500">chưa chọn (không bắt buộc)</span>}
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btn} onClick={async () => setState(await api.chooseLeDir())}>
            {state?.leDir ? "Đổi thư mục Live Editor" : "Chọn thư mục Live Editor…"}
          </button>
          {state?.leDir && state.exportDir && (
            <button type="button" className={btn} onClick={async () => setMessage((await api.installScript()).message)}>
              Cài script xuất vào Live Editor
            </button>
          )}
        </div>
        <p className="text-xs text-zinc-500">
          Script được chép sẵn với đúng thư mục xuất ở trên. Trong Live Editor chỉ cần vào Features → Lua Engine, chọn script
          <code> counterpick_export.lua</code> và Execute.
        </p>
        {message && <p className="text-xs">{message}</p>}
      </div>

      <p className={`text-sm ${sync.kind === "error" ? "text-red-600" : sync.kind === "ok" ? "text-emerald-700 dark:text-emerald-400" : "text-zinc-500"}`}>
        {sync.kind === "idle" && (state?.exportDir ? "Đang theo dõi thư mục, chưa có file mới." : "Chưa theo dõi thư mục nào.")}
        {sync.kind !== "idle" && sync.message}
        {sync.at && sync.kind !== "importing" && ` · ${new Date(sync.at).toLocaleTimeString("vi-VN")}`}
      </p>
    </section>
  );
}
