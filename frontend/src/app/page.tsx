import Link from "next/link";
import { Suspense } from "react";
import { apiGet, type Team } from "@/lib/api";

async function ApiStatus() {
  let teams: Team[];
  try {
    teams = await apiGet<Team[]>("/teams");
  } catch {
    return (
      <p className="rounded border border-amber-500/50 bg-amber-500/10 p-4">
        Chưa kết nối được backend. Hãy chạy API:{" "}
        <code className="font-mono">uvicorn app.main:app --port 8000</code> trong thư mục <code>backend/</code>, rồi tải lại trang.
      </p>
    );
  }
  if (teams.length === 0) {
    return (
      <p className="rounded border border-amber-500/50 bg-amber-500/10 p-4">
        Backend chạy nhưng chưa có dữ liệu. Nhập dữ liệu xuất từ game:{" "}
        <code className="font-mono">python -m app.importers.run data/exports</code>
      </p>
    );
  }
  const leagues = new Set(teams.map((t) => t.league_id).filter((id) => id !== null)).size;
  return (
    <p className="rounded border border-emerald-500/50 bg-emerald-500/10 p-4">
      Đã kết nối backend: {teams.length} đội, {leagues} giải.
    </p>
  );
}

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">CounterPick FC</h1>
      <p className="mt-2 mb-8 text-zinc-500">
        Phân tích đối thủ và gợi ý đấu pháp cho Career Mode, chạy hoàn toàn trên máy bạn.
      </p>
      <nav className="mb-8 flex flex-wrap gap-3 text-sm">
        <Link href="/teams" className="rounded bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700">
          Xem các đội
        </Link>
      </nav>
      <Suspense fallback={<p className="p-4 text-zinc-500">Đang kiểm tra backend…</p>}>
        <ApiStatus />
      </Suspense>
    </main>
  );
}
