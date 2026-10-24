// Phân tích đội hình đối thủ (khớp backend/app/services/opponent.py). Dùng cho đội trong dữ liệu và đội hình nhập tay.
import { analyzePlayer, WEAKNESS_PCT } from "./analysis";
import { teamForm, type FormInfo } from "./form";
import { lineOfPosition, roleOfPlayer, roleOfPosition } from "./positions";
import type { Store } from "./store";
import { resolveLineup, slotLine, slotName, squadPlayers, type LineupView, type SlotView } from "./teams";
import type { Player } from "./types";
import { avg, percentile, pyFloat, pyRound, pySum } from "./util";

export const BENCH_SIZE = 7;
export const MIN_BENCHMARK_TEAMS = 5;
const WING_BACK_POSITIONS = new Set([2, 8]);
const MIN_CENTRE_BACKS_FOR_WING_BACKS = 3;

export const METRICS: Record<string, [string, boolean]> = {
  def_pace: ["Tốc độ chạy TB hàng thủ", true],
  def_accel: ["Tăng tốc TB hàng thủ", true],
  def_slowest: ["Tốc độ hậu vệ chậm nhất", true],
  def_height: ["Chiều cao TB hàng thủ (cm)", true],
  def_aerial: ["Không chiến hàng thủ (nhảy/đánh đầu/sức mạnh)", true],
  gk_reflexes: ["Phản xạ thủ môn (phản xạ/bay người)", true],
  gk_aerial: ["Bóng bổng thủ môn (bật nhảy/bắt bóng/vị trí)", true],
  mid_defense: ["Phòng ngự tiền vệ (cắt/tắc/ý thức)", true],
  flank_left_defense: ["Phòng ngự biên trái", true],
  flank_right_defense: ["Phòng ngự biên phải", true],
  team_height: ["Chiều cao TB đội hình (cm)", true],
  team_stamina: ["Thể lực TB đội hình", true],
  att_pace: ["Tốc độ chạy TB hàng công", true],
  att_finishing: ["Dứt điểm TB hàng công", true],
  xi_overall: ["OVR TB đội hình xuất phát", true],
  bench_quality: ["OVR TB dự bị tốt nhất", true],
  depth_drop: ["Chênh lệch OVR đội hình chính – dự bị", false],
};
export const DEFENSIVE_METRICS = [
  "def_pace", "def_accel", "def_slowest", "def_aerial", "gk_reflexes", "gk_aerial", "mid_defense",
  "flank_left_defense", "flank_right_defense", "team_stamina", "bench_quality",
];

// Thứ tự khóa của các từ điển này quyết định kết quả khi có điểm bằng nhau: giữ đúng như bản Python.
const ATTACK_WEIGHTS: Record<string, number> = { finishing: 0.25, positioning: 0.15, shot_power: 0.1, sprint_speed: 0.15, dribbling: 0.15, ball_control: 0.1, composure: 0.1 };
const CREATIVE_WEIGHTS: Record<string, number> = { vision: 0.25, short_passing: 0.2, long_passing: 0.15, ball_control: 0.15, dribbling: 0.1, crossing: 0.05, curve: 0.05, composure: 0.05 };
const LABELS: Record<string, string> = {
  finishing: "dứt điểm", positioning: "chọn vị trí", shot_power: "lực sút", sprint_speed: "tốc độ", dribbling: "rê bóng",
  ball_control: "kiểm soát bóng", composure: "bình tĩnh", vision: "tầm nhìn", short_passing: "chuyền ngắn",
  long_passing: "chuyền dài", crossing: "tạt bóng", curve: "sút xoáy",
};
const FULLBACK_LEFT = new Set([7, 8]);
const FULLBACK_RIGHT = new Set([2, 3]);

type Metrics = Record<string, number | null>;
const val = (p: Player, k: string): number | null => (p as unknown as Record<string, number | null>)[k];
const fullbackScore = (p: Player) => avg([p.defensive_awareness, p.standing_tackle, p.interceptions, p.sprint_speed]);
const brief = (p: Player) => ({ player_id: p.player_id, name: p.name || `Cầu thủ #${p.player_id}`, overall: p.overall });

export interface Extras {
  slowest_defender: { player_id: number; name: string; overall: number; sprint_speed: number } | null;
  fastest_attacker: { player_id: number; name: string; overall: number; sprint_speed: number } | null;
  weaker_flank: "left" | "right" | null;
  back_line_size: number;
  midfield_roles: string[];
}

export interface OpponentReport {
  name: string; teamId: number | null; lineup: LineupView; values: Metrics; extras: Extras;
  percentiles: Record<string, number | null>; benchmark: { league_id: number; league_name: string | null; teams: number } | null;
  dangerous: { attackers: Dangerous[]; playmakers: Dangerous[] }; weakPoints: WeakPoint[]; form: FormInfo | null;
  injuries: { player_id: number; name: string; in_xi: boolean }[]; ratings: Record<string, number | null>;
}
export interface Dangerous { player_id: number; name: string; overall: number; role: string; score: number; why: string }
export interface WeakPoint { kind: string; text: string; [k: string]: unknown }

export function metricsList(r: OpponentReport) {
  return Object.keys(METRICS).map((k) => ({
    key: k, label: METRICS[k][0], value: r.values[k] ?? null, percentile: r.percentiles[k] ?? null, higher_is_better: METRICS[k][1],
  }));
}

/** Phần tử đầu tiên có khoá nhỏ nhất/lớn nhất (như min/max của Python khi có nhiều phần tử bằng nhau). */
function firstBy<T>(items: T[], key: (t: T) => number, pickMax: boolean): T | null {
  let best: T | null = null;
  for (const it of items) if (best === null || (pickMax ? key(it) > key(best) : key(it) < key(best))) best = it;
  return best;
}

export function computeMetrics(slots: SlotView[], bench: Player[]): { values: Metrics; extras: Extras } {
  const starters = slots.filter((s) => s.player !== null).map((s) => ({ sv: s, p: s.player! }));
  const line = (name: string) => starters.filter((x) => slotLine(x.sv) === name).map((x) => x.p);
  const centreBacks = starters.filter((x) => roleOfPosition(x.sv.position) === "CB");
  const threeAtBack = centreBacks.length >= MIN_CENTRE_BACKS_FOR_WING_BACKS;
  const defenders = starters.filter((x) => slotLine(x.sv) === "DEF" && !(threeAtBack && x.sv.position !== null && WING_BACK_POSITIONS.has(x.sv.position))).map((x) => x.p);
  const attackers = line("ATT");
  const goalkeepers = line("GK");
  const dm = starters.filter((x) => roleOfPosition(x.sv.position) === "DM").map((x) => x.p);
  const cm = starters.filter((x) => roleOfPosition(x.sv.position) === "CM").map((x) => x.p);
  const mids = dm.length ? dm : cm.length ? cm : line("MID");
  const left = starters.filter((x) => x.sv.position !== null && FULLBACK_LEFT.has(x.sv.position)).map((x) => x.p);
  const right = starters.filter((x) => x.sv.position !== null && FULLBACK_RIGHT.has(x.sv.position)).map((x) => x.p);
  const xi = starters.map((x) => x.p);
  const gkAvg = (...attrs: string[]) => avg(goalkeepers.map((g) => avg(attrs.map((a) => val(g, a)))));
  const sprintOf = defenders.map((p) => p.sprint_speed).filter((v): v is number => v !== null);

  const values: Metrics = {
    def_pace: avg(defenders.map((p) => p.sprint_speed)),
    def_accel: avg(defenders.map((p) => p.acceleration)),
    def_slowest: sprintOf.length ? Math.min(...sprintOf) : null,
    def_height: avg(defenders.map((p) => p.height)),
    def_aerial: avg(defenders.map((p) => avg([p.jumping, p.heading_accuracy, p.strength]))),
    gk_reflexes: gkAvg("gk_reflexes", "gk_diving"),
    gk_aerial: gkAvg("jumping", "gk_handling", "gk_positioning"),
    mid_defense: avg(mids.map((p) => avg([p.interceptions, p.standing_tackle, p.defensive_awareness]))),
    flank_left_defense: avg(left.map(fullbackScore)),
    flank_right_defense: avg(right.map(fullbackScore)),
    team_height: avg(xi.map((p) => p.height)),
    team_stamina: avg(xi.map((p) => p.stamina)),
    att_pace: avg(attackers.map((p) => p.sprint_speed)),
    att_finishing: avg(attackers.map((p) => p.finishing)),
    xi_overall: avg(xi.map((p) => p.overall)),
  };
  const bestBench = [...bench].sort((a, b) => b.overall - a.overall).slice(0, BENCH_SIZE);
  values.bench_quality = avg(bestBench.map((p) => p.overall));
  values.depth_drop = values.xi_overall !== null && values.bench_quality !== null ? pyRound(values.xi_overall - values.bench_quality, 1) : null;

  const slowest = firstBy(defenders.filter((p) => p.sprint_speed !== null), (p) => p.sprint_speed!, false);
  const fastest = firstBy(attackers.filter((p) => p.sprint_speed !== null), (p) => p.sprint_speed!, true);
  const l = values.flank_left_defense;
  const r = values.flank_right_defense;
  const midRoles = [...new Set(starters.filter((x) => lineOfPosition(x.sv.position) === "MID").map((x) => roleOfPosition(x.sv.position)).filter((x): x is NonNullable<typeof x> => x !== null))].sort();
  const extras: Extras = {
    slowest_defender: slowest ? { ...brief(slowest), sprint_speed: slowest.sprint_speed! } : null,
    fastest_attacker: fastest ? { ...brief(fastest), sprint_speed: fastest.sprint_speed! } : null,
    weaker_flank: l !== null && r !== null && l !== r ? (l < r ? "left" : "right") : null,
    back_line_size: defenders.length,
    midfield_roles: midRoles,
  };
  return { values, extras };
}

function weighted(p: Player, weights: Record<string, number>): number {
  const used = Object.entries(weights).filter(([a]) => val(p, a) !== null);
  const total = pySum(used.map(([, w]) => w));
  return total ? pySum(used.map(([a, w]) => val(p, a)! * w)) / total : 0;
}

export function dangerousPlayers(slots: SlotView[], top = 3): { attackers: Dangerous[]; playmakers: Dangerous[] } {
  const candidates = slots.filter((s) => s.player && slotLine(s) !== "GK").map((s) => s.player!);
  const entries = (weights: Record<string, number>): Dangerous[] =>
    [...candidates].sort((a, b) => -weighted(a, weights) - -weighted(b, weights)).slice(0, top).map((p) => {
      const best = Object.keys(weights).filter((a) => val(p, a) !== null).sort((a, b) => -val(p, a)! * weights[a] - -val(p, b)! * weights[b]).slice(0, 3);
      return {
        ...brief(p), role: roleOfPlayer(p.positions, p.primary_position), score: pyRound(weighted(p, weights), 1),
        why: best.map((a) => `${LABELS[a]} ${val(p, a)}`).join(", "),
      };
    });
  return { attackers: entries(ATTACK_WEIGHTS), playmakers: entries(CREATIVE_WEIGHTS) };
}

/** Giá trị chỉ số như Python in ra: def_slowest là int, các chỉ số còn lại là float (luôn có phần thập phân). */
const fmtMetric = (key: string, v: number): string => (key === "def_slowest" ? String(v) : pyFloat(v));

export function weakPoints(store: Store, slots: SlotView[], percentiles: Record<string, number | null>, values: Metrics, limit = 8): WeakPoint[] {
  const points: WeakPoint[] = [];
  const teamLevel = DEFENSIVE_METRICS.filter((k) => percentiles[k] != null && percentiles[k]! <= WEAKNESS_PCT)
    .map((k) => [percentiles[k]!, k] as [number, string])
    .sort((a, b) => a[0] - b[0] || (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0));
  for (const [pct, key] of teamLevel) {
    const label = METRICS[key][0];
    points.push({
      kind: "team", metric: key, label, value: values[key], percentile: pct,
      text: `${label}: ${fmtMetric(key, values[key]!)} (thuộc nhóm thấp nhất giải, phân vị ${pyRound(pct)})`,
    });
  }
  const playerLevel: { pct: number; sv: SlotView; w: ReturnType<typeof analyzePlayer>["weaknesses"][number] }[] = [];
  for (const sv of slots) {
    if (!sv.player) continue;
    for (const w of analyzePlayer(store, sv.player).weaknesses) playerLevel.push({ pct: w.percentile, sv, w });
  }
  playerLevel.sort((a, b) => a.pct - b.pct);
  for (const { pct, sv, w } of playerLevel) {
    const p = sv.player!;
    const who = p.name || String(p.player_id);
    points.push({
      kind: "player", player_id: p.player_id, name: p.name || `Cầu thủ #${p.player_id}`, position_name: slotName(sv),
      attribute: w.key, label: w.label, value: w.value, percentile: pct, peer_avg: w.peer_avg,
      text: `${who} (${slotName(sv)}): ${w.label.toLowerCase()} ${w.value} (nhóm trung bình ${w.peer_avg === null ? "None" : pyFloat(w.peer_avg)}, phân vị ${pyRound(pct)})`,
    });
  }
  return points.slice(0, limit);
}

/** Chỉ số của mọi đội cùng giải để tính phân vị, lưu đệm theo phiên bản dữ liệu. */
export function leagueBenchmark(store: Store, leagueId: number): Metrics[] {
  const version = store.dataVersion;
  const key = `${leagueId}:${version}`;
  if (version && store.benchCache.has(key)) return store.benchCache.get(key) as Metrics[];
  const rows: Metrics[] = [];
  for (const [teamId, standing] of store.data.standings) {
    if (standing.league_id !== leagueId) continue;
    const squad = squadPlayers(store, teamId);
    if (!squad.length) continue;
    const lineup = resolveLineup(store, teamId, squad);
    const starters = new Set(lineup.slots.filter((s) => s.player).map((s) => s.player!.player_id));
    const bench = squad.filter((e) => !starters.has(e.player.player_id) && !e.member.injury).map((e) => e.player);
    rows.push(computeMetrics(lineup.slots, bench).values);
  }
  if (version) store.benchCache.set(key, rows);
  return rows;
}

export function percentilesVs(values: Metrics, rows: Metrics[]): Record<string, number | null> {
  const out: Record<string, number | null> = {};
  for (const [key, value] of Object.entries(values)) {
    const series = rows.map((r) => r[key]).filter((v): v is number => v !== null && v !== undefined).sort((a, b) => a - b);
    out[key] = value !== null && series.length >= MIN_BENCHMARK_TEAMS ? percentile(series, value) : null;
  }
  return out;
}

export function buildReport(store: Store, o: {
  name: string; teamId: number | null; leagueId: number | null; leagueName: string | null; lineup: LineupView; bench: Player[];
  form: FormInfo | null; injuries: OpponentReport["injuries"]; ratings: OpponentReport["ratings"];
}): OpponentReport {
  const { values, extras } = computeMetrics(o.lineup.slots, o.bench);
  const rows = o.leagueId !== null ? leagueBenchmark(store, o.leagueId) : [];
  const percentiles = percentilesVs(values, rows);
  return {
    name: o.name, teamId: o.teamId, lineup: o.lineup, values, extras, percentiles,
    benchmark: rows.length >= MIN_BENCHMARK_TEAMS ? { league_id: o.leagueId!, league_name: o.leagueName, teams: rows.length } : null,
    dangerous: dangerousPlayers(o.lineup.slots), weakPoints: weakPoints(store, o.lineup.slots, percentiles, values),
    form: o.form, injuries: o.injuries, ratings: o.ratings,
  };
}

export function analyzeTeam(store: Store, teamId: number): OpponentReport | null {
  const team = store.data.teams.get(teamId);
  if (!team) return null;
  const squad = squadPlayers(store, teamId);
  const lineup = resolveLineup(store, teamId, squad);
  const starters = new Set(lineup.slots.filter((s) => s.player).map((s) => s.player!.player_id));
  const bench = squad.filter((e) => !starters.has(e.player.player_id) && !e.member.injury).map((e) => e.player);
  const injuries = squad.filter((e) => e.member.injury).map((e) => ({
    player_id: e.player.player_id, name: e.player.name || `Cầu thủ #${e.player.player_id}`, in_xi: starters.has(e.player.player_id),
  }));
  const standing = store.data.standings.get(teamId);
  const leagueId = standing?.league_id ?? null;
  const league = leagueId !== null ? store.data.leagues.get(leagueId) : undefined;
  return buildReport(store, {
    name: team.name, teamId, leagueId, leagueName: league?.name ?? null, lineup, bench, form: teamForm(store, teamId), injuries,
    ratings: { overall: team.overall, attack: team.attack, midfield: team.midfield, defense: team.defense },
  });
}
