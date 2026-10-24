"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { NotFoundNote } from "@/components/NotFoundNote";
import { Pitch } from "@/components/Pitch";
import { type Line, type PlayerSummary, type TeamOverview, playerName } from "@/lib/api";
import { useApi } from "@/lib/engine";
import { LINE_LABELS, positionsLabel } from "@/lib/positions";
import { analysisHref, playerHref } from "@/lib/routes";

const LINES: Line[] = ["GK", "DEF", "MID", "ATT"];

const METRIC_COLUMNS: [string, string][] = [
  ["overall", "OVR"],
  ["sprint_speed", "Tốc độ"],
  ["acceleration", "Tăng tốc"],
  ["stamina", "Thể lực"],
  ["strength", "Sức mạnh"],
  ["jumping", "Bật nhảy"],
  ["height", "Cao (cm)"],
  ["defensive_awareness", "Ý thức PN"],
  ["interceptions", "Cắt bóng"],
  ["standing_tackle", "Tắc bóng"],
  ["short_passing", "Chuyền"],
  ["dribbling", "Rê bóng"],
  ["finishing", "Dứt điểm"],
];

export default function TeamView() {
  const id = useSearchParams().get("id");
  const res = useApi<TeamOverview>(id ? `/teams/${encodeURIComponent(id)}/overview` : null);
  if (!res) return <p className="text-zinc-500">Đang tải…</p>;
  if (!res.data) return <NotFoundNote what="đội" />;
  const data = res.data;
  const { team, standing, lineup } = data;
  const hasSeasonData = standing != null && (standing.points ?? 0) > 0;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{team.name}</h1>
          <p className="text-zinc-500">
            {team.league_name ?? "Chưa rõ giải"}
            {hasSeasonData && standing
              ? ` · hạng ${standing.position} · ${standing.points} điểm / ${standing.played} trận`
              : " · chưa có số liệu mùa giải"}
          </p>
        </div>
        <dl className="flex gap-4 text-center text-sm">
          {[
            ["OVR", team.overall],
            ["Tấn công", team.attack],
            ["Tiền vệ", team.midfield],
            ["Phòng ngự", team.defense],
          ].map(([label, value]) => (
            <div key={label as string}>
              <dt className="text-xs text-zinc-500">{label}</dt>
              <dd className="text-xl font-semibold tabular-nums">{value ?? "–"}</dd>
            </div>
          ))}
        </dl>
      </div>

      <p className="mb-6">
        <Link href={analysisHref(team.team_id)} className="rounded bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700">
          Phân tích đội này như đối thủ →
        </Link>
      </p>

      <div className="grid gap-8 md:grid-cols-2">
        <section>
          <h2 className="mb-2 font-semibold">
            Đội hình xuất phát{lineup.formation_name ? ` · ${lineup.formation_name}` : ""}
          </h2>
          {lineup.slots.length === 0 ? (
            <p className="text-zinc-500">Đội chưa có cầu thủ trong dữ liệu.</p>
          ) : (
            <>
              <Pitch slots={lineup.slots} />
              <p className="mt-2 text-xs text-zinc-500">
                {lineup.source === "inferred"
                  ? "Dữ liệu không có đội hình: đội hình được suy ra từ sơ đồ mặc định và chất lượng cầu thủ. "
                  : lineup.slots.some((s) => s.inferred)
                    ? "Viền nét đứt: ô trống trong đội hình gốc, được điền tự động bằng cầu thủ phù hợp nhất. "
                    : ""}
                Bấm vào cầu thủ để xem phân tích.
              </p>
            </>
          )}
        </section>

        <section>
          <h2 className="mb-2 font-semibold">Trung bình theo tuyến (đội hình xuất phát)</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-zinc-500">
                <tr>
                  <th className="py-1 pr-2">Chỉ số</th>
                  {LINES.map((l) => (
                    <th key={l} className="px-1 text-right">
                      {LINE_LABELS[l]} ({data.line_averages[l].count})
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {METRIC_COLUMNS.map(([key, label]) => (
                  <tr key={key} className="border-t border-zinc-200 dark:border-zinc-800">
                    <td className="py-1 pr-2">{label}</td>
                    {LINES.map((l) => (
                      <td key={l} className="px-1 text-right tabular-nums">
                        {data.line_averages[l][key] ?? "–"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="mt-10">
        <h2 className="mb-3 font-semibold">Toàn bộ đội hình</h2>
        <div className="grid gap-6 md:grid-cols-2">
          {LINES.map((line) => (
            <SquadTable key={line} title={LINE_LABELS[line]} players={data.squad[line]} />
          ))}
        </div>
      </section>
    </>
  );
}

function SquadTable({ title, players }: { title: string; players: PlayerSummary[] }) {
  return (
    <div>
      <h3 className="mb-1 text-sm font-medium text-zinc-500">
        {title} ({players.length})
      </h3>
      {players.length === 0 ? (
        <p className="text-sm text-zinc-500">Không có.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <tbody>
            {players.map((p) => (
              <tr key={p.player_id} className="border-t border-zinc-200 dark:border-zinc-800">
                <td className="w-8 py-1 text-xs text-zinc-500">{p.jersey_number ?? ""}</td>
                <td>
                  <Link href={playerHref(p.player_id)} className="hover:underline">
                    {playerName(p)}
                  </Link>
                  {p.in_xi && <span className="ml-1 text-xs text-emerald-600">●</span>}
                  {(p.injury ?? 0) > 0 && <span className="ml-1 text-xs text-red-600">chấn thương</span>}
                </td>
                <td className="text-xs text-zinc-500">{positionsLabel(p.positions.slice(0, 2))}</td>
                <td className="text-right text-xs text-zinc-500">{p.age != null ? `${p.age}t` : ""}</td>
                <td className="w-10 text-right font-semibold tabular-nums">{p.overall}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
