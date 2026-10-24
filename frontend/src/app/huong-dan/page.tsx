import Link from "next/link";

export const metadata = { title: "Hướng dẫn · CounterPick FC" };

export default function GuidePage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
      <h1 className="text-3xl font-semibold tracking-tight">Hướng dẫn xuất dữ liệu và dùng ứng dụng</h1>
      <p className="mt-3 text-zinc-600 dark:text-zinc-400">
        Ứng dụng cần các bảng dữ liệu của save Career Mode của bạn. Game không có nút xuất sẵn, nên ta dùng Live Editor chạy một script nhỏ để ghi các bảng ra file CSV.
      </p>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Bước 1: cài ứng dụng</h2>
        <p className="mt-2 text-sm">
          <Link href="/tai-ung-dung" className="underline">Tải ứng dụng cho Windows</Link>, mở file và làm theo hướng dẫn trên trang đó.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Bước 2: xuất dữ liệu từ game</h2>
        <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm">
          <li>Mở FC 26, vào Career Mode và bật Live Editor (phím F9).</li>
          <li>Tạo một thư mục trống để chứa file xuất, ví dụ <code>D:/XboxGames/fc_exports</code>.</li>
          <li>
            Trong ứng dụng, chọn thư mục đó ở mục <b>Thư mục xuất</b>, chọn thư mục cài Live Editor rồi bấm <b>Cài script xuất vào Live Editor</b>.
            Ứng dụng tự chép script đã điền sẵn thư mục xuất.
            <span className="block text-zinc-500">Không muốn dùng cách tự chép? <a href="/export_tables.lua" download className="underline">Tải script</a>, mở bằng Notepad, sửa <code>OUT_DIR</code> ở đầu file thành thư mục xuất rồi dán vào Live Editor.</span>
          </li>
          <li>Trong Live Editor: Features → Lua Engine → chọn script → Execute. Chờ script chạy xong (vài chục giây).</li>
          <li>Ứng dụng thấy file mới sẽ tự nhập và phân tích. Mở trang chủ của ứng dụng để xem trận kế tiếp.</li>
        </ol>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Bước 3: dùng ứng dụng</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          <li>Trang chủ hiện trận kế tiếp của đội bạn và nút phân tích đối thủ. Chưa có lịch (tiền mùa giải) thì chọn đối thủ thủ công.</li>
          <li>Trang phân tích cho điểm yếu của đối thủ, cầu thủ nguy hiểm, gợi ý đấu pháp và đội hình đáp trả. Đọc <Link href="/cam-nang/doc-phan-tich" className="underline">cách hiểu bảng phân tích</Link>.</li>
          <li>Có thể nhập tay đội hình đối thủ, ghi chú, lưu kết quả các trận gặp và xuất báo cáo Markdown.</li>
          <li>Qua một vài vòng đấu, chạy lại script trong Live Editor để cập nhật lịch và phong độ; ghi chú của bạn được giữ nguyên.</li>
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Câu hỏi thường gặp</h2>
        <dl className="mt-2 space-y-3 text-sm">
          <div>
            <dt className="font-medium">Dữ liệu của tôi có bị gửi đi đâu không?</dt>
            <dd className="text-zinc-600 dark:text-zinc-400">Không. Ứng dụng đọc file trên máy bạn và lưu kết quả trên máy bạn. Chỉ có tính năng diễn giải bằng LLM (tùy chọn, mặc định tắt) gửi báo cáo tới Anthropic khi bạn dán khóa API của mình và bấm nút.</dd>
          </div>
          <div>
            <dt className="font-medium">Windows báo &ldquo;Unknown publisher&rdquo;?</dt>
            <dd className="text-zinc-600 dark:text-zinc-400">Ứng dụng chưa có chữ ký số (khoản phí hằng năm). Bấm More info → Run anyway nếu bạn tin nguồn tải là trang này.</dd>
          </div>
          <div>
            <dt className="font-medium">Có cần mở Live Editor mỗi lần chơi không?</dt>
            <dd className="text-zinc-600 dark:text-zinc-400">Có, để chạy script xuất. Ứng dụng không điều khiển game hay Live Editor; nó chỉ đọc file trong thư mục xuất.</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
