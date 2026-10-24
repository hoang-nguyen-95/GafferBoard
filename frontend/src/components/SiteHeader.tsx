import Link from "next/link";
import { Download } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { IS_DESKTOP_BUILD } from "@/lib/target";
import { HeaderSearch } from "./HeaderSearch";

const link = "rounded-md px-2.5 py-1.5 hover:bg-zinc-100 hover:text-current dark:hover:bg-zinc-800";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/85 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/85">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-6 py-2.5">
        <Link href="/" aria-label="CounterPick FC - trang chủ">
          <Logo />
        </Link>
        {IS_DESKTOP_BUILD ? (
          <>
            <nav className="flex flex-wrap gap-1 text-sm text-zinc-600 dark:text-zinc-400">
              <Link href="/teams" className={link}>Đội bóng</Link>
              <Link href="/cau-thu" className={link}>Cầu thủ</Link>
              <Link href="/manager" className={link}>Manager</Link>
              <Link href="/manual" className={link}>Nhập tay đối thủ</Link>
              <Link href="/compare/players" className={link}>So sánh</Link>
              <Link href="/cam-nang" className={link}>Cẩm nang</Link>
              <Link href="/import" className={link}>Nhập dữ liệu</Link>
            </nav>
            <div className="ml-auto w-full sm:w-72">
              <HeaderSearch />
            </div>
          </>
        ) : (
          <>
            <nav className="flex flex-wrap gap-1 text-sm text-zinc-600 dark:text-zinc-400">
              <Link href="/cam-nang" className={link}>Cẩm nang</Link>
              <Link href="/cau-thu" className={link}>Cầu thủ</Link>
              <Link href="/cam-nang/chi-so" className={link}>Chỉ số</Link>
              <Link href="/cam-nang/mua-cau-thu" className={link}>Mua cầu thủ</Link>
              <Link href="/cam-nang/chien-thuat" className={link}>Đấu pháp</Link>
              <Link href="/huong-dan" className={link}>Hướng dẫn</Link>
            </nav>
            <Link
              href="/tai-ung-dung"
              className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
            >
              <Download size={16} aria-hidden="true" />
              Tải ứng dụng
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
