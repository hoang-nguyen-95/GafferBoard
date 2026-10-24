import Link from "next/link";
import { HeaderSearch } from "./HeaderSearch";

export function SiteHeader() {
  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-6 py-3">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          CounterPick FC
        </Link>
        <nav className="flex gap-4 text-sm text-zinc-600 dark:text-zinc-400">
          <Link href="/teams" className="hover:underline">
            Đội bóng
          </Link>
          <Link href="/manual" className="hover:underline">
            Nhập tay đối thủ
          </Link>
          <Link href="/compare/players" className="hover:underline">
            So sánh
          </Link>
          <Link href="/import" className="hover:underline">
            Nhập dữ liệu
          </Link>
        </nav>
        <div className="ml-auto w-full sm:w-72">
          <HeaderSearch />
        </div>
      </div>
    </header>
  );
}
