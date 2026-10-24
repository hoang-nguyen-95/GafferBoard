"use client";

import Link from "next/link";
import type { ManualSummary } from "@/lib/api";
import { useApi } from "@/lib/engine";
import { manualHref } from "@/lib/routes";

export default function ManualListView() {
  const res = useApi<ManualSummary[]>("/manual-lineups");
  if (!res?.data) return <p className="text-zinc-500">Đang tải…</p>;
  const items = res.data;
  if (items.length === 0) return <p className="text-zinc-500">Chưa có đội hình nào được lưu.</p>;
  return (
    <ul className="space-y-2">
      {items.map((m) => (
        <li key={m.id}>
          <Link href={manualHref(m.id)} className="flex items-center justify-between rounded border border-zinc-200 px-4 py-2 hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-900">
            <span className="font-medium">{m.name}</span>
            <span className="text-xs text-zinc-500">
              {m.formation_name} · {m.players}/11 cầu thủ
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
