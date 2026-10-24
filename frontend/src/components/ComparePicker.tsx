"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PlayerAutocomplete } from "./PlayerAutocomplete";
import { TeamAutocomplete } from "./TeamAutocomplete";

/** Chọn hai cầu thủ/đội rồi chuyển tới trang so sánh (trạng thái nằm trên URL). */
export function ComparePicker({ kind, a, b }: { kind: "players" | "teams"; a?: string; b?: string }) {
  const router = useRouter();
  const [ids, setIds] = useState<{ a?: string; b?: string }>({ a, b });

  function pick(slot: "a" | "b", id: number) {
    const next = { ...ids, [slot]: String(id) };
    setIds(next);
    if (next.a && next.b && next.a !== next.b) router.push(`/compare/${kind}?a=${next.a}&b=${next.b}`);
  }

  return (
    <div className="mb-6 grid gap-3 sm:grid-cols-2">
      {(["a", "b"] as const).map((slot) =>
        kind === "players" ? (
          <PlayerAutocomplete key={slot} onSelect={(p) => pick(slot, p.player_id)} placeholder={slot === "a" ? "Cầu thủ thứ nhất…" : "Cầu thủ thứ hai…"} />
        ) : (
          <TeamAutocomplete key={slot} onSelect={(t) => pick(slot, t.team_id)} placeholder={slot === "a" ? "Đội thứ nhất…" : "Đội thứ hai…"} />
        ),
      )}
    </div>
  );
}
