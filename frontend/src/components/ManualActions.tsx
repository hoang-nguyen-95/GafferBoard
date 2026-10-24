"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function ManualActions({ id }: { id: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!confirm("Xóa đội hình nhập tay này?")) return;
    setBusy(true);
    const res = await fetch(`/api/manual-lineups/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/manual");
      router.refresh();
    } else setBusy(false);
  }

  return (
    <div className="mb-6 flex flex-wrap gap-3 text-sm">
      <Link href={`/manual/${id}/edit`} className="rounded border border-zinc-300 px-3 py-1.5 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900">
        Sửa đội hình
      </Link>
      <button onClick={remove} disabled={busy} className="rounded border border-red-300 px-3 py-1.5 text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:hover:bg-red-950">
        Xóa
      </button>
    </div>
  );
}
