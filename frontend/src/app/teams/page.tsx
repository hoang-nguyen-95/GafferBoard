import { Suspense } from "react";
import TeamsView from "./view";

export const metadata = { title: "Đội bóng · CounterPick FC" };

export default function TeamsPage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
      <h1 className="mb-4 text-2xl font-semibold">Đội bóng</h1>
      <Suspense fallback={<p className="text-zinc-500">Đang tải…</p>}>
        <TeamsView />
      </Suspense>
    </main>
  );
}
