import { Check, Download, FolderOpen, HelpCircle, Lock, MonitorPlay, Play, Terminal, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { Callout, IconTile, SectionTitle } from "@/components/brand/ui";

export const metadata = { title: "Hướng dẫn · CounterPick FC" };

const STEPS: { icon: LucideIcon; title: string; body: React.ReactNode }[] = [
  { icon: Download, title: "Cài ứng dụng", body: <><Link href="/tai-ung-dung" className="underline">Tải ứng dụng cho Windows</Link>, mở file và làm theo hướng dẫn trên trang đó.</> },
  { icon: FolderOpen, title: "Chọn thư mục xuất", body: <>Tạo một thư mục trống để chứa file xuất, ví dụ <code>D:/XboxGames/fc_exports</code>, rồi chọn nó ở mục <b>Thư mục xuất</b> trong ứng dụng.</> },
  { icon: Terminal, title: "Cài script vào Live Editor", body: <>Chọn thư mục cài Live Editor rồi bấm <b>Cài script xuất vào Live Editor</b>: ứng dụng chép script đã điền sẵn thư mục xuất. Không muốn dùng cách tự chép? <a href="/export_tables.lua" download className="underline">Tải script</a>, mở bằng Notepad, sửa <code>OUT_DIR</code> ở đầu file rồi dán vào Live Editor.</> },
  { icon: Play, title: "Chạy script trong game", body: <>Mở FC 26, vào Career Mode và bật Live Editor (phím F9). Features → Lua Engine → chọn script → Execute. Chờ script chạy xong (vài chục giây).</> },
  { icon: MonitorPlay, title: "Xem phân tích", body: <>Ứng dụng thấy file mới sẽ tự nhập và phân tích. Mở trang chủ của ứng dụng để xem trận kế tiếp, hoặc vào mục Manager để lên kế hoạch chuyển nhượng.</> },
];

const FAQ = [
  ["Dữ liệu của tôi có bị gửi đi đâu không?", "Không. Ứng dụng đọc file trên máy bạn và lưu kết quả trên máy bạn. Chỉ có tính năng diễn giải bằng LLM (tùy chọn, mặc định tắt) gửi báo cáo tới Anthropic khi bạn dán khóa API của mình và bấm nút."],
  ["Windows báo “Unknown publisher”?", "Ứng dụng chưa có chữ ký số (khoản phí hằng năm). Bấm More info → Run anyway nếu bạn tin nguồn tải là trang này."],
  ["Có cần mở Live Editor mỗi lần chơi không?", "Có, để chạy script xuất. Ứng dụng không điều khiển game hay Live Editor; nó chỉ đọc file trong thư mục xuất."],
  ["Chưa có lịch thi đấu thì sao?", "Tiền mùa giải thường chưa có lịch của đội bạn. Hãy chọn đối thủ thủ công trên trang chủ của ứng dụng."],
];

export default function GuidePage() {
  return (
    <main className="flex-1">
      <div className="pitch-stripes bg-gradient-to-br from-emerald-800 via-emerald-700 to-emerald-900 text-white">
        <div className="mx-auto w-full max-w-4xl px-6 py-10">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Hướng dẫn xuất dữ liệu và dùng ứng dụng</h1>
          <p className="mt-3 max-w-2xl text-emerald-50/95">
            Ứng dụng cần các bảng dữ liệu của save Career Mode của bạn. Game không có nút xuất sẵn, nên ta dùng Live Editor chạy một script nhỏ để ghi các bảng ra file CSV.
          </p>
        </div>
      </div>
      <div className="mx-auto w-full max-w-4xl space-y-12 px-6 py-10">
        <ol className="space-y-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
              <IconTile icon={s.icon} tone="emerald" size="lg" />
              <div className="min-w-0">
                <h2 className="font-semibold"><span className="mr-2 text-emerald-600">Bước {i + 1}.</span>{s.title}</h2>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <Callout icon={Terminal} tone="amber" title="Tự xuất lặp lại (thử nghiệm)">
          Ứng dụng cũng chép sẵn một script chạy lặp: bạn Execute một lần mỗi phiên chơi và nó tự xuất lại dữ liệu định kỳ. Cách này chưa được thử trên mọi bản Live Editor,
          nên ứng dụng kèm một script thử 10 giây để kiểm tra game có bị đơ không trước khi dùng. Bấm Execute thủ công vẫn luôn dùng được.
        </Callout>
        <Callout icon={Lock} tone="emerald" title="Riêng tư">
          Ứng dụng chỉ đọc file CSV bạn tự xuất. Không đọc bộ nhớ game, không sửa save, không đụng tới chế độ online, và không gửi dữ liệu của bạn đi đâu.
        </Callout>
        <section>
          <SectionTitle icon={HelpCircle} tone="sky">Câu hỏi thường gặp</SectionTitle>
          <dl className="mt-4 space-y-3">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
                <summary className="flex cursor-pointer items-center justify-between gap-3 font-medium">
                  {q}<Check size={16} className="text-emerald-600 opacity-0 transition group-open:opacity-100" aria-hidden="true" />
                </summary>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{a}</p>
              </details>
            ))}
          </dl>
        </section>
      </div>
    </main>
  );
}
