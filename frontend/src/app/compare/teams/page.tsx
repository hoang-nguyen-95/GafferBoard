import { Suspense } from "react";
import { CompareTable } from "@/components/CompareTable";
import { ComparePicker } from "@/components/ComparePicker";
import { ApiError, type TeamCompare, apiGet } from "@/lib/api";

export const metadata = { title: "So sánh đội · CounterPick FC" };

export default function CompareTeamsPage(props: PageProps<"/compare/teams">) {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">
      <h1 className="mb-1 text-2xl font-semibold">So sánh đội</h1>
      <p className="mb-4 text-sm text-zinc-500">
        <a href="/compare/players" className="underline">So sánh cầu thủ</a> · Đội
      </p>
      <Suspense fallback={<p className="text-zinc-500">Đang tải…</p>}>
        <Content searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}

async function Content({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const a = typeof sp.a === "string" ? sp.a : undefined;
  const b = typeof sp.b === "string" ? sp.b : undefined;
  let data: TeamCompare | null = null;
  let problem: string | null = null;
  if (a && b) {
    try {
      data = await apiGet<TeamCompare>(`/compare/teams?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}`);
    } catch (e) {
      if (e instanceof ApiError && [404, 422].includes(e.status)) problem = "Không so sánh được: chọn hai đội khác nhau và có trong dữ liệu.";
      else throw e;
    }
  }
  return (
    <>
      <ComparePicker kind="teams" a={a} b={b} />
      {problem && <p className="text-red-600">{problem}</p>}
      {!data && !problem && <p className="text-zinc-500">Chọn hai đội để so sánh.</p>}
      {data && (
        <div className="space-y-8">
          <p className="text-sm text-zinc-500">
            {data.a.name}: {data.a.formation ?? "chưa rõ sơ đồ"} · {data.b.name}: {data.b.formation ?? "chưa rõ sơ đồ"}
          </p>
          <div>
            <h2 className="mb-2 font-semibold">Rating đội trong game</h2>
            <CompareTable rows={data.ratings} nameA={data.a.name} nameB={data.b.name} />
          </div>
          <div>
            <h2 className="mb-2 font-semibold">Chỉ số đội hình xuất phát</h2>
            <CompareTable rows={data.metrics} nameA={data.a.name} nameB={data.b.name} extra />
            <p className="mt-2 text-xs text-zinc-500">P = phân vị trong giải của từng đội (nếu đủ đội cùng giải để so sánh).</p>
          </div>
        </div>
      )}
    </>
  );
}
