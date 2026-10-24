import Link from "next/link";
import { type Slot, playerName } from "@/lib/api";
import { PITCH_COORDS } from "@/lib/positions";

export function Pitch({ slots }: { slots: Slot[] }) {
  return (
    <div
      className="relative mx-auto aspect-[3/4] w-full max-w-md overflow-hidden rounded-lg border border-emerald-900/40 bg-emerald-700"
      aria-label="Sơ đồ đội hình"
    >
      <div className="absolute inset-x-0 top-1/2 border-t border-white/40" />
      <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/40" />
      <div className="absolute inset-x-[22%] top-0 h-[14%] border-x border-b border-white/40" />
      <div className="absolute inset-x-[22%] bottom-0 h-[14%] border-x border-t border-white/40" />
      {slots.map((s) => {
        const [x, y] = (s.position != null && PITCH_COORDS[s.position]) || [50, 50];
        return (
          <div
            key={s.slot}
            className="absolute flex w-20 -translate-x-1/2 -translate-y-1/2 flex-col items-center text-center"
            style={{ left: `${x}%`, top: `${y}%` }}
          >
            {s.player ? (
              <Link href={`/players/${s.player.player_id}`} className="group flex flex-col items-center">
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-semibold text-black ${
                    s.inferred ? "border-dashed border-amber-300 bg-white/80" : "border-white bg-white"
                  }`}
                  title={s.inferred ? "Ô trống trong đội hình gốc, được điền tự động" : undefined}
                >
                  {s.player.overall}
                </span>
                <span className="mt-0.5 max-w-full truncate rounded bg-black/55 px-1 text-[11px] leading-tight text-white group-hover:underline">
                  {s.player.jersey_name ?? playerName(s.player)}
                </span>
              </Link>
            ) : (
              <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-dashed border-white/60 text-xs text-white/70">
                ?
              </span>
            )}
            <span className="text-[10px] text-white/80">{s.position_name}</span>
          </div>
        );
      })}
    </div>
  );
}
