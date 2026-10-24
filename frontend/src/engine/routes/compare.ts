// So sánh hai cầu thủ / hai đội (khớp backend/app/routers/compare.py).
import { analyzePlayer, ATTRIBUTE_LABELS, clubOfPlayer, ROLE_ATTRS } from "../analysis";
import { notFound, requiredQueryInt, unprocessable, type Ctx } from "../http";
import { analyzeTeam, METRICS } from "../opponent";
import { playerSummary, referenceDate } from "../serialize";
import type { Store } from "../store";
import type { Player } from "../types";

const BASIC_ROWS: [string, string][] = [["overall", "OVR"], ["potential", "Tiềm năng"], ["age", "Tuổi"], ["height", "Chiều cao (cm)"],
  ["weight", "Cân nặng (kg)"], ["weak_foot", "Chân yếu (sao)"], ["skill_moves", "Kỹ thuật (0-4)"]];

type N = number | null | undefined;
const better = (a: N, b: N, hib = true): "a" | "b" | null => {
  if (a === null || a === undefined || b === null || b === undefined || a === b) return null;
  return (a > b) === hib ? "a" : "b";
};
const row = (key: string, label: string, a: N, b: N, hib = true) => ({
  key, label, a: a ?? null, b: b ?? null,
  diff: a !== null && a !== undefined && b !== null && b !== undefined ? a - b : null,
  better: better(a, b, hib),
});
const attr = (p: Player, k: string): N => (p as unknown as Record<string, N>)[k];

function playerBlock(store: Store, playerId: number, ref: string) {
  const player = store.data.players.get(playerId);
  if (!player) throw notFound(`Không tìm thấy cầu thủ ${playerId}`);
  const analysis = analyzePlayer(store, player);
  const club = clubOfPlayer(store, playerId);
  return { player, analysis: { ...analysis, club: club ? { team_id: club.team.team_id, name: club.team.name } : null, player: playerSummary(player, null, null, ref) } };
}

export function comparePlayers(ctx: Ctx) {
  const a = requiredQueryInt(ctx.query, "a"), b = requiredQueryInt(ctx.query, "b");
  if (a === b) throw unprocessable("Hãy chọn hai cầu thủ khác nhau");
  const ref = referenceDate(ctx.store);
  const A = playerBlock(ctx.store, a, ref), B = playerBlock(ctx.store, b, ref);
  const rows = BASIC_ROWS.map(([k, label]) =>
    row(k, label, k === "age" ? A.analysis.player.age : attr(A.player, k), k === "age" ? B.analysis.player.age : attr(B.player, k)));
  const keys = [...new Set<string>([...ROLE_ATTRS[A.analysis.role], ...ROLE_ATTRS[B.analysis.role]])].filter((k) => k !== "height");
  rows.push(...keys.map((k) => row(k, ATTRIBUTE_LABELS[k], attr(A.player, k), attr(B.player, k))));
  return { a: A.analysis, b: B.analysis, rows, same_role: A.analysis.role === B.analysis.role };
}

export function compareTeams(ctx: Ctx) {
  const a = requiredQueryInt(ctx.query, "a"), b = requiredQueryInt(ctx.query, "b");
  if (a === b) throw unprocessable("Hãy chọn hai đội khác nhau");
  const ra = analyzeTeam(ctx.store, a), rb = analyzeTeam(ctx.store, b);
  for (const [tid, rep] of [[a, ra], [b, rb]] as const) if (rep === null) throw notFound(`Không tìm thấy đội ${tid}`);
  const A = ra!, B = rb!;
  const metrics = Object.entries(METRICS).map(([k, [label, hib]]) => ({
    ...row(k, label, A.values[k], B.values[k], hib), percentile_a: A.percentiles[k] ?? null, percentile_b: B.percentiles[k] ?? null,
  }));
  const ratings = ([["overall", "OVR đội"], ["attack", "Tấn công"], ["midfield", "Tiền vệ"], ["defense", "Phòng ngự"]] as const)
    .map(([k, label]) => row(k, label, A.ratings[k], B.ratings[k]));
  return {
    a: { team_id: a, name: A.name, formation: A.lineup.formation_name },
    b: { team_id: b, name: B.name, formation: B.lineup.formation_name },
    ratings, metrics,
  };
}
