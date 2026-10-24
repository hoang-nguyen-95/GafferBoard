"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormInfo } from "@/lib/api";

export function ResultsForm({ teamId, results }: { teamId: number; results: FormInfo["results"] }) {
  const router = useRouter();
  const [gf, setGf] = useState("");
  const [ga, setGa] = useState("");
  const [opponent, setOpponent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function call(url: string, init: RequestInit) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(url, init);
      if (!res.ok) throw new Error(res.status === 422 ? "Tỷ số không hợp lệ (0–30)." : `Lỗi ${res.status}`);
      router.refresh();
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const ok = await call(`/api/teams/${teamId}/results`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        goals_for: Number(gf),
        goals_against: Number(ga),
        opponent_name: opponent.trim() || null,
      }),
    });
    if (ok) {
      setGf("");
      setGa("");
      setOpponent("");
    }
  }

  return (
    <div className="space-y-3 text-sm">
      <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col text-xs text-zinc-500">
          Bàn thắng
          <input type="number" min={0} max={30} required value={gf} onChange={(e) => setGf(e.target.value)}
            className="w-20 rounded border border-zinc-300 bg-transparent px-2 py-1 text-sm text-current dark:border-zinc-700" />
        </label>
        <label className="flex flex-col text-xs text-zinc-500">
          Bàn thua
          <input type="number" min={0} max={30} required value={ga} onChange={(e) => setGa(e.target.value)}
            className="w-20 rounded border border-zinc-300 bg-transparent px-2 py-1 text-sm text-current dark:border-zinc-700" />
        </label>
        <label className="flex flex-col text-xs text-zinc-500">
          Đối thủ (tùy chọn)
          <input value={opponent} maxLength={80} onChange={(e) => setOpponent(e.target.value)}
            className="w-44 rounded border border-zinc-300 bg-transparent px-2 py-1 text-sm text-current dark:border-zinc-700" />
        </label>
        <button disabled={busy} className="rounded bg-emerald-600 px-3 py-1.5 text-white hover:bg-emerald-700 disabled:opacity-50">
          Thêm kết quả
        </button>
      </form>
      {error && <p className="text-red-600">{error}</p>}
      {results.length > 0 && (
        <ul className="space-y-1">
          {results.map((r) => (
            <li key={r.id} className="flex items-center gap-3">
              <span className="w-12 font-semibold tabular-nums">
                {r.goals_for}–{r.goals_against}
              </span>
              <span className="text-zinc-500">{r.opponent_name ?? "không rõ đối thủ"}</span>
              <button
                disabled={busy}
                onClick={() => call(`/api/results/${r.id}`, { method: "DELETE" })}
                className="ml-auto text-xs text-red-600 hover:underline disabled:opacity-50"
              >
                Xóa
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
