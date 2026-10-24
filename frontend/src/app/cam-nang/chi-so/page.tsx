import { Crosshair, Dumbbell, Footprints, Hand, LineChart, Send, Shield, Zap, type LucideIcon } from "lucide-react";
import { Article } from "@/components/handbook/Article";
import { Callout, IconTile, TONES, type Tone } from "@/components/brand/ui";
import { ROLE_ATTRS } from "@/engine/analysis";
import { ROLE_LABELS_VI, type Role } from "@/engine/positions";
import { ATTRIBUTE_NOTES, HEIGHT_NOTE, STAT_GROUPS, labelOf } from "@/handbook/content";

export const metadata = { title: "Chỉ số cầu thủ · CounterPick FC" };

const STYLE: Record<string, { icon: LucideIcon; tone: Tone }> = {
  PAC: { icon: Zap, tone: "amber" }, SHO: { icon: Crosshair, tone: "rose" }, PAS: { icon: Send, tone: "sky" },
  DRI: { icon: Footprints, tone: "violet" }, DEF: { icon: Shield, tone: "emerald" }, PHY: { icon: Dumbbell, tone: "zinc" }, GK: { icon: Hand, tone: "amber" },
};

const rolesFor = (attr: string): string[] =>
  (Object.keys(ROLE_ATTRS) as Role[]).filter((r) => (ROLE_ATTRS[r] as string[]).includes(attr)).map((r) => ROLE_LABELS_VI[r]);

export default function AttributesPage() {
  return (
    <Article
      title="Chỉ số cầu thủ"
      icon={LineChart}
      intro="Mỗi cầu thủ có hàng chục chỉ số chi tiết, gộp thành 6 nhóm trên thẻ (hoặc bộ chỉ số riêng với thủ môn). Dưới mỗi chỉ số là những vai trò mà công cụ xem chỉ số đó là quan trọng."
    >
      <nav aria-label="Nhóm chỉ số" className="-mt-4 flex flex-wrap gap-2">
        {STAT_GROUPS.map((g) => {
          const st = STYLE[g.key];
          return (
            <a key={g.key} href={`#${g.key.toLowerCase()}`} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium hover:shadow-sm ${TONES[st.tone].border} ${TONES[st.tone].soft} ${TONES[st.tone].text}`}>
              <st.icon size={15} aria-hidden="true" /> {g.key === "GK" ? "Thủ môn" : g.title.replace(/ \(.*\)/, "")}
            </a>
          );
        })}
      </nav>

      {STAT_GROUPS.map((g) => {
        const st = STYLE[g.key];
        return (
          <section key={g.key} id={g.key.toLowerCase()} className="scroll-mt-24">
            <div className="flex items-center gap-4">
              <IconTile icon={st.icon} tone={st.tone} size="lg" />
              <div>
                <h2 className="text-xl font-bold tracking-tight">{g.title}</h2>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">{g.blurb}</p>
              </div>
            </div>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {g.attrs.map((a) => (
                <li key={a} className={`rounded-xl border bg-white p-4 shadow-sm dark:bg-zinc-900/60 ${TONES[st.tone].border}`}>
                  <h3 className="font-semibold">{labelOf(a)}</h3>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{ATTRIBUTE_NOTES[a]}</p>
                  <p className="mt-3 flex flex-wrap gap-1.5">
                    {rolesFor(a).length === 0 ? <span className="text-xs text-zinc-400">Không nằm trong bộ chỉ số then chốt của vai trò nào</span> : rolesFor(a).map((r) => (
                      <span key={r} className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${TONES[st.tone].tile}`}>{r}</span>
                    ))}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      <Callout icon={LineChart} tone="sky" title="Chiều cao">{HEIGHT_NOTE}</Callout>
    </Article>
  );
}
