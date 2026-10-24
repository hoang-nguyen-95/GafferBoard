import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AnalysisView } from "@/components/AnalysisView";
import { type Advice, ApiError, type OpponentAnalysis, apiGet } from "@/lib/api";

export default function AnalysisPage(props: PageProps<"/teams/[id]/analysis">) {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
      <Suspense fallback={<p className="text-zinc-500">Đang phân tích…</p>}>
        <AnalysisContent params={props.params} />
      </Suspense>
    </main>
  );
}

async function AnalysisContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let data: OpponentAnalysis, advice: Advice;
  try {
    [data, advice] = await Promise.all([
      apiGet<OpponentAnalysis>(`/teams/${encodeURIComponent(id)}/analysis`),
      apiGet<Advice>(`/teams/${encodeURIComponent(id)}/suggestions`),
    ]);
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 422)) notFound();
    throw e;
  }
  return <AnalysisView data={data} advice={advice} />;
}

