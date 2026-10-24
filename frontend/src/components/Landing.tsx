import Link from "next/link";
import { DownloadButton } from "@/components/handbook/DownloadButton";

const CARDS = [
  { href: "/cam-nang/chi-so", title: "Chỉ số cầu thủ", text: "Mỗi chỉ số làm gì, quan trọng với vị trí nào." },
  { href: "/cam-nang/vi-tri", title: "Vị trí và vai trò", text: "Chỉ số then chốt của từng vai trò, đá lệch vị trí mất bao nhiêu." },
  { href: "/cam-nang/mua-cau-thu", title: "Mua cầu thủ", text: "Đọc tuổi, tiềm năng, hợp đồng và chọn người đáng mua." },
  { href: "/cam-nang/chien-thuat", title: "Gợi ý đấu pháp", text: "11 tình huống của đối thủ và cách khai thác." },
  { href: "/cam-nang/so-do", title: "Sơ đồ khắc chế", text: "Gặp sơ đồ nào thì nên dùng sơ đồ nào." },
];

/** Trang chủ bản web: cẩm nang + nút tải ứng dụng. */
export function Landing() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
      <section className="text-center">
        <h1 className="text-4xl font-semibold tracking-tight">CounterPick FC</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">
          Cẩm nang phân tích chỉ số cầu thủ và đấu pháp cho FC 26 Career Mode, kèm ứng dụng Windows tự phân tích đối thủ kế tiếp từ dữ liệu save của bạn.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <DownloadButton />
          <Link href="/cam-nang" className="rounded-lg border border-zinc-300 px-6 py-3 font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900">
            Đọc cẩm nang
          </Link>
        </div>
        <p className="mt-3 text-xs text-zinc-500">Miễn phí, chạy trên máy bạn, không tải dữ liệu lên đâu cả.</p>
      </section>

      <section className="mt-14">
        <h2 className="mb-4 text-xl font-semibold">Trong cẩm nang</h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {CARDS.map((c) => (
            <li key={c.href}>
              <Link href={c.href} className="block h-full rounded-lg border border-zinc-200 p-4 hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-900">
                <span className="font-semibold">{c.title}</span>
                <span className="mt-1 block text-sm text-zinc-500">{c.text}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-14 rounded-xl border border-zinc-200 p-6 dark:border-zinc-800">
        <h2 className="text-xl font-semibold">Ứng dụng làm gì</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
          <li>Tự nhận đối thủ kế tiếp từ lịch thi đấu, hoặc bạn chọn tay.</li>
          <li>Chỉ ra điểm yếu của đội đối thủ và cầu thủ nguy hiểm, so với các đội cùng giải.</li>
          <li>Gợi ý đấu pháp có lý do bằng chỉ số, và 2–3 đội hình đáp trả chọn từ squad của bạn.</li>
          <li>Chế độ Manager: nhu cầu đội hình, mục tiêu chuyển nhượng, ngân sách, gợi ý đàm phán giá.</li>
          <li>Ghi chú, lịch sử các trận gặp, xuất báo cáo, nhập tay đội hình bất kỳ.</li>
        </ul>
        <p className="mt-3 text-sm">
          Cần xuất dữ liệu từ game bằng Live Editor, xem <Link href="/huong-dan" className="underline">hướng dẫn</Link>.
        </p>
      </section>
    </main>
  );
}
