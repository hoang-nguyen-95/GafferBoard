import { AlertTriangle, ArrowRight, FolderOpen, MonitorDown, RefreshCw, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { AppPreview } from "@/components/brand/AppPreview";
import { Callout, IconTile } from "@/components/brand/ui";
import { DownloadButton } from "@/components/handbook/DownloadButton";
import { PORTABLE_FILE, PORTABLE_URL, RELEASES_URL } from "@/lib/links";

export const metadata = { title: "Tải ứng dụng · CounterPick FC" };

export default function DownloadPage() {
  return (
    <main className="flex-1">
      <section className="hero-glow">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-6 py-14 lg:grid-cols-[1fr_1fr]">
          <div>
            <IconTile icon={MonitorDown} tone="emerald" size="lg" />
            <h1 className="mt-5 text-4xl font-extrabold tracking-tight">CounterPick FC cho Windows</h1>
            <p className="mt-4 max-w-lg text-lg text-zinc-600 dark:text-zinc-400">
              Ứng dụng tự đọc dữ liệu bạn xuất từ Live Editor rồi phân tích đối thủ kế tiếp, gợi ý đấu pháp, đội hình đáp trả và lập kế hoạch chuyển nhượng.
              Mọi thứ chạy ngay trên máy bạn, không tải dữ liệu lên đâu cả.
            </p>
            <div className="mt-8"><DownloadButton /></div>
            <p className="mt-3 text-sm text-zinc-500">Bản cài đặt .exe cho Windows 10/11 (64-bit), dung lượng khoảng 100 MB. Bấm là tải thẳng về máy.</p>
            <p className="mt-4 text-sm">
              Không muốn cài đặt?{" "}
              <a href={PORTABLE_URL} download={PORTABLE_FILE} className="font-medium underline">Tải bản chạy thẳng</a> (bấm đúp là chạy, không cần cài).
            </p>
          </div>
          <AppPreview />
        </div>
      </section>

      <div className="mx-auto w-full max-w-4xl space-y-12 px-6 py-12">
        <section>
          <h2 className="text-2xl font-bold tracking-tight">Cài đặt trong 3 bước</h2>
          <ol className="mt-5 grid gap-4 sm:grid-cols-3">
            {[
              [MonitorDown, "Mở file vừa tải", "Windows có thể hiện cảnh báo xanh “Windows protected your PC” vì ứng dụng chưa có chữ ký số trả phí: bấm More info rồi Run anyway."],
              [FolderOpen, "Chọn thư mục xuất", "Lần đầu mở ứng dụng, chọn thư mục chứa file CSV xuất từ Live Editor (thư mục fc_exports của bạn)."],
              [RefreshCw, "Để ứng dụng tự cập nhật", "Mỗi khi có file mới trong thư mục, ứng dụng tự nhập và phân tích lại."],
            ].map(([Icon, title, text], i) => {
              const I = Icon as typeof MonitorDown;
              return (
                <li key={title as string} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
                  <IconTile icon={I} tone="emerald" />
                  <h3 className="mt-3 font-semibold"><span className="mr-1.5 text-emerald-600">{i + 1}.</span>{title as string}</h3>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{text as string}</p>
                </li>
              );
            })}
          </ol>
          <p className="mt-4 text-sm">
            Chưa có file xuất? <Link href="/huong-dan" className="inline-flex items-center gap-1 font-medium text-emerald-700 underline dark:text-emerald-400">Xem hướng dẫn xuất dữ liệu <ArrowRight size={14} aria-hidden="true" /></Link>
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-bold tracking-tight">Cần biết</h2>
          <Callout icon={ShieldCheck} tone="emerald" title="Ứng dụng chỉ đọc file CSV bạn tự xuất">Không đọc bộ nhớ game, không sửa save, không đụng tới chế độ online.</Callout>
          <Callout icon={AlertTriangle} tone="amber" title="Cần Live Editor để xuất dữ liệu">Đây là công cụ của bên thứ ba, hãy dùng cho Career Mode offline và tự chịu trách nhiệm.</Callout>
          <Callout icon={MonitorDown} tone="sky" title="Hiện chỉ có bản Windows">
            Chưa có bản macOS hoặc Linux. Tải không được? Thử mở <a href={RELEASES_URL} className="underline" target="_blank" rel="noreferrer">trang các bản phát hành</a> để chọn file thủ công.
          </Callout>
        </section>
      </div>
    </main>
  );
}
