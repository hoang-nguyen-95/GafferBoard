"use client";

import { useSearchParams } from "next/navigation";
import { AnalysisView } from "@/components/AnalysisView";
import { DownloadReport } from "@/components/DownloadReport";
import { LlmPanel } from "@/components/LlmPanel";
import { ManualActions } from "@/components/ManualActions";
import { NotFoundNote } from "@/components/NotFoundNote";
import type { Advice, CounterLineups, OpponentAnalysis } from "@/lib/api";
import { useApi } from "@/lib/engine";

export default function ManualDetailView() {
  const id = useSearchParams().get("id");
  const base = id ? `/manual-lineups/${encodeURIComponent(id)}` : null;
  const data = useApi<OpponentAnalysis>(base && `${base}/analysis`);
  const advice = useApi<Advice>(base && `${base}/suggestions`);
  const counter = useApi<CounterLineups>(base && `${base}/counter-lineups`);
  if (!data || !advice || !counter) return <p className="text-zinc-500">Đang phân tích…</p>;
  if (!data.data || !advice.data) return <NotFoundNote what="đội hình" />;
  return (
    <>
      <ManualActions id={Number(id)} />
      <p className="mb-4 text-sm">
        <DownloadReport path={`${base}/report.md`} />
      </p>
      <AnalysisView data={data.data} advice={advice.data} counter={counter.data} />
      <LlmPanel reportPath={`${base}/report.md`} />
      <p className="mt-8 text-xs text-zinc-500">
        Đội hình nhập tay không có thông tin dự bị, phong độ hay chấn thương nên các mục đó không được tính.
      </p>
    </>
  );
}
