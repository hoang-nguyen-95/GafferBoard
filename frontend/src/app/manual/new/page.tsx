import { Suspense } from "react";
import { ManualBuilder } from "@/components/ManualBuilder";
import { type FormationOption, apiGet } from "@/lib/api";

export const metadata = { title: "Tạo đội hình · CounterPick FC" };

export default function NewManualPage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
      <h1 className="mb-4 text-2xl font-semibold">Tạo đội hình đối thủ</h1>
      <Suspense fallback={<p className="text-zinc-500">Đang tải…</p>}>
        <Builder />
      </Suspense>
    </main>
  );
}

async function Builder() {
  const formations = await apiGet<FormationOption[]>("/formations");
  return <ManualBuilder formations={formations} />;
}
