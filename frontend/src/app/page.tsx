import { Suspense } from "react";
import HomeView from "./home-view";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">CounterPick FC</h1>
      <p className="mt-2 mb-8 text-zinc-500">
        Phân tích đối thủ và gợi ý đấu pháp cho Career Mode. Dữ liệu của bạn được xử lý ngay trong trình duyệt, không tải lên đâu cả.
      </p>
      <Suspense fallback={<p className="p-4 text-zinc-500">Đang tải…</p>}>
        <HomeView />
      </Suspense>
    </main>
  );
}
