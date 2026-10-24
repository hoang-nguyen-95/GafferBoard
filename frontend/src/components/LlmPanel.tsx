"use client";

import { useEffect, useState } from "react";
import type { LlmStatus } from "@/lib/api";

/** Diễn giải bằng LLM: tùy chọn, mặc định tắt. Khi bật, báo cáo phân tích được gửi tới Claude API. */
export function LlmPanel({ explainPath }: { explainPath: string }) {
  const [status, setStatus] = useState<LlmStatus | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/llm/status")
      .then((r) => (r.ok ? r.json() : null))
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  async function toggle(enabled: boolean) {
    setError(null);
    const before = status;
    setStatus((s) => (s ? { ...s, enabled } : s)); // cập nhật ngay, hoàn lại nếu API từ chối
    const res = await fetch("/api/llm/enabled", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled }) });
    if (res.ok) setStatus(await res.json());
    else {
      setStatus(before);
      setError((await res.json().catch(() => null))?.detail ?? `Lỗi ${res.status}`);
    }
  }

  async function explain() {
    setBusy(true);
    setError(null);
    setText(null);
    try {
      const res = await fetch(explainPath, { method: "POST" });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.detail ?? `Lỗi ${res.status}`);
      setText(body.text + (body.truncated ? "\n\n(Câu trả lời bị cắt do giới hạn độ dài.)" : ""));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!status) return null;
  return (
    <details className="mt-10 rounded border border-zinc-200 p-4 text-sm dark:border-zinc-800">
      <summary className="cursor-pointer font-semibold">Diễn giải bằng LLM (tùy chọn)</summary>
      <div className="mt-3 space-y-3">
        <p className="text-xs text-amber-600">{status.privacy}</p>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={status.enabled} onChange={(e) => toggle(e.target.checked)} disabled={!status.sdk_installed} />
          Bật diễn giải bằng Claude ({status.model})
        </label>
        {!status.sdk_installed && <p className="text-xs text-zinc-500">Cần cài thư viện: pip install anthropic.</p>}
        {status.enabled && !status.has_api_key && (
          <p className="text-xs text-zinc-500">Chưa thấy khóa API trong môi trường (ANTHROPIC_API_KEY); nếu bạn đã đăng nhập bằng <code>ant auth login</code> thì vẫn có thể dùng được.</p>
        )}
        {status.enabled && (
          <button onClick={explain} disabled={busy} className="rounded bg-emerald-600 px-3 py-1.5 text-white hover:bg-emerald-700 disabled:opacity-50">
            {busy ? "Đang diễn giải…" : "Diễn giải báo cáo này"}
          </button>
        )}
        {error && <p className="text-red-600">{error}</p>}
        {text && <div className="whitespace-pre-wrap rounded bg-zinc-100 p-3 dark:bg-zinc-900">{text}</div>}
      </div>
    </details>
  );
}
