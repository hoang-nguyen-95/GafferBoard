// Đề nghị dạng GÓI khi mua cầu thủ: tiền mặt kèm trao đổi cầu thủ, tiền thưởng (add-on), % chia lại khi bán và tiền ký.
// Các thành phần này đúng với các trường trong đề nghị của game (career_presignedcontract: offeredfee, isexchangedplayer/secondaryplayerid,
// performancebonus*, signonbonus, releaseclause...). Cách bên bán "tính" từng thành phần KHÔNG có trong dữ liệu game; các hệ số dưới đây
// là kinh nghiệm chung, chưa kiểm chứng, để so sánh các gói với nhau và với mức giá mục tiêu.
import { roleOfPlayer } from "./positions";
import { estimatedValue, priceAnalysis, priorValue, round, valueModel } from "./pricing";
import { seasonEndYear, seasonsLeft } from "./manager";
import { referenceDate } from "./serialize";
import type { Store } from "./store";
import { resolveLineup, squadPlayers } from "./teams";
import type { Player } from "./types";
import { ageOn } from "./util";

export const PACKAGE = {
  /** Bên bán tính cầu thủ trao đổi bằng phần này của giá trị ước tính. */
  swapCredit: 0.9,
  /** Phần mệnh giá thưởng được tính vào giá trị gói (cả với bên bán lẫn chi phí kỳ vọng của bạn): thưởng chỉ trả khi đạt chỉ tiêu. */
  addonWeight: 0.5,
  /** Chia lại khi bán: trọng số của (phần trăm × giá bán lại kỳ vọng) vì chưa chắc bán, và bán sau vài năm. */
  sellOnWeight: 0.6, sellOnYears: 3, sellOnMaxPercent: 20, sellOnStep: 5,
  /** Gợi ý tự động. */
  autoCashShare: { addons: 0.85, sellOn: 0.9 },
  /** So giá trị gói (theo bên bán) với mục tiêu: từ ngưỡng này trở lên là "dễ", từ "possible" là "có thể". */
  likely: 1.0, possible: 0.93,
  maxSwapPlayers: 3,
} as const;

export interface PackageInput { cash: number; swapIds: number[]; addons: number; sellOnPercent: number; signOn: number }

/** Giá bán lại kỳ vọng sau `years` năm: cầu thủ trẻ tiến gần POT, cầu thủ già giảm dần. */
export function projectedResale(store: Store, p: Player, years: number): number {
  const age = ageOn(p.birth_date, referenceDate(store));
  const future = age === null ? 0 : age + years;
  const pot = p.potential ?? p.overall;
  let overall = p.overall;
  if (age !== null && age <= 24) overall = Math.min(pot, p.overall + (pot - p.overall) * 0.5);
  else if (future > 30) overall = p.overall - (future - 30);
  const proj: Player = { ...p, overall: Math.max(40, Math.round(overall)), potential: Math.max(pot, overall) };
  return priorValue(proj, future, null) * Math.exp(valueModel(store).scaleLn);
}

export function evaluatePackage(store: Store, teamId: number | null, target: Player, input: PackageInput) {
  const vm = valueModel(store);
  const analysis = priceAnalysis(store, teamId, target, null, null);
  const ladder = analysis.fee.ladder;
  const xi = teamId === null ? new Set<number>() : new Set(resolveLineup(store, teamId).slots.flatMap((s) => (s.player ? [s.player.player_id] : [])));
  const swaps = input.swapIds.flatMap((id) => {
    const p = store.data.players.get(id);
    if (!p) return [];
    const value = estimatedValue(store, p, vm);
    return [{ player_id: id, name: p.name || `Cầu thủ #${id}`, value: round(value), credit: round(value * PACKAGE.swapCredit), in_xi: xi.has(id), wage: store.data.contracts.get(id)?.wage ?? null }];
  });
  const resale = projectedResale(store, target, PACKAGE.sellOnYears);
  const addonsWeighted = input.addons * PACKAGE.addonWeight;
  const sellOnWeighted = (input.sellOnPercent / 100) * resale * PACKAGE.sellOnWeight;
  const swapCredit = swaps.reduce((s, x) => s + x.credit, 0);
  const perceived = input.cash + swapCredit + addonsWeighted + sellOnWeighted;
  const ratio = ladder.target > 0 ? perceived / ladder.target : 0;
  const verdict = ratio >= PACKAGE.likely ? "likely" : ratio >= PACKAGE.possible ? "possible" : perceived >= ladder.open ? "unlikely" : "below_open";

  const swapValueGiven = swaps.reduce((s, x) => s + x.value, 0);
  const totalCost = input.cash + swapValueGiven + addonsWeighted + sellOnWeighted + input.signOn;
  const notes: string[] = [];
  if (swaps.some((s) => s.in_xi)) notes.push("Gói có cầu thủ đang đá chính của bạn: mất họ có thể làm yếu đội hình.");
  if (swaps.length > 0) notes.push("Trao đổi giúp giảm tiền mặt và giải phóng quỹ lương, nhưng bạn mất giá trị của cầu thủ đó: chi phí thực không giảm.");
  if (input.sellOnPercent > 0 && resale > 0) notes.push(`Chia lại ${input.sellOnPercent}% ước tính ~${round(resale * input.sellOnPercent / 100).toLocaleString("vi-VN")} nếu bán lại sau ${PACKAGE.sellOnYears} năm với giá ~${round(resale).toLocaleString("vi-VN")}.`);
  if (input.addons > 0) notes.push("Tiền thưởng chỉ tốn khi đạt chỉ tiêu: nếu chỉ tiêu khó đạt thì chi phí thực thấp hơn số tính ở đây, nhưng bên bán cũng đánh giá thấp nó.");
  const budget = store.user.manager.budget.transfer;
  if (budget !== null && input.cash > budget) notes.push(`Tiền mặt ${input.cash.toLocaleString("vi-VN")} vượt ngân sách chuyển nhượng còn lại bạn đã nhập (${budget.toLocaleString("vi-VN")}).`);
  const wageFreed = swaps.reduce((s, x) => s + (x.wage ?? 0), 0);

  return {
    target: { player_id: target.player_id, name: target.name || `Cầu thủ #${target.player_id}` }, ladder, verdict,
    perceived: { cash: input.cash, swaps, swap_credit: round(swapCredit), addons: round(addonsWeighted), sell_on: round(sellOnWeighted), total: round(perceived), ratio_to_target: Math.round(ratio * 100) / 100 },
    cost: { cash: input.cash, swap_value_given: round(swapValueGiven), addons_expected: round(addonsWeighted), sell_on_expected: round(sellOnWeighted), sign_on: input.signOn, total: round(totalCost), wage_freed: wageFreed },
    resale_estimate: round(resale), notes, weights: { swap_credit: PACKAGE.swapCredit, addon: PACKAGE.addonWeight, sell_on: PACKAGE.sellOnWeight },
  };
}

/** Những cầu thủ của đội bạn hợp để đưa vào trao đổi: không đá chính, xếp theo giá trị. */
export function swapCandidates(store: Store, teamId: number) {
  const squad = squadPlayers(store, teamId);
  const lineup = resolveLineup(store, teamId, squad);
  const xi = new Set(lineup.slots.flatMap((s) => (s.player ? [s.player.player_id] : [])));
  const vm = valueModel(store);
  const endYear = seasonEndYear(store), ref = referenceDate(store);
  return squad.map(({ player: p }) => ({
    player_id: p.player_id, name: p.name || `Cầu thủ #${p.player_id}`, overall: p.overall, potential: p.potential, age: ageOn(p.birth_date, ref),
    role: roleOfPlayer(p.positions, p.primary_position), in_xi: xi.has(p.player_id), value: round(estimatedValue(store, p, vm)),
    wage: store.data.contracts.get(p.player_id)?.wage ?? null, seasons_left: seasonsLeft(p, endYear),
  })).sort((a, b) => Number(a.in_xi) - Number(b.in_xi) || b.value - a.value);
}

/** Các gói gợi ý tự động để đạt giá trị mục tiêu: toàn tiền mặt, trao đổi + tiền, giảm tiền mặt bằng thưởng, bằng % bán lại. */
export function packageOptions(store: Store, teamId: number | null, target: Player) {
  const target$ = priceAnalysis(store, teamId, target, null, null).fee.ladder.target;
  const resale = projectedResale(store, target, PACKAGE.sellOnYears);
  const mk = (label: string, why: string, input: PackageInput) => ({ label, why, input, evaluation: evaluatePackage(store, teamId, target, input) });
  const options = [mk("Toàn bộ bằng tiền mặt", "Đơn giản nhất, tốn nhiều tiền mặt nhất.", { cash: target$, swapIds: [], addons: 0, sellOnPercent: 0, signOn: 0 })];

  if (teamId !== null) {
    const spare = swapCandidates(store, teamId).filter((c) => !c.in_xi && c.value * PACKAGE.swapCredit < target$ && c.value > target$ * 0.1).slice(0, PACKAGE.maxSwapPlayers);
    for (const c of spare) {
      const cash = Math.max(0, target$ - c.value * PACKAGE.swapCredit);
      options.push(mk(`Trao đổi ${c.name} + tiền`, `Dùng cầu thủ không đá chính để giảm tiền mặt${c.wage ? " và giải phóng quỹ lương" : ""}.`, { cash: round(cash), swapIds: [c.player_id], addons: 0, sellOnPercent: 0, signOn: 0 }));
    }
  }
  const addons = Math.round((target$ * (1 - PACKAGE.autoCashShare.addons)) / PACKAGE.addonWeight);
  options.push(mk("Giảm tiền mặt, thêm tiền thưởng", "Đẩy một phần giá sang thưởng chỉ trả khi đạt chỉ tiêu.", { cash: round(target$ * PACKAGE.autoCashShare.addons), swapIds: [], addons: round(addons), sellOnPercent: 0, signOn: 0 }));
  const gap = target$ * (1 - PACKAGE.autoCashShare.sellOn);
  const pct = resale > 0 ? Math.min(PACKAGE.sellOnMaxPercent, Math.max(PACKAGE.sellOnStep, Math.ceil((gap / (resale * PACKAGE.sellOnWeight)) * 100 / PACKAGE.sellOnStep) * PACKAGE.sellOnStep)) : 0;
  if (pct > 0) options.push(mk("Giảm tiền mặt, thêm % chia lại khi bán", "Bên bán được chia khi bạn bán lại; hợp với cầu thủ trẻ còn lên giá.", { cash: round(target$ * PACKAGE.autoCashShare.sellOn), swapIds: [], addons: 0, sellOnPercent: pct, signOn: 0 }));
  return options;
}
