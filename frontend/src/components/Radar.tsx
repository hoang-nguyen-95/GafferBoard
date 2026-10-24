type Axis = { label: string; value: number | null; peer_avg?: number | null; other?: number | null };

const SIZE = 260;
const C = SIZE / 2;
const R = 90;

function point(i: number, n: number, value: number): [number, number] {
  const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
  const r = (Math.max(0, Math.min(99, value)) / 99) * R;
  return [C + r * Math.cos(angle), C + r * Math.sin(angle)];
}

function polygon(axes: Axis[], pick: (a: Axis) => number | null | undefined): string | null {
  const pts = axes.map((a, i) => {
    const v = pick(a);
    return v == null ? null : point(i, axes.length, v);
  });
  if (pts.some((p) => p === null)) return null;
  return (pts as [number, number][]).map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
}

export function Radar({ axes }: { axes: Axis[] }) {
  const own = polygon(axes, (a) => a.value);
  const peer = polygon(axes, (a) => a.peer_avg);
  const other = polygon(axes, (a) => a.other);
  const n = axes.length;
  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full max-w-xs" role="img" aria-label="Biểu đồ radar chỉ số">
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <polygon
          key={f}
          points={axes.map((_, i) => point(i, n, 99 * f).map((v) => v.toFixed(1)).join(",")).join(" ")}
          fill="none"
          className="stroke-zinc-300 dark:stroke-zinc-700"
        />
      ))}
      {axes.map((a, i) => {
        const [x, y] = point(i, n, 99);
        const [lx, ly] = point(i, n, 118);
        return (
          <g key={a.label}>
            <line x1={C} y1={C} x2={x} y2={y} className="stroke-zinc-300 dark:stroke-zinc-700" />
            <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" className="fill-current text-[11px]">
              {a.label} {a.value ?? "–"}
            </text>
          </g>
        );
      })}
      {peer && <polygon points={peer} fill="none" strokeDasharray="4 3" className="stroke-zinc-500" strokeWidth={1.5} />}
      {other && <polygon points={other} className="fill-sky-500/25 stroke-sky-600" strokeWidth={2} />}
      {own && <polygon points={own} className="fill-emerald-500/30 stroke-emerald-600" strokeWidth={2} />}
    </svg>
  );
}
