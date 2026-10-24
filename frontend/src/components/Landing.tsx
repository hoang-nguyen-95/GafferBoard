import { ArrowRight, BookOpen, Briefcase, Download, FolderSync, Handshake, Layers, LineChart, Shirt, ShieldCheck, Swords, Target, Users } from "lucide-react";
import Link from "next/link";
import { AppPreview } from "@/components/brand/AppPreview";
import { HeroPitch } from "@/components/brand/Pitch";
import { IconTile, type Tone } from "@/components/brand/ui";
import { DownloadButton } from "@/components/handbook/DownloadButton";
import counters from "@/engine/data/counters.json";
import { RULES } from "@/engine/rules";
import { STAT_GROUPS } from "@/handbook/content";

const FEATURES: { href: string; title: string; text: string; icon: typeof Users; tone: Tone }[] = [
  { href: "/cau-thu", title: "Danh sách cầu thủ", text: "Bảng toàn bộ cầu thủ với mọi chỉ số, lọc theo vị trí, giải, tuổi và xem phân tích từng người.", icon: Users, tone: "sky" },
  { href: "/cam-nang/chi-so", title: "Chỉ số cầu thủ", text: "Mỗi chỉ số làm gì, quan trọng với vị trí nào, đọc phân vị thế nào.", icon: LineChart, tone: "sky" },
  { href: "/cam-nang/vi-tri", title: "Vị trí và vai trò", text: "Chỉ số then chốt của từng vai trò và điểm trừ khi đá lệch vị trí.", icon: Shirt, tone: "violet" },
  { href: "/cam-nang/mua-cau-thu", title: "Mua cầu thủ", text: "Quy trình 6 bước đọc tuổi, tiềm năng, hợp đồng để chọn người đáng mua.", icon: Target, tone: "emerald" },
  { href: "/cam-nang/dam-phan-gia", title: "Đàm phán giá", text: "Ba bậc giá và các yếu tố làm đổi giá khi vào mùa chuyển nhượng.", icon: Handshake, tone: "amber" },
  { href: "/cam-nang/chien-thuat", title: "Gợi ý đấu pháp", text: "11 tình huống của đối thủ và cách khai thác từng điểm yếu.", icon: Swords, tone: "rose" },
  { href: "/cam-nang/so-do", title: "Sơ đồ khắc chế", text: "Gặp sơ đồ nào thì nên dùng sơ đồ nào, kèm minh họa.", icon: Layers, tone: "zinc" },
];

const STEPS = [
  { icon: FolderSync, title: "Xuất dữ liệu từ game", text: "Chạy script trong Live Editor để ghi các bảng của save ra file CSV." },
  { icon: Download, title: "Mở ứng dụng Windows", text: "Ứng dụng tự đọc thư mục xuất, không cần kéo thả, dữ liệu ở lại trên máy bạn." },
  { icon: Briefcase, title: "Ra quyết định", text: "Xem điểm yếu đối thủ, đội hình đáp trả, mục tiêu chuyển nhượng và kế hoạch ngân sách." },
];

const STATS = [
  [STAT_GROUPS.reduce((n, g) => n + g.attrs.length, 0), "chỉ số được giải thích"],
  [9, "vai trò thi đấu"],
  [RULES.length, "tình huống đấu pháp"],
  [Object.keys((counters as { counters: object }).counters).length, "sơ đồ khắc chế"],
] as const;

/** Trang chủ bản web: cẩm nang + nút tải ứng dụng. */
export function Landing() {
  return (
    <main className="flex-1">
      <section className="hero-glow">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-6 py-14 lg:grid-cols-[1.05fr_1fr] lg:py-20">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300">
              <BookOpen size={14} aria-hidden="true" /> Cẩm nang FC 26 Career Mode
            </p>
            <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              Hiểu cầu thủ, đọc đối thủ, <span className="text-emerald-600">mua đúng người</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-zinc-600 dark:text-zinc-400">
              Cẩm nang giải thích chỉ số cầu thủ, đấu pháp và tài chính khi làm manager, kèm ứng dụng Windows tự phân tích đối thủ kế tiếp từ chính dữ liệu save của bạn.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <DownloadButton />
              <Link href="/cam-nang" className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 px-5 py-3 font-semibold hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900">
                Đọc cẩm nang <ArrowRight size={18} aria-hidden="true" />
              </Link>
            </div>
            <p className="mt-4 flex items-center gap-1.5 text-sm text-zinc-500">
              <ShieldCheck size={16} className="text-emerald-600" aria-hidden="true" /> Miễn phí, chạy trên máy bạn, không tải dữ liệu lên đâu cả.
            </p>
          </div>
          <div className="relative">
            <HeroPitch />
            <p className="mt-2 text-center text-xs text-zinc-500">Minh họa: đội hình 4-3-3 tấn công vào biên hở của đối thủ.</p>
          </div>
        </div>
      </section>

      <section className="border-y border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/40">
        <dl className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-6 px-6 py-8 text-center md:grid-cols-4">
          {STATS.map(([n, l]) => (
            <div key={l}>
              <dt className="text-3xl font-extrabold text-emerald-600">{n}</dt>
              <dd className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{l}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 py-16">
        <h2 className="text-3xl font-bold tracking-tight">Trong cẩm nang</h2>
        <p className="mt-2 max-w-2xl text-zinc-600 dark:text-zinc-400">Từ đọc một chỉ số đến lập kế hoạch cả kỳ chuyển nhượng, mọi trang dùng cùng quy tắc mà ứng dụng dùng để phân tích.</p>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <li key={f.href}>
              <Link href={f.href} className="group flex h-full flex-col rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-emerald-700">
                <IconTile icon={f.icon} tone={f.tone} size="lg" />
                <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
                <p className="mt-1 flex-1 text-sm text-zinc-600 dark:text-zinc-400">{f.text}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  Đọc tiếp <ArrowRight size={14} className="transition group-hover:translate-x-0.5" aria-hidden="true" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-gradient-to-b from-emerald-950 to-emerald-900 text-white">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-6 py-16 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-emerald-300">Ứng dụng Windows</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight">Cẩm nang là lý thuyết, ứng dụng làm phần việc nặng</h2>
            <ol className="mt-8 space-y-6">
              {STEPS.map((s, i) => (
                <li key={s.title} className="flex gap-4">
                  <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-400/30">
                    <s.icon size={22} aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="font-semibold"><span className="mr-2 text-emerald-300">{i + 1}.</span>{s.title}</h3>
                    <p className="mt-1 text-sm text-emerald-50/85">{s.text}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-8 flex flex-wrap gap-3">
              <DownloadButton className="!bg-white !text-emerald-800 hover:!bg-emerald-50" />
              <Link href="/huong-dan" className="inline-flex items-center gap-2 rounded-lg border border-white/30 px-5 py-3 font-semibold hover:bg-white/10">Xem hướng dẫn</Link>
            </div>
          </div>
          <AppPreview />
        </div>
      </section>
    </main>
  );
}
