import Link from "next/link";
import { Suspense } from "react";
import { type ManualSummary, apiGet } from "@/lib/api";

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
        <List />
      </Suspense>
    </main>
  );
}

async function List() {
  const items = await apiGet<ManualSummary[]>("/manual-lineups");
  if (items.length === 0) return <p className="text-zinc-500">Chưa có đội hình nào được lưu.</p>;
  return (
    <ul className="space-y-2">
      {items.map((m) => (
        <li key={m.id}>
          <Link href={`/manual/${m.id}`} className="flex items-center justify-between rounded border border-zinc-200 px-4 py-2 hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-900">
            <span className="font-medium">{m.name}</span>
            <span className="text-xs text-zinc-500">
              {m.formation_name} · {m.players}/11 cầu thủ
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
