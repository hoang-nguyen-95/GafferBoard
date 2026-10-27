"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { getDesktop, useSyncStatus } from "@/lib/desktop";

/** Cài đặt đồng bộ của ứng dụng desktop: thư mục xuất, thư mục Live Editor, cài script, trạng thái nhập. */
export function DesktopPanel() {
  const api = useSyncExternalStore(() => () => undefined, getDesktop, () => null);
  const [state, setState] = useState<DesktopState | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [report, setReport] = useState<{ count: number; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const sync = useSyncStatus();

  // đọc trạng thái lúc mở, mỗi khi việc nhập có tiến triển, và định kỳ (để thấy nhịp tim của script xuất lặp)
  useEffect(() => {
    void api?.getState().then(setState);
  }, [api, sync.at]);
  useEffect(() => {
    if (!api) return;
    const timer = setInterval(() => void api.getState().then(setState), 5000);
    return () => clearInterval(timer);
  }, [api]);

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

      {state?.exportDir && (
        <div className="space-y-2 rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-800">
          <p className="font-medium">Các bảng chưa dùng (hợp đồng, chuyển nhượng, tuyển trạch…)</p>
          <p className="text-xs text-zinc-500">
            Script xuất còn có các bảng ứng dụng chưa đọc. Bấm để xem tên cột và vài dòng mẫu rồi sao chép gửi cho người phát triển: từ đó mới thêm được giá trị chuyển nhượng và lương.
          </p>
          <button type="button" className={btn} onClick={async () => { setCopied(false); const r = await api.describeExports(); setReport({ count: r.count, text: r.text }); }}>
            Xem cấu trúc các bảng chưa dùng
          </button>
          {report && (
            <>
              <textarea readOnly aria-label="Báo cáo các bảng chưa dùng" value={report.text} rows={12}
                className="w-full rounded border border-zinc-300 bg-white p-2 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-950" />
              <button type="button" className={btn} onClick={async () => { await navigator.clipboard.writeText(report.text); setCopied(true); }}>
                {copied ? "Đã sao chép" : "Sao chép báo cáo"}
              </button>
            </>
          )}
        </div>
      )}

      <div className="space-y-1 text-sm">
        <p>
          <b>Thư mục Live Editor:</b> {state?.leDir ? <code>{state.leDir}</code> : <span className="text-zinc-500">chưa tìm thấy, bạn có thể chọn tay</span>}
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btn} onClick={async () => setState(await api.chooseLeDir())}>
            {state?.leDir ? "Đổi thư mục Live Editor" : "Chọn thư mục Live Editor…"}
          </button>
          {state?.leDir && state.exportDir && (
            <button type="button" className={btn} onClick={async () => setMessage((await api.installScript()).message)}>
              Cài các script xuất vào Live Editor
            </button>
          )}
        </div>
        <p className="text-xs text-zinc-500">
          Ứng dụng tự cập nhật script mỗi khi mở. Muốn xuất một lần bằng tay: Live Editor → Features → Lua Engine, chọn
          <code> counterpick_export.lua</code> và Execute.
        </p>
        {message && <p className="text-xs">{message}</p>}
      </div>

      {state?.exportDir && (
        <div className="space-y-2 rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-800">
          <p className="font-medium">Tự động xuất khi chơi</p>
          <p className="text-xs text-zinc-500">
            Ứng dụng tự tìm Live Editor và chép script <code>counterpick_auto.lua</code> (vào cả thư mục <code>lua/autorun</code> để chạy mỗi khi mở game).
            Khi bạn chơi Career, script tự xuất lại dữ liệu sau mỗi ngày, trận đấu hay thương vụ, kèm ngân sách chuyển nhượng và ngày trong game. Không cần bấm gì trong Live Editor.
          </p>
          <p className={state.setup?.scriptDir || state.setup?.autorunDirs.length ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"}>
            {state.setup?.scriptDir || state.setup?.autorunDirs.length
              ? `Đã cài script${state.setup.autorunDirs.length ? " (có autorun)" : ""}${state.setup.written ? `, vừa cập nhật ${state.setup.written} file` : ""}.`
              : "Chưa tìm thấy Live Editor trên máy: hãy chọn thư mục Live Editor ở dưới."}
          </p>
          {state.setup?.errors.length ? <p className="text-xs text-red-600">{state.setup.errors.join(" · ")}</p> : null}
          <p className={state.lastExport ? "text-emerald-700 dark:text-emerald-400" : "text-zinc-500"}>
            {state.lastExport
              ? `Dữ liệu từ game cập nhật lần cuối ${state.lastExport.ageSeconds < 90 ? `${state.lastExport.ageSeconds} giây` : `${Math.round(state.lastExport.ageSeconds / 60)} phút`} trước.`
              : "Chưa nhận dữ liệu từ script tự động. Mở game, vào Career rồi chơi/qua một ngày. Nếu Live Editor không tự chạy autorun: Lua Engine → counterpick_auto.lua → Execute một lần mỗi phiên."}
          </p>
          <button type="button" className={btn} onClick={async () => setMessage((await api.requestExport()).message)}>
            Yêu cầu xuất lại ngay
          </button>
          <p className="text-xs text-zinc-500">Tạo file <code>stop.txt</code> trong thư mục xuất để tạm dừng, xóa đi để chạy tiếp.</p>
        </div>
      )}

      <p className={`text-sm ${sync.kind === "error" ? "text-red-600" : sync.kind === "ok" ? "text-emerald-700 dark:text-emerald-400" : "text-zinc-500"}`}>
        {sync.kind === "idle" && (state?.exportDir ? "Đang theo dõi thư mục, chưa có file mới." : "Chưa theo dõi thư mục nào.")}
        {sync.kind !== "idle" && sync.message}
        {sync.at && sync.kind !== "importing" && ` · ${new Date(sync.at).toLocaleTimeString("vi-VN")}`}
      </p>
    </section>
  );
}
