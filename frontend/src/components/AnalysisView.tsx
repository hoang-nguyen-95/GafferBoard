import Link from "next/link";
import { Pitch } from "@/components/Pitch";
import { ResultsForm } from "@/components/ResultsForm";
import { Suggestions } from "@/components/Suggestions";
import { CounterLineupsView } from "@/components/CounterLineups";
import type { Advice, CounterLineups, DangerousPlayer, Metric, OpponentAnalysis } from "@/lib/api";
import { percentileColor } from "@/lib/positions";
import { playerHref, teamHref } from "@/lib/routes";

const GROUPS: { title: string; keys: string[] }[] = [
  { title: "Hàng thủ", keys: ["def_pace", "def_accel", "def_slowest", "def_height", "def_aerial"] },
  { title: "Thủ môn", keys: ["gk_reflexes", "gk_aerial"] },
  { title: "Tiền vệ và hai biên", keys: ["mid_defense", "flank_left_defense", "flank_right_defense"] },
  { title: "Thể lực và thể hình", keys: ["team_stamina", "team_height"] },
  { title: "Hàng công", keys: ["att_pace", "att_finishing"] },
  { title: "Độ sâu đội hình", keys: ["xi_overall", "bench_quality", "depth_drop"] },
];

export function AnalysisView({
  data,
  advice,
  counter,
}: {
  data: OpponentAnalysis;
  advice?: Advice | null;
  /** undefined: không hiển thị mục này; null: không tính được (thiếu đội của bạn). */
  counter?: CounterLineups | null;
}) {
  const byKey = new Map(data.metrics.map((m) => [m.key, m]));
  const { extras } = data;
  return (
    <>
      <div className="mb-6">
        <p className="text-sm text-zinc-500">Phân tích đối thủ</p>
        <h1 className="text-2xl font-semibold">
          {data.team_id != null ? <Link href={teamHref(data.team_id)} className="hover:underline">{data.name}</Link> : data.name}
        </h1>
        <p className="text-zinc-500">
          {data.lineup.formation_name ? `Sơ đồ ${data.lineup.formation_name}` : "Chưa rõ sơ đồ"}
          {data.benchmark
            ? ` · so với ${data.benchmark.teams} đội ${data.benchmark.league_name ?? "cùng giải"}`
            : " · chưa đủ đội cùng giải để so sánh phân vị"}
        </p>
      </div>

      {advice && <Suggestions advice={advice} />}
      {counter !== undefined && <CounterLineupsView data={counter} teamName={data.name} />}

      <div className="grid gap-8 md:grid-cols-2">
        <section>
          <Pitch slots={data.lineup.slots} />
          {data.lineup.source === "inferred" && (
            <p className="mt-2 text-xs text-zinc-500">Dữ liệu không có đội hình: được suy ra từ sơ đồ mặc định.</p>
          )}
          {data.injuries.length > 0 && (
            <p className="mt-3 text-sm text-red-600">
              Chấn thương: {data.injuries.map((i) => `${i.name}${i.in_xi ? " (đá chính)" : ""}`).join(", ")}
            </p>
          )}
        </section>

        <section className="space-y-6">
          <div>
            <h2 className="mb-2 font-semibold">Điểm yếu rõ nhất</h2>
            {data.weak_points.length === 0 ? (
              <p className="text-sm text-zinc-500">Không có điểm yếu nổi bật so với giải.</p>
            ) : (
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {data.weak_points.map((w, i) => (
                  <li key={i}>
                    {w.kind === "player" && w.player_id != null ? (
                      <Link href={playerHref(w.player_id!)} className="hover:underline">{w.text}</Link>
                    ) : (
                      w.text
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h2 className="mb-2 font-semibold">Cầu thủ nguy hiểm nhất</h2>
            <DangerList title="Tấn công" players={data.dangerous.attackers} />
            <DangerList title="Kiến tạo" players={data.dangerous.playmakers} />
          </div>

          <div>
            <h2 className="mb-2 font-semibold">Một số điểm đáng chú ý</h2>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {extras.slowest_defender && (
                <li>
                  Hậu vệ chậm nhất: {extras.slowest_defender.name} (tốc độ {extras.slowest_defender.sprint_speed})
                </li>
              )}
              {extras.fastest_attacker && (
                <li>
                  Tiền đạo nhanh nhất: {extras.fastest_attacker.name} (tốc độ {extras.fastest_attacker.sprint_speed})
                </li>
              )}
              {extras.weaker_flank && <li>Biên yếu hơn: {extras.weaker_flank === "left" ? "trái" : "phải"}</li>}
            </ul>
          </div>
        </section>
      </div>

      <section className="mt-10">
        <h2 className="mb-3 font-semibold">Chỉ số đội</h2>
        <div className="grid gap-6 md:grid-cols-2">
          {GROUPS.map((g) => (
            <div key={g.title}>
              <h3 className="mb-1 text-sm font-medium text-zinc-500">{g.title}</h3>
              <ul className="space-y-1">
                {g.keys.map((k) => byKey.get(k)).filter((m): m is Metric => !!m).map((m) => (
                  <MetricRow key={m.key} m={m} />
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          P = phân vị trong giải (P90: cao hơn 90% các đội). Với “chênh lệch OVR chính – dự bị”, thấp hơn là tốt hơn.
        </p>
      </section>

      {data.team_id != null && <FormSection data={data} />}
    </>
  );
}

function FormSection({ data }: { data: OpponentAnalysis }) {
  const form = data.form;
  return (
    <section className="mt-10">
      <h2 className="mb-2 font-semibold">Phong độ</h2>
      {form ? (
        <p className="mb-3 text-sm">
          {form.matches} trận gần nhất: {form.wins} thắng, {form.draws} hòa, {form.losses} thua — {form.points}/
          {form.max_points} điểm
          {form.goal_difference != null && `, hiệu số ${form.goal_difference > 0 ? "+" : ""}${form.goal_difference}`}
          {form.sequence && ` (${form.sequence.split("").join(" ")})`}.
          {!form.verified && (
            <span className="mt-1 block text-xs text-amber-600">
              Ước tính từ chuỗi phong độ của game, cách đọc chưa được xác nhận và không có tỷ số. Nhập kết quả bên dưới để có số liệu chính xác.
            </span>
          )}
        </p>
      ) : (
        <p className="mb-3 text-sm text-zinc-500">Chưa có dữ liệu phong độ. Nhập kết quả các trận gần đây của đội bên dưới.</p>
      )}
      <ResultsForm teamId={data.team_id!} results={form?.source === "manual" ? form.results : []} />
    </section>
  );
}

function MetricRow({ m }: { m: Metric }) {
  const goodness = m.percentile == null ? null : m.higher_is_better ? m.percentile : 100 - m.percentile;
  return (
    <li className="flex items-center gap-2 text-sm">
      <span className="w-60 shrink-0">{m.label}</span>
      <span className="w-12 shrink-0 text-right font-semibold tabular-nums">{m.value ?? "–"}</span>
      <span className="relative h-2 flex-1 rounded bg-zinc-200 dark:bg-zinc-800">
        {m.percentile != null && (
          <span className={`absolute inset-y-0 left-0 rounded ${percentileColor(goodness!)}`} style={{ width: `${m.percentile}%` }} />
        )}
      </span>
      <span className="w-10 shrink-0 text-right text-xs text-zinc-500 tabular-nums">
        {m.percentile != null ? `P${Math.round(m.percentile)}` : ""}
      </span>
    </li>
  );
}

function DangerList({ title, players }: { title: string; players: DangerousPlayer[] }) {
  return (
    <div className="mb-3">
      <h3 className="text-xs font-medium text-zinc-500">{title}</h3>
      <ul className="space-y-0.5 text-sm">
        {players.map((p) => (
          <li key={p.player_id}>
            <Link href={playerHref(p.player_id)} className="font-medium hover:underline">{p.name}</Link>{" "}
            <span className="text-zinc-500">({p.overall}) — {p.why}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
