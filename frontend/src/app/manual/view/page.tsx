import { Suspense } from "react";
import ManualDetailView from "./view";

export const metadata = { title: "Đội hình nhập tay · CounterPick FC" };

export default function ManualPage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
      <Suspense fallback={<p className="text-zinc-500">Đang phân tích…</p>}>
        <ManualDetailView />
      </Suspense>
    </main>
  );
}
