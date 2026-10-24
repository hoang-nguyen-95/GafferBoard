"use client";

import { useSearchParams } from "next/navigation";
import { ManualBuilder } from "@/components/ManualBuilder";
import { NotFoundNote } from "@/components/NotFoundNote";
import type { FormationOption, ManualDetail } from "@/lib/api";
import { useApi } from "@/lib/engine";

export default function EditManualView() {
  const id = useSearchParams().get("id");
  const detail = useApi<ManualDetail>(id ? `/manual-lineups/${encodeURIComponent(id)}` : null);
  const formations = useApi<FormationOption[]>("/formations");
  if (!detail || !formations) return <p className="text-zinc-500">Đang tải…</p>;
  if (!detail.data || !formations.data) return <NotFoundNote what="đội hình" />;
  const d = detail.data;
  return (
    <ManualBuilder
      key={d.id}
      formations={formations.data}
      initial={{ id: d.id, name: d.name, formationId: d.formation.id, players: d.slots.map((s) => s.player) }}
    />
  );
}
