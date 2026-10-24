"use client";

import { useSearchParams } from "next/navigation";
import { CompareTable } from "@/components/CompareTable";
import { ComparePicker } from "@/components/ComparePicker";
import { Radar } from "@/components/Radar";
import { type PlayerCompare, playerName } from "@/lib/api";
import { useApi } from "@/lib/engine";

export default function ComparePlayersView() {
  const sp = useSearchParams();
  const a = sp.get("a") ?? undefined;
  const b = sp.get("b") ?? undefined;
  const res = useApi<PlayerCompare>(a && b ? `/compare/players?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}` : null);
  const data = res?.data ?? null;
  const problem = res && !res.data ? "Không so sánh được: chọn hai cầu thủ khác nhau và có trong dữ liệu." : null;
  return (
    <>
      <ComparePicker kind="players" a={a} b={b} />
      {problem && <p className="text-red-600">{problem}</p>}
      {!data && !problem && <p className="text-zinc-500">Chọn hai cầu thủ để so sánh.</p>}
      {data && <Result data={data} />}
    </>
  );
}

function Result({ data }: { data: PlayerCompare }) {
  const nameA = playerName(data.a.player);
  const nameB = playerName(data.b.player);
  const axes = data.a.radar.map((r, i) => ({ label: r.label, value: r.value, other: data.b.radar[i]?.value ?? null }));
  return (
    <div className="space-y-8">
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <Radar axes={axes} />
          <p className="mt-1 text-xs">
            <span className="text-emerald-600">■</span> {nameA} <span className="ml-3 text-sky-600">■</span> {nameB}
          </p>
          {(data.a.role === "GK") !== (data.b.role === "GK") && (
            <p className="mt-1 text-xs text-amber-600">Một trong hai là thủ môn: các trục radar có ý nghĩa khác nhau (DIV/HAN/KIC/REF/SPE/POS), chỉ so số thô.</p>
          )}
        </div>
        <div className="space-y-4 text-sm">
          {([data.a, data.b] as const).map((x) => (
            <div key={x.player.player_id}>
              <h2 className="font-semibold">
                {playerName(x.player)} <span className="font-normal text-zinc-500">({x.role_label}, {x.club?.name ?? "không có CLB"})</span>
              </h2>
              <p className="text-zinc-600 dark:text-zinc-400">{x.summary}</p>
            </div>
          ))}
        </div>
      </div>
      <CompareTable rows={data.rows} nameA={nameA} nameB={nameB} />
    </div>
  );
}
