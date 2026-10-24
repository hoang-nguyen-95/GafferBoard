"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { NotFoundNote } from "@/components/NotFoundNote";
import { ShortlistButton } from "@/components/ShortlistButton";
import { Radar } from "@/components/Radar";
import { PLAYER_ATTRS } from "@/engine/types";
import { type AttributeScore, type Player, type PlayerAnalysis, playerName } from "@/lib/api";
import { useApi, useNations } from "@/lib/engine";
import { percentileColor, positionsLabel } from "@/lib/positions";
import { teamHref } from "@/lib/routes";
import { IS_DESKTOP_BUILD } from "@/lib/target";
import { ATTRIBUTE_LABELS } from "@/engine/analysis";

export default function PlayerView() {
  const id = useSearchParams().get("id");
  const base = id ? `/players/${encodeURIComponent(id)}` : null;
  const p = useApi<Player>(base);
  const a = useApi<PlayerAnalysis>(base && `${base}/analysis`);
  const nations = useNations();
  if (!p || !a) return <p className="text-zinc-500">Đang tải…</p>;
  if (!p.data || !a.data) return <NotFoundNote what="cầu thủ" />;
  const player = p.data, analysis = a.data;
  const footLabel = player.preferred_foot === 1 ? "Phải" : player.preferred_foot === 2 ? "Trái" : "–";

  return (
    <>
      <div className="mb-6">
        <h1 className="flex items-center gap-3 text-2xl font-semibold">
          <PlayerAvatar playerId={player.player_id} name={playerName(player)} line={analysis.line} size={64} />
          {playerName(player)}
        </h1>
        <p className="text-zinc-500">
          {analysis.role_label} · {positionsLabel(player.positions)}
          {analysis.club && (
            <>
              {" · "}
              {IS_DESKTOP_BUILD ? (
                <Link href={teamHref(analysis.club.team_id)} className="underline">
                  {analysis.club.name}
                </Link>
              ) : (
                analysis.club.name
              )}
              {analysis.club.league_name ? ` (${analysis.club.league_name})` : ""}
            </>
          )}
        </p>
        <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {[
            ["OVR", player.overall],
            ["Tiềm năng", player.potential],
            ["Tuổi", player.age],
            ["Cao/Nặng", player.height != null ? `${player.height} cm / ${player.weight} kg` : null],
            ["Chân thuận", footLabel],
            ["Chân yếu", player.weak_foot != null ? `${player.weak_foot}★` : null],
            ["Kỹ thuật", player.skill_moves != null ? `${Number(player.skill_moves) + 1}★` : null],
            ["Quốc tịch", player.nationality_id != null ? nations.get(player.nationality_id as number) ?? `#${player.nationality_id}` : null],
            ["Ngày sinh", player.birth_date],
            ["Danh tiếng", player.international_rep != null ? `${player.international_rep}★` : null],
            ["HĐ đến", player.contract_until],
          ].map(([label, value]) => (
            <div key={label as string}>
              <dt className="text-xs text-zinc-500">{label}</dt>
              <dd className="text-lg font-semibold tabular-nums">{value ?? "–"}</dd>
            </div>
          ))}
        </dl>
      </div>

      {IS_DESKTOP_BUILD && <ShortlistButton playerId={player.player_id} />}

      <p className="mb-6 rounded border border-zinc-200 p-3 text-sm dark:border-zinc-800">
        {analysis.summary}
        <span className="mt-1 block text-xs text-zinc-500">
          So với {analysis.peer_group.size} cầu thủ cùng vị trí
          {analysis.peer_group.kind === "league" ? ` ở ${analysis.peer_group.name}` : " trong toàn bộ dữ liệu"}.
        </span>
      </p>

      <div className="grid gap-8 md:grid-cols-2">
        <section>
          <h2 className="mb-2 font-semibold">Radar</h2>
          <Radar axes={analysis.radar} />
          <p className="text-xs text-zinc-500">Đường nét đứt: trung bình của nhóm so sánh.</p>
        </section>

        <section className="space-y-6">
          <ScoreList title="Điểm mạnh" items={analysis.strengths} empty="Không có chỉ số nào nổi bật so với nhóm." />
          <ScoreList title="Điểm yếu" items={analysis.weaknesses} empty="Không có chỉ số nào yếu rõ so với nhóm." />
        </section>
      </div>

      <section className="mt-10">
        <h2 className="mb-2 font-semibold">Chỉ số liên quan tới vị trí</h2>
        <ul className="grid gap-x-8 gap-y-1 sm:grid-cols-2">
          {analysis.attributes.map((a) => (
            <li key={a.key} className="flex items-center gap-2 text-sm">
              <span className="w-36 shrink-0">{a.label}</span>
              <span className="w-8 shrink-0 text-right font-semibold tabular-nums">{a.value}</span>
              <span className="relative h-2 flex-1 rounded bg-zinc-200 dark:bg-zinc-800" title={`Phân vị ${a.percentile}`}>
                <span className={`absolute inset-y-0 left-0 rounded ${percentileColor(a.percentile)}`} style={{ width: `${a.percentile}%` }} />
              </span>
              <span className="w-12 shrink-0 text-right text-xs text-zinc-500 tabular-nums">P{Math.round(a.percentile)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-zinc-500">P = phân vị trong nhóm so sánh (P90: tốt hơn 90% cầu thủ cùng vị trí).</p>
      </section>

      <section className="mt-10">
        <h2 className="mb-2 font-semibold">Tất cả chỉ số</h2>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm sm:grid-cols-3 lg:grid-cols-4">
          {PLAYER_ATTRS.filter((k) => player[k] !== null).map((k) => (
            <div key={k} className="flex justify-between gap-2 border-b border-zinc-100 py-0.5 dark:border-zinc-800">
              <dt className="text-zinc-600 dark:text-zinc-400">{ATTRIBUTE_LABELS[k]}</dt>
              <dd className="font-semibold tabular-nums">{player[k]}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs text-zinc-500">
          Giá trị chuyển nhượng và lương chưa có: dữ liệu hợp đồng/chuyển nhượng của game chưa được xuất, nên chưa hiển thị số nào.
          {" "}<Link href="/cau-thu" className="underline">Về danh sách cầu thủ</Link>
        </p>
      </section>
    </>
  );
}

function ScoreList({ title, items, empty }: { title: string; items: AttributeScore[]; empty: string }) {
  return (
    <div>
      <h2 className="mb-2 font-semibold">{title}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-zinc-500">{empty}</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {items.map((a) => (
            <li key={a.key}>
              <span className="font-medium">{a.label}</span> {a.value}
              <span className="text-zinc-500">
                {" "}
                (nhóm trung bình {a.peer_avg}, phân vị {Math.round(a.percentile)})
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
