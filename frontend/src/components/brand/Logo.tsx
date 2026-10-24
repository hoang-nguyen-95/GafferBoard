/** Logo: sân bóng nhìn từ trên với mũi tên chiến thuật. */
export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" role="img" aria-label="CounterPick FC" className="flex-none">
      <rect x="2" y="2" width="44" height="44" rx="12" className="fill-emerald-600" />
      <g fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.9">
        <rect x="9" y="9" width="30" height="30" rx="3" opacity="0.55" />
        <line x1="9" y1="24" x2="39" y2="24" opacity="0.55" />
        <circle cx="24" cy="24" r="5" opacity="0.55" />
        <path d="M14 35 C 20 33, 24 27, 33 15" strokeWidth="2.4" />
        <path d="M27 14.5 L33.4 14.6 L33 21" strokeWidth="2.4" />
      </g>
      <circle cx="14" cy="35" r="2.6" fill="#fbbf24" />
    </svg>
  );
}

export function Logo({ size = 32 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark size={size} />
      <span className="text-lg font-bold tracking-tight">
        CounterPick <span className="text-emerald-600">FC</span>
      </span>
    </span>
  );
}
