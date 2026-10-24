import Link from "next/link";
import type { ReactNode } from "react";

/** Khung chung của các trang cẩm nang. */
export function Article({ title, intro, children }: { title: string; intro?: ReactNode; children: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">
      <p className="mb-2 text-sm text-zinc-500">
        <Link href="/cam-nang" className="hover:underline">Cẩm nang</Link> › {title}
      </p>
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      {intro && <p className="mt-3 text-zinc-600 dark:text-zinc-400">{intro}</p>}
      <div className="mt-8 space-y-10">{children}</div>
      <p className="mt-12 border-t border-zinc-200 pt-4 text-xs text-zinc-500 dark:border-zinc-800">
        Nội dung là kinh nghiệm chung và cách công cụ CounterPick FC phân tích, không phải số liệu chính thức của EA. Mỗi bản game có thể
        điều chỉnh cách các chỉ số ảnh hưởng tới trận đấu.
      </p>
    </main>
  );
}

export const tableCls = "w-full text-left text-sm";
export const thCls = "py-1.5 pr-3 font-medium text-zinc-500";
export const rowCls = "border-t border-zinc-200 dark:border-zinc-800";
