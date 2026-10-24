// Minh họa sân bóng và sơ đồ bằng SVG, không dùng ảnh ngoài.

/** "4-2-3-1" → [4,2,3,1] */
export function parseFormation(name: string): number[] {
  const rows = name.split("-").map(Number);
  return rows.every((n) => Number.isInteger(n) && n > 0) ? rows : [4, 4, 2];
}

type Dot = { x: number; y: number };

/** Tọa độ các cầu thủ trên sân dọc (tấn công lên trên), thủ môn ở dưới cùng. */
export function formationDots(name: string, w: number, h: number, pad = 0.09): Dot[] {
  const rows = parseFormation(name);
  const dots: Dot[] = [{ x: w / 2, y: h * (1 - pad - 0.02) }];
  const top = h * (pad + 0.04), bottom = h * (1 - pad - 0.2);
  rows.forEach((n, r) => {
    const y = rows.length === 1 ? (top + bottom) / 2 : bottom - ((bottom - top) * r) / (rows.length - 1);
    for (let i = 0; i < n; i++) dots.push({ x: (w * (i + 1)) / (n + 1), y });
  });
  return dots;
}

function Markings({ w, h }: { w: number; h: number }) {
  const m = w * 0.05;
  return (
    <g fill="none" stroke="white" strokeOpacity="0.55" strokeWidth={Math.max(1, w / 160)}>
      <rect x={m} y={m} width={w - 2 * m} height={h - 2 * m} rx={w * 0.01} />
      <line x1={m} y1={h / 2} x2={w - m} y2={h / 2} />
      <circle cx={w / 2} cy={h / 2} r={w * 0.13} />
      <rect x={w * 0.27} y={m} width={w * 0.46} height={h * 0.15} />
      <rect x={w * 0.38} y={m} width={w * 0.24} height={h * 0.06} />
      <rect x={w * 0.27} y={h - m - h * 0.15} width={w * 0.46} height={h * 0.15} />
      <rect x={w * 0.38} y={h - m - h * 0.06} width={w * 0.24} height={h * 0.06} />
    </g>
  );
}

function Grass({ w, h, id }: { w: number; h: number; id: string }) {
  const stripes = 8;
  return (
    <>
      <defs>
        <clipPath id={id}><rect width={w} height={h} rx={w * 0.04} /></clipPath>
      </defs>
      <g clipPath={`url(#${id})`}>
        <rect width={w} height={h} className="fill-emerald-700" />
        {Array.from({ length: stripes }, (_, i) => (
          <rect key={i} y={(h / stripes) * i} width={w} height={h / stripes} fill={i % 2 ? "rgb(255 255 255 / 0.05)" : "transparent"} />
        ))}
      </g>
    </>
  );
}

/** Sơ đồ nhỏ, dùng trong thẻ. */
export function MiniFormation({ name, tone = "emerald", label }: { name: string; tone?: "emerald" | "amber" | "rose"; label?: string }) {
  const w = 120, h = 160;
  const dots = formationDots(name, w, h);
  const fill = tone === "amber" ? "#fbbf24" : tone === "rose" ? "#fb7185" : "white";
  return (
    <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={label ?? `Sơ đồ ${name}`} className="h-auto w-full max-w-[120px]">
      <Grass w={w} h={h} id={`g-${name}-${tone}`} />
      <Markings w={w} h={h} />
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={5.2} fill={i === 0 ? "#38bdf8" : fill} stroke="rgb(0 0 0 / 0.35)" strokeWidth="0.8" />
      ))}
    </svg>
  );
}

/** Minh họa lớn cho trang chủ: sân ngang, sơ đồ 4-3-3, mũi tên tấn công biên và vùng điểm yếu của đối thủ. */
export function HeroPitch() {
  const w = 520, h = 340;
  // sân ngang: tấn công sang phải
  const rows = [[0.06, [0.5]], [0.18, [0.15, 0.38, 0.62, 0.85]], [0.33, [0.25, 0.5, 0.75]], [0.47, [0.18, 0.5, 0.82]]] as const;
  const dots: Dot[] = rows.flatMap(([x, ys]) => ys.map((y) => ({ x: w * x, y: h * y })));
  const rival: Dot[] = [[0.94, [0.5]], [0.82, [0.15, 0.38, 0.62, 0.85]], [0.68, [0.15, 0.38, 0.62, 0.85]], [0.55, [0.35, 0.65]]].flatMap(([x, ys]) => (ys as number[]).map((y) => ({ x: w * (x as number), y: h * y })));
  return (
    <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Minh họa sơ đồ chiến thuật trên sân bóng" className="h-auto w-full drop-shadow-xl">
      <defs>
        <clipPath id="hero-clip"><rect width={w} height={h} rx="22" /></clipPath>
        <marker id="arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#fbbf24" />
        </marker>
      </defs>
      <g clipPath="url(#hero-clip)">
        <rect width={w} height={h} className="fill-emerald-700" />
        {Array.from({ length: 10 }, (_, i) => (
          <rect key={i} x={(w / 10) * i} width={w / 10} height={h} fill={i % 2 ? "rgb(255 255 255 / 0.05)" : "transparent"} />
        ))}
        <g fill="none" stroke="white" strokeOpacity="0.55" strokeWidth="2">
          <rect x="18" y="18" width={w - 36} height={h - 36} rx="4" />
          <line x1={w / 2} y1="18" x2={w / 2} y2={h - 18} />
          <circle cx={w / 2} cy={h / 2} r="44" />
          <rect x="18" y={h * 0.27} width="70" height={h * 0.46} />
          <rect x="18" y={h * 0.4} width="26" height={h * 0.2} />
          <rect x={w - 88} y={h * 0.27} width="70" height={h * 0.46} />
          <rect x={w - 44} y={h * 0.4} width="26" height={h * 0.2} />
        </g>
        {/* vùng điểm yếu của đối thủ */}
        <ellipse cx={w * 0.82} cy={h * 0.84} rx="58" ry="34" fill="#f43f5e" fillOpacity="0.28" stroke="#fb7185" strokeDasharray="5 4" strokeWidth="2" />
        {/* đường tấn công */}
        <path d={`M ${w * 0.4} ${h * 0.84} C ${w * 0.52} ${h * 0.97}, ${w * 0.68} ${h * 0.97}, ${w * 0.8} ${h * 0.82}`} fill="none" stroke="#fbbf24" strokeWidth="3.4" strokeDasharray="8 6" strokeLinecap="round" markerEnd="url(#arrow)" />
        {rival.map((d, i) => <circle key={`r${i}`} cx={d.x} cy={d.y} r="9" fill="#fb7185" stroke="rgb(0 0 0 / 0.35)" strokeWidth="1.5" />)}
        {dots.map((d, i) => <circle key={`m${i}`} cx={d.x} cy={d.y} r="9" fill={i === 0 ? "#38bdf8" : "white"} stroke="rgb(0 0 0 / 0.35)" strokeWidth="1.5" />)}
      </g>
    </svg>
  );
}
