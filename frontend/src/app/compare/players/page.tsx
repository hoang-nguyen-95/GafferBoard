import Link from "next/link";
import { Suspense } from "react";
import ComparePlayersView from "./view";

export const metadata = { title: "So sánh cầu thủ · CounterPick FC" };

export default function ComparePlayersPage() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">
      <h1 className="mb-1 text-2xl font-semibold">So sánh cầu thủ</h1>
      <p className="mb-4 text-sm text-zinc-500">
        Cầu thủ · <Link href="/compare/teams" className="underline">So sánh đội</Link>
      </p>
      <Suspense fallback={<p className="text-zinc-500">Đang tải…</p>}>
        <ComparePlayersView />
      </Suspense>
    </main>
  );
}
