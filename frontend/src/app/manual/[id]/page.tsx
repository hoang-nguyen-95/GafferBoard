import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AnalysisView } from "@/components/AnalysisView";
import { ManualActions } from "@/components/ManualActions";
import {
  type Advice, ApiError, type CounterLineups, type OpponentAnalysis, apiGet, apiGetOptional,
} from "@/lib/api";

export default function ManualPage(props: PageProps<"/manual/[id]">) {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
      <Suspense fallback={<p className="text-zinc-500">Đang phân tích…</p>}>
        <Content params={props.params} />
      </Suspense>
    </main>
  );
}

async function Content({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const base = `/manual-lineups/${encodeURIComponent(id)}`;
  let data: OpponentAnalysis, advice: Advice, counter: CounterLineups | null;
  try {
    [data, advice, counter] = await Promise.all([
      apiGet<OpponentAnalysis>(`${base}/analysis`),
      apiGet<Advice>(`${base}/suggestions`),
      apiGetOptional<CounterLineups>(`${base}/counter-lineups`),
    ]);
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 422)) notFound();
    throw e;
  }
  return (
    <>
      <ManualActions id={Number(id)} />
      <AnalysisView data={data} advice={advice} counter={counter} />
      <p className="mt-8 text-xs text-zinc-500">
        Đội hình nhập tay không có thông tin dự bị, phong độ hay chấn thương nên các mục đó không được tính.
      </p>
    </>
  );
}
