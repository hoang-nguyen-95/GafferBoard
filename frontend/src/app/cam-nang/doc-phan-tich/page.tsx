import { Article, rowCls, thCls } from "@/components/handbook/Article";
import { STRENGTH_PCT, WEAKNESS_PCT } from "@/engine/analysis";
import { HIGH_PCT, LOW_PCT } from "@/engine/rules";
import { MIN_BENCHMARK_TEAMS, METRICS } from "@/engine/opponent";
import { METRIC_NOTES } from "@/handbook/content";

export const metadata = { title: "Đọc bảng phân tích đối thủ · CounterPick FC" };

export default function ReadingAnalysisPage() {
  return (
    <Article
      title="Đọc bảng phân tích đối thủ"
      intro="Cách hiểu các con số trong trang phân tích của ứng dụng: phân vị, chỉ số đội, điểm mạnh yếu."
    >
      <section>
        <h2 className="text-xl font-semibold">Phân vị (P) là gì</h2>
        <p className="mt-2">
          Con số 72 tự nó không nói lên nhiều. Phân vị cho biết con số đó nằm ở đâu so với nhóm so sánh: <b>P90 nghĩa là tốt hơn 90% nhóm</b>,
          P10 nghĩa là chỉ hơn 10%. Với một cầu thủ, nhóm so sánh là các cầu thủ cùng vai trò (trong cùng giải nếu đủ đông, không thì toàn bộ
          dữ liệu). Với một đội, nhóm so sánh là các đội cùng giải, cần ít nhất {MIN_BENCHMARK_TEAMS} đội có đội hình.
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
          <li>Điểm mạnh của cầu thủ: chỉ số có phân vị từ <b>{STRENGTH_PCT}</b> trở lên; điểm yếu: từ <b>{WEAKNESS_PCT}</b> trở xuống.</li>
          <li>Với đội, công cụ coi là <b>thấp rõ</b> khi phân vị ≤ {LOW_PCT} và <b>cao rõ</b> khi ≥ {HIGH_PCT}. Đó là ngưỡng để các gợi ý đấu pháp kích hoạt.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Các chỉ số đội</h2>
        <p className="mt-2 text-sm text-zinc-500">
          Tính trên 11 người ra sân (cộng dự bị với chỉ số độ sâu). Chỉ số ghi “càng cao càng tốt” hay “càng thấp càng tốt” trong bảng để đọc phân vị cho đúng hướng.
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                <th className={thCls}>Chỉ số</th>
                <th className={thCls}>Cách tính</th>
                <th className={thCls}>Hướng</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(METRICS).map(([key, [label, higherIsBetter]]) => (
                <tr key={key} className={`${rowCls} align-top`}>
                  <td className="w-64 py-2 pr-3 font-medium">{label}</td>
                  <td className="py-2 pr-3">{METRIC_NOTES[key]}</td>
                  <td className="w-24 py-2 text-xs text-zinc-500">{higherIsBetter ? "cao tốt" : "thấp tốt"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Những điều dễ hiểu nhầm</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          <li>Chỉ số đội tính theo <b>đội hình xuất phát</b>. Nếu đối thủ đổi người, kết quả đổi theo.</li>
          <li>Phong độ 5 trận gần nhất chỉ chính xác khi bạn tự nhập kết quả. Phong độ ước tính từ dữ liệu game được ghi rõ là chưa xác nhận.</li>
          <li>Cầu thủ chấn thương không được tính vào dự bị và bị loại khỏi đội hình đáp trả.</li>
          <li>Đội hình nhập tay không có dự bị, phong độ hay chấn thương, nên các mục đó bị bỏ qua.</li>
        </ul>
      </section>
    </Article>
  );
}
