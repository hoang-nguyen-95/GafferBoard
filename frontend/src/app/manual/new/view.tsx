"use client";

import { ManualBuilder } from "@/components/ManualBuilder";
import type { FormationOption } from "@/lib/api";
import { useApi } from "@/lib/engine";

export default function NewManualView() {
  const formations = useApi<FormationOption[]>("/formations");
  if (!formations?.data) return <p className="text-zinc-500">Đang tải…</p>;
  return <ManualBuilder formations={formations.data} />;
}
