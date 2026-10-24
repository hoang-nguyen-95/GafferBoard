import Link from "next/link";

export const metadata = { title: "Cẩm nang · CounterPick FC" };

const SECTIONS = [
  { href: "/cam-nang/chi-so", title: "Chỉ số cầu thủ", text: "34 chỉ số chia theo nhóm, mỗi chỉ số làm gì và quan trọng với vị trí nào." },
  { href: "/cam-nang/vi-tri", title: "Vị trí và vai trò", text: "9 vai trò, vị trí thuộc vai trò nào, chỉ số then chốt của từng vai trò và điểm trừ khi đá lệch vị trí." },
  { href: "/cam-nang/mua-cau-thu", title: "Mua cầu thủ", text: "Quy trình 6 bước đánh giá một thương vụ và cách ứng dụng chấm điểm đáng mua." },
  { href: "/cam-nang/tuoi-va-tiem-nang", title: "Tuổi và tiềm năng", text: "OVR, POT và tuổi: khi nào nên mua người trẻ, khi nào nên mua người ở đỉnh cao." },
  { href: "/cam-nang/mua-theo-vi-tri", title: "Mua theo vị trí", text: "Mỗi vai trò cần chỉ số gì, nên nhìn và nên tránh điều gì." },
  { href: "/cam-nang/dam-phan-gia", title: "Đàm phán giá", text: "Ba bậc giá, các yếu tố làm đổi giá và nguyên tắc đàm phán." },
  { href: "/cam-nang/tai-chinh", title: "Tài chính manager", text: "Ngân sách chuyển nhượng, quỹ lương và cách lập kế hoạch một kỳ chuyển nhượng." },
  { href: "/cam-nang/chien-thuat", title: "Gợi ý đấu pháp", text: "11 tình huống của đối thủ và cách khai thác: khi nào áp dụng, nên làm gì." },
  { href: "/cam-nang/so-do", title: "Sơ đồ khắc chế", text: "Gặp sơ đồ nào thì nên dùng sơ đồ nào, và vì sao." },
  { href: "/cam-nang/doc-phan-tich", title: "Đọc bảng phân tích đối thủ", text: "Phân vị là gì, chỉ số đội tính thế nào, điểm mạnh/yếu được xác định ra sao." },
  { href: "/huong-dan", title: "Hướng dẫn xuất dữ liệu và dùng ứng dụng", text: "Từng bước lấy dữ liệu từ game bằng Live Editor và để ứng dụng tự phân tích." },
];

export default function HandbookHome() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Cẩm nang người chơi Career Mode</h1>
      <p className="mt-3 text-zinc-600 dark:text-zinc-400">
        Tổng hợp cách đọc chỉ số cầu thủ, cách chọn mua cầu thủ, quản lý tài chính và phân tích chiến thuật khi đối đầu một đội. Các trang này dùng cùng quy tắc mà ứng dụng
        CounterPick FC dùng để phân tích, nên đọc xong bạn hiểu vì sao ứng dụng gợi ý như vậy.
      </p>
      <ul className="mt-8 grid gap-3 sm:grid-cols-2">
        {SECTIONS.map((s) => (
          <li key={s.href}>
            <Link href={s.href} className="block h-full rounded-lg border border-zinc-200 p-4 hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-900">
              <span className="font-semibold">{s.title}</span>
              <span className="mt-1 block text-sm text-zinc-500">{s.text}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
