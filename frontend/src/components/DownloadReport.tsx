"use client";

import { callApi } from "@/lib/engine";

/** Tải báo cáo Markdown do engine tạo ngay trong trình duyệt (không có máy chủ để trỏ link tới). */
export function DownloadReport({ path, label = "Tải báo cáo (.md)" }: { path: string; label?: string }) {
  function download() {
    const res = callApi("GET", path);
    if (res.status >= 400 || res.text === undefined) return;
    const filename = /filename="([^"]+)"/.exec(res.headers["content-disposition"] ?? "")?.[1] ?? "bao-cao.md";
    const url = URL.createObjectURL(new Blob([res.text], { type: "text/markdown;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <button type="button" onClick={download} className="underline hover:no-underline">
      {label}
    </button>
  );
}
