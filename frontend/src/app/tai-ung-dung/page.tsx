import Link from "next/link";
import { DownloadButton } from "@/components/handbook/DownloadButton";
import { PORTABLE_FILE, PORTABLE_URL, RELEASES_URL } from "@/lib/links";

export const metadata = { title: "Tải ứng dụng · CounterPick FC" };

export default function DownloadPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <div className="rounded-2xl border border-zinc-200 p-8 text-center dark:border-zinc-800">
        <h1 className="text-3xl font-semibold tracking-tight">CounterPick FC cho Windows</h1>
        <p className="mx-auto mt-3 max-w-xl text-zinc-600 dark:text-zinc-400">
          Ứng dụng tự đọc dữ liệu bạn xuất từ Live Editor rồi phân tích đối thủ kế tiếp, gợi ý đấu pháp và đội hình đáp trả.
          Mọi thứ chạy ngay trên máy bạn, không tải dữ liệu lên đâu cả.
        </p>
        <div className="mt-8">
          <DownloadButton />
        </div>
        <p className="mt-3 text-xs text-zinc-500">Bản cài đặt .exe cho Windows 10/11 (64-bit), dung lượng khoảng 100 MB. Bấm là tải thẳng về máy.</p>
        <p className="mt-4 text-sm">
          Không muốn cài đặt?{" "}
          <a href={PORTABLE_URL} download={PORTABLE_FILE} className="underline">Tải bản chạy thẳng</a> (bấm đúp là chạy, không cần cài).
        </p>
      </div>

      <section className="mt-10 space-y-3">
        <h2 className="text-xl font-semibold">Cài đặt thế nào</h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm">
          <li>Mở file vừa tải. Windows có thể hiện cảnh báo xanh <b>&ldquo;Windows protected your PC&rdquo;</b> vì ứng dụng chưa có chữ ký số trả phí:
            bấm <b>More info</b> rồi <b>Run anyway</b>.</li>
          <li>Lần đầu mở ứng dụng, chọn thư mục chứa file CSV xuất từ Live Editor (thư mục <code>fc_exports</code> của bạn).</li>
          <li>Từ đó mỗi khi có file mới trong thư mục, ứng dụng tự cập nhật. Xem <Link href="/huong-dan" className="underline">hướng dẫn xuất dữ liệu</Link> nếu bạn chưa có file.</li>
        </ol>
      </section>

      <section className="mt-8 space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
        <h2 className="text-xl font-semibold text-current">Cần biết</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Ứng dụng chỉ đọc file CSV bạn tự xuất. Không đọc bộ nhớ game, không sửa save, không đụng tới chế độ online.</li>
          <li>Cần Live Editor để xuất dữ liệu. Đây là công cụ của bên thứ ba, hãy dùng cho Career Mode offline và tự chịu trách nhiệm.</li>
          <li>Hiện chỉ có bản Windows. Chưa có bản macOS hoặc Linux.</li>
          <li>Tải không được? Thử mở <a href={RELEASES_URL} className="underline" target="_blank" rel="noreferrer">trang các bản phát hành</a> để chọn file thủ công.</li>
        </ul>
      </section>
    </main>
  );
}
