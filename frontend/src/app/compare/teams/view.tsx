"use client";

import { useSearchParams } from "next/navigation";
import { CompareTable } from "@/components/CompareTable";
import { ComparePicker } from "@/components/ComparePicker";
import type { TeamCompare } from "@/lib/api";
import { useApi } from "@/lib/engine";

export default function CompareTeamsView() {
  const sp = useSearchParams();
  const a = sp.get("a") ?? undefined;
  const b = sp.get("b") ?? undefined;
  const res = useApi<TeamCompare>(a && b ? `/compare/teams?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}` : null);
  const data = res?.data ?? null;
  const problem = res && !res.data ? "Không so sánh được: chọn hai đội khác nhau và có trong dữ liệu." : null;
  return (
    <>
      <ComparePicker kind="teams" a={a} b={b} />
      {problem && <p className="text-red-600">{problem}</p>}
      {!data && !problem && <p className="text-zinc-500">Chọn hai đội để so sánh.</p>}
      {data && (
        <div className="space-y-8">
          <p className="text-sm text-zinc-500">
            {data.a.name}: {data.a.formation ?? "chưa rõ sơ đồ"} · {data.b.name}: {data.b.formation ?? "chưa rõ sơ đồ"}
          </p>
          <div>
            <h2 className="mb-2 font-semibold">Rating đội trong game</h2>
            <CompareTable rows={data.ratings} nameA={data.a.name} nameB={data.b.name} />
          </div>
          <div>
            <h2 className="mb-2 font-semibold">Chỉ số đội hình xuất phát</h2>
            <CompareTable rows={data.metrics} nameA={data.a.name} nameB={data.b.name} extra />
            <p className="mt-2 text-xs text-zinc-500">P = phân vị trong giải của từng đội (nếu đủ đội cùng giải để so sánh).</p>
          </div>
        </div>
      )}
    </>
  );
}
