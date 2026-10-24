import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { REPO_URL } from "@/lib/links";

const col = "space-y-2 text-sm text-zinc-600 dark:text-zinc-400";
const a = "hover:text-emerald-700 hover:underline dark:hover:text-emerald-400";

/** Chân trang của bản web. */
export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/40">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-6 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3 lg:col-span-1">
          <Logo size={28} />
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Cẩm nang và công cụ phân tích cho người chơi FC 26 Career Mode.</p>
        </div>
        <ul className={col}>
          <li className="font-semibold text-current">Cẩm nang</li>
          <li><Link href="/cau-thu" className={a}>Danh sách cầu thủ</Link></li>
          <li><Link href="/cam-nang/chi-so" className={a}>Chỉ số cầu thủ</Link></li>
          <li><Link href="/cam-nang/vi-tri" className={a}>Vị trí và vai trò</Link></li>
          <li><Link href="/cam-nang/chien-thuat" className={a}>Gợi ý đấu pháp</Link></li>
          <li><Link href="/cam-nang/so-do" className={a}>Sơ đồ khắc chế</Link></li>
        </ul>
        <ul className={col}>
          <li className="font-semibold text-current">Quản lý đội</li>
          <li><Link href="/cam-nang/mua-cau-thu" className={a}>Mua cầu thủ</Link></li>
          <li><Link href="/cam-nang/tuoi-va-tiem-nang" className={a}>Tuổi và tiềm năng</Link></li>
          <li><Link href="/cam-nang/dam-phan-gia" className={a}>Đàm phán giá</Link></li>
          <li><Link href="/cam-nang/tai-chinh" className={a}>Tài chính manager</Link></li>
        </ul>
        <ul className={col}>
          <li className="font-semibold text-current">Ứng dụng</li>
          <li><Link href="/tai-ung-dung" className={a}>Tải cho Windows</Link></li>
          <li><Link href="/huong-dan" className={a}>Hướng dẫn xuất dữ liệu</Link></li>
          <li><a href={REPO_URL} target="_blank" rel="noreferrer" className={a}>Mã nguồn trên GitHub</a></li>
        </ul>
      </div>
      <div className="border-t border-zinc-200 py-4 dark:border-zinc-800">
        <p className="mx-auto max-w-6xl px-6 text-xs text-zinc-500">
          CounterPick FC là dự án của cộng đồng, không liên kết với và không được EA SPORTS hay Electronic Arts xác nhận. EA SPORTS FC là nhãn hiệu của
          Electronic Arts Inc. Mọi hình minh họa trên trang này do dự án tự vẽ. Nội dung cẩm nang là kinh nghiệm chung.
        </p>
      </div>
    </footer>
  );
}
