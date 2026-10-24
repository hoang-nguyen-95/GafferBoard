import type { CompareRow } from "@/lib/api";

export function CompareTable({ rows, nameA, nameB, extra }: { rows: (CompareRow & { percentile_a?: number | null; percentile_b?: number | null })[]; nameA: string; nameB: string; extra?: boolean }) {
  const cell = (better: boolean) => (better ? "font-semibold text-emerald-600" : "");
  return (
    <table className="w-full text-sm">
      <thead className="text-left text-zinc-500">
        <tr>
          <th className="py-1">Chỉ số</th>
          <th className="text-right">{nameA}</th>
          <th className="text-right">{nameB}</th>
          <th className="text-right">Chênh</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.key} className="border-t border-zinc-200 dark:border-zinc-800">
            <td className="py-1">{r.label}</td>
            <td className={`text-right tabular-nums ${cell(r.better === "a")}`}>
              {r.a ?? "–"}
              {extra && r.percentile_a != null && <span className="ml-1 text-xs text-zinc-500">P{Math.round(r.percentile_a)}</span>}
            </td>
            <td className={`text-right tabular-nums ${cell(r.better === "b")}`}>
              {r.b ?? "–"}
              {extra && r.percentile_b != null && <span className="ml-1 text-xs text-zinc-500">P{Math.round(r.percentile_b)}</span>}
            </td>
            <td className="text-right tabular-nums text-zinc-500">{r.diff == null ? "" : r.diff > 0 ? `+${Math.round(r.diff * 10) / 10}` : Math.round(r.diff * 10) / 10}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
