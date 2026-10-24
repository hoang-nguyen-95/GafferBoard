import { Suspense } from "react";
import ImportView from "./view";

export const metadata = { title: "Nhập dữ liệu · CounterPick FC" };

export default function ImportPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
      <Suspense fallback={<p className="text-zinc-500">Đang tải…</p>}>
        <ImportView />
      </Suspense>
    </main>
  );
}
