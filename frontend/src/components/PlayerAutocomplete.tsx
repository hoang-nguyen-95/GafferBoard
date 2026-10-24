"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { PlayerSummary } from "@/lib/api";
import { positionsLabel } from "@/lib/positions";

type Props = {
  onSelect: (player: PlayerSummary) => void;
  placeholder?: string;
  autoFocus?: boolean;
  /** Xóa ô nhập sau khi chọn (dùng cho thanh tìm kiếm); mặc định giữ tên đã chọn. */
  clearOnSelect?: boolean;
};

export function PlayerAutocomplete({ onSelect, placeholder = "Tìm cầu thủ…", autoFocus, clearOnSelect }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlayerSummary[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [error, setError] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const listId = useId();
  // Kết quả cũ không hiển thị khi ô nhập đã ngắn lại (không cần xóa trong effect).
  const visible = query.trim().length >= 2 ? results : [];

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/players?q=${encodeURIComponent(q)}&limit=8`, { signal: controller.signal });
        if (!res.ok) throw new Error(String(res.status));
        setResults(await res.json());
        setError(false);
        setActive(0);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setError(true);
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  function choose(p: PlayerSummary) {
    onSelect(p);
    setQuery(clearOnSelect ? "" : (p.name ?? ""));
    setResults([]);
    setOpen(false);
  }

  return (
    <div ref={box} className="relative w-full">
      <input
        type="search"
        value={query}
        autoFocus={autoFocus}
        placeholder={placeholder}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") setActive((a) => Math.min(a + 1, visible.length - 1));
          else if (e.key === "ArrowUp") setActive((a) => Math.max(a - 1, 0));
          else if (e.key === "Enter" && visible[active]) choose(visible[active]);
          else if (e.key === "Escape") setOpen(false);
        }}
        className="w-full rounded border border-zinc-300 bg-transparent px-3 py-1.5 text-sm dark:border-zinc-700"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
      />
      {open && query.trim().length >= 2 && (
        <ul id={listId} role="listbox" className="absolute z-20 mt-1 max-h-80 w-full overflow-auto rounded border border-zinc-300 bg-white text-sm shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          {error && <li className="px-3 py-2 text-amber-600">Không gọi được API.</li>}
          {!error && visible.length === 0 && <li className="px-3 py-2 text-zinc-500">Không tìm thấy cầu thủ.</li>}
          {visible.map((p, i) => (
            <li key={p.player_id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(p)}
                className={`flex w-full items-center justify-between gap-3 px-3 py-1.5 text-left ${
                  i === active ? "bg-zinc-100 dark:bg-zinc-800" : ""
                }`}
              >
                <span className="truncate">{p.name ?? `Cầu thủ #${p.player_id}`}</span>
                <span className="shrink-0 text-xs text-zinc-500">
                  {positionsLabel(p.positions.slice(0, 2))} · {p.overall}
                  {p.age != null && ` · ${p.age}t`}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
