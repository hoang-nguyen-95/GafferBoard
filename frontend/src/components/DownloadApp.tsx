"use client";

import { useSyncExternalStore } from "react";
import { getDesktop } from "@/lib/desktop";
import { DESKTOP_DOWNLOAD_URL } from "@/lib/links";

/** Gợi ý tải ứng dụng Windows (tự đọc thư mục xuất từ Live Editor). Ẩn khi đang chạy chính ứng dụng đó. */
export function DownloadApp() {
  const inDesktop = useSyncExternalStore(() => () => undefined, () => getDesktop() !== null, () => false);
  if (inDesktop) return null;
  return (
    <section className="rounded-lg border border-zinc-200 p-4 text-sm dark:border-zinc-800">
      <h2 className="font-semibold">Không muốn kéo thả file mỗi lần?</h2>
      <p className="mt-1 text-zinc-500">
        Ứng dụng Windows dùng đúng giao diện này nhưng tự đọc thư mục xuất từ Live Editor: có file mới là tự cập nhật.
        Ứng dụng chưa có chữ ký số nên Windows sẽ cảnh báo &ldquo;Unknown publisher&rdquo; khi mở lần đầu (bấm More info → Run anyway).
      </p>
      <a href={DESKTOP_DOWNLOAD_URL} target="_blank" rel="noreferrer" className="mt-3 inline-block rounded bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700">
        Tải ứng dụng Windows
      </a>
    </section>
  );
}
