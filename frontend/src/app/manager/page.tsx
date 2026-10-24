import { Suspense } from "react";
import ManagerView from "./view";

export const metadata = { title: "Chế độ Manager · CounterPick FC" };

export default function ManagerPage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
      <Suspense fallback={<p className="text-zinc-500">Đang tải…</p>}>
        <ManagerView />
      </Suspense>
    </main>
  );
}
