"use client";

import { useState } from "react";
import { callApi } from "@/lib/engine";
import { DEFAULT_MODEL, explainReport, LlmError } from "@/lib/llm";

const KEY = "counterpick.llm";

function readSaved(): { apiKey: string; model: string } {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "null");
    return { apiKey: saved?.apiKey ?? "", model: saved?.model ?? DEFAULT_MODEL };
  } catch {
    return { apiKey: "", model: DEFAULT_MODEL };
  }
}

/** Diễn giải bằng LLM: tùy chọn, mặc định đóng. Báo cáo chỉ rời trình duyệt khi bạn bấm nút, và đi thẳng tới Claude API. */
export function LlmPanel({ reportPath }: { reportPath: string }) {
  const [saved] = useState(readSaved);
  const [apiKey, setApiKey] = useState(saved.apiKey);
  const [model, setModel] = useState(saved.model);
  const [remember, setRemember] = useState(saved.apiKey !== "");
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function explain() {
    setBusy(true);
    setError(null);
    setText(null);
    try {
      try {
        localStorage.setItem(KEY, JSON.stringify(remember ? { apiKey, model } : { model }));
      } catch {
        /* trình duyệt chặn lưu trữ: bỏ qua */
      }
      const report = callApi("GET", reportPath);
      if (report.status >= 400 || report.text === undefined) throw new LlmError("Không dựng được báo cáo để gửi.");
      const out = await explainReport(report.text, apiKey, model.trim() || DEFAULT_MODEL);
      setText(out.text + (out.truncated ? "\n\n(Câu trả lời bị cắt do giới hạn độ dài.)" : ""));
    } catch (e) {
      setError(e instanceof LlmError ? e.message : "Có lỗi khi gọi Claude API.");
    } finally {
      setBusy(false);
    }
  }

  const input = "rounded border border-zinc-300 bg-transparent px-2 py-1 text-sm text-current dark:border-zinc-700";
  return (
    <details className="mt-10 rounded border border-zinc-200 p-4 text-sm dark:border-zinc-800">
      <summary className="cursor-pointer font-semibold">Diễn giải bằng LLM (tùy chọn)</summary>
      <div className="mt-3 space-y-3">
        <p className="text-xs text-amber-600">
          Khi bạn bấm “Diễn giải”, nội dung báo cáo (số liệu đội, cầu thủ và ghi chú cá nhân của đội này) được gửi thẳng từ trình
          duyệt tới Claude API của Anthropic bằng khóa của bạn. Không có máy chủ trung gian. Không bấm thì không có gì rời khỏi máy.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col text-xs text-zinc-500">
            Khóa API Anthropic
            <input type="password" autoComplete="off" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-ant-…" className={`w-72 ${input}`} />
          </label>
          <label className="flex flex-col text-xs text-zinc-500">
            Mô hình
            <input value={model} onChange={(e) => setModel(e.target.value)} className={`w-48 ${input}`} />
          </label>
        </div>
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          Nhớ khóa trên trình duyệt này (lưu trong localStorage; đừng bật trên máy dùng chung)
        </label>
        <button onClick={explain} disabled={busy || !apiKey.trim()} className="rounded bg-emerald-600 px-3 py-1.5 text-white hover:bg-emerald-700 disabled:opacity-50">
          {busy ? "Đang diễn giải…" : "Diễn giải báo cáo này"}
        </button>
        {error && <p className="text-red-600">{error}</p>}
        {text && <div className="whitespace-pre-wrap rounded bg-zinc-100 p-3 dark:bg-zinc-900">{text}</div>}
      </div>
    </details>
  );
}
