import { NEGOTIATION, OLD_AGE, PRIME_END_AGE, GROWTH_MAX_AGE } from "@/engine/manager";

/** Trục tuổi: 4 nhóm tuổi tô màu theo cách công cụ nhìn cầu thủ. */
export function AgeTimeline() {
  const min = 16, max = 38;
  const segs = [
    { from: min, to: GROWTH_MAX_AGE + 1, label: "Đầu tư", cls: "bg-sky-500" },
    { from: GROWTH_MAX_AGE + 1, to: 27, label: "Đang lên", cls: "bg-emerald-400" },
    { from: 27, to: PRIME_END_AGE + 1, label: "Đỉnh cao", cls: "bg-emerald-600" },
    { from: PRIME_END_AGE + 1, to: max + 1, label: "Ngắn hạn", cls: "bg-amber-500" },
  ];
  const span = max + 1 - min;
  return (
    <figure aria-label={`Trục tuổi: đầu tư tới ${GROWTH_MAX_AGE}, đỉnh cao tới ${PRIME_END_AGE}, ngắn hạn từ ${OLD_AGE}`}>
      <div className="flex h-12 overflow-hidden rounded-xl text-xs font-semibold text-white">
        {segs.map((s) => (
          <div key={s.label} className={`flex items-center justify-center ${s.cls}`} style={{ width: `${((s.to - s.from) / span) * 100}%` }}>{s.label}</div>
        ))}
      </div>
      <div className="relative mt-1 h-5 text-[11px] text-zinc-500">
        {[16, 20, 23, 26, 30, 34, 38].map((a) => (
          <span key={a} className="absolute -translate-x-1/2" style={{ left: `${((a - min + 0.5) / span) * 100}%` }}>{a}</span>
        ))}
      </div>
      <figcaption className="mt-1 text-xs text-zinc-500">Tuổi cầu thủ (năm). Màu cho biết cách công cụ nhìn từng nhóm tuổi.</figcaption>
    </figure>
  );
}

/** Thang giá: ba mốc mở giá, mục tiêu, tối đa so với giá trị hiển thị trong game (100%). */
export function PriceLadder() {
  const { open, target, walk } = NEGOTIATION.base;
  const lo = 0.6, hi = 1.3;
  const pos = (x: number) => `${((x - lo) / (hi - lo)) * 100}%`;
  const marks = [
    { x: open, label: "Mở giá", cls: "bg-sky-500" },
    { x: target, label: "Mục tiêu", cls: "bg-emerald-600" },
    { x: walk, label: "Tối đa", cls: "bg-rose-500" },
  ];
  return (
    <figure aria-label="Thang giá so với giá trị hiển thị trong game">
      <div className="relative mt-8 h-3 rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div className="absolute inset-y-0 rounded-full bg-emerald-200 dark:bg-emerald-900" style={{ left: pos(open), width: `calc(${pos(walk)} - ${pos(open)})` }} />
        <span className="absolute -top-1 h-5 w-0.5 bg-zinc-500" style={{ left: pos(1) }} />
        <span className="absolute -top-7 -translate-x-1/2 text-[11px] text-zinc-500" style={{ left: pos(1) }}>Giá trị 100%</span>
        {marks.map((m) => (
          <span key={m.label} className="absolute -top-1.5 -translate-x-1/2" style={{ left: pos(m.x) }}>
            <span className={`block h-6 w-6 rounded-full ring-4 ring-white dark:ring-zinc-950 ${m.cls}`} />
            <span className="absolute left-1/2 top-8 -translate-x-1/2 whitespace-nowrap text-center text-xs font-semibold">{m.label}<br /><span className="font-normal text-zinc-500">{Math.round(m.x * 100)}%</span></span>
          </span>
        ))}
      </div>
      <div className="h-14" />
      <figcaption className="text-xs text-zinc-500">Mức gốc trước khi điều chỉnh theo tuổi, tiềm năng, hợp đồng.</figcaption>
    </figure>
  );
}

/** Thang phân vị: vùng yếu, trung bình, mạnh theo ngưỡng của công cụ. */
export function PercentileScale({ weak, strong, label }: { weak: number; strong: number; label: string }) {
  return (
    <figure aria-label={label}>
      <div className="flex h-8 overflow-hidden rounded-lg text-xs font-semibold text-white">
        <div className="flex items-center justify-center bg-rose-500" style={{ width: `${weak}%` }}>Yếu</div>
        <div className="flex items-center justify-center bg-zinc-400 dark:bg-zinc-600" style={{ width: `${strong - weak}%` }}>Trung bình</div>
        <div className="flex items-center justify-center bg-emerald-600" style={{ width: `${100 - strong}%` }}>Mạnh</div>
      </div>
      <div className="relative mt-1 h-4 text-[11px] text-zinc-500">
        {[0, weak, 50, strong, 100].map((v) => <span key={v} className="absolute -translate-x-1/2" style={{ left: `${v}%` }}>P{v}</span>)}
      </div>
      <figcaption className="mt-1 text-xs text-zinc-500">{label}</figcaption>
    </figure>
  );
}
