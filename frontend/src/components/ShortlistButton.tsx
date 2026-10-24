"use client";

import Link from "next/link";
import { useState } from "react";
import { send } from "@/components/manager/common";

/** Nút ở trang cầu thủ: thêm vào shortlist mua (chế độ Manager) và mở gợi ý đàm phán. */
export function ShortlistButton({ playerId }: { playerId: number }) {
  const [done, setDone] = useState(false);
  return (
    <p className="mb-6 flex flex-wrap items-center gap-3 text-sm">
      <button
        type="button" disabled={done}
        onClick={async () => setDone((await send("PUT", `/manager/shortlist/${playerId}`, { status: "target" })).ok)}
        className="rounded border border-zinc-300 px-3 py-1.5 hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:hover:bg-zinc-900"
      >
        {done ? "Đã thêm vào shortlist" : "Thêm vào shortlist mua"}
      </button>
      <Link href={`/manager?tab=negotiate&pid=${playerId}`} className="underline">Gợi ý đàm phán</Link>
      {done && <Link href="/manager?tab=budget" className="underline">Xem shortlist</Link>}
    </p>
  );
}
