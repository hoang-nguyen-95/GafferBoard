import Link from "next/link";
import { Suspense } from "react";
import { type League, type Team, apiGet } from "@/lib/api";

export const metadata = { title: "Đội bóng · CounterPick FC" };

export default function TeamsPage(props: PageProps<"/teams">) {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
      <h1 className="mb-4 text-2xl font-semibold">Đội bóng</h1>
      <Suspense fallback={<p className="text-zinc-500">Đang tải…</p>}>
        <TeamsContent searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}

async function TeamsContent({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const league = typeof sp.league === "string" ? sp.league : "";
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const leagues = await apiGet<League[]>("/leagues");
  const clubLeagues = leagues.filter((l) => !l.is_international);

  const params = new URLSearchParams({ limit: "300" });
  if (league) params.set("league", league);
  if (q) params.set("q", q);
  const teams = league || q ? await apiGet<Team[]>(`/teams?${params}`) : [];
  teams.sort((a, b) => (b.overall ?? 0) - (a.overall ?? 0) || a.name.localeCompare(b.name));

  return (
    <>
      <form className="mb-6 flex flex-wrap gap-2 text-sm" action="/teams">
        <select name="league" defaultValue={league} className="rounded border border-zinc-300 bg-transparent px-2 py-1.5 dark:border-zinc-700">
          <option value="">Tất cả giải</option>
          {clubLeagues.map((l) => (
            <option key={l.league_id} value={l.league_id}>
              {l.name}
            </option>
          ))}
        </select>
        <input
          name="q"
          defaultValue={q}
          placeholder="Tên đội…"
          className="rounded border border-zinc-300 bg-transparent px-3 py-1.5 dark:border-zinc-700"
        />
        <button className="rounded bg-emerald-600 px-4 py-1.5 text-white hover:bg-emerald-700">Lọc</button>
      </form>

      {league || q ? (
        teams.length === 0 ? (
          <p className="text-zinc-500">Không có đội nào khớp.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="text-zinc-500">
              <tr>
                <th className="py-1.5">Đội</th>
                <th>Giải</th>
                <th className="text-right">OVR</th>
                <th className="text-right">TC</th>
                <th className="text-right">TV</th>
                <th className="text-right">PN</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((t) => (
                <tr key={t.team_id} className="border-t border-zinc-200 dark:border-zinc-800">
                  <td className="py-1.5">
                    <Link href={`/teams/${t.team_id}`} className="hover:underline">
                      {t.name}
                    </Link>
                  </td>
                  <td className="text-zinc-500">{t.league_name ?? "–"}</td>
                  <td className="text-right tabular-nums">{t.overall ?? "–"}</td>
                  <td className="text-right tabular-nums">{t.attack ?? "–"}</td>
                  <td className="text-right tabular-nums">{t.midfield ?? "–"}</td>
                  <td className="text-right tabular-nums">{t.defense ?? "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
          {clubLeagues.map((l) => (
            <li key={l.league_id}>
              <Link
                href={`/teams?league=${l.league_id}`}
                className="block rounded border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-900"
              >
                {l.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
