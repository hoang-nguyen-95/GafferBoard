"use client";

import { useEffect, useState } from "react";
import type { Team } from "@/lib/api";

export function TeamAutocomplete({ onSelect, placeholder = "Tìm đội…" }: { onSelect: (team: Team) => void; placeholder?: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Team[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/teams?q=${encodeURIComponent(q)}&limit=8`, { signal: controller.signal });
        if (res.ok) setResults(await res.json());
      } catch {
        /* bỏ qua: hủy yêu cầu cũ hoặc mất kết nối */
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const visible = query.trim().length >= 2 ? results : [];
  return (
    <div className="relative w-full">
      <input
        value={query}
        placeholder={placeholder}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        className="w-full rounded border border-zinc-300 bg-transparent px-3 py-1.5 text-sm dark:border-zinc-700"
      />
      {open && visible.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded border border-zinc-300 bg-white text-sm shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          {visible.map((t) => (
            <li key={t.team_id}>
              <button
                type="button"
                className="flex w-full justify-between gap-3 px-3 py-1.5 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800"
                onClick={() => {
                  setQuery(t.name);
                  setOpen(false);
                  onSelect(t);
                }}
              >
                <span>{t.name}</span>
                <span className="text-xs text-zinc-500">{t.league_name ?? ""}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
