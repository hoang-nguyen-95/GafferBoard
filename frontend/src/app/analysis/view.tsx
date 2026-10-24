"use client";

import { useSearchParams } from "next/navigation";
import { AnalysisView } from "@/components/AnalysisView";
import { DownloadReport } from "@/components/DownloadReport";
import { LlmPanel } from "@/components/LlmPanel";
import { NotFoundNote } from "@/components/NotFoundNote";
import { NotesSection } from "@/components/NotesSection";
import type { Advice, CounterLineups, NotesData, OpponentAnalysis } from "@/lib/api";
import { useApi } from "@/lib/engine";

export default function AnalysisPageView() {
  const id = useSearchParams().get("id");
  const base = id ? `/teams/${encodeURIComponent(id)}` : null;
  const data = useApi<OpponentAnalysis>(base && `${base}/analysis`);
  const advice = useApi<Advice>(base && `${base}/suggestions`);
  const counter = useApi<CounterLineups>(base && `${base}/counter-lineups`);
  const notes = useApi<NotesData>(base && `${base}/notes`);
  if (!data || !advice || !counter || !notes) return <p className="text-zinc-500">Đang phân tích…</p>;
  if (!data.data || !advice.data || !notes.data) return <NotFoundNote what="đội" />;
  return (
    <>
      <p className="mb-4 text-sm">
        <DownloadReport path={`${base}/report.md`} />
      </p>
      <AnalysisView data={data.data} advice={advice.data} counter={counter.data} />
      <NotesSection key={id} teamId={Number(id)} teamName={data.data.name} data={notes.data} />
      <LlmPanel reportPath={`${base}/report.md`} />
    </>
  );
}
