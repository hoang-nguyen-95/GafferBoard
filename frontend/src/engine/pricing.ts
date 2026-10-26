// Ước tính giá chuyển nhượng và lương hợp lý khi game không cho biết, kèm nhật ký đề nghị để học từ kết quả đàm phán thật.
//
// NGUỒN SỐ LIỆU (nói rõ để không bị hiểu nhầm):
//  - LƯƠNG: đường cong ln(lương) theo OVR được khớp trên chính hợp đồng trong save của bạn (career_playercontract). Trên bản xuất đã kiểm tra
//    (46 cầu thủ Man Utd) đường này giải thích 97% biến thiên lương (R²=0,966), sai số điển hình ±20%; tuổi và tiềm năng gần như không ảnh hưởng.
//    Đó là thang lương CỦA ĐỘI BẠN, nên là mức một cầu thủ cùng OVR sẽ được trả nếu vào đội bạn, không phải lương hiện tại ở CLB của họ.
//  - GIÁ TRỊ CHUYỂN NHƯỢNG: game không lưu. Công thức mặc định dưới đây là KINH NGHIỆM CHUNG, CHƯA KIỂM CHỨNG và sai lệch lớn; nó chỉ trở nên
//    đáng tin khi bạn nhập vài con số "Giá trị" bạn thấy trong game (hiệu chỉnh) và ghi lại kết quả các đề nghị của mình.
import { monthsLeft } from "./contracts";
import { ageOn, pyRound } from "./util";
import { negotiationPlan } from "./manager";
import { seasonEndYear, seasonsLeft } from "./manager";
import { roleOfPlayer } from "./positions";
import { referenceDate } from "./serialize";
import type { Store } from "./store";
import type { Offer, OfferKind, OfferResult, Player, PriceObservation } from "./types";

export const PRICING = {
  value: {
    base: 600_000, perOverall: 0.18, baseOverall: 60,             // giá trị cho OVR 60 và hệ số mũ theo OVR
    potentialWeight: [[21, 0.4], [23, 0.35], [25, 0.2], [27, 0.1]] as [number, number][], // tuổi tối đa -> tỉ lệ (POT-OVR) cộng vào OVR hiệu dụng
    ageMultiplier: [[20, 1.1], [23, 1.05], [27, 1.0], [29, 0.85], [30, 0.65], [31, 0.5], [32, 0.38], [33, 0.25]] as [number, number][], // trên mức cuối: 0.15
    seasonsLeftMultiplier: [0.55, 0.75, 0.9, 1.0] as number[],    // chỉ số theo số mùa còn lại 0..3; từ 4 mùa: 1.05
    goalkeeper: 0.85,
    uncalibratedSpread: 0.45, minSpread: 0.12, maxSpread: 0.6,    // độ lệch chuẩn của ln(giá) khi chưa / đã hiệu chỉnh
    shrinkPoints: 2,                                              // co số hiệu chỉnh về 0 khi ít điểm: n / (n + 2)
  },
  wage: {
    // đường mặc định khi save chưa có hợp đồng đủ để khớp: lấy từ một save mẫu (Man Utd), ln(lương) = intercept + slope × OVR
    defaultIntercept: 2.115, defaultSlope: 0.1165, defaultSpread: 0.25, minPoints: 8, minSpread: 0.12,
    goalkeeperOffset: -0.35, minGoalkeepers: 3,
  },
  /** Bước nâng giá sau một lần bị từ chối, và biên an toàn so với mức đã được chấp nhận. */
  nextRaise: 1.06, tightenAccepted: 0.97,
  /** Số lần chấp nhận tối thiểu để thay bậc giá mặc định bằng bậc giá học từ nhật ký của bạn. */
  minAcceptedForStats: 3,
} as const;

const tier = (table: [number, number][], x: number, fallback: number) => {
  for (const [max, v] of table) if (x <= max) return v;
  return fallback;
};
const median = (xs: number[]): number | null => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const round = (n: number) => {
  if (n >= 1_000_000) return Math.round(n / 50_000) * 50_000;
  if (n >= 100_000) return Math.round(n / 5_000) * 5_000;
  return Math.round(n / 500) * 500;
};

// ---------------------------------------------------------------- giá trị

/** Giá trị chuyển nhượng THEO CÔNG THỨC MẶC ĐỊNH (chưa hiệu chỉnh). */
export function priorValue(p: Player, age: number | null, seasons: number | null): number {
  const V = PRICING.value;
  const gap = p.potential !== null ? Math.max(0, p.potential - p.overall) : 0;
  const eff = p.overall + (age === null ? 0 : tier(V.potentialWeight, age, 0)) * gap;
  let v = V.base * Math.exp(V.perOverall * (eff - V.baseOverall));
  v *= age === null ? 1 : tier(V.ageMultiplier, age, 0.15);
  if (seasons !== null) v *= seasons >= 4 ? 1.05 : V.seasonsLeftMultiplier[Math.max(0, seasons)];
  if (roleOfPlayer(p.positions, p.primary_position) === "GK") v *= V.goalkeeper;
  return v;
}

export interface ValueModel { scaleLn: number; spread: number; points: number; calibrated: boolean }

/** Hiệu chỉnh công thức giá trị bằng các "Giá trị" bạn đã nhập từ game: dịch cả đường theo trung vị sai lệch ln(thực tế / công thức). */
export function valueModel(store: Store): ValueModel {
  const V = PRICING.value;
  const ref = referenceDate(store), endYear = seasonEndYear(store);
  const residuals: number[] = [];
  for (const o of store.user.manager.observations) {
    if (o.value === null || o.value <= 0) continue;
    const p = store.data.players.get(o.player_id);
    if (!p) continue;
    const prior = priorValue(p, ageOn(p.birth_date, ref), seasonsLeft(p, endYear));
    residuals.push(Math.log(o.value / prior));
  }
  const n = residuals.length;
  if (n === 0) return { scaleLn: 0, spread: V.uncalibratedSpread, points: 0, calibrated: false };
  const med = median(residuals)!;
  const dev = residuals.map((r) => Math.abs(r - med));
  const spread = n >= 3 ? Math.min(V.maxSpread, Math.max(V.minSpread, 1.4826 * median(dev)!)) : V.uncalibratedSpread * 0.7;
  return { scaleLn: med * (n / (n + V.shrinkPoints)), spread, points: n, calibrated: true };
}

// ---------------------------------------------------------------- lương

export interface WageModel { intercept: number; slope: number; spread: number; points: number; r2: number | null; source: "club_fit" | "default"; gkOffset: number; shift: number }

/** Khớp ln(lương) = a + b × OVR trên hợp đồng của đội bạn (không tính thủ môn), rồi tính độ lệch thủ môn. */
export function wageModel(store: Store, teamId: number | null): WageModel {
  const W = PRICING.wage;
  const rows = [...store.data.contracts.values()].filter((c) => c.team_id === teamId && c.wage > 0).flatMap((c) => {
    const p = store.data.players.get(c.player_id);
    return p ? [{ ovr: p.overall, ln: Math.log(c.wage), gk: roleOfPlayer(p.positions, p.primary_position) === "GK" }] : [];
  });
  const field = rows.filter((r) => !r.gk), keepers = rows.filter((r) => r.gk);
  let model: WageModel;
  if (field.length >= W.minPoints) {
    const n = field.length;
    const mx = field.reduce((s, r) => s + r.ovr, 0) / n, my = field.reduce((s, r) => s + r.ln, 0) / n;
    const sxx = field.reduce((s, r) => s + (r.ovr - mx) ** 2, 0);
    const slope = sxx > 0 ? field.reduce((s, r) => s + (r.ovr - mx) * (r.ln - my), 0) / sxx : W.defaultSlope;
    const intercept = my - slope * mx;
    const ss = field.reduce((s, r) => s + (r.ln - (intercept + slope * r.ovr)) ** 2, 0);
    const tot = field.reduce((s, r) => s + (r.ln - my) ** 2, 0);
    const gkOffset = keepers.length >= W.minGoalkeepers
      ? keepers.reduce((s, r) => s + (r.ln - (intercept + slope * r.ovr)), 0) / keepers.length : W.goalkeeperOffset;
    model = { intercept, slope, spread: Math.max(W.minSpread, Math.sqrt(ss / n)), points: n + keepers.length, r2: tot > 0 ? 1 - ss / tot : null, source: "club_fit", gkOffset, shift: 0 };
  } else {
    model = { intercept: W.defaultIntercept, slope: W.defaultSlope, spread: W.defaultSpread, points: rows.length, r2: null, source: "default", gkOffset: W.goalkeeperOffset, shift: 0 };
  }
  // Lương bạn thấy trong game cho cầu thủ khác đội: dịch đường theo trung vị sai lệch
  const resid: number[] = [];
  for (const o of store.user.manager.observations) {
    if (o.wage === null || o.wage <= 0) continue;
    const p = store.data.players.get(o.player_id);
    if (!p) continue;
    const gk = roleOfPlayer(p.positions, p.primary_position) === "GK";
    resid.push(Math.log(o.wage) - (model.intercept + model.slope * p.overall + (gk ? model.gkOffset : 0)));
  }
  if (resid.length >= 2) model = { ...model, shift: median(resid)! * (resid.length / (resid.length + 2)) };
  return model;
}

export function estimateWage(m: WageModel, p: Player): number {
  const gk = roleOfPlayer(p.positions, p.primary_position) === "GK";
  return Math.exp(m.intercept + m.slope * p.overall + (gk ? m.gkOffset : 0) + m.shift);
}

// ---------------------------------------------------------------- nhật ký đề nghị

export interface OfferStats {
  kind: OfferKind; accepted: number; rejected: number; counters: number;
  /** Tỉ lệ (đề nghị / ước tính lúc đó): trung vị các lần được chấp nhận, thấp nhất được chấp nhận, cao nhất bị từ chối. */
  medianAcceptedRatio: number | null; lowestAcceptedRatio: number | null; highestRejectedRatio: number | null;
}

export function offerStats(offers: Offer[], kind: OfferKind): OfferStats {
  const of = offers.filter((o) => o.kind === kind);
  const ratio = (o: Offer) => (o.estimate && o.estimate > 0 ? o.amount / o.estimate : null);
  const acc = of.filter((o) => o.result === "accepted").map(ratio).filter((x): x is number => x !== null);
  const rej = of.filter((o) => o.result === "rejected").map(ratio).filter((x): x is number => x !== null);
  return {
    kind, accepted: of.filter((o) => o.result === "accepted").length, rejected: of.filter((o) => o.result === "rejected").length,
    counters: of.filter((o) => o.result === "counter").length,
    medianAcceptedRatio: median(acc), lowestAcceptedRatio: acc.length ? Math.min(...acc) : null, highestRejectedRatio: rej.length ? Math.max(...rej) : null,
  };
}

/** Bước tiếp theo cho MỘT cầu thủ dựa trên các đề nghị đã gửi cho riêng người đó. */
export function nextStep(offers: Offer[], kind: OfferKind, ladder: { open: number; target: number; walk: number }) {
  const mine = offers.filter((o) => o.kind === kind);
  const accepted = mine.filter((o) => o.result === "accepted").map((o) => o.amount);
  const rejected = mine.filter((o) => o.result === "rejected").map((o) => o.amount);
  const counters = mine.filter((o) => o.result === "counter" && o.counter !== null);
  const lastCounter = counters.length ? counters[counters.length - 1].counter! : null;
  if (accepted.length) {
    const low = Math.min(...accepted);
    return { amount: round(low * PRICING.tightenAccepted), text: `Đã có mức được chấp nhận (${low.toLocaleString("vi-VN")}). Đã chốt thì thôi; nếu còn đàm phán lại thì thử thấp hơn khoảng 3%.` };
  }
  if (lastCounter !== null && lastCounter <= ladder.walk) {
    return { amount: round(lastCounter), text: `Bên kia đã ra giá ${lastCounter.toLocaleString("vi-VN")}, nằm trong mức tối đa nên trả: chấp nhận, hoặc đề nghị lại thấp hơn một chút (khoảng 3%) rồi chốt.` };
  }
  if (lastCounter !== null) {
    return { amount: null, text: `Bên kia ra giá ${lastCounter.toLocaleString("vi-VN")}, vượt mức tối đa nên trả (${ladder.walk.toLocaleString("vi-VN")}): từ chối hoặc tìm lựa chọn khác.` };
  }
  if (rejected.length) {
    const next = round(Math.max(...rejected) * PRICING.nextRaise);
    if (next > ladder.walk) return { amount: null, text: `Mức ${Math.max(...rejected).toLocaleString("vi-VN")} đã bị từ chối và nâng thêm sẽ vượt mức tối đa nên trả (${ladder.walk.toLocaleString("vi-VN")}): nên dừng hoặc tìm lựa chọn khác.` };
    return { amount: next, text: `Đề nghị ${Math.max(...rejected).toLocaleString("vi-VN")} bị từ chối: nâng khoảng 6% lên ${next.toLocaleString("vi-VN")} (vẫn dưới mức tối đa).` };
  }
  return { amount: ladder.open, text: `Chưa có đề nghị nào cho cầu thủ này: bắt đầu ở mức mở giá ${ladder.open.toLocaleString("vi-VN")}.` };
}

// ---------------------------------------------------------------- phân tích tổng hợp

export function priceAnalysis(store: Store, teamId: number | null, p: Player, askingFee: number | null, askingWage: number | null) {
  const ref = referenceDate(store);
  const age = ageOn(p.birth_date, ref);
  const seasons = seasonsLeft(p, seasonEndYear(store));
  const m = store.user.manager;
  const vm = valueModel(store);
  const wm = wageModel(store, teamId);

  const gameValue = [...m.observations].reverse().find((o) => o.player_id === p.player_id && o.value !== null)?.value ?? null;
  const prior = priorValue(p, age, seasons);
  const estimate = gameValue ?? prior * Math.exp(vm.scaleLn);
  const band = gameValue !== null ? { low: gameValue, high: gameValue } : { low: estimate * Math.exp(-vm.spread), high: estimate * Math.exp(vm.spread) };
  const valueInfo = {
    estimate: round(estimate), low: round(band.low), high: round(band.high), source: gameValue !== null ? "game" as const : "estimate" as const,
    calibration_points: vm.points, calibrated: vm.calibrated, spread_percent: Math.round((Math.exp(vm.spread) - 1) * 100), prior: round(prior),
  };

  const wageEst = estimateWage(wm, p);
  const gameWage = [...m.observations].reverse().find((o) => o.player_id === p.player_id && o.wage !== null)?.wage ?? null;
  const wageCentre = gameWage ?? wageEst;
  const wageInfo = {
    estimate: round(wageCentre), low: round(wageCentre * Math.exp(-wm.spread)), high: round(wageCentre * Math.exp(wm.spread)),
    source: gameWage !== null ? "game" as const : wm.source, points: wm.points, r2: wm.r2 === null ? null : pyRound(wm.r2, 3), spread_percent: Math.round((Math.exp(wm.spread) - 1) * 100),
    shift_percent: Math.round((Math.exp(wm.shift) - 1) * 100), team_estimate: round(wageEst),
  };

  const offers = m.offers.filter((o) => o.player_id === p.player_id);
  const feeStats = offerStats(m.offers, "fee");
  const wageStats = offerStats(m.offers, "wage");

  // Bậc giá chuyển nhượng: mặc định từ negotiationPlan trên giá trị ước tính; đủ lần được chấp nhận thì học từ nhật ký
  const plan = negotiationPlan({ value: estimate, asking: askingFee, age, seasonsLeft: seasons, overall: p.overall, potential: p.potential });
  let feeLadder = { open: plan.ladder[0].amount, target: plan.ladder[1].amount, walk: plan.ladder[2].amount };
  let feeSource: "default" | "history" = "default";
  if (feeStats.accepted >= PRICING.minAcceptedForStats && feeStats.medianAcceptedRatio !== null && feeStats.lowestAcceptedRatio !== null) {
    const target = estimate * feeStats.medianAcceptedRatio;
    feeLadder = { open: target * 0.9, target, walk: Math.max(target, plan.ladder[2].amount) };
    feeSource = "history";
  }
  feeLadder = { open: round(feeLadder.open), target: round(feeLadder.target), walk: round(feeLadder.walk) };
  // Bậc lương: mở ở đáy dải, mục tiêu ở ước tính, trần ở đỉnh dải
  let wageLadder = { open: round(wageCentre * Math.exp(-wm.spread * 0.5)), target: round(wageCentre), walk: round(wageCentre * Math.exp(wm.spread)) };
  let wageSource: "default" | "history" = "default";
  if (wageStats.accepted >= PRICING.minAcceptedForStats && wageStats.medianAcceptedRatio !== null) {
    const target = wageCentre * wageStats.medianAcceptedRatio;
    wageLadder = { open: round(target * 0.92), target: round(target), walk: round(Math.max(target, wageLadder.walk)) };
    wageSource = "history";
  }

  const verdicts: string[] = [];
  if (askingFee !== null) verdicts.push(askingFee <= feeLadder.target ? `Giá đòi ${askingFee.toLocaleString("vi-VN")} nằm trong vùng mục tiêu.` : askingFee <= feeLadder.walk ? `Giá đòi ${askingFee.toLocaleString("vi-VN")} cao hơn mục tiêu nhưng chưa vượt mức tối đa: ép xuống trước khi chấp nhận.` : `Giá đòi ${askingFee.toLocaleString("vi-VN")} vượt mức tối đa nên trả (${feeLadder.walk.toLocaleString("vi-VN")}).`);
  if (askingWage !== null) verdicts.push(askingWage <= wageLadder.target ? `Lương đòi ${askingWage.toLocaleString("vi-VN")} nằm trong vùng mục tiêu.` : askingWage <= wageLadder.walk ? `Lương đòi ${askingWage.toLocaleString("vi-VN")} cao hơn mục tiêu nhưng chưa vượt trần: thương lượng xuống.` : `Lương đòi ${askingWage.toLocaleString("vi-VN")} vượt trần ${wageLadder.walk.toLocaleString("vi-VN")}: cầu thủ này sẽ làm lệch thang lương đội.`);

  return {
    player: { player_id: p.player_id, name: p.name || `Cầu thủ #${p.player_id}`, overall: p.overall, potential: p.potential, age, seasons_left: seasons, months_left: store.data.contracts.get(p.player_id) ? monthsLeft(store.data.contracts.get(p.player_id)!.end_date, ref) : null },
    value: valueInfo, wage: wageInfo,
    fee: { ladder: feeLadder, source: feeSource, factors: plan.factors, next: nextStep(offers, "fee", feeLadder) },
    wage_offer: { ladder: wageLadder, source: wageSource, next: nextStep(offers, "wage", wageLadder) },
    verdicts, tips: plan.tips,
    stats: { fee: feeStats, wage: wageStats },
    offers: [...offers].reverse(), observations: m.observations.filter((o) => o.player_id === p.player_id).reverse(),
    disclaimer: "Giá trị chuyển nhượng là ƯỚC TÍNH từ công thức kinh nghiệm chung (độ lệch lớn), không phải số của game; nhập \"Giá trị\" bạn thấy trong game cho vài cầu thủ để hiệu chỉnh. Lương ước tính theo thang lương hợp đồng trong save của đội bạn.",
  };
}

// ---------------------------------------------------------------- ghi dữ liệu

export function addObservation(store: Store, input: { player_id: number; value: number | null; wage: number | null }): PriceObservation {
  const m = store.user.manager;
  const obs: PriceObservation = { id: m.nextId.observation++, ...input, at: new Date().toISOString() };
  m.observations.push(obs);
  store.touch();
  return obs;
}

export function addOffer(store: Store, teamId: number | null, input: { player_id: number; kind: OfferKind; amount: number; result: OfferResult; counter: number | null }): Offer {
  const m = store.user.manager;
  const p = store.data.players.get(input.player_id)!;
  // tính ước tính lúc này (không tính chính lần ghi này) để lưu cùng đề nghị
  const a = priceAnalysis(store, teamId, p, null, null);
  const estimate = input.kind === "fee" ? a.value.estimate : a.wage.estimate;
  const offer: Offer = { id: m.nextId.offer++, ...input, estimate, at: new Date().toISOString() };
  m.offers.push(offer);
  store.touch();
  return offer;
}

export const RESULT_LABELS: Record<OfferResult, string> = { accepted: "chấp nhận", rejected: "từ chối", counter: "ra giá lại" };
