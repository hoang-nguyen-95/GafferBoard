import Link from "next/link";
import { Suspense } from "react";
import ManualListView from "./list-view";

export const metadata = { title: "Nhập tay đối thủ · CounterPick FC" };

export default function ManualListPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Đội hình đối thủ nhập tay</h1>
        <Link href="/manual/new" className="rounded bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700">
          Tạo đội hình mới
        </Link>
      </div>
      <p className="mb-6 text-sm text-zinc-500">
        Dùng khi muốn phân tích một đội hình bất kỳ (đội chưa có trong dữ liệu, hoặc đội hình dự đoán): chọn sơ đồ, gõ tên từng
        cầu thủ, app chạy cùng phân tích và gợi ý như với đội trong dữ liệu.
      </p>
      <Suspense fallback={<p className="text-zinc-500">Đang tải…</p>}>
        <ManualListView />
      </Suspense>
    </main>
  );
}
