import Link from "next/link";
import { IS_DESKTOP_BUILD } from "@/lib/target";
import { HeaderSearch } from "./HeaderSearch";

const link = "hover:underline";

export function SiteHeader() {
  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-6 py-3">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          CounterPick FC
        </Link>
        {IS_DESKTOP_BUILD ? (
          <>
            <nav className="flex gap-4 text-sm text-zinc-600 dark:text-zinc-400">
              <Link href="/teams" className={link}>Đội bóng</Link>
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
            <nav className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-600 dark:text-zinc-400">
              <Link href="/cam-nang" className={link}>Cẩm nang</Link>
              <Link href="/cam-nang/chi-so" className={link}>Chỉ số</Link>
              <Link href="/cam-nang/chien-thuat" className={link}>Đấu pháp</Link>
              <Link href="/huong-dan" className={link}>Hướng dẫn</Link>
            </nav>
            <Link href="/tai-ung-dung" className="ml-auto rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700">
              Tải ứng dụng
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
