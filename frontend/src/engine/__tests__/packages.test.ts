import { describe, expect, it } from "vitest";
import { handleRequest } from "../api";
import { evaluatePackage, packageOptions, PACKAGE, projectedResale, swapCandidates } from "../packages";
import { priceAnalysis } from "../pricing";
import "../routes/register";
import { Store, squadKey } from "../store";
import { newPlayer, type Contract, type Player } from "../types";

const FORMATION = [0, 3, 5, 6, 7, 13, 14, 15, 23, 25, 27];

function player(id: number, overall: number, pos: number, born = "1999-01-01", potential = overall): Player {
  const p = newPlayer(id);
  Object.assign(p, { name: `P${id}`, overall, potential, primary_position: pos, positions: [pos], birth_date: born, contract_until: 2029, gender: 0 });
  return p;
}

function world() {
  const s = new Store();
  s.data.leagues.set(1, { league_id: 1, name: "L", country_id: null, level: 1, is_international: false, is_women: false });
  for (const id of [1, 2]) {
    s.data.teams.set(id, { team_id: id, name: `T${id}`, gender: 0 } as never);
    s.data.standings.set(id, { team_id: id, league_id: 1 } as never);
  }
  s.data.formations.set(1, { formation_id: 1, name: "4-3-3", full_name_id: null, attackers: 3, midfielders: 3, defenders: 4, positions: FORMATION });
  s.data.fixtures.set(1, { fixture_id: 1, fixture_date: "2025-08-01" } as never);
  s.user.settings.set("user_team_id", "1");
  s.user.manager.season_end_year = 2026;
  const mine = FORMATION.map((pos, i) => [101 + i, pos, 80] as const);
  for (const [id, pos, ovr] of mine) s.data.players.set(id, player(id, ovr, pos));
  s.data.players.set(150, player(150, 74, 14, "1996-01-01")); // dự bị giá trị cao
  s.data.players.set(151, player(151, 70, 5, "1994-01-01"));  // dự bị
  s.data.players.set(152, player(152, 55, 5, "1990-01-01"));  // giá trị thấp
  for (const id of [...mine.map((m) => m[0]), 150, 151, 152]) {
    const pos = s.data.players.get(id)!.primary_position;
    s.data.squad.set(squadKey(1, id), { team_id: 1, player_id: id, position: pos, jersey_number: null, injury: 0, form: 3, league_appearances: null, league_goals: null, yellows: null, reds: null });
    const c: Contract = { player_id: id, team_id: 1, wage: 20000 + (id % 7) * 1000, duration_months: 24, start_date: null, end_date: "2028-06-30", signon_bonus: 0, status: 0, loan_wage_split: -1 };
    s.data.contracts.set(id, c);
  }
  // mục tiêu: tiền đạo trẻ tiềm năng ở đội 2
  s.data.players.set(300, player(300, 80, 25, "2004-05-05", 88));
  s.data.squad.set(squadKey(2, 300), { team_id: 2, player_id: 300, position: 25, jersey_number: null, injury: 0, form: 3, league_appearances: null, league_goals: null, yellows: null, reds: null });
  s.reindex();
  return s;
}

describe("đánh giá gói đề nghị", () => {
  const target = (s: Store) => s.data.players.get(300)!;
  const base = { cash: 0, swapIds: [] as number[], addons: 0, sellOnPercent: 0, signOn: 0 };

  it("toàn tiền mặt đúng mức mục tiêu thì được coi là 'dễ', thấp hơn nhiều thì dưới mức mở giá", () => {
    const s = world();
    const t = priceAnalysis(s, 1, target(s), null, null).fee.ladder;
    expect(evaluatePackage(s, 1, target(s), { ...base, cash: t.target }).verdict).toBe("likely");
    expect(evaluatePackage(s, 1, target(s), { ...base, cash: t.open * 0.5 }).verdict).toBe("below_open");
    expect(evaluatePackage(s, 1, target(s), { ...base, cash: t.open }).verdict).toMatch(/unlikely|possible/);
  });

  it("trao đổi: bên bán tính 90% giá trị, bạn mất đủ giá trị nhưng giải phóng lương", () => {
    const s = world();
    const ev = evaluatePackage(s, 1, target(s), { ...base, cash: 1_000_000, swapIds: [150] });
    const sw = ev.perceived.swaps[0];
    expect(Math.abs(sw.credit - sw.value * PACKAGE.swapCredit)).toBeLessThanOrEqual(50_000); // mỗi số được làm tròn riêng
    expect(Math.abs(ev.perceived.total - (1_000_000 + sw.credit))).toBeLessThanOrEqual(50_000);
    expect(ev.cost.swap_value_given).toBe(sw.value);
    expect(ev.cost.wage_freed).toBe(s.data.contracts.get(150)!.wage);
    expect(ev.notes.join(" ")).toContain("chi phí thực không giảm");
  });

  it("cảnh báo khi đưa cầu thủ đá chính vào gói", () => {
    const s = world();
    expect(evaluatePackage(s, 1, target(s), { ...base, cash: 1, swapIds: [101] }).notes.join(" ")).toContain("đang đá chính");
  });

  it("thưởng và % chia lại tính theo trọng số, % chia lại dựa trên giá bán lại kỳ vọng", () => {
    const s = world();
    const ev = evaluatePackage(s, 1, target(s), { ...base, cash: 0, addons: 10_000_000, sellOnPercent: 10 });
    expect(ev.perceived.addons).toBe(10_000_000 * PACKAGE.addonWeight);
    const resale = projectedResale(s, target(s), PACKAGE.sellOnYears);
    expect(resale).toBeGreaterThan(0);
    expect(ev.perceived.sell_on).toBeCloseTo(0.1 * resale * PACKAGE.sellOnWeight, -5);
    expect(ev.cost.total).toBeGreaterThanOrEqual(ev.perceived.addons + ev.perceived.sell_on - 100_000);
  });

  it("cầu thủ trẻ tiềm năng dự kiến lên giá, cầu thủ già giảm giá khi bán lại", () => {
    const s = world();
    const young = target(s), old = s.data.players.get(152)!;
    const now = (p: Player) => priceAnalysis(s, 1, p, null, null).value.estimate;
    expect(projectedResale(s, young, 3)).toBeGreaterThan(now(young));
    expect(projectedResale(s, old, 3)).toBeLessThan(now(old));
  });
});

describe("gợi ý gói tự động", () => {
  it("các gói đạt xấp xỉ giá trị mục tiêu; gói trao đổi chỉ dùng cầu thủ không đá chính", () => {
    const s = world();
    const opts = packageOptions(s, 1, s.data.players.get(300)!);
    const labels = opts.map((o) => o.label);
    expect(labels[0]).toBe("Toàn bộ bằng tiền mặt");
    expect(labels.some((l) => l.startsWith("Trao đổi"))).toBe(true);
    expect(labels).toContain("Giảm tiền mặt, thêm tiền thưởng");
    for (const o of opts) {
      expect(o.evaluation.perceived.ratio_to_target).toBeGreaterThan(0.95);
      expect(o.evaluation.perceived.ratio_to_target).toBeLessThan(1.2);
      for (const id of o.input.swapIds) expect(swapCandidates(s, 1).find((c) => c.player_id === id)?.in_xi).toBe(false);
    }
    const swap = opts.find((o) => o.input.swapIds.length)!;
    expect(swap.input.cash).toBeLessThan(opts[0].input.cash);
  });

  it("danh sách cầu thủ có thể trao đổi xếp người không đá chính lên trước, giá trị giảm dần", () => {
    const s = world();
    const c = swapCandidates(s, 1);
    expect(c.slice(0, 3).every((x) => !x.in_xi)).toBe(true);
    expect(c[0].value).toBeGreaterThanOrEqual(c[1].value);
  });
});

describe("route gói đề nghị", () => {
  it("trả gợi ý ngay cả khi chưa nhập gì, và đánh giá khi có fee", () => {
    const s = world();
    const r0 = handleRequest(s, "GET", "/manager/packages?player_id=300").json as { evaluation: unknown; options: unknown[]; squad: unknown[] };
    expect(r0.evaluation).toBeNull();
    expect(r0.options.length).toBeGreaterThanOrEqual(3);
    expect(r0.squad.length).toBe(14);
    const r1 = handleRequest(s, "GET", "/manager/packages?player_id=300&fee=5000000&swap=150&addons=2000000&sell_on=10").json as { evaluation: { perceived: { total: number } } };
    expect(r1.evaluation.perceived.total).toBeGreaterThan(5_000_000);
  });
  it("kiểm tra dữ liệu", () => {
    const s = world();
    expect(handleRequest(s, "GET", "/manager/packages?player_id=300&fee=1&swap=1,2,3,4").status).toBe(422);
    expect(handleRequest(s, "GET", "/manager/packages?player_id=300&fee=1&sell_on=80").status).toBe(422);
    expect(handleRequest(s, "GET", "/manager/packages?player_id=999").status).toBe(404);
  });
  it("ghi đề nghị dạng gói kèm thành phần và dùng được trong nhật ký", () => {
    const s = world();
    const r = handleRequest(s, "POST", "/manager/offers", { player_id: 300, kind: "fee", amount: 9_000_000, result: "rejected", package: { cash: 5_000_000, swap_ids: [150, 9999], addons: 3_000_000, sell_on_percent: 10, sign_on: 0 } });
    expect(r.status).toBe(201);
    expect(s.user.manager.offers[0].package).toEqual({ cash: 5_000_000, swap_ids: [150], addons: 3_000_000, sell_on_percent: 10, sign_on: 0 });
  });
});
