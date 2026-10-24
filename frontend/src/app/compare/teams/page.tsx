import Link from "next/link";
import { Suspense } from "react";
import CompareTeamsView from "./view";

export const metadata = { title: "So sánh đội · CounterPick FC" };

export default function CompareTeamsPage() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">
      <h1 className="mb-1 text-2xl font-semibold">So sánh đội</h1>
      <p className="mb-4 text-sm text-zinc-500">
        <Link href="/compare/players" className="underline">So sánh cầu thủ</Link> · Đội
      </p>
      <Suspense fallback={<p className="text-zinc-500">Đang tải…</p>}>
        <CompareTeamsView />
      </Suspense>
    </main>
  );
}
