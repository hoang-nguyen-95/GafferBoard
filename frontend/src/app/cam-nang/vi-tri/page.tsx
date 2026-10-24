import { Shirt } from "lucide-react";
import { Article } from "@/components/handbook/Article";
import { SectionTitle, TONES, type Tone } from "@/components/brand/ui";
import { ROLE_ATTRS } from "@/engine/analysis";
import {
  PENALTY_ALT_POSITION, PENALTY_GK_MISMATCH, PENALTY_OTHER_LINE, PENALTY_SAME_FAMILY, PENALTY_SAME_LINE, PENALTY_SAME_ROLE,
} from "@/engine/lineup";
import { LINE_LABELS_VI, LINE_OF_ROLE, POSITION_NAMES, ROLE_LABELS_VI, ROLE_POSITIONS, type Line, type Role } from "@/engine/positions";
import { labelOf } from "@/handbook/content";

export const metadata = { title: "Vị trí và vai trò · CounterPick FC" };

const ROLES = Object.keys(ROLE_POSITIONS) as Role[];
const LINE_TONE: Record<Line, Tone> = { GK: "amber", DEF: "sky", MID: "emerald", ATT: "rose" };
const PENALTIES: [string, number][] = [
  ["Đúng vị trí sở trường", 0],
  ["Đá cùng họ vị trí (vd CB ↔ LCB/RCB, CM ↔ LCM)", PENALTY_SAME_FAMILY],
  ["Đá vị trí phụ ghi trên thẻ", PENALTY_ALT_POSITION],
  ["Cùng vai trò nhưng khác vị trí (vd RB ↔ LB)", PENALTY_SAME_ROLE],
  ["Cùng tuyến, khác vai trò (vd CM ↔ AM)", PENALTY_SAME_LINE],
  ["Khác tuyến (vd tiền vệ xuống làm trung vệ)", PENALTY_OTHER_LINE],
  ["Thủ môn đá ngoài sân hoặc ngược lại", PENALTY_GK_MISMATCH],
];

export default function PositionsPage() {
  return (
    <Article
      title="Vị trí và vai trò"
      icon={Shirt}
      intro="Game có 28 mã vị trí. Công cụ gom chúng thành 9 vai trò để đánh giá cầu thủ: cầu thủ được so với các cầu thủ cùng vai trò và nhìn vào những chỉ số then chốt của vai trò đó."
    >
      <section>
        <SectionTitle icon={Shirt} tone="violet">9 vai trò và chỉ số then chốt</SectionTitle>
        <div className="mt-2 flex flex-wrap gap-3 text-xs">
          {(Object.keys(LINE_TONE) as Line[]).map((l) => (
            <span key={l} className="inline-flex items-center gap-1.5"><span className={`h-3 w-3 rounded-full ${TONES[LINE_TONE[l]].bar}`} />{LINE_LABELS_VI[l]}</span>
          ))}
        </div>
        <ul className="mt-4 grid gap-4 md:grid-cols-2">
          {ROLES.map((r) => {
            const t = TONES[LINE_TONE[LINE_OF_ROLE[r]]];
            return (
              <li key={r} className={`overflow-hidden rounded-2xl border bg-white shadow-sm dark:bg-zinc-900/60 ${t.border}`}>
                <div className={`flex items-center justify-between px-4 py-2.5 ${t.tile}`}>
                  <h3 className="font-bold">{ROLE_LABELS_VI[r]}</h3>
                  <span className="text-xs font-medium">{LINE_LABELS_VI[LINE_OF_ROLE[r]]}</span>
                </div>
                <div className="space-y-3 p-4">
                  <p className="flex flex-wrap gap-1.5">
                    {ROLE_POSITIONS[r].map((c) => (
                      <span key={c} className="rounded-md border border-zinc-300 px-1.5 py-0.5 font-mono text-[11px] dark:border-zinc-600">{POSITION_NAMES[c]}</span>
                    ))}
                  </p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    <span className="font-medium text-current">Chỉ số công cụ xét: </span>
                    {(ROLE_ATTRS[r] as string[]).map((a) => (a === "height" ? "Chiều cao" : labelOf(a))).join(", ")}.
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <SectionTitle icon={Shirt} tone="rose">Đá lệch vị trí thì mất bao nhiêu</SectionTitle>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Khi chọn đội hình đáp trả, công cụ trừ điểm OVR của cầu thủ tùy mức lệch so với sở trường (đây là mô hình của công cụ, không phải con số của game).
          Cầu thủ càng lệch thì các điểm cộng theo chỉ số càng bị giảm.
        </p>
        <ul className="mt-4 space-y-3">
          {PENALTIES.map(([label, pts]) => (
            <li key={label}>
              <div className="flex items-baseline justify-between gap-4 text-sm">
                <span>{label}</span>
                <span className="font-bold tabular-nums">{pts ? `−${pts}` : "0"}</span>
              </div>
              <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                <div className={`h-full rounded-full ${pts >= 40 ? "bg-rose-600" : pts >= 12 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${Math.max(2, (pts / PENALTY_GK_MISMATCH) * 100)}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </section>
    </Article>
  );
}
