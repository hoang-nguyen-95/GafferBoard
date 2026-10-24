import { ArrowUpRight, Armchair, Battery, Check, Eye, Flag, Footprints, Hand, HeartPulse, Layers, Lightbulb, Swords, Wind, Zap, type LucideIcon } from "lucide-react";
import { Article } from "@/components/handbook/Article";
import { Callout, IconTile, TONES, type Tone } from "@/components/brand/ui";
import { RULES } from "@/engine/rules";
import { RULE_TRIGGERS, labelOf } from "@/handbook/content";

export const metadata = { title: "Gợi ý đấu pháp · CounterPick FC" };

const META: Record<string, { icon: LucideIcon; tone: Tone }> = {
  slow_defence: { icon: Footprints, tone: "emerald" }, weak_flank: { icon: Flag, tone: "amber" }, weak_midfield: { icon: Layers, tone: "sky" },
  fast_striker: { icon: Zap, tone: "rose" }, weak_goalkeeper: { icon: Hand, tone: "violet" }, aerial_threat: { icon: Wind, tone: "rose" },
  weak_aerial_defence: { icon: ArrowUpRight, tone: "emerald" }, tired_team: { icon: Battery, tone: "amber" }, injured_starters: { icon: HeartPulse, tone: "rose" },
  thin_bench: { icon: Armchair, tone: "zinc" }, key_players: { icon: Eye, tone: "violet" },
};
const LINE: Record<string, string> = { ATT: "hàng công", MID: "tiền vệ", DEF: "hàng thủ" };
const MAX_PRIORITY = Math.max(...RULES.map((r) => r.priority));

export default function TacticsPage() {
  return (
    <Article
      title="Gợi ý đấu pháp"
      icon={Swords}
      intro="Công cụ xét 11 tình huống của đối thủ. Mỗi tình huống chỉ được nêu khi số liệu thật sự cho thấy nó, kèm lý do bằng chỉ số. Thứ tự dưới đây là mức ưu tiên cơ bản; mức ưu tiên thực tế còn tùy tình huống rõ rệt đến đâu."
    >
      {RULES.map((rule, i) => {
        const m = META[rule.id] ?? { icon: Swords, tone: "emerald" as Tone };
        const t = TONES[m.tone];
        return (
          <section key={rule.id} id={rule.id} className={`scroll-mt-24 rounded-2xl border bg-white p-5 shadow-sm dark:bg-zinc-900/60 ${t.border}`}>
            <div className="flex items-start gap-4">
              <IconTile icon={m.icon} tone={m.tone} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Tình huống {i + 1}</p>
                <h2 className="text-xl font-bold tracking-tight">{rule.title}</h2>
                <div className="mt-2 flex items-center gap-2 text-xs text-zinc-500" title="Mức ưu tiên cơ bản của luật">
                  <span>Ưu tiên</span>
                  <span className="h-2 w-28 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"><span className={`block h-full ${t.bar}`} style={{ width: `${(rule.priority / MAX_PRIORITY) * 100}%` }} /></span>
                  <span className="tabular-nums">{rule.priority}</span>
                </div>
              </div>
            </div>
            <p className={`mt-4 rounded-lg px-3 py-2 text-sm ${t.soft}`}>
              <b className={t.text}>Khi nào: </b>{RULE_TRIGGERS[rule.id]}
            </p>
            <p className="mt-3 font-medium">{rule.advice}</p>
            <ul className="mt-3 space-y-1.5 text-sm">
              {rule.tactics.map((x) => (
                <li key={x} className="flex gap-2"><Check size={16} className={`mt-0.5 flex-none ${t.text}`} aria-hidden="true" />{x}</li>
              ))}
            </ul>
            {rule.emphasis && Object.keys(rule.emphasis).length > 0 && (
              <p className="mt-3 text-xs text-zinc-500">
                Khi chọn đội hình đáp trả, công cụ ưu tiên thêm:{" "}
                {Object.entries(rule.emphasis).map(([line, attrs]) => `${LINE[line] ?? line}: ${Object.keys(attrs).map(labelOf).join(", ")}`).join(" · ")}.
              </p>
            )}
          </section>
        );
      })}
      <Callout icon={Lightbulb} tone="amber" title="Lưu ý khi áp dụng">
        <ul className="list-disc space-y-1 pl-5">
          <li>Đây là gợi ý chung bằng lời, không gắn với tên tùy chọn cụ thể trong menu chiến thuật vì tên menu thay đổi theo bản game.</li>
          <li>Đối chiếu với trận đấu thật: một đội có số liệu hàng thủ chậm vẫn có thể phòng ngự tốt nhờ lùi sâu.</li>
          <li>Phân vị so với các đội cùng giải. Khi chưa có đủ đội để so, công cụ chỉ so trực tiếp với đội của bạn.</li>
        </ul>
      </Callout>
    </Article>
  );
}
