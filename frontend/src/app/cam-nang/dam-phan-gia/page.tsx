import { ArrowDown, ArrowUp, Check, Handshake, Scale } from "lucide-react";
import { PriceLadder } from "@/components/brand/Graphics";
import { Callout, SectionTitle } from "@/components/brand/ui";
import { Article, rowCls, thCls } from "@/components/handbook/Article";
import { NEGOTIATION, OLD_AGE } from "@/engine/manager";

export const metadata = { title: "Đàm phán giá · CounterPick FC" };

const pct = (x: number) => `${Math.round(x * 100)}%`;
const signed = (x: number) => `${x > 0 ? "+" : ""}${Math.round(x * 100)}%`;

export default function NegotiationGuidePage() {
  const A = NEGOTIATION.adjust;
  const FACTORS: [string, number, string][] = [
    ["Hợp đồng hết vào cuối mùa", A.expiring, "Bên bán sắp mất cầu thủ mà không thu được gì nên dễ nhượng bộ."],
    ["Hợp đồng còn 2 mùa", A.two_seasons, "Bên bán chịu chút áp lực."],
    ["Hợp đồng còn từ 4 mùa", A.long_contract, "Bên bán không cần vội, khó ép giá."],
    [`Cầu thủ từ ${OLD_AGE} tuổi`, A.old, "Giá trị sử dụng ngắn, giá thường thấp hơn."],
    ["Dưới 22 tuổi và POT hơn OVR từ 8 điểm", A.young_high_potential, "Cầu thủ trẻ tiềm năng cao thường bị đòi giá cao."],
  ];
  return (
    <Article
      title="Đàm phán giá"
      icon={Handshake}
      intro="Mục tiêu không phải trả giá thấp nhất có thể mà là trả giá hợp lý cho đúng người, không vượt kế hoạch tài chính. Công cụ dùng ba bậc giá tính theo “Giá trị” hiển thị trong game, điều chỉnh theo tình huống của cầu thủ."
    >
      <section>
        <SectionTitle icon={Scale} tone="amber">Ba bậc giá</SectionTitle>
        <div className="mt-2 rounded-2xl border border-zinc-200 bg-white px-6 pt-2 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60"><PriceLadder /></div>
        <table className="mt-5 w-full text-left text-sm">
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
        <div className="mt-4">
          <Callout icon={Scale} tone="amber" title="Chưa kiểm chứng">
            Đây là hệ số kinh nghiệm chung, <b>chưa được kiểm chứng với cách game định giá và chấp nhận đề nghị</b>. Hãy coi như điểm xuất phát và chỉnh theo thực tế bạn gặp trong save của mình.
          </Callout>
        </div>
      </section>

      <section>
        <SectionTitle icon={Handshake} tone="sky">Yếu tố làm đổi các bậc giá</SectionTitle>
        <ul className="mt-4 space-y-3">
          {FACTORS.map(([a, adj, why]) => (
            <li key={a} className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
              <span className={`inline-flex h-11 w-20 flex-none items-center justify-center gap-1 rounded-xl text-sm font-bold ${adj < 0 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"}`}>
                {adj < 0 ? <ArrowDown size={16} aria-hidden="true" /> : <ArrowUp size={16} aria-hidden="true" />}{signed(adj)}
              </span>
              <p className="text-sm"><b>{a}.</b> <span className="text-zinc-600 dark:text-zinc-400">{why}</span></p>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-zinc-500">Các điều chỉnh cộng dồn vào cả ba bậc; kết quả luôn nằm trong khoảng {pct(NEGOTIATION.bounds[0])} đến {pct(NEGOTIATION.bounds[1])} giá trị. Mũi tên xanh = giá thấp đi (có lợi cho bạn).</p>
      </section>

      <section>
        <SectionTitle icon={Check} tone="emerald">Nguyên tắc chung</SectionTitle>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            ["Bán trước, mua sau", "Có tiền từ việc bán cầu thủ dư thừa thì bạn đàm phán thoải mái hơn và không phải mua vội."],
            ["Biết giá tối đa trước khi bắt đầu", "Người đàm phán kém thường trả quá mức vì sa vào cuộc ép giá."],
            ["Nâng giá từng bước nhỏ", "Thay vì nhảy thẳng lên giá bên bán đòi."],
            ["Xem lương cùng lúc với giá", "Cầu thủ rẻ nhưng đòi lương cao vẫn ăn vào quỹ lương nhiều mùa."],
            ["Hợp đồng theo tuổi", "Ngắn cho người lớn tuổi; dài cho người trẻ tiềm năng để giữ giá trị bán lại."],
            ["Có phương án thay thế", "Shortlist 2–3 người cho một vị trí để không bị ép phải mua người duy nhất."],
          ].map(([a, b]) => (
            <li key={a} className="flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 text-sm dark:border-emerald-900 dark:bg-emerald-950/30">
              <Check size={18} className="mt-0.5 flex-none text-emerald-600" aria-hidden="true" />
              <p><b>{a}.</b> <span className="text-zinc-600 dark:text-zinc-400">{b}</span></p>
            </li>
          ))}
        </ul>
      </section>
    </Article>
  );
}
