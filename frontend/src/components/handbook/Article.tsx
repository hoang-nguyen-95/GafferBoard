import { ChevronRight, type LucideIcon, BookOpen } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

/** Khung chung của các trang cẩm nang: banner sân cỏ, đường dẫn, nội dung. */
export function Article({ title, intro, icon: Icon = BookOpen, children }: { title: string; intro?: ReactNode; icon?: LucideIcon; children: ReactNode }) {
  return (
    <main className="flex-1">
      <div className="pitch-stripes relative overflow-hidden bg-gradient-to-br from-emerald-800 via-emerald-700 to-emerald-900 text-white">
        <div className="mx-auto w-full max-w-4xl px-6 py-10">
          <nav aria-label="Đường dẫn" className="mb-4 flex items-center gap-1 text-sm text-emerald-100/90">
            <Link href="/cam-nang" className="hover:underline">Cẩm nang</Link>
            <ChevronRight size={14} aria-hidden="true" />
            <span className="text-white">{title}</span>
          </nav>
          <div className="flex items-start gap-4">
            <span className="mt-1 hidden h-14 w-14 flex-none items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25 sm:inline-flex">
              <Icon size={28} aria-hidden="true" />
            </span>
            <div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
              {intro && <p className="mt-3 max-w-2xl text-emerald-50/95">{intro}</p>}
            </div>
          </div>
        </div>
        <svg aria-hidden="true" className="pointer-events-none absolute -right-10 -top-10 h-64 w-64 text-white/10" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="50" cy="50" r="40" />
          <circle cx="50" cy="50" r="4" />
          <line x1="10" y1="50" x2="90" y2="50" />
        </svg>
      </div>
      <div className="mx-auto w-full max-w-4xl px-6 py-10">
        <div className="space-y-12">{children}</div>
        <p className="mt-14 border-t border-zinc-200 pt-4 text-xs text-zinc-500 dark:border-zinc-800">
          Nội dung là kinh nghiệm chung và cách công cụ CounterPick FC phân tích, không phải số liệu chính thức của EA. Mỗi bản game có thể
          điều chỉnh cách các chỉ số ảnh hưởng tới trận đấu.
        </p>
      </div>
    </main>
  );
}

export const tableCls = "w-full text-left text-sm";
export const thCls = "py-1.5 pr-3 font-medium text-zinc-500";
export const rowCls = "border-t border-zinc-200 dark:border-zinc-800";
