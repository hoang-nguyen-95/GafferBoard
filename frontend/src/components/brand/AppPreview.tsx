/** Hình minh họa giao diện ứng dụng (số liệu ví dụ, không phải dữ liệu thật). */
export function AppPreview() {
  const rows = [
    ["Cầu thủ A", "84", "90", "20", "83"],
    ["Cầu thủ B", "82", "82", "32", "70"],
    ["Cầu thủ C", "79", "81", "26", "61"],
  ];
  return (
    <figure className="overflow-hidden rounded-2xl border border-zinc-200 bg-white text-zinc-900 shadow-xl dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" aria-label="Minh họa giao diện ứng dụng">
      <div className="flex items-center gap-1.5 border-b border-zinc-200 bg-zinc-100 px-4 py-2.5 dark:border-zinc-700 dark:bg-zinc-800">
        <span className="h-3 w-3 rounded-full bg-rose-400" /><span className="h-3 w-3 rounded-full bg-amber-400" /><span className="h-3 w-3 rounded-full bg-emerald-400" />
        <span className="ml-3 text-xs text-zinc-500">CounterPick FC · Manager</span>
      </div>
      <div className="space-y-3 p-4 text-sm">
        <div className="flex gap-4 border-b border-zinc-200 text-xs dark:border-zinc-700">
          <span className="text-zinc-500">Nhu cầu đội hình</span>
          <span className="-mb-px border-b-2 border-emerald-600 pb-1.5 font-semibold">Mục tiêu chuyển nhượng</span>
          <span className="text-zinc-500">Ngân sách</span>
        </div>
        <table className="w-full text-left text-xs">
          <thead className="text-zinc-500"><tr><th className="py-1">Cầu thủ</th><th>OVR</th><th>POT</th><th>Tuổi</th><th className="text-right">Điểm</th></tr></thead>
          <tbody>
            {rows.map(([n, o, p, a, s]) => (
              <tr key={n} className="border-t border-zinc-100 dark:border-zinc-800">
                <td className="py-1.5 font-medium">{n}</td><td className="tabular-nums">{o}</td><td className="tabular-nums">{p}</td><td>{a}</td>
                <td className="text-right font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">{s}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
          {[["Hàng thủ chậm", "P12", "rose"], ["Biên trái hở", "P8", "amber"], ["Thể lực thấp", "P20", "sky"]].map(([l, v, t]) => (
            <div key={l} className={`rounded-lg p-2 ${t === "rose" ? "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300" : t === "amber" ? "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300" : "bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300"}`}>
              <div className="text-base font-bold">{v}</div>{l}
            </div>
          ))}
        </div>
      </div>
      <figcaption className="border-t border-zinc-200 px-4 py-2 text-[11px] text-zinc-500 dark:border-zinc-700">Minh họa với số liệu ví dụ.</figcaption>
    </figure>
  );
}
