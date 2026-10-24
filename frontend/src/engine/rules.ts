// Engine gợi ý đấu pháp theo luật (khớp backend/app/services/rules.py): điều kiện dựa trên phân vị so với giải.
import counters from "./data/counters.json";
import { pyFloat, pyRound } from "./util";

const LOW_PCT = 25.0;
const HIGH_PCT = 75.0;
const PACE_EDGE = 4.0;
const FLANK_GAP = 8.0;
const HEIGHT_EDGE = 4.0;

type Num = number | null | undefined;
type Dict = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export interface Ctx {
  values: Record<string, Num>;
  percentiles: Record<string, Num>;
  extras: Dict;
  injuries: Dict[];
  dangerous: Dict;
  formation_name: string | null;
  mine_values: Record<string, Num>;
  mine_extras: Dict;
  verified_form: Dict | null;
}

export interface Evidence { strength: number; lines: string[] }

export interface Rule {
  id: string; priority: number; title: string; advice: string; tactics: string[];
  condition: (c: Ctx) => Evidence | null;
  emphasis?: Record<string, Record<string, number>>;
}

export interface Suggestion {
  rule_id: string; priority: number; title: string; advice: string; tactics: string[]; evidence: string[];
  strength: number; emphasis: Record<string, Record<string, number>>;
}

const v = (c: Ctx, k: string): number | null => c.values[k] ?? null;
const p = (c: Ctx, k: string): number | null => c.percentiles[k] ?? null;
const mine = (c: Ctx, k: string): number | null => c.mine_values[k] ?? null;
/** Số thực Python (luôn có ".0" khi nguyên). */
const f = (x: number): string => pyFloat(x);

function scale(x: number, full: number): number {
  return pyRound(0.4 + 0.6 * Math.max(0.0, Math.min(1.0, x / full)), 3);
}

function pctText(c: Ctx, key: string): string {
  const pc = p(c, key);
  return pc !== null ? ` (phân vị ${pyRound(pc)} trong giải)` : "";
}

function condSlowDefence(c: Ctx): Evidence | null {
  const pace = v(c, "def_pace"), pct = p(c, "def_pace"), m = mine(c, "att_pace");
  if (pace === null) return null;
  const byPct = pct !== null && pct <= LOW_PCT;
  const edge = m !== null ? m - pace : null;
  const byEdge = edge !== null && edge >= PACE_EDGE;
  if (!(byPct || byEdge)) return null;
  const lines = [`Tốc độ chạy TB hàng thủ đối thủ: ${f(pace)}${pctText(c, "def_pace")}`];
  if (m !== null) lines.push(`Tốc độ chạy TB hàng công của bạn: ${f(m)}`);
  const slow = c.extras.slowest_defender;
  if (slow) lines.push(`Hậu vệ chậm nhất: ${slow.name} (tốc độ ${slow.sprint_speed})`);
  const s = [byPct ? scale(LOW_PCT - pct!, LOW_PCT) : 0, byEdge ? scale(edge!, 12) : 0];
  return { strength: Math.max(...s), lines };
}

function condWeakMidfield(c: Ctx): Evidence | null {
  const pct = p(c, "mid_defense"), val = v(c, "mid_defense");
  if (val === null || pct === null || pct > LOW_PCT) return null;
  return { strength: scale(LOW_PCT - pct, LOW_PCT), lines: [`Phòng ngự tiền vệ (cắt/tắc/ý thức) của đối thủ: ${f(val)}${pctText(c, "mid_defense")}`] };
}

function condWeakFlank(c: Ctx): Evidence | null {
  const left = v(c, "flank_left_defense"), right = v(c, "flank_right_defense");
  const pl = p(c, "flank_left_defense"), pr = p(c, "flank_right_defense");
  const weak = ([["trái", left, pl], ["phải", right, pr]] as [string, number | null, number | null][])
    .filter(([, val, pc]) => val !== null && pc !== null && pc <= LOW_PCT);
  if (weak.length) {
    const lines = weak.map(([side, val]) => `Biên ${side} của đối thủ: phòng ngự ${f(val!)}${pctText(c, side === "trái" ? "flank_left_defense" : "flank_right_defense")}`);
    return { strength: Math.max(...weak.map(([, , pc]) => scale(LOW_PCT - pc!, LOW_PCT))), lines };
  }
  const gap = left !== null && right !== null ? Math.abs(left - right) : null;
  const side = c.extras.weaker_flank;
  if (gap !== null && gap >= FLANK_GAP && side) {
    const name = side === "left" ? "trái" : "phải";
    return { strength: scale(gap, 20), lines: [`Biên ${name} của đối thủ yếu hơn biên còn lại ${f(pyRound(gap, 1))} điểm phòng ngự (trái ${f(left!)}, phải ${f(right!)})`] };
  }
  return null;
}

function condAerialThreat(c: Ctx): Evidence | null {
  const hPct = p(c, "def_height"), aPct = p(c, "def_aerial");
  const h = v(c, "def_height"), a = v(c, "def_aerial");
  if (hPct !== null && aPct !== null) {
    if (hPct >= HIGH_PCT && aPct >= HIGH_PCT) {
      return {
        strength: scale(Math.min(hPct, aPct) - HIGH_PCT, 100 - HIGH_PCT),
        lines: [`Hàng thủ đối thủ cao TB ${h === null ? "None" : f(h)} cm${pctText(c, "def_height")}, không chiến ${a === null ? "None" : f(a)}${pctText(c, "def_aerial")}`],
      };
    }
    return null;
  }
  const mineH = mine(c, "team_height"), oppH = v(c, "team_height");
  if (oppH !== null && mineH !== null && oppH - mineH >= HEIGHT_EDGE) {
    return { strength: scale(oppH - mineH, 10), lines: [`Đội hình đối thủ cao TB ${f(oppH)} cm, bạn ${f(mineH)} cm`] };
  }
  return null;
}

function condFastStriker(c: Ctx): Evidence | null {
  const pct = p(c, "att_pace"), pace = v(c, "att_pace");
  const fast = c.extras.fastest_attacker;
  const mineDef = mine(c, "def_pace");
  const byPct = pct !== null && pct >= HIGH_PCT;
  const edge = fast && mineDef !== null ? fast.sprint_speed - mineDef : null;
  const byEdge = edge !== null && edge >= PACE_EDGE + 2;
  if (!(byPct || byEdge)) return null;
  const lines: string[] = [];
  if (pace !== null) lines.push(`Tốc độ chạy TB hàng công đối thủ: ${f(pace)}${pctText(c, "att_pace")}`);
  if (fast) lines.push(`Tiền đạo nhanh nhất: ${fast.name} (tốc độ ${fast.sprint_speed})`);
  if (mineDef !== null) lines.push(`Tốc độ chạy TB hàng thủ của bạn: ${f(mineDef)}`);
  const s = [byPct ? scale(pct! - HIGH_PCT, 100 - HIGH_PCT) : 0, byEdge ? scale(edge!, 14) : 0];
  return { strength: Math.max(...s), lines };
}

function condWeakGoalkeeper(c: Ctx): Evidence | null {
  const lines: string[] = [], strengths: number[] = [];
  for (const [key, text] of [["gk_reflexes", "Phản xạ thủ môn đối thủ"], ["gk_aerial", "Bóng bổng thủ môn đối thủ"]]) {
    const pct = p(c, key), val = v(c, key);
    if (val !== null && pct !== null && pct <= LOW_PCT) {
      lines.push(`${text}: ${f(val)}${pctText(c, key)}`);
      strengths.push(scale(LOW_PCT - pct, LOW_PCT));
    }
  }
  return lines.length ? { strength: Math.max(...strengths), lines } : null;
}

function condWeakAerialDefence(c: Ctx): Evidence | null {
  const hPct = p(c, "def_height"), aPct = p(c, "def_aerial");
  if (hPct === null || aPct === null || hPct > LOW_PCT || aPct > LOW_PCT) return null;
  const h = v(c, "def_height"), a = v(c, "def_aerial");
  return {
    strength: scale(LOW_PCT - Math.max(hPct, aPct), LOW_PCT),
    lines: [`Hàng thủ đối thủ thấp (TB ${h === null ? "None" : f(h)} cm${pctText(c, "def_height")}) và không chiến yếu (${a === null ? "None" : f(a)}${pctText(c, "def_aerial")})`],
  };
}

function condTired(c: Ctx): Evidence | null {
  const pct = p(c, "team_stamina"), val = v(c, "team_stamina");
  if (val === null || pct === null || pct > LOW_PCT) return null;
  return { strength: scale(LOW_PCT - pct, LOW_PCT), lines: [`Thể lực TB đội hình đối thủ: ${f(val)}${pctText(c, "team_stamina")}`] };
}

function condThinBench(c: Ctx): Evidence | null {
  const pct = p(c, "bench_quality"), val = v(c, "bench_quality");
  if (val === null || pct === null || pct > LOW_PCT) return null;
  return { strength: scale(LOW_PCT - pct, LOW_PCT), lines: [`OVR TB dự bị tốt nhất của đối thủ: ${f(val)}${pctText(c, "bench_quality")}`] };
}

function condInjuredStarters(c: Ctx): Evidence | null {
  const out = c.injuries.filter((i) => i.in_xi);
  if (!out.length) return null;
  return { strength: scale(out.length, 3), lines: [`Đối thủ vắng cầu thủ đá chính: ${out.map((i) => i.name).join(", ")}`] };
}

function condKeyPlayers(c: Ctx): Evidence | null {
  const attackers: Dict[] = c.dangerous.attackers ?? [], playmakers: Dict[] = c.dangerous.playmakers ?? [];
  if (!attackers.length && !playmakers.length) return null;
  const lines: string[] = [];
  if (attackers.length) lines.push(`Tấn công nguy hiểm nhất: ${attackers[0].name} (${attackers[0].why})`);
  if (playmakers.length) lines.push(`Kiến tạo chính: ${playmakers[0].name} (${playmakers[0].why})`);
  return { strength: 0.5, lines };
}

export const RULES: Rule[] = [
  {
    id: "slow_defence", priority: 90,
    title: "Hàng thủ đối thủ chậm: khai thác khoảng trống sau lưng",
    advice: "Đá bóng dài/chọc khe sau lưng hàng thủ và để tiền đạo chạy chỗ; tránh dồn bóng vào chân chậm rãi.",
    tactics: ["Lên bóng nhanh, ưu tiên chuyền dài và chuyền xuyên tuyến",
      "Tiền đạo/tiền đạo cánh: chạy chỗ vào khoảng trống sau hàng thủ",
      "Đẩy đường chắn của đội cao vừa phải để nhanh chóng bật lên khi cướp bóng"],
    condition: condSlowDefence,
    emphasis: { ATT: { sprint_speed: 0.30, acceleration: 0.20 } },
  },
  {
    id: "weak_flank", priority: 85,
    title: "Biên đối thủ hở: tấn công cánh",
    advice: "Dồn lực lên phía biên yếu của đối thủ: kéo biên rộng, tạt hoặc cắt vào trong nhờ cầu thủ chạy cánh.",
    tactics: ["Hai cầu thủ chạy cánh bám biên, hậu vệ biên dâng cao hỗ trợ ở phía biên yếu",
      "Tiền đạo cánh phía biên yếu cắt vào trong sút hoặc chuyền",
      "Đổi cánh nhanh để kéo giãn hàng thủ"],
    condition: condWeakFlank,
    emphasis: { ATT: { sprint_speed: 0.15, dribbling: 0.20 }, MID: { crossing: 0.10, dribbling: 0.10 } },
  },
  {
    id: "weak_midfield", priority: 80,
    title: "Tiền vệ phòng ngự yếu: chơi qua trung lộ",
    advice: "Đẩy bóng qua trung lộ; tiền vệ tấn công dạt vào kẽ giữa các tuyến để nhận bóng và xoay người.",
    tactics: ["Lối chơi chuyền ngắn qua trung lộ, tiền vệ tấn công chơi giữa hai tuyến",
      "Tiền vệ trung tâm lên hỗ trợ, rê dắt qua tuyến giữa",
      "Không quá phụ thuộc vào tạt bóng"],
    condition: condWeakMidfield,
    emphasis: { MID: { short_passing: 0.20, ball_control: 0.20, dribbling: 0.15, vision: 0.10 } },
  },
  {
    id: "fast_striker", priority: 80,
    title: "Đối thủ có tiền đạo tốc độ cao: giữ đường chắn thấp",
    advice: "Lùi sâu đường chắn và giữ đội hình thấp, tránh để hậu vệ bị bỏ lại với khoảng trống sau lưng.",
    tactics: ["Đường chắn của đội: thấp hoặc vừa phải, không dâng cao dồn ép",
      "Hậu vệ giữ vị trí, hạn chế lên cao đơn lẻ; trung vệ nhanh kèm tiền đạo tốc độ",
      "Cầu thủ kèm người chuyên trách cho tiền đạo nhanh nhất"],
    condition: condFastStriker,
    emphasis: { DEF: { sprint_speed: 0.30, acceleration: 0.15, defensive_awareness: 0.10 } },
  },
  {
    id: "weak_goalkeeper", priority: 75,
    title: "Thủ môn đối thủ yếu: sút xa và bóng bổng",
    advice: "Thử thủ môn bằng các cú sút xa và bóng bổng/tạt vào vòng cấm; phản xạ yếu thì sút từ xa, bóng bổng yếu thì tạt và phạt góc.",
    tactics: ["Khuyến khích sút xa khi có khoảng trống", "Tạt bóng bổng, phạt góc nhiều hơn nếu thủ môn yếu bóng bổng",
      "Tiền đạo bám theo cú sút để đá bồi"],
    condition: condWeakGoalkeeper,
    emphasis: { MID: { long_shots: 0.20, shot_power: 0.10 }, ATT: { shot_power: 0.15, heading_accuracy: 0.10 } },
  },
  {
    id: "aerial_threat", priority: 70,
    title: "Hàng thủ đối thủ cao và đánh đầu tốt: hạn chế bóng bổng",
    advice: "Hạn chế tạt bóng bổng vào vòng cấm; chơi dưới thấp và phòng thủ phạt góc/đá phạt kỹ lưỡng.",
    tactics: ["Ưu tiên chuyền ngắn, chuyền sệt, tạt sệt thay vì tạt bổng",
      "Phạt góc: kèm người kỹ, giữ lại cầu thủ cao ở vòng cấm nhà",
      "Hạn chế để đối thủ có nhiều đá phạt/phạt góc (không phạm lỗi gần vòng cấm)"],
    condition: condAerialThreat,
    emphasis: { DEF: { jumping: 0.20, heading_accuracy: 0.20, strength: 0.10 } },
  },
  {
    id: "weak_aerial_defence", priority: 65,
    title: "Hàng thủ đối thủ thấp và yếu không chiến: tạt bóng bổng",
    advice: "Tạt bóng bổng và phạt góc vào vòng cấm, dùng tiền đạo cao đánh đầu.",
    tactics: ["Hai cầu thủ chạy cánh tạt bổng vào vòng cấm", "Tiền đạo cắm cao to chơi đánh đầu/tì đè",
      "Tận dụng phạt góc và đá phạt"],
    condition: condWeakAerialDefence,
    emphasis: { ATT: { heading_accuracy: 0.25, jumping: 0.20, strength: 0.10 } },
  },
  {
    id: "tired_team", priority: 60,
    title: "Thể lực đối thủ thấp: nhịp độ cao",
    advice: "Duy trì nhịp độ cao và pressing, đối thủ dễ hụt hơi hiệp hai.",
    tactics: ["Nhịp độ lên bóng cao, pressing liên tục", "Giữ sức bằng cách xoay vòng/thay người hợp lý để tận dụng cuối trận"],
    condition: condTired,
    emphasis: { MID: { stamina: 0.20 }, ATT: { stamina: 0.10 } },
  },
  {
    id: "injured_starters", priority: 55,
    title: "Đối thủ thiếu cầu thủ đá chính",
    advice: "Đội hình của đối thủ có thể mất cân bằng; kiểm tra vị trí của cầu thủ vắng và tấn công vào khu vực đó.",
    tactics: ["Tập trung tấn công vào phía có cầu thủ thay thế yếu hơn"],
    condition: condInjuredStarters,
  },
  {
    id: "thin_bench", priority: 45,
    title: "Băng ghế dự bị đối thủ mỏng",
    advice: "Duy trì áp lực tới cuối trận: chất lượng người vào thay của đối thủ thấp hơn.",
    tactics: ["Giữ cường độ cao, cuối trận tấn công thêm khi đối thủ thay người"],
    condition: condThinBench,
  },
  {
    id: "key_players", priority: 40,
    title: "Kèm chặt cầu thủ nguy hiểm",
    advice: "Giám sát cầu thủ tấn công nguy hiểm nhất và ngắt nguồn kiến tạo của đối thủ.",
    tactics: ["Kèm người chuyên trách cho cầu thủ nguy hiểm nhất", "Tiền vệ phòng ngự chặn đường chuyền của cầu thủ kiến tạo chính"],
    condition: condKeyPlayers,
  },
];

/** Chạy mọi luật; ưu tiên cao nhất trước (sắp xếp ổn định như Python). */
export function evaluate(ctx: Ctx, rules: Rule[] = RULES): Suggestion[] {
  const out: Suggestion[] = [];
  for (const rule of rules) {
    const ev = rule.condition(ctx);
    if (ev === null) continue;
    const emphasis: Record<string, Record<string, number>> = {};
    for (const [group, attrs] of Object.entries(rule.emphasis ?? {})) {
      emphasis[group] = {};
      for (const [attr, w] of Object.entries(attrs)) emphasis[group][attr] = pyRound(w * ev.strength, 3);
    }
    out.push({
      rule_id: rule.id, priority: rule.priority * (0.5 + 0.5 * ev.strength), title: rule.title, advice: rule.advice,
      tactics: [...rule.tactics], evidence: ev.lines, strength: ev.strength, emphasis,
    });
  }
  return out.sort((a, b) => b.priority - a.priority);
}

export function suggestionDict(s: Suggestion) {
  return {
    rule_id: s.rule_id, priority: pyRound(s.priority, 1), title: s.title, advice: s.advice, tactics: s.tactics,
    evidence: s.evidence, strength: pyRound(s.strength, 2), emphasis: s.emphasis,
  };
}

const COUNTERS = (counters as { counters: Record<string, { formation: string; reason: string }[]> }).counters;

export function formationCounters(name: string | null | undefined): { formation: string; reason: string }[] {
  if (!name) return [];
  return (COUNTERS[name.trim()] ?? []).map((c) => ({ ...c }));
}
