import { Suspense } from "react";
import NewManualView from "./view";

export const metadata = { title: "Tạo đội hình · CounterPick FC" };

export default function NewManualPage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
      <h1 className="mb-4 text-2xl font-semibold">Tạo đội hình đối thủ</h1>
      <Suspense fallback={<p className="text-zinc-500">Đang tải…</p>}>
        <NewManualView />
      </Suspense>
    </main>
  );
}
