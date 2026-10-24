import { ArrowRight, BookOpen, Coins, Handshake, Layers, LineChart, Search, Shirt, Swords, Target, Timer, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { IconTile, type Tone } from "@/components/brand/ui";

export const metadata = { title: "Cẩm nang · CounterPick FC" };

type Item = { href: string; title: string; text: string; icon: LucideIcon; tone: Tone };
const GROUPS: { title: string; blurb: string; items: Item[] }[] = [
  {
    title: "Hiểu cầu thủ", blurb: "Đọc đúng con số trước khi quyết định.",
    items: [
      { href: "/cam-nang/chi-so", title: "Chỉ số cầu thủ", text: "34 chỉ số chia theo nhóm, mỗi chỉ số làm gì và quan trọng với vị trí nào.", icon: LineChart, tone: "sky" },
      { href: "/cam-nang/vi-tri", title: "Vị trí và vai trò", text: "9 vai trò, chỉ số then chốt và điểm trừ khi đá lệch vị trí.", icon: Shirt, tone: "violet" },
      { href: "/cam-nang/tuoi-va-tiem-nang", title: "Tuổi và tiềm năng", text: "OVR, POT và tuổi: khi nào mua người trẻ, khi nào mua người ở đỉnh cao.", icon: Timer, tone: "amber" },
      { href: "/cam-nang/mua-theo-vi-tri", title: "Mua theo vị trí", text: "Mỗi vai trò cần chỉ số gì, nên nhìn và nên tránh điều gì.", icon: Search, tone: "emerald" },
    ],
  },
  {
    title: "Quản lý và chuyển nhượng", blurb: "Từ chọn mục tiêu đến chốt giá.",
    items: [
      { href: "/cam-nang/mua-cau-thu", title: "Mua cầu thủ", text: "Quy trình 6 bước đánh giá một thương vụ và cách chấm điểm đáng mua.", icon: Target, tone: "emerald" },
      { href: "/cam-nang/dam-phan-gia", title: "Đàm phán giá", text: "Ba bậc giá, các yếu tố làm đổi giá và nguyên tắc đàm phán.", icon: Handshake, tone: "amber" },
      { href: "/cam-nang/tai-chinh", title: "Tài chính manager", text: "Ngân sách chuyển nhượng, quỹ lương, lập kế hoạch một kỳ chuyển nhượng.", icon: Coins, tone: "violet" },
    ],
  },
  {
    title: "Chiến thuật", blurb: "Đọc đối thủ và chọn cách đáp trả.",
    items: [
      { href: "/cam-nang/chien-thuat", title: "Gợi ý đấu pháp", text: "11 tình huống của đối thủ: khi nào áp dụng, nên làm gì.", icon: Swords, tone: "rose" },
      { href: "/cam-nang/so-do", title: "Sơ đồ khắc chế", text: "Gặp sơ đồ nào thì nên dùng sơ đồ nào, và vì sao.", icon: Layers, tone: "zinc" },
      { href: "/cam-nang/doc-phan-tich", title: "Đọc bảng phân tích", text: "Phân vị là gì, chỉ số đội tính thế nào, điểm mạnh yếu xác định ra sao.", icon: BookOpen, tone: "sky" },
    ],
  },
];

export default function HandbookHome() {
  return (
    <main className="flex-1">
      <div className="pitch-stripes bg-gradient-to-br from-emerald-800 via-emerald-700 to-emerald-900 text-white">
        <div className="mx-auto w-full max-w-5xl px-6 py-12">
          <h1 className="text-4xl font-bold tracking-tight">Cẩm nang người chơi Career Mode</h1>
          <p className="mt-3 max-w-2xl text-emerald-50/95">
            Cách đọc chỉ số cầu thủ, chọn mua cầu thủ, quản lý tài chính và phân tích chiến thuật khi đối đầu một đội. Mọi trang dùng cùng quy tắc mà ứng dụng CounterPick FC
            dùng để phân tích, nên đọc xong bạn hiểu vì sao ứng dụng gợi ý như vậy.
          </p>
        </div>
      </div>
      <div className="mx-auto w-full max-w-5xl space-y-12 px-6 py-12">
        {GROUPS.map((g) => (
          <section key={g.title}>
            <h2 className="text-2xl font-bold tracking-tight">{g.title}</h2>
            <p className="mt-1 text-sm text-zinc-500">{g.blurb}</p>
            <ul className="mt-5 grid gap-4 sm:grid-cols-2">
              {g.items.map((s) => (
                <li key={s.href}>
                  <Link href={s.href} className="group flex h-full gap-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-emerald-700">
                    <IconTile icon={s.icon} tone={s.tone} size="lg" />
                    <span>
                      <span className="flex items-center gap-1 font-semibold">{s.title} <ArrowRight size={14} className="opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" aria-hidden="true" /></span>
                      <span className="mt-1 block text-sm text-zinc-600 dark:text-zinc-400">{s.text}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
