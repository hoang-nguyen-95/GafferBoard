import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AnalysisView } from "@/components/AnalysisView";
import { LlmPanel } from "@/components/LlmPanel";
import { NotesSection } from "@/components/NotesSection";
import { type Advice, ApiError, type CounterLineups, type NotesData, type OpponentAnalysis, apiGet, apiGetOptional } from "@/lib/api";

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
  let data: OpponentAnalysis, advice: Advice, counter: CounterLineups | null, notes: NotesData;
  try {
    [data, advice, counter, notes] = await Promise.all([
      apiGet<OpponentAnalysis>(`/teams/${encodeURIComponent(id)}/analysis`),
      apiGet<Advice>(`/teams/${encodeURIComponent(id)}/suggestions`),
      apiGetOptional<CounterLineups>(`/teams/${encodeURIComponent(id)}/counter-lineups`),
      apiGet<NotesData>(`/teams/${encodeURIComponent(id)}/notes`),
    ]);
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 422)) notFound();
    throw e;
  }
  return (
    <>
      <p className="mb-4 text-sm">
        <a href={`/api/teams/${encodeURIComponent(id)}/report.md`} download className="underline hover:no-underline">
          Tải báo cáo (.md)
        </a>
      </p>
      <AnalysisView data={data} advice={advice} counter={counter} />
      <NotesSection teamId={Number(id)} teamName={data.name} data={notes} />
      <LlmPanel explainPath={`/api/teams/${encodeURIComponent(id)}/explain`} />
    </>
  );
}

