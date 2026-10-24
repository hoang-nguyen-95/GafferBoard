import { describe, expect, it } from "vitest";
import { handleRequest } from "../api";
import { budgetSummary, findTargets, negotiationPlan, scoreTarget, seasonEndYear, seasonsLeft, squadNeeds } from "../manager";
import "../routes/register";
import { Store, squadKey } from "../store";
import { newPlayer, type Player } from "../types";

const REF = "2025-08-01"; // ngày tham chiếu cố định (lịch sớm nhất) để tuổi không phụ thuộc ngày chạy test
const FORMATION = [0, 3, 5, 6, 7, 13, 14, 15, 23, 25, 27]; // 4-3-3

function player(id: number, o: Partial<Player> & { overall: number; pos: number; born?: string }): Player {
  const p = newPlayer(id);
  Object.assign(p, {
    name: `P${id}`, overall: o.overall, potential: o.potential ?? o.overall, primary_position: o.pos, positions: [o.pos],
    birth_date: o.born ?? "1998-01-01", contract_until: o.contract_until ?? 2029, gender: 0,
  });
  return p;
}

function world() {
  const s = new Store();
  s.data.leagues.set(1, { league_id: 1, name: "Liga Test", country_id: null, level: 1, is_international: false, is_women: false });
  for (const id of [1, 2]) {
    s.data.teams.set(id, { team_id: id, name: `Team${id}`, gender: 0, overall: 70, attack: 70, midfield: 70, defense: 70, build_up_play: null, defensive_awareness: null, captain_id: null, penalty_taker_id: null, popularity: null } as never);
    s.data.standings.set(id, { team_id: id, league_id: 1 } as never);
  }
  s.data.formations.set(1, { formation_id: 1, name: "4-3-3", full_name_id: null, attackers: 3, midfielders: 3, defenders: 4, positions: FORMATION });
  s.data.fixtures.set(1, { fixture_id: 1, competition_id: null, home_team_id: 1, away_team_id: 2, fixture_date: REF, fixture_time: null } as never);
  s.user.manager.season_end_year = 2026;
  s.user.settings.set("user_team_id", "1");
  // đội của bạn: ST yếu (60), trung vệ 33 tuổi, tiền vệ hết hợp đồng
  const mine: [number, number, number, (Partial<Player> & { born?: string })?][] = [
    [101, 0, 78], [102, 3, 76], [103, 5, 77, { born: "1992-03-03" }], [104, 6, 75], [105, 7, 74],
    [106, 13, 75], [107, 14, 76, { contract_until: 2026 }], [108, 15, 74], [109, 23, 77], [110, 25, 60], [111, 27, 76],
    [112, 5, 62], [113, 14, 63],
  ];
  for (const [id, pos, ovr, extra] of mine) {
    s.data.players.set(id, player(id, { overall: ovr, pos, ...extra }));
    s.data.squad.set(squadKey(1, id), { team_id: 1, player_id: id, position: pos, jersey_number: null, injury: 0, form: 3, league_appearances: null, league_goals: null, yellows: null, reds: null });
  }
  // thị trường: các tiền đạo cắm ở đội 2
  const market: [number, number, Partial<Player> & { born?: string }][] = [
    [201, 80, { born: "2005-05-05", potential: 90 }],            // trẻ, tiềm năng cao
    [202, 82, { born: "1993-01-01", contract_until: 2026 }],      // già, hết hợp đồng
    [203, 59, { born: "2000-01-01" }],                            // không nâng cấp
    [204, 79, { born: "1999-01-01" }],
  ];
  for (const [id, ovr, extra] of market) {
    s.data.players.set(id, player(id, { overall: ovr, pos: 25, ...extra }));
    s.data.squad.set(squadKey(2, id), { team_id: 2, player_id: id, position: 25, jersey_number: null, injury: 0, form: 3, league_appearances: null, league_goals: null, yellows: null, reds: null });
  }
  s.reindex();
  return s;
}

describe("mùa giải và hợp đồng", () => {
  it("suy năm kết thúc mùa từ ngày tham chiếu, cho phép ghi đè", () => {
    const s = world();
    s.user.manager.season_end_year = null;
    expect(seasonEndYear(s)).toBe(2026); // tháng 8/2025 -> mùa 2025/26
    s.data.fixtures.get(1)!.fixture_date = "2026-02-01";
    expect(seasonEndYear(s)).toBe(2026); // tháng 2/2026 vẫn mùa 2025/26
    s.user.manager.season_end_year = 2030;
    expect(seasonEndYear(s)).toBe(2030);
  });
  it("số mùa còn lại tính cả mùa hiện tại", () => {
    const p = player(1, { overall: 70, pos: 25, contract_until: 2026 });
    expect(seasonsLeft(p, 2026)).toBe(1);
    expect(seasonsLeft({ ...p, contract_until: 2029 }, 2026)).toBe(4);
    expect(seasonsLeft({ ...p, contract_until: 2024 }, 2026)).toBe(0);
    expect(seasonsLeft({ ...p, contract_until: null }, 2026)).toBeNull();
  });
});

describe("nhu cầu đội hình", () => {
  it("tiền đạo cắm yếu nhất đội được ưu tiên cao nhất kèm lý do", () => {
    const s = world();
    const needs = squadNeeds(s, 1);
    expect(needs.needs[0].role).toBe("ST");
    expect(needs.needs[0].issues.join(" ")).toContain("thấp hơn mặt bằng");
    expect(needs.needs[0].issues.join(" ")).toContain("Không có cầu thủ dự bị");
    const cb = needs.needs.find((n) => n.role === "CB")!;
    expect(cb.issues.join(" ")).toContain("33 tuổi");
    const cm = needs.needs.find((n) => n.role === "CM")!;
    expect(cm.issues.join(" ")).toContain("hết vào cuối mùa");
    expect(needs.expiring.map((p) => p.player_id)).toContain(107);
  });
});

describe("mục tiêu chuyển nhượng", () => {
  it("chấm điểm, xếp hạng và loại cầu thủ không nâng cấp hoặc đã thuộc đội mình", () => {
    const s = world();
    const res = findTargets(s, { teamId: 1, role: "ST" });
    expect(res.baseline_overall).toBe(60);
    expect(res.items.map((i) => i.player_id)).toEqual([201, 202, 204]); // 203 (59) không phải nâng cấp, 110 là người của mình
    // 201: nâng cấp 20*3 + tiềm năng 10*1.5 + 8 mùa đỉnh cao = 83; 202: 22*3 + hợp đồng sắp hết 4 = 70; 204: 19*3 + 4 = 61
    expect(res.items.map((i) => i.score)).toEqual([83, 70, 61]);
    expect(res.items[1].flags).toContain("Hợp đồng sắp hết");
    expect(res.items[1].flags).toContain("Tuổi cao: giá trị sử dụng ngắn");
    expect(res.items[0].club?.name).toBe("Team2");
  });
  it("lọc theo tuổi tối đa, số mùa hợp đồng tối đa và OVR tối thiểu", () => {
    const s = world();
    expect(findTargets(s, { teamId: 1, role: "ST", maxAge: 25 }).items.map((i) => i.player_id)).toEqual([201]);
    expect(findTargets(s, { teamId: 1, role: "ST", maxSeasonsLeft: 1 }).items.map((i) => i.player_id)).toEqual([202]);
    expect(findTargets(s, { teamId: 1, role: "ST", minOverall: 81 }).items.map((i) => i.player_id)).toEqual([202]);
    expect(findTargets(s, { teamId: 1, role: "ST", minOverall: 50 }).items.map((i) => i.player_id)).toContain(203);
    expect(findTargets(s, { teamId: 1, role: "ST", leagueId: 999 }).total_matches).toBe(0);
  });
  it("loại cầu thủ huyền thoại và quá tuổi mặc định, gắn nhãn cầu thủ tự do", () => {
    const s = world();
    s.data.leagues.set(2255, { league_id: 2255, name: "Classic League", country_id: null, level: 1, is_international: false, is_women: false });
    s.data.leagues.set(382, { league_id: 382, name: "Free", country_id: null, level: 1, is_international: false, is_women: false });
    for (const id of [3, 4]) {
      s.data.teams.set(id, { team_id: id, name: id === 3 ? "Classic XI" : "Free Agents", gender: 0 } as never);
      s.data.standings.set(id, { team_id: id, league_id: id === 3 ? 2255 : 382 } as never);
    }
    s.data.players.set(301, player(301, { overall: 92, pos: 25, born: "1950-01-01" }));    // huyền thoại 75 tuổi
    s.data.players.set(302, player(302, { overall: 90, pos: 25, born: "1996-01-01" }));    // huyền thoại trẻ tuổi nhưng nằm trong Classic League
    s.data.players.set(303, player(303, { overall: 83, pos: 25, born: "1996-01-01" }));    // cầu thủ tự do
    s.data.squad.set(squadKey(3, 301), { team_id: 3, player_id: 301 } as never);
    s.data.squad.set(squadKey(3, 302), { team_id: 3, player_id: 302 } as never);
    s.data.squad.set(squadKey(4, 303), { team_id: 4, player_id: 303 } as never);
    s.reindex();
    const items = findTargets(s, { teamId: 1, role: "ST" }).items;
    expect(items.map((i) => i.player_id)).not.toContain(301);
    expect(items.map((i) => i.player_id)).not.toContain(302);
    const free = items.find((i) => i.player_id === 303)!;
    expect(free.flags.join(" ")).toContain("Cầu thủ tự do");
    expect(findTargets(s, { teamId: 1, role: "ST", maxAge: 80, minOverall: 91 }).items.map((i) => i.player_id)).toEqual([]);
  });
  it("không gợi ý cầu thủ khác giới", () => {
    const s = world();
    s.data.players.get(201)!.gender = 1;
    expect(findTargets(s, { teamId: 1, role: "ST" }).items.map((i) => i.player_id)).not.toContain(201);
  });
  it("scoreTarget: chỉ tính tiềm năng tới 23 tuổi, số mùa đỉnh cao không âm", () => {
    const p = player(1, { overall: 75, potential: 90, pos: 25, born: "1999-01-01" });
    const r = scoreTarget(p, 70, REF, 2026);
    expect(r.breakdown.find((x) => x.key === "growth")!.value).toBe(0); // 26 tuổi
    const old = scoreTarget(player(2, { overall: 75, pos: 25, born: "1985-01-01" }), 70, REF, 2026);
    expect(old.breakdown.find((x) => x.key === "prime")!.value).toBe(0);
  });
});

describe("ngân sách và shortlist", () => {
  it("tính tổng chi, thu từ bán, số dư và cảnh báo vượt ngân sách", () => {
    const s = world();
    const m = s.user.manager;
    m.budget = { transfer: 50_000_000, wage: 100_000 };
    m.shortlist = [
      { player_id: 201, fee: 40_000_000, wage: 80_000, note: "", status: "agreed" },
      { player_id: 202, fee: 20_000_000, wage: 60_000, note: "", status: "target" },
    ];
    m.sales = [{ player_id: 113, expected_fee: 5_000_000, wage: 20_000 }];
    const r = budgetSummary(s, 1);
    expect(r.totals).toMatchObject({ planned_spend: 60_000_000, committed_spend: 40_000_000, sales_income: 5_000_000, transfer_after: -5_000_000, wage_added: 140_000, wage_saved: 20_000, wage_after: -20_000 });
    expect(r.warnings.join(" ")).toContain("vượt ngân sách chuyển nhượng 5000000");
    expect(r.warnings.join(" ")).toContain("vượt quỹ lương");
    expect(r.items[0].points_per_million).toBeCloseTo(83 / 40, 2);
    const share = r.allocation.reduce((a, x) => a + x.share, 0);
    expect(share).toBeGreaterThan(0.99);
    expect(share).toBeLessThan(1.01);
    expect(r.allocation[0].role).toBe("ST");
  });
  it("chưa nhập ngân sách thì cảnh báo và không chia tiền", () => {
    const s = world();
    const r = budgetSummary(s, 1);
    expect(r.warnings.join(" ")).toContain("Chưa nhập ngân sách");
    expect(r.allocation).toEqual([]);
    expect(r.totals.transfer_after).toBeNull();
  });
});

describe("gợi ý đàm phán", () => {
  const base = { value: 10_000_000, asking: null, age: 27, seasonsLeft: 3, overall: 80, potential: 80 };
  it("giá gốc khi không có yếu tố nào", () => {
    const r = negotiationPlan(base);
    expect(r.factors).toEqual([]);
    expect(r.ladder.map((x) => x.amount)).toEqual([8_000_000, 9_500_000, 11_000_000]);
  });
  it("hợp đồng sắp hết và tuổi cao làm giá giảm, cầu thủ trẻ tiềm năng làm giá tăng", () => {
    const cheap = negotiationPlan({ ...base, seasonsLeft: 1, age: 33 });
    expect(cheap.factors.map((f) => f.effect)).toEqual(["buyer", "buyer"]);
    expect(cheap.adjust_total).toBe(-0.2);
    expect(cheap.ladder[0].amount).toBe(6_000_000);
    const dear = negotiationPlan({ ...base, age: 19, potential: 92, seasonsLeft: 5 });
    expect(dear.adjust_total).toBe(0.15);
    expect(dear.ladder[1].amount).toBe(11_000_000);
    expect(dear.tips.join(" ")).toContain("hợp đồng dài");
  });
  it("nhận xét giá đòi theo ba vùng", () => {
    expect(negotiationPlan({ ...base, asking: 9_000_000 }).verdict).toContain("có thể chấp nhận");
    expect(negotiationPlan({ ...base, asking: 10_500_000 }).verdict).toContain("thử ép xuống");
    expect(negotiationPlan({ ...base, asking: 15_000_000 }).verdict).toContain("vượt mức tối đa");
  });
  it("hệ số luôn nằm trong giới hạn", () => {
    const r = negotiationPlan({ ...base, value: 1000, seasonsLeft: 1, age: 40 });
    for (const x of r.ladder) expect(x.percent_of_value).toBeGreaterThanOrEqual(0.3);
  });
});

describe("API /manager", () => {
  const call = (s: Store, m: string, p: string, b?: unknown) => handleRequest(s, m, p, b);
  it("cần biết đội của bạn", () => {
    const s = world();
    s.user.settings.clear();
    s.data.users.clear();
    expect(call(s, "GET", "/manager/overview").status).toBe(409);
  });
  it("tổng quan, mục tiêu và kiểm tra tham số", () => {
    const s = world();
    expect(call(s, "GET", "/manager/overview").json).toMatchObject({ user_team: { team_id: 1 }, season_end_year: 2026 });
    const t = call(s, "GET", "/manager/targets?role=ST&max_age=25");
    expect(t.status).toBe(200);
    expect((t.json as { items: unknown[] }).items).toHaveLength(1);
    expect(call(s, "GET", "/manager/targets").status).toBe(422);
    expect(call(s, "GET", "/manager/targets?role=XX").status).toBe(422);
    expect(call(s, "GET", "/manager/targets?role=ST&max_age=abc").status).toBe(422);
  });
  it("lưu ngân sách, shortlist, bán; xóa; kiểm tra dữ liệu vào", () => {
    const s = world();
    expect(call(s, "PUT", "/manager/budget", { transfer: 30_000_000, wage: 90_000, season_end_year: 2026 }).status).toBe(200);
    expect(call(s, "PUT", "/manager/budget", { transfer: -5 }).status).toBe(422);
    expect(call(s, "PUT", "/manager/budget", { season_end_year: 1800 }).status).toBe(422);
    const put = call(s, "PUT", "/manager/shortlist/201", { fee: 25_000_000, wage: 70_000, status: "negotiating", note: "ghi chú" });
    expect((put.json as { items: { player_id: number; status: string }[] }).items[0]).toMatchObject({ player_id: 201, status: "negotiating" });
    expect(call(s, "PUT", "/manager/shortlist/201", { fee: 1, status: "bậy" }).status).toBe(422);
    expect(call(s, "PUT", "/manager/shortlist/99999", { fee: 1 }).status).toBe(404);
    call(s, "PUT", "/manager/shortlist/201", { fee: 26_000_000 }); // ghi đè, không nhân đôi
    expect(s.user.manager.shortlist).toHaveLength(1);
    expect(s.user.manager.shortlist[0].fee).toBe(26_000_000);
    expect(call(s, "PUT", "/manager/sales/113", { expected_fee: 2_000_000, wage: 10_000 }).status).toBe(200);
    expect(s.user.manager.sales).toHaveLength(1);
    call(s, "DELETE", "/manager/shortlist/201");
    call(s, "DELETE", "/manager/sales/113");
    expect(s.user.manager.shortlist).toHaveLength(0);
    expect(s.user.manager.sales).toHaveLength(0);
  });
  it("đàm phán qua API", () => {
    const s = world();
    const r = call(s, "GET", "/manager/negotiation?player_id=202&value=10000000&asking=9000000");
    expect(r.status).toBe(200);
    const j = r.json as { player: { name: string }; ladder: { amount: number }[]; factors: unknown[] };
    expect(j.player.name).toBe("P202");
    expect(j.factors).toHaveLength(2); // hợp đồng sắp hết + 32 tuổi
    expect(call(s, "GET", "/manager/negotiation?player_id=202").status).toBe(422);
    expect(call(s, "GET", "/manager/negotiation?player_id=9&value=100").status).toBe(404);
  });
});
