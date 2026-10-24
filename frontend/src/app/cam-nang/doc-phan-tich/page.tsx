import { AlertTriangle, BarChart3, BookOpen, Gauge } from "lucide-react";
import { PercentileScale } from "@/components/brand/Graphics";
import { Callout, SectionTitle } from "@/components/brand/ui";
import { Article, rowCls, thCls } from "@/components/handbook/Article";
import { STRENGTH_PCT, WEAKNESS_PCT } from "@/engine/analysis";
import { MIN_BENCHMARK_TEAMS, METRICS } from "@/engine/opponent";
import { HIGH_PCT, LOW_PCT } from "@/engine/rules";
import { METRIC_NOTES } from "@/handbook/content";

export const metadata = { title: "Đọc bảng phân tích đối thủ · CounterPick FC" };

export default function ReadingAnalysisPage() {
  return (
    <Article
      title="Đọc bảng phân tích đối thủ"
      icon={BookOpen}
      intro="Cách hiểu các con số trong trang phân tích của ứng dụng: phân vị, chỉ số đội, điểm mạnh yếu."
    >
      <section>
        <SectionTitle icon={Gauge} tone="sky">Phân vị (P) là gì</SectionTitle>
        <p className="mt-3">
          Con số 72 tự nó không nói lên nhiều. Phân vị cho biết con số đó nằm ở đâu so với nhóm so sánh: <b>P90 nghĩa là tốt hơn 90% nhóm</b>,
          P10 nghĩa là chỉ hơn 10%. Với một cầu thủ, nhóm so sánh là các cầu thủ cùng vai trò (trong cùng giải nếu đủ đông, không thì toàn bộ
          dữ liệu). Với một đội, nhóm so sánh là các đội cùng giải, cần ít nhất {MIN_BENCHMARK_TEAMS} đội có đội hình.
        </p>
        <div className="mt-5 grid gap-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60 md:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-semibold">Cầu thủ</p>
            <PercentileScale weak={WEAKNESS_PCT} strong={STRENGTH_PCT} label={`Điểm yếu khi phân vị ≤ ${WEAKNESS_PCT}, điểm mạnh khi ≥ ${STRENGTH_PCT}`} />
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold">Đội (ngưỡng kích hoạt gợi ý đấu pháp)</p>
            <PercentileScale weak={LOW_PCT} strong={HIGH_PCT} label={`Thấp rõ khi phân vị ≤ ${LOW_PCT}, cao rõ khi ≥ ${HIGH_PCT}`} />
          </div>
        </div>
      </section>

      <section>
        <SectionTitle icon={BarChart3} tone="emerald">Các chỉ số đội</SectionTitle>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Tính trên 11 người ra sân (cộng dự bị với chỉ số độ sâu). Cột “Hướng” cho biết đọc phân vị theo chiều nào.
        </p>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/60">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-900">
              <tr><th className={`${thCls} px-4`}>Chỉ số</th><th className={thCls}>Cách tính</th><th className={thCls}>Hướng</th></tr>
            </thead>
            <tbody>
              {Object.entries(METRICS).map(([key, [label, higherIsBetter]]) => (
                <tr key={key} className={`${rowCls} align-top`}>
                  <td className="w-64 px-4 py-2.5 font-medium">{label}</td>
                  <td className="py-2.5 pr-3 text-zinc-600 dark:text-zinc-400">{METRIC_NOTES[key]}</td>
                  <td className="w-24 py-2.5 pr-3">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${higherIsBetter ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"}`}>
                      {higherIsBetter ? "cao tốt" : "thấp tốt"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <SectionTitle icon={AlertTriangle} tone="amber">Những điều dễ hiểu nhầm</SectionTitle>
        <ul className="mt-4 grid gap-3">
          {[
            "Chỉ số đội tính theo đội hình xuất phát. Nếu đối thủ đổi người, kết quả đổi theo.",
            "Phong độ 5 trận gần nhất chỉ chính xác khi bạn tự nhập kết quả. Phong độ ước tính từ dữ liệu game được ghi rõ là chưa xác nhận.",
            "Cầu thủ chấn thương không được tính vào dự bị và bị loại khỏi đội hình đáp trả.",
            "Đội hình nhập tay không có dự bị, phong độ hay chấn thương, nên các mục đó bị bỏ qua.",
          ].map((t) => (
            <li key={t}><Callout icon={AlertTriangle} tone="amber">{t}</Callout></li>
          ))}
        </ul>
      </section>
    </Article>
  );
}
