"use client";

import type { ReactNode } from "react";

export const money = (n: number | null | undefined): string => (n === null || n === undefined ? "–" : n.toLocaleString("vi-VN"));

export const inputCls = "rounded border border-zinc-300 bg-transparent px-2 py-1 text-sm text-current dark:border-zinc-700";
export const btnCls = "rounded border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-900";
export const primaryCls = "rounded bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700 disabled:opacity-50";

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="flex flex-col text-xs text-zinc-500">
      {label}
      {children}
      {hint && <span className="mt-0.5 text-[11px] text-zinc-400">{hint}</span>}
    </label>
  );
}

export async function send(method: string, path: string, body?: unknown): Promise<{ ok: boolean; status: number; json: unknown }> {
  const res = await fetch(`/api${path}`, { method, headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { ok: res.ok, status: res.status, json: await res.json().catch(() => null) };
}

export function contractText(left: number | null, until: number | null): string {
  if (until === null) return "–";
  if (left === 0) return `${until} (đã hết)`;
  return `${until} (${left} mùa)`;
}
