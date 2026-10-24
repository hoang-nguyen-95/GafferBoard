import type { Advice } from "@/lib/api";

export function Suggestions({ advice }: { advice: Advice }) {
  return (
    <section className="mb-10">
      <h2 className="mb-1 text-lg font-semibold">Gợi ý đấu pháp</h2>
      <p className="mb-3 text-xs text-zinc-500">
        Sắp theo mức ưu tiên (luật cơ bản × độ rõ rệt của tình huống). Gợi ý chiến thuật viết chung, bạn tự đối chiếu với
        tùy chọn trong game.
        {advice.my_team ? ` So sánh với đội của bạn: ${advice.my_team.name}.` : ""}
      </p>
      {advice.notes.length > 0 && (
        <ul className="mb-3 list-disc pl-5 text-xs text-amber-600">
          {advice.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}
      {advice.suggestions.length === 0 ? (
        <p className="text-sm text-zinc-500">Không có tình huống nào nổi bật để khai thác theo các luật hiện có.</p>
      ) : (
        <ol className="space-y-4">
          {advice.suggestions.map((s, i) => (
            <li key={s.rule_id} className="rounded border border-zinc-200 p-4 dark:border-zinc-800">
              <div className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-semibold text-white">
                  {i + 1}
                </span>
                <div className="space-y-2 text-sm">
                  <h3 className="font-semibold">{s.title}</h3>
                  <p>{s.advice}</p>
                  <div>
                    <p className="text-xs font-medium text-zinc-500">Lý do (chỉ số)</p>
                    <ul className="list-disc pl-5 text-zinc-600 dark:text-zinc-400">
                      {s.evidence.map((e) => (
                        <li key={e}>{e}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-zinc-500">Gợi ý chiến thuật / chỉ dẫn cầu thủ</p>
                    <ul className="list-disc pl-5">
                      {s.tactics.map((t) => (
                        <li key={t}>{t}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}

      {advice.formation_counters.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-1 font-semibold">Sơ đồ khắc chế {advice.opponent_formation}</h3>
          <p className="mb-2 text-xs text-zinc-500">Gợi ý tham khảo theo kinh nghiệm (bảng cấu hình trong app/data/formation_counters.yaml).</p>
          <ul className="space-y-1 text-sm">
            {advice.formation_counters.map((c) => (
              <li key={c.formation}>
                <span className="font-medium">{c.formation}</span> — {c.reason}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
