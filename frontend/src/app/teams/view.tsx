"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { type League, type Team } from "@/lib/api";
import { useApi } from "@/lib/engine";
import { teamHref } from "@/lib/routes";

export default function TeamsView() {
  const sp = useSearchParams();
  const league = sp.get("league") ?? "";
  const q = (sp.get("q") ?? "").trim();
  const params = new URLSearchParams({ limit: "300" });
  if (league) params.set("league", league);
  if (q) params.set("q", q);
  const leaguesRes = useApi<League[]>("/leagues");
  const teamsRes = useApi<Team[]>(league || q ? `/teams?${params}` : null);
  if (!leaguesRes?.data) return <p className="text-zinc-500">Đang tải…</p>;
  const clubLeagues = leaguesRes.data.filter((l) => !l.is_international);
  const teams = [...(teamsRes?.data ?? [])];
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
                    <Link href={teamHref(t.team_id)} className="hover:underline">
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
