import { Suspense } from "react";
import { Landing } from "@/components/Landing";
import { IS_DESKTOP_BUILD } from "@/lib/target";
import HomeView from "./home-view";

export default function Home() {
  if (!IS_DESKTOP_BUILD) return <Landing />;
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">CounterPick FC</h1>
      <p className="mt-2 mb-8 text-zinc-500">
        Phân tích đối thủ và gợi ý đấu pháp cho Career Mode. Dữ liệu của bạn được xử lý ngay trên máy, không tải lên đâu cả.
      </p>
      <Suspense fallback={<p className="p-4 text-zinc-500">Đang tải…</p>}>
        <HomeView />
      </Suspense>
    </main>
  );
}
