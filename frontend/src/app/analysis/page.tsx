import { Suspense } from "react";
import View from "./view";

export const metadata = { title: "Phân tích đối thủ · CounterPick FC" };

export default function Page() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
      <Suspense fallback={<p className="text-zinc-500">Đang phân tích…</p>}>
        <View />
      </Suspense>
    </main>
  );
}
