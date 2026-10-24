// Chọn 11 người tối ưu cho đội của người dùng khi đối đầu một đối thủ (khớp backend/app/services/optimizer.py).
import { ATTRIBUTE_LABELS } from "./analysis";
import { assignPlayers, PENALTY_OTHER_LINE, PENALTY_SAME_FAMILY, positionPenalty } from "./lineup";
import { LINE_OF_ROLE, lineOfPosition, positionName, roleOfPlayer, LINES } from "./positions";
import type { Suggestion } from "./rules";
import type { Store } from "./store";
import { squadPlayers } from "./teams";
import type { FormationDef, Player, SquadMember } from "./types";
import { pySum, signed1 } from "./util";

export const DEFAULT_FORMATIONS = ["4-3-3", "4-2-3-1", "4-4-2"];
const FORM_NEUTRAL = 3;
const FORM_WEIGHT = 1.0;
const MAX_EMPHASIS_WEIGHT = 0.6;
const MIN_REASON_BONUS = 1.0;
const MAX_RULE_BONUS = 6.0;
export const DEFAULT_OPTIONS = 3;

export interface SlotChoice {
  slot: number; position: number | null; player: Player | null; rating: number; fit_penalty: number; form_bonus: number;
  rule_bonus: number; reasons: string[]; rule_reasons: string[];
}
export const slotScore = (s: SlotChoice) => s.rating + s.form_bonus + s.rule_bonus;

export interface LineupOption {
  formation: FormationDef; slots: SlotChoice[]; baseline_score: number;
  added: { player_id: number; name: string; position: string; because: string }[];
  removed: { player_id: number; name: string }[];
  is_usual: boolean; why_formation: string; warnings: string[];
}
export const optionScore = (o: LineupOption) => pySum(o.slots.map(slotScore));
export function optionValid(o: LineupOption): boolean {
  const ids = o.slots.filter((s) => s.player).map((s) => s.player!.player_id);
  return o.slots.length === 11 && ids.length === 11 && new Set(ids).size === 11;
}

export interface Candidate { player: Player; member: SquadMember }

const attrOf = (p: Player, a: string): number | null => (p as unknown as Record<string, number | null>)[a];
type Contribution = [Suggestion, string, number];

function lineMeans(candidates: Candidate[], attrs: Set<string>): Record<string, Record<string, number>> {
  const means: Record<string, Record<string, number>> = {};
  for (const line of LINES) {
    const group = candidates.filter((c) => LINE_OF_ROLE[roleOfPlayer(c.player.positions, c.player.primary_position)] === line).map((c) => c.player);
    means[line] = {};
    for (const attr of attrs) {
      const vals = group.map((p) => attrOf(p, attr)).filter((v): v is number => v !== null);
      if (vals.length) means[line][attr] = pySum(vals) / vals.length;
    }
  }
  return means;
}

/** (tuyến|chỉ số) -> [(luật, trọng số)], trần tổng trọng số theo MAX_EMPHASIS_WEIGHT. Giữ thứ tự chèn như dict của Python. */
function ruleWeights(suggestions: Suggestion[]): Map<string, { group: string; attr: string; items: [Suggestion, number][] }> {
  const table = new Map<string, { group: string; attr: string; items: [Suggestion, number][] }>();
  for (const s of suggestions) {
    for (const [group, attrs] of Object.entries(s.emphasis)) {
      for (const [attr, w] of Object.entries(attrs)) {
        const key = `${group}|${attr}`;
        if (!table.has(key)) table.set(key, { group, attr, items: [] });
        table.get(key)!.items.push([s, w]);
      }
    }
  }
  for (const entry of table.values()) {
    const total = pySum(entry.items.map(([, w]) => w));
    if (total > MAX_EMPHASIS_WEIGHT) entry.items = entry.items.map(([s, w]) => [s, (w * MAX_EMPHASIS_WEIGHT) / total]);
  }
  return table;
}

export function evaluateFormation(formation: FormationDef, candidates: Candidate[], suggestions: Suggestion[]): LineupOption {
  const weights = ruleWeights(suggestions);
  const means = lineMeans(candidates, new Set([...weights.values()].map((e) => e.attr)));
  const byId = new Map(candidates.map((c) => [c.player.player_id, c]));

  const formBonus = (c: Candidate): number => (c.member.form ? (c.member.form - FORM_NEUTRAL) * FORM_WEIGHT : 0.0);

  const ruleContributions = (p: Player, slotPosition: number | null): Contribution[] => {
    const line = lineOfPosition(slotPosition);
    const fit = Math.max(0.0, 1.0 - positionPenalty(p.positions, slotPosition) / PENALTY_OTHER_LINE);
    let out: Contribution[] = [];
    for (const { group, attr, items } of weights.values()) {
      const val = attrOf(p, attr);
      if (group !== line || val === null || !(line !== null && attr in (means[line] ?? {}))) continue;
      const diff = val - means[line!][attr];
      for (const [suggestion, w] of items) out.push([suggestion, attr, w * diff * fit]);
    }
    const total = pySum(out.map((t) => t[2]));
    const limit = MAX_RULE_BONUS * fit;
    if (Math.abs(total) > limit) {
      const scale = total ? limit / Math.abs(total) : 0.0;
      out = out.map(([s, a, v]) => [s, a, v * scale]);
    }
    return out;
  };

  const bonus = (p: Player, slotPosition: number | null): number => {
    const c = byId.get(p.player_id)!;
    const extra = slotPosition !== null ? pySum(ruleContributions(p, slotPosition).map((t) => t[2])) : 0.0;
    return formBonus(c) + extra;
  };

  const positions = [...formation.positions];
  const players = candidates.map((c) => c.player);
  const assigned = assignPlayers(positions, players, bonus);
  const baseline = assignPlayers(positions, players);

  const slots: SlotChoice[] = assigned.map((a) => {
    const choice: SlotChoice = { slot: a.slot, position: a.position, player: a.player, rating: 0.0, fit_penalty: 0.0, form_bonus: 0.0, rule_bonus: 0.0, reasons: [], rule_reasons: [] };
    if (a.player !== null) {
      const p = a.player, c = byId.get(p.player_id)!;
      choice.fit_penalty = positionPenalty(p.positions, a.position);
      choice.rating = p.overall - choice.fit_penalty;
      choice.form_bonus = formBonus(c);
      const contribs = ruleContributions(p, a.position);
      choice.rule_bonus = pySum(contribs.map((t) => t[2]));
      [choice.reasons, choice.rule_reasons] = reasonsFor(p, c, a.position, choice, contribs);
    }
    return choice;
  });

  const option: LineupOption = {
    formation, slots, added: [], removed: [], is_usual: false, why_formation: "", warnings: [],
    baseline_score: pySum(baseline.filter((b) => b.player).map((b) => b.player!.overall - positionPenalty(b.player!.positions, b.position))),
  };
  const baseById = new Map(baseline.filter((b) => b.player).map((b) => [b.player!.player_id, b]));
  const chosenById = new Map(slots.filter((s) => s.player).map((s) => [s.player!.player_id, s]));
  for (const [pid, s] of chosenById) {
    if (!baseById.has(pid)) {
      option.added.push({
        player_id: pid, name: s.player!.name || `Cầu thủ #${pid}`, position: positionName(s.position),
        because: (s.rule_reasons.length ? s.rule_reasons : s.reasons.length ? s.reasons : [""])[0],
      });
    }
  }
  for (const [pid, b] of baseById) {
    if (!chosenById.has(pid)) option.removed.push({ player_id: pid, name: b.player!.name || `Cầu thủ #${pid}` });
  }
  if (candidates.length < 11) option.warnings.push(`Chỉ có ${candidates.length} cầu thủ khả dụng, không đủ 11 người.`);
  return option;
}

function reasonsFor(p: Player, c: Candidate, slotPosition: number | null, choice: SlotChoice, contribs: Contribution[]): [string[], string[]] {
  const out: string[] = [], ruleReasons: string[] = [];
  const pos = positionName(slotPosition);
  if (choice.fit_penalty === 0) out.push(`Đá đúng sở trường ${pos} (OVR ${p.overall})`);
  else if (choice.fit_penalty <= PENALTY_SAME_FAMILY) out.push(`Đá ${pos}, cùng họ vị trí với sở trường: OVR ${p.overall} − ${choice.fit_penalty} = ${choice.rating}`);
  else out.push(`Đá ${pos} lệch vị trí sở trường: OVR ${p.overall} − ${choice.fit_penalty} = ${choice.rating}`);
  const form = c.member.form;
  if (form && form !== FORM_NEUTRAL) {
    out.push(`Phong độ ${form > FORM_NEUTRAL ? "tốt" : "kém"} (mức ${form}/5): ${choice.form_bonus >= 0 ? "+" : ""}${choice.form_bonus}`);
  }
  const grouped = new Map<string, Contribution>();
  for (const t of contribs) {
    const key = t[0].rule_id;
    const cur = grouped.get(key);
    if (!cur || Math.abs(t[2]) > Math.abs(cur[2])) grouped.set(key, t);
  }
  const ordered = [...grouped.values()].sort((a, b) => Math.abs(b[2]) - Math.abs(a[2]));
  for (const [suggestion, attr, value] of ordered) {
    if (Math.abs(value) >= MIN_REASON_BONUS) {
      const rel = value > 0 ? "cao hơn" : "thấp hơn";
      const text = `${ATTRIBUTE_LABELS[attr] ?? attr} ${attrOf(p, attr)} ${rel} trung bình đội ở tuyến này — ${suggestion.title.toLowerCase()} (${signed1(value)})`;
      out.push(text);
      if (value > 0) ruleReasons.push(text);
    }
  }
  return [out, ruleReasons];
}

export function eligibleCandidates(store: Store, teamId: number) {
  const candidates: Candidate[] = [];
  const injured: { player_id: number; name: string }[] = [];
  for (const { player, member } of squadPlayers(store, teamId)) {
    if (member.injury) injured.push({ player_id: player.player_id, name: player.name || `Cầu thủ #${player.player_id}` });
    else candidates.push({ player, member });
  }
  return { candidates, injured };
}

export function recommendLineups(
  store: Store, myTeamId: number, suggestions: Suggestion[], counters: { formation: string; reason: string }[],
  limit = DEFAULT_OPTIONS, formationNames?: string[],
) {
  const { candidates, injured } = eligibleCandidates(store, myTeamId);
  const usual = store.data.lineups.get(myTeamId)?.formation_name ?? null;
  const reasonsByName = new Map(counters.map((c) => [c.formation, c.reason]));
  const names = new Set(formationNames?.length ? formationNames : [...reasonsByName.keys(), ...(usual ? [usual] : []), ...DEFAULT_FORMATIONS]);
  const variants = [...store.data.formations.values()].filter((f) => names.has(f.name)).sort((a, b) => a.formation_id - b.formation_id);
  const best = new Map<string, LineupOption>();
  for (const f of variants) {
    const option = evaluateFormation(f, candidates, suggestions);
    const cur = best.get(f.name);
    if (!cur || optionScore(option) > optionScore(cur)) best.set(f.name, option);
  }
  const options = [...best.values()].map((o) => ({ o, s: optionScore(o) })).sort((a, b) => b.s - a.s).slice(0, limit).map((x) => x.o);
  for (const o of options) {
    o.is_usual = o.formation.name === usual;
    const why = reasonsByName.get(o.formation.name);
    if (why !== undefined) o.why_formation = `Sơ đồ khắc chế: ${why}`;
    else if (o.is_usual) o.why_formation = "Sơ đồ đội bạn thường dùng.";
    else o.why_formation = "Sơ đồ phổ biến phù hợp với cầu thủ hiện có.";
  }
  return { options, injured, available: candidates.length, usual_formation: usual, rules: suggestions.filter((s) => Object.keys(s.emphasis).length > 0).map((s) => s.title) };
}
