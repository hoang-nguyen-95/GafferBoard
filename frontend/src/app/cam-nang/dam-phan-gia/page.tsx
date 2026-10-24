import { Article, rowCls, thCls } from "@/components/handbook/Article";
import { NEGOTIATION, OLD_AGE } from "@/engine/manager";

export const metadata = { title: "Đàm phán giá · CounterPick FC" };

const pct = (x: number) => `${Math.round(x * 100)}%`;
const signed = (x: number) => `${x > 0 ? "+" : ""}${Math.round(x * 100)}%`;

export default function NegotiationGuidePage() {
  const A = NEGOTIATION.adjust;
  return (
    <Article
      title="Đàm phán giá"
      intro="Mục tiêu không phải trả giá thấp nhất có thể mà là trả giá hợp lý cho đúng người, không vượt kế hoạch tài chính. Công cụ dùng ba bậc giá tính theo “Giá trị” hiển thị trong game, điều chỉnh theo tình huống của cầu thủ."
    >
      <section>
        <h2 className="text-xl font-semibold">Ba bậc giá</h2>
        <table className="mt-3 w-full text-left text-sm">
          <thead><tr><th className={thCls}>Bước</th><th className={thCls}>Mức gốc</th><th className={thCls}>Ý nghĩa</th></tr></thead>
          <tbody>
            {[
              ["Mở giá", pct(NEGOTIATION.base.open), "Đề nghị đầu tiên: đủ thấp để còn chỗ nâng, đủ cao để bên bán không từ chối thẳng."],
              ["Mục tiêu chốt", pct(NEGOTIATION.base.target), "Mức bạn muốn đạt được. Nâng từng bước nhỏ từ giá mở tới đây."],
              ["Giá tối đa nên trả", pct(NEGOTIATION.base.walk), "Quá mức này thì dừng lại và tìm người khác. Đặt trước khi đàm phán để không bị cuốn theo."],
            ].map(([a, b, c]) => (
              <tr key={a} className={`${rowCls} align-top`}><td className="w-40 py-2 pr-3 font-medium">{a}</td><td className="w-24 py-2 pr-3 tabular-nums">{b}</td><td className="py-2 text-zinc-600 dark:text-zinc-400">{c}</td></tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-zinc-500">
          Đây là hệ số kinh nghiệm chung, <b>chưa được kiểm chứng với cách game định giá và chấp nhận đề nghị</b>. Hãy coi như điểm xuất phát và chỉnh theo thực tế bạn gặp trong save của mình.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Yếu tố làm đổi các bậc giá</h2>
        <table className="mt-3 w-full text-left text-sm">
          <thead><tr><th className={thCls}>Tình huống</th><th className={thCls}>Điều chỉnh</th><th className={thCls}>Vì sao</th></tr></thead>
          <tbody>
            {[
              ["Hợp đồng hết vào cuối mùa", signed(A.expiring), "Bên bán sắp mất cầu thủ mà không thu được gì nên dễ nhượng bộ."],
              ["Hợp đồng còn 2 mùa", signed(A.two_seasons), "Bên bán chịu chút áp lực."],
              ["Hợp đồng còn từ 4 mùa", signed(A.long_contract), "Bên bán không cần vội, khó ép giá."],
              [`Cầu thủ từ ${OLD_AGE} tuổi`, signed(A.old), "Giá trị sử dụng ngắn, giá thường thấp hơn."],
              ["Dưới 22 tuổi và POT hơn OVR từ 8 điểm", signed(A.young_high_potential), "Cầu thủ trẻ tiềm năng cao thường bị đòi giá cao."],
            ].map(([a, b, c]) => (
              <tr key={a} className={`${rowCls} align-top`}><td className="w-64 py-2 pr-3 font-medium">{a}</td><td className="w-24 py-2 pr-3 tabular-nums">{b}</td><td className="py-2 text-zinc-600 dark:text-zinc-400">{c}</td></tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-zinc-500">Các điều chỉnh cộng dồn vào cả ba bậc; kết quả luôn nằm trong khoảng {pct(NEGOTIATION.bounds[0])} đến {pct(NEGOTIATION.bounds[1])} giá trị.</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Nguyên tắc chung</h2>
        <ul className="mt-2 list-disc space-y-2 pl-5 text-sm">
          <li><b>Bán trước, mua sau.</b> Có tiền từ việc bán cầu thủ dư thừa thì bạn đàm phán thoải mái hơn và không phải mua vội.</li>
          <li><b>Biết giá tối đa trước khi bắt đầu.</b> Người đàm phán kém thường trả quá mức vì sa vào cuộc ép giá.</li>
          <li><b>Nâng giá từng bước nhỏ</b> thay vì nhảy thẳng lên giá bên bán đòi.</li>
          <li><b>Xem lương cùng lúc với giá.</b> Cầu thủ rẻ nhưng đòi lương cao vẫn ăn vào quỹ lương nhiều mùa.</li>
          <li><b>Hợp đồng theo tuổi:</b> ngắn cho người lớn tuổi; dài cho người trẻ tiềm năng để giữ giá trị bán lại.</li>
          <li><b>Có phương án thay thế.</b> Shortlist 2–3 người cho một vị trí để không bị ép phải mua người duy nhất.</li>
        </ul>
      </section>
    </Article>
  );
}
