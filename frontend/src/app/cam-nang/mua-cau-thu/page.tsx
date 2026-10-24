import Link from "next/link";
import { Article, rowCls, thCls } from "@/components/handbook/Article";
import {
  DEFAULT_MAX_AGE, GROWTH_MAX_AGE, MAX_PRIME_SEASONS, NEED_WEIGHTS, OLD_AGE, PRIME_END_AGE, TARGET_WEIGHTS,
} from "@/engine/manager";

export const metadata = { title: "Mua cầu thủ: đọc gì trước khi chi tiền · CounterPick FC" };

const STEPS = [
  ["Xác định vị trí cần mua", "Đừng mua theo cảm hứng. Nhìn đội hình chính: vị trí nào người đá chính yếu hơn mặt bằng đội, thiếu dự bị, người đá chính đã lớn tuổi hoặc sắp hết hợp đồng. Đó là nơi mỗi đồng tiền đem lại nhiều nhất."],
  ["So với người đang đá chính", "Một cầu thủ 80 OVR là nâng cấp lớn nếu người đá chính yếu nhất của bạn là 70, nhưng gần như vô nghĩa nếu bạn đã có người 80. Luôn so với người sẽ bị thay."],
  ["Tuổi và tiềm năng", "Tuổi quyết định bạn dùng được cầu thủ bao lâu và bán lại được bao nhiêu. Xem trang “Tuổi và tiềm năng” để biết khi nào nên mua người trẻ, khi nào nên mua người đang ở đỉnh cao."],
  ["Hợp đồng còn bao lâu", "Hợp đồng sắp hết thường làm bên bán dễ nhượng bộ giá, nhưng cũng nghĩa là bạn phải sớm gia hạn lương. Hợp đồng dài làm giá khó ép nhưng giữ được giá trị bán lại."],
  ["Có hợp lối chơi và vị trí không", "Xem chỉ số then chốt của vai trò (trang “Mua theo vị trí”) và vị trí sở trường: đá lệch vị trí bị trừ điểm theo bảng ở trang “Vị trí và vai trò”."],
  ["Giá và lương", "Giá chuyển nhượng chỉ là một nửa chi phí; lương mới là chi phí lặp lại mỗi mùa. Kiểm tra cả ngân sách chuyển nhượng lẫn quỹ lương còn lại (xem trang “Tài chính”)."],
];

export default function BuyingGuidePage() {
  return (
    <Article
      title="Mua cầu thủ: đọc gì trước khi chi tiền"
      intro="Một quy trình 6 bước để biến việc mua cầu thủ từ cảm tính thành quyết định có lý do. Chế độ Manager trong ứng dụng Windows làm sẵn các bước 1, 2, 3, 4 và 6 từ dữ liệu save của bạn."
    >
      <section>
        <ol className="space-y-4">
          {STEPS.map(([title, text], i) => (
            <li key={title} className="flex gap-3">
              <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-emerald-600 text-sm font-semibold text-white">{i + 1}</span>
              <div>
                <h2 className="font-semibold">{title}</h2>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Ứng dụng chấm “điểm đáng mua” thế nào</h2>
        <p className="mt-2 text-sm">
          Với mỗi cầu thủ cùng vai trò mà bạn chưa có, ứng dụng cộng điểm theo 4 yếu tố rồi xếp từ cao xuống thấp. Bạn bấm “Vì sao điểm này” trong ứng dụng để xem từng phần.
        </p>
        <table className="mt-3 w-full text-left text-sm">
          <thead><tr><th className={thCls}>Yếu tố</th><th className={thCls}>Điểm</th></tr></thead>
          <tbody>
            {[
              ["Nâng cấp so với người đá chính yếu nhất cùng vai trò (chênh lệch OVR)", `× ${TARGET_WEIGHTS.upgrade}`],
              [`Tiềm năng còn lại (POT − OVR) của cầu thủ đến ${GROWTH_MAX_AGE} tuổi`, `× ${TARGET_WEIGHTS.growth}`],
              [`Số mùa còn trong độ tuổi đỉnh cao (tới ${PRIME_END_AGE} tuổi, tối đa ${MAX_PRIME_SEASONS})`, `× ${TARGET_WEIGHTS.prime}`],
              ["Hợp đồng hết vào cuối mùa này (có thể mua rẻ hơn)", `+ ${TARGET_WEIGHTS.expiring}`],
            ].map(([a, b]) => (
              <tr key={a} className={rowCls}><td className="py-2 pr-3">{a}</td><td className="py-2 font-semibold tabular-nums">{b}</td></tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-zinc-500">Đây là hệ số kinh nghiệm để xếp hạng, không phải giá trị thật của game.</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Ứng dụng đánh giá nhu cầu đội hình thế nào</h2>
        <p className="mt-2 text-sm">Mỗi vai trò trong đội hình chính được cộng điểm ưu tiên khi gặp các tình huống sau; điểm cao thì nên củng cố sớm.</p>
        <table className="mt-3 w-full text-left text-sm">
          <thead><tr><th className={thCls}>Tình huống</th><th className={thCls}>Điểm ưu tiên</th></tr></thead>
          <tbody>
            {[
              ["Người đá chính yếu nhất thấp hơn OVR trung bình đội hình chính từ 3 điểm trở lên", `${NEED_WEIGHTS.quality} điểm cho mỗi điểm chênh (tối đa ${NEED_WEIGHTS.quality_cap} điểm chênh)`],
              ["Không có cầu thủ dự bị cùng vai trò", `${NEED_WEIGHTS.no_depth}`],
              ["Dự bị tốt nhất kém người đá chính yếu nhất hơn 8 điểm", `${NEED_WEIGHTS.thin_depth}`],
              [`Mỗi người đá chính từ ${OLD_AGE} tuổi trở lên`, `${NEED_WEIGHTS.old}`],
              ["Mỗi người đá chính hết hợp đồng vào cuối mùa", `${NEED_WEIGHTS.expiring}`],
            ].map(([a, b]) => (
              <tr key={a} className={rowCls}><td className="py-2 pr-3">{a}</td><td className="py-2 font-semibold">{b}</td></tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Giới hạn cần biết</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          <li>Dữ liệu xuất từ Live Editor hiện <b>không có giá trị cầu thủ, lương hay ngân sách</b>. Giá, lương và ngân sách bạn đọc trong game rồi nhập vào ứng dụng.</li>
          <li>Năm hết hợp đồng (<code>contract_until</code>) được hiểu là năm dương lịch hợp đồng kết thúc. Nếu ứng dụng đoán sai mùa hiện tại, chỉnh “năm kết thúc mùa” ở tab Ngân sách.</li>
          <li>Mục tiêu mặc định chỉ gồm cầu thủ tới {DEFAULT_MAX_AGE} tuổi và loại cầu thủ huyền thoại (Classic League) vì không mua được trong Career. Cầu thủ ở giải “Cầu thủ tự do” được gắn nhãn; cầu thủ không thuộc CLB nào trong dữ liệu cũng được gắn nhãn nhưng ứng dụng không chắc chắn.</li>
          <li>Ứng dụng không biết hồ sơ ưa thích của cầu thủ (muốn chơi chính, muốn giải nào), nên một mục tiêu tốt trên giấy vẫn có thể từ chối bạn.</li>
        </ul>
        <p className="mt-3 text-sm">Xem tiếp: <Link href="/cam-nang/tuoi-va-tiem-nang" className="underline">Tuổi và tiềm năng</Link>, <Link href="/cam-nang/dam-phan-gia" className="underline">Đàm phán giá</Link>, <Link href="/cam-nang/tai-chinh" className="underline">Tài chính</Link>.</p>
      </section>
    </Article>
  );
}
