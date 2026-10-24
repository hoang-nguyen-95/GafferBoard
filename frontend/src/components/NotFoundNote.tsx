import Link from "next/link";

/** Hiện khi id trên URL không có trong dữ liệu (thường do chưa nhập dữ liệu hoặc nhập bộ khác). */
export function NotFoundNote({ what }: { what: string }) {
  return (
    <p className="rounded border border-zinc-200 p-4 text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
      Không tìm thấy {what} này trong dữ liệu đang mở. <Link href="/" className="underline">Về trang chủ</Link>
      {" "}hoặc <Link href="/import" className="underline">nhập lại file xuất</Link>.
    </p>
  );
}
