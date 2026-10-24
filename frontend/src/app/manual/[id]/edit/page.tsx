import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ManualBuilder } from "@/components/ManualBuilder";
import { ApiError, type FormationOption, type ManualDetail, apiGet } from "@/lib/api";

export default function EditManualPage(props: PageProps<"/manual/[id]/edit">) {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
      <h1 className="mb-4 text-2xl font-semibold">Sửa đội hình đối thủ</h1>
      <Suspense fallback={<p className="text-zinc-500">Đang tải…</p>}>
        <Editor params={props.params} />
      </Suspense>
    </main>
  );
}

async function Editor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let detail: ManualDetail, formations: FormationOption[];
  try {
    [detail, formations] = await Promise.all([
      apiGet<ManualDetail>(`/manual-lineups/${encodeURIComponent(id)}`),
      apiGet<FormationOption[]>("/formations"),
    ]);
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 422)) notFound();
    throw e;
  }
  return (
    <ManualBuilder
      formations={formations}
      initial={{ id: detail.id, name: detail.name, formationId: detail.formation.id, players: detail.slots.map((s) => s.player) }}
    />
  );
}
