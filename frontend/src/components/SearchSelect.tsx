"use client";

// Ô chọn một giá trị từ danh sách, có ô tìm kiếm (không dấu) ngay trong danh sách; thay cho <select> khi danh sách dài.
import { ChevronDown, Search } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { foldText } from "@/engine/util";

export function SearchSelect({ label, value, onChange, options, allLabel = "Tất cả", searchPlaceholder = "Tìm…", className = "w-44" }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  allLabel?: string;
  searchPlaceholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const listId = useId();

  const shown = useMemo(() => {
    const f = foldText(q);
    return f ? options.filter((o) => foldText(o).includes(f)) : options;
  }, [options, q]);
  // Mục đầu tiên (chỉ khi chưa gõ tìm) là "Tất cả" để bỏ lọc.
  const items = q ? shown : ["", ...shown];

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const choose = (v: string) => { onChange(v); setOpen(false); };
  const toggle = () => { setQ(""); setActive(0); setOpen((o) => !o); };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") setOpen(false);
    else if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, items.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter" && items.length) { e.preventDefault(); choose(items[active] ?? ""); }
  };

  return (
    <div ref={root} className={`relative ${className}`} onKeyDown={onKey}>
      <span className="text-xs text-zinc-500">{label}</span>
      <button type="button" aria-label={label} aria-haspopup="listbox" aria-expanded={open} aria-controls={listId} onClick={toggle}
        className="mt-1 flex w-full items-center justify-between gap-2 rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-left text-sm dark:border-zinc-700 dark:bg-zinc-900">
        <span className={`truncate ${value ? "" : "text-zinc-500"}`}>{value || allLabel}</span>
        <ChevronDown size={14} className="shrink-0 text-zinc-400" aria-hidden="true" />
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-64 max-w-[85vw] rounded-lg border border-zinc-200 bg-white p-2 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          <span className="relative block">
            <Search size={14} className="pointer-events-none absolute left-2 top-2.5 text-zinc-400" aria-hidden="true" />
            <input autoFocus value={q} onChange={(e) => { setQ(e.target.value); setActive(0); }} placeholder={searchPlaceholder} aria-label={`Tìm trong ${label}`}
              className="w-full rounded-md border border-zinc-300 bg-white py-1.5 pl-7 pr-2 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
          </span>
          <ul id={listId} role="listbox" aria-label={label} className="mt-2 max-h-64 overflow-y-auto text-sm">
            {items.map((o, i) => (
              <li key={o || "__all"} role="option" aria-selected={o === value} onMouseEnter={() => setActive(i)} onClick={() => choose(o)}
                className={`cursor-pointer rounded px-2 py-1.5 ${i === active ? "bg-emerald-50 dark:bg-emerald-950/50" : ""} ${o === value ? "font-semibold text-emerald-700 dark:text-emerald-300" : ""}`}>
                {o || allLabel}
              </li>
            ))}
            {items.length === 0 && <li className="px-2 py-1.5 text-zinc-500">Không có kết quả</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
