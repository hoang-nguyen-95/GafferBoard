"use client";

import { useEffect, useRef, useState } from "react";
import type { Team } from "@/lib/api";

type Props = {
  /** Đường dẫn PUT (qua rewrite /api), body {team_id}. */
  endpoint: string;
  label: string;
  /** Nút bỏ lựa chọn thủ công (đặt team_id = null). */
  clearLabel?: string;
};

/** Chọn một đội (tìm theo tên) và lưu vào backend; dùng cho "đội của tôi" và "đối thủ chọn tay". */
export function TeamSetting({ endpoint, label, clearLabel }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Team[]>([]);
  const [error, setError] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query.trim();
    if (!open || q.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/teams?q=${encodeURIComponent(q)}&limit=8`, { signal: controller.signal });
        if (!res.ok) throw new Error(String(res.status));
        setResults(await res.json());
      } catch (e) {
        if ((e as Error).name !== "AbortError") setError("Không gọi được API.");
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, open]);

  async function save(teamId: number | null) {
    setError(null);
    const res = await fetch(endpoint, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ team_id: teamId }),
    });
    if (!res.ok) {
      setError(`Không lưu được (${res.status}).`);
      return;
    }
    setOpen(false);
    setQuery("");
    setResults([]);
  }

  const visible = query.trim().length >= 2 ? results : [];

  return (
    <div ref={box} className="inline-block">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <button type="button" onClick={() => setOpen((o) => !o)} className="rounded border border-zinc-300 px-3 py-1.5 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900">
          {label}
        </button>
        {clearLabel && (
          <button type="button" onClick={() => save(null)} className="rounded border border-zinc-300 px-3 py-1.5 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900">
            {clearLabel}
          </button>
        )}
      </div>
      {open && (
        <div className="relative mt-2 w-72">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Gõ tên đội…"
            className="w-full rounded border border-zinc-300 bg-transparent px-3 py-1.5 text-sm dark:border-zinc-700"
          />
          {visible.length > 0 && (
            <ul className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded border border-zinc-300 bg-white text-sm shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
              {visible.map((t) => (
                <li key={t.team_id}>
                  <button type="button" onClick={() => save(t.team_id)} className="flex w-full justify-between gap-3 px-3 py-1.5 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800">
                    <span>{t.name}</span>
                    <span className="text-xs text-zinc-500">{t.league_name ?? ""}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
