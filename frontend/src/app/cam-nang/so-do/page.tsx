import { ArrowRight, Layers, Swords } from "lucide-react";
import { Article } from "@/components/handbook/Article";
import { Callout } from "@/components/brand/ui";
import { MiniFormation } from "@/components/brand/Pitch";
import counters from "@/engine/data/counters.json";

export const metadata = { title: "Sơ đồ khắc chế · CounterPick FC" };

const TABLE = (counters as { counters: Record<string, { formation: string; reason: string }[]> }).counters;

export default function FormationsPage() {
  return (
    <Article
      title="Sơ đồ khắc chế"
      icon={Layers}
      intro="Gặp đối thủ đá sơ đồ nào thì nên đá sơ đồ nào? Bảng dưới là kinh nghiệm chung về cách các sơ đồ đối đầu nhau ở trung lộ và hai biên. Công cụ cũng xét các sơ đồ này khi đề xuất đội hình đáp trả, cùng với sơ đồ bạn đang dùng."
    >
      {Object.entries(TABLE).map(([opponent, list]) => (
        <section key={opponent} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
          <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <Swords size={20} className="text-rose-600" aria-hidden="true" /> Đối thủ đá {opponent}
          </h2>
          <div className="mt-4 grid gap-5 md:grid-cols-[auto_1fr]">
            <div className="flex flex-col items-center gap-1">
              <MiniFormation name={opponent} tone="rose" label={`Sơ đồ đối thủ ${opponent}`} />
              <span className="text-xs font-medium text-rose-600 dark:text-rose-400">{opponent} (đối thủ)</span>
            </div>
            <ul className="space-y-3">
              {list.map((c) => (
                <li key={c.formation} className="flex items-center gap-4 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 dark:border-emerald-900 dark:bg-emerald-950/30">
                  <ArrowRight size={18} className="hidden flex-none text-emerald-600 sm:block" aria-hidden="true" />
                  <MiniFormation name={c.formation} label={`Sơ đồ gợi ý ${c.formation}`} />
                  <div>
                    <p className="font-bold">{c.formation}</p>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">{c.reason}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ))}
      <Callout icon={Layers} tone="sky">
        Sơ đồ chỉ là một phần: đội hình có đủ người hợp sơ đồ đó hay không còn quan trọng hơn. Đừng đổi sơ đồ chỉ vì bảng này nếu bạn không có cầu thủ phù hợp.
      </Callout>
    </Article>
  );
}
