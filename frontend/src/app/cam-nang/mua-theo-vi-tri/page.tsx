import { Eye, Search, ShieldAlert } from "lucide-react";
import { Article } from "@/components/handbook/Article";
import { IconTile, TONES, type Tone } from "@/components/brand/ui";
import { ROLE_ATTRS } from "@/engine/analysis";
import { LINE_LABELS_VI, LINE_OF_ROLE, POSITION_NAMES, ROLE_LABELS_VI, ROLE_POSITIONS, type Line, type Role } from "@/engine/positions";
import { ROLE_BUYING_NOTES, labelOf } from "@/handbook/content";

export const metadata = { title: "Mua theo vị trí · CounterPick FC" };

const ROLES = Object.keys(ROLE_POSITIONS) as Role[];
const LINE_TONE: Record<Line, Tone> = { GK: "amber", DEF: "sky", MID: "emerald", ATT: "rose" };

export default function BuyByRolePage() {
  return (
    <Article
      title="Mua theo vị trí"
      icon={Search}
      intro="Mỗi vị trí cần một bộ chỉ số khác nhau. Dưới đây là chỉ số công cụ xét cho từng vai trò và những điều nên nhìn hoặc nên tránh khi mua."
    >
      <nav aria-label="Vai trò" className="-mt-4 flex flex-wrap gap-2">
        {ROLES.map((r) => (
          <a key={r} href={`#${r.toLowerCase()}`} className={`rounded-full border px-3 py-1.5 text-sm font-medium ${TONES[LINE_TONE[LINE_OF_ROLE[r]]].border} ${TONES[LINE_TONE[LINE_OF_ROLE[r]]].soft} ${TONES[LINE_TONE[LINE_OF_ROLE[r]]].text}`}>
            {ROLE_LABELS_VI[r]}
          </a>
        ))}
      </nav>
      {ROLES.map((r) => {
        const t = TONES[LINE_TONE[LINE_OF_ROLE[r]]];
        return (
          <section key={r} id={r.toLowerCase()} className={`scroll-mt-24 overflow-hidden rounded-2xl border bg-white shadow-sm dark:bg-zinc-900/60 ${t.border}`}>
            <div className={`flex flex-wrap items-center justify-between gap-2 px-5 py-3 ${t.tile}`}>
              <h2 className="text-xl font-bold">{ROLE_LABELS_VI[r]}</h2>
              <p className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="font-medium">{LINE_LABELS_VI[LINE_OF_ROLE[r]]}</span>
                {ROLE_POSITIONS[r].map((c) => <span key={c} className="rounded border border-current px-1.5 py-0.5 font-mono">{POSITION_NAMES[c]}</span>)}
              </p>
            </div>
            <div className="space-y-4 p-5 text-sm">
              <p className="flex flex-wrap gap-1.5">
                {(ROLE_ATTRS[r] as string[]).map((a) => (
                  <span key={a} className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium dark:bg-zinc-800">{a === "height" ? "Chiều cao" : labelOf(a)}</span>
                ))}
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex gap-3">
                  <IconTile icon={Eye} tone="emerald" size="sm" />
                  <p><b>Nên nhìn:</b> <span className="text-zinc-600 dark:text-zinc-400">{ROLE_BUYING_NOTES[r].look}</span></p>
                </div>
                <div className="flex gap-3">
                  <IconTile icon={ShieldAlert} tone="rose" size="sm" />
                  <p><b>Nên tránh:</b> <span className="text-zinc-600 dark:text-zinc-400">{ROLE_BUYING_NOTES[r].avoid}</span></p>
                </div>
              </div>
            </div>
          </section>
        );
      })}
    </Article>
  );
}
