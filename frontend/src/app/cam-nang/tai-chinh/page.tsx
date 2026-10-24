import Link from "next/link";
import { Article } from "@/components/handbook/Article";

export const metadata = { title: "Tài chính khi làm manager · CounterPick FC" };

export default function FinanceGuidePage() {
  return (
    <Article
      title="Tài chính khi làm manager"
      intro="Trong Career Mode có hai nguồn lực giới hạn: tiền chuyển nhượng (một lần) và quỹ lương (lặp lại mỗi mùa). Quản lý tốt cả hai quan trọng hơn việc mua được một ngôi sao."
    >
      <section>
        <h2 className="text-xl font-semibold">Hai ngân sách khác nhau</h2>
        <ul className="mt-2 list-disc space-y-2 pl-5 text-sm">
          <li><b>Ngân sách chuyển nhượng</b> là số tiền bạn có thể trả cho phí chuyển nhượng. Bán cầu thủ sẽ cộng vào, mua sẽ trừ đi.</li>
          <li><b>Quỹ lương</b> là mức tổng lương cho phép. Mỗi cầu thủ vào làm tăng quỹ lương, mỗi cầu thủ ra làm giảm. Vượt quỹ lương thường sẽ chặn bạn ký thêm người.</li>
          <li>Một thương vụ rẻ về phí nhưng đắt về lương có thể tệ hơn một thương vụ đắt phí mà lương vừa phải, vì lương trả mỗi mùa.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Lập kế hoạch cho một kỳ chuyển nhượng</h2>
        <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm">
          <li><b>Ghi lại số hiện có:</b> ngân sách chuyển nhượng còn lại và quỹ lương còn trống (đọc ở màn Tài chính của game).</li>
          <li><b>Liệt kê cầu thủ dư:</b> người ngoài kế hoạch, lớn tuổi hợp đồng ngắn, người đòi lương cao nhưng ít được ra sân. Nhập giá bán dự kiến.</li>
          <li><b>Xếp hạng vị trí cần mua</b> theo mức ưu tiên rồi chia ngân sách theo mức cần (ứng dụng gợi ý tỷ lệ).</li>
          <li><b>Lập shortlist 2–3 người mỗi vị trí</b> kèm giá và lương dự kiến; ứng dụng cộng tổng và cảnh báo khi vượt ngân sách.</li>
          <li><b>Chừa dự phòng:</b> đừng dùng hết 100% ngân sách ngay đầu kỳ; giá thường nhích lên trong lúc đàm phán và có thể cần một vị trí bất ngờ (chấn thương).</li>
        </ol>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Chi cho đâu thì đáng</h2>
        <ul className="mt-2 list-disc space-y-2 pl-5 text-sm">
          <li>Ưu tiên vị trí có <b>khoảng cách nâng cấp lớn nhất</b> và đá chính nhiều phút, vì cùng một khoản tiền cho tác động lớn hơn.</li>
          <li>Với vị trí đã khá ổn, <b>dự bị chất lượng vừa phải</b> thường kinh tế hơn mua thêm ngôi sao.</li>
          <li>Cầu thủ trẻ tiềm năng là khoản đầu tư chậm: chỉ chi khi ngân sách đã đủ cho các vị trí cần ngay.</li>
          <li>Cầu thủ sắp hết hợp đồng cho phép bạn chờ giá thấp hơn, nhưng đừng để vị trí quan trọng bị bỏ trống chỉ vì tiết kiệm.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Chế độ Manager làm gì trong phần này</h2>
        <p className="mt-2 text-sm">
          Tab Ngân sách &amp; shortlist cộng chi phí, thu từ bán, tính số dư và cảnh báo vượt ngân sách chuyển nhượng hoặc quỹ lương; tính điểm đáng mua trên mỗi triệu để so sánh các mục tiêu;
          gợi ý chia ngân sách theo vị trí cần. Dữ liệu xuất từ Live Editor hiện không có số tiền của game, nên bạn nhập tay các con số đọc từ màn Tài chính.
          Xem <Link href="/cam-nang/mua-cau-thu" className="underline">cách chấm điểm</Link> và <Link href="/cam-nang/dam-phan-gia" className="underline">đàm phán giá</Link>.
        </p>
      </section>
    </Article>
  );
}
