import { Check, Coins, PiggyBank, Wallet } from "lucide-react";
import Link from "next/link";
import { Callout, IconTile, SectionTitle } from "@/components/brand/ui";
import { Article } from "@/components/handbook/Article";

export const metadata = { title: "Tài chính khi làm manager · CounterPick FC" };

export default function FinanceGuidePage() {
  return (
    <Article
      title="Tài chính khi làm manager"
      icon={Coins}
      intro="Trong Career Mode có hai nguồn lực giới hạn: tiền chuyển nhượng (một lần) và quỹ lương (lặp lại mỗi mùa). Quản lý tốt cả hai quan trọng hơn việc mua được một ngôi sao."
    >
      <section>
        <SectionTitle icon={Wallet} tone="violet">Hai ngân sách khác nhau</SectionTitle>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-violet-200 bg-white p-5 shadow-sm dark:border-violet-900 dark:bg-zinc-900/60">
            <IconTile icon={Wallet} tone="violet" size="lg" />
            <h3 className="mt-3 text-lg font-bold">Ngân sách chuyển nhượng</h3>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Số tiền bạn có thể trả cho phí chuyển nhượng. Bán cầu thủ cộng vào, mua trừ đi. Dùng một lần cho mỗi thương vụ.</p>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm dark:border-amber-900 dark:bg-zinc-900/60">
            <IconTile icon={Coins} tone="amber" size="lg" />
            <h3 className="mt-3 text-lg font-bold">Quỹ lương</h3>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Mức tổng lương cho phép, trả lặp lại mỗi mùa. Mỗi cầu thủ vào làm tăng, mỗi cầu thủ ra làm giảm. Vượt quỹ lương thường sẽ chặn bạn ký thêm người.</p>
          </div>
        </div>
        <div className="mt-4">
          <Callout icon={Coins} tone="amber">Một thương vụ rẻ về phí nhưng đắt về lương có thể tệ hơn một thương vụ đắt phí mà lương vừa phải, vì lương trả mỗi mùa.</Callout>
        </div>
      </section>

      <section>
        <SectionTitle icon={PiggyBank} tone="emerald">Lập kế hoạch cho một kỳ chuyển nhượng</SectionTitle>
        <ol className="mt-4 space-y-3">
          {[
            ["Ghi lại số hiện có", "Ngân sách chuyển nhượng còn lại và quỹ lương còn trống (đọc ở màn Tài chính của game)."],
            ["Liệt kê cầu thủ dư", "Người ngoài kế hoạch, lớn tuổi hợp đồng ngắn, người đòi lương cao nhưng ít được ra sân. Nhập giá bán dự kiến."],
            ["Xếp hạng vị trí cần mua", "Theo mức ưu tiên rồi chia ngân sách theo mức cần (ứng dụng gợi ý tỷ lệ)."],
            ["Lập shortlist 2–3 người mỗi vị trí", "Kèm giá và lương dự kiến; ứng dụng cộng tổng và cảnh báo khi vượt ngân sách."],
            ["Chừa dự phòng", "Đừng dùng hết 100% ngân sách ngay đầu kỳ; giá thường nhích lên trong lúc đàm phán và có thể cần một vị trí bất ngờ (chấn thương)."],
          ].map(([a, b], i) => (
            <li key={a} className="flex gap-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">{i + 1}</span>
              <p className="text-sm"><b>{a}.</b> <span className="text-zinc-600 dark:text-zinc-400">{b}</span></p>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <SectionTitle icon={Check} tone="sky">Chi cho đâu thì đáng</SectionTitle>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            "Ưu tiên vị trí có khoảng cách nâng cấp lớn nhất và đá chính nhiều phút, vì cùng một khoản tiền cho tác động lớn hơn.",
            "Với vị trí đã khá ổn, dự bị chất lượng vừa phải thường kinh tế hơn mua thêm ngôi sao.",
            "Cầu thủ trẻ tiềm năng là khoản đầu tư chậm: chỉ chi khi ngân sách đã đủ cho các vị trí cần ngay.",
            "Cầu thủ sắp hết hợp đồng cho phép bạn chờ giá thấp hơn, nhưng đừng để vị trí quan trọng bị bỏ trống chỉ vì tiết kiệm.",
          ].map((t) => (
            <li key={t} className="flex gap-3 rounded-xl border border-sky-200 bg-sky-50/50 p-4 text-sm dark:border-sky-900 dark:bg-sky-950/30">
              <Check size={18} className="mt-0.5 flex-none text-sky-600" aria-hidden="true" />{t}
            </li>
          ))}
        </ul>
      </section>

      <Callout icon={PiggyBank} tone="emerald" title="Chế độ Manager làm gì trong phần này">
        Tab Ngân sách &amp; shortlist cộng chi phí, thu từ bán, tính số dư và cảnh báo vượt ngân sách chuyển nhượng hoặc quỹ lương; tính điểm đáng mua trên mỗi triệu để so sánh các mục tiêu;
        gợi ý chia ngân sách theo vị trí cần. Dữ liệu xuất từ Live Editor hiện không có số tiền của game, nên bạn nhập tay các con số đọc từ màn Tài chính.
        Xem <Link href="/cam-nang/mua-cau-thu" className="underline">cách chấm điểm</Link> và <Link href="/cam-nang/dam-phan-gia" className="underline">đàm phán giá</Link>.
      </Callout>
    </Article>
  );
}
