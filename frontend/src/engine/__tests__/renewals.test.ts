import { describe, expect, it } from "vitest";
import { handleRequest } from "../api";
import { renewalPlan, suggestedYears, urgencyOf } from "../renewals";
import "../routes/register";
import { Store, squadKey } from "../store";
import { newPlayer, type Contract, type Player } from "../types";

const REF = "2025-08-01";
const FORMATION = [0, 3, 5, 6, 7, 13, 14, 15, 23, 25, 27]; // 4-3-3

function player(id: number, overall: number, pos: number, born: string, potential = overall): Player {
  const p = newPlayer(id);
  Object.assign(p, { name: `P${id}`, overall, potential, primary_position: pos, positions: [pos], birth_date: born, gender: 0 });
  return p;
}

function contract(id: number, wage: number, end: string, team = 1): Contract {
  return { player_id: id, team_id: team, wage, duration_months: 24, start_date: null, end_date: end, signon_bonus: 0, status: 0, loan_wage_split: -1 };
}

function world() {
  const s = new Store();
  s.data.leagues.set(1, { league_id: 1, name: "L", country_id: null, level: 1, is_international: false, is_women: false });
  s.data.teams.set(1, { team_id: 1, name: "Mine", gender: 0 } as never);
  s.data.standings.set(1, { team_id: 1, league_id: 1 } as never);
  s.data.formations.set(1, { formation_id: 1, name: "4-3-3", full_name_id: null, attackers: 3, midfielders: 3, defenders: 4, positions: FORMATION });
  s.data.fixtures.set(1, { fixture_id: 1, competition_id: null, home_team_id: 1, away_team_id: 1, fixture_date: REF } as never);
  s.user.settings.set("user_team_id", "1");
  // 11 người đá chính (OVR 75-80), sinh năm 1999 (26 tuổi) trừ hai trường hợp đặc biệt
  const xi: [number, number, string][] = [
    [1, 0, "1999-01-01"], [2, 3, "1999-01-01"], [3, 5, "1999-01-01"], [4, 6, "1999-01-01"], [5, 7, "1999-01-01"],
    [6, 13, "1999-01-01"], [7, 14, "1999-01-01"], [8, 15, "1999-01-01"], [9, 23, "1999-01-01"], [10, 25, "1999-01-01"], [11, 27, "1999-01-01"],
  ];
  for (const [id, pos, born] of xi) s.data.players.set(id, player(id, 78, pos, born));
  s.data.players.set(7, player(7, 78, 14, "1992-01-01")); // trụ cột 33 tuổi
  s.data.players.set(20, player(20, 60, 14, "2006-03-03", 80)); // trẻ tiềm năng, dự bị
  s.data.players.set(21, player(21, 55, 5, "1995-01-01")); // thừa
  s.data.players.set(22, player(22, 74, 5, "1999-01-01")); // dự bị hữu ích
  for (const id of [...xi.map((x) => x[0]), 20, 21, 22]) {
    const pos = s.data.players.get(id)!.primary_position;
    s.data.squad.set(squadKey(1, id), { team_id: 1, player_id: id, position: pos, jersey_number: null, injury: 0, form: 3, league_appearances: null, league_goals: null, yellows: null, reds: null });
  }
  // hợp đồng: ngày tham chiếu 2025-08-01
  const wages = [100000, 100000, 100000, 100000, 100000, 100000, 100000, 100000, 100000, 100000, 60000];
  xi.forEach(([id], i) => s.data.contracts.set(id, contract(id, wages[i], "2029-06-30"))); // dài hạn
  s.data.contracts.set(2, contract(2, 100000, "2026-04-30"));  // đá chính 26 tuổi, còn 8 tháng, lương bằng mặt bằng
  s.data.contracts.set(7, contract(7, 100000, "2025-10-30"));  // đá chính 33 tuổi, còn 2 tháng
  s.data.contracts.set(11, contract(11, 60000, "2026-04-30")); // đá chính, đang được trả thấp hơn mặt bằng
  s.data.contracts.set(20, contract(20, 20000, "2027-03-31")); // trẻ tiềm năng, còn ~20 tháng
  s.data.contracts.set(21, contract(21, 30000, "2025-12-31")); // thừa, còn 4 tháng
  s.data.contracts.set(22, contract(22, 70000, "2027-03-31")); // dự bị hữu ích, còn ~20 tháng
  s.reindex();
  return s;
}

describe("gợi ý gia hạn hợp đồng", () => {
  it("số năm theo tuổi và mức khẩn cấp theo số tháng còn lại", () => {
    expect([suggestedYears(20), suggestedYears(26), suggestedYears(30), suggestedYears(33), suggestedYears(null)]).toEqual([5, 4, 2, 1, 2]);
    expect([urgencyOf(-1), urgencyOf(6), urgencyOf(7), urgencyOf(12), urgencyOf(24), urgencyOf(25), urgencyOf(null)]).toEqual(["urgent", "urgent", "soon", "soon", "later", "none", "none"]);
  });

  it("phân loại hành động và lý do từng trường hợp", () => {
    const plan = renewalPlan(world(), 1);
    const row = (id: number) => plan.rows.find((r) => r.player_id === id)!;
    expect(row(2)).toMatchObject({ squad_role: "starter", urgency: "soon", action: "renew", suggested_years: 4 });
    expect(row(7)).toMatchObject({ urgency: "urgent", action: "renew_short", suggested_years: 1 });
    expect(row(21)).toMatchObject({ squad_role: "surplus", action: "sell", suggested_years: null });
    expect(row(20)).toMatchObject({ squad_role: "prospect", urgency: "later", action: "renew", suggested_years: 5 });
    expect(row(22)).toMatchObject({ squad_role: "rotation", action: "renew" });
    expect(row(1)).toMatchObject({ urgency: "none", action: "none", wage_ladder: null });
  });

  it("bậc lương: mở = lương hiện tại, mục tiêu không thấp hơn hiện tại, trần theo vai trò", () => {
    const plan = renewalPlan(world(), 1);
    const r2 = plan.rows.find((r) => r.player_id === 2)!;
    expect(r2.reference_wage).toBe(100000);
    expect(r2.wage_ladder).toEqual({ open: 100000, target: 100000, walk: 125000 }); // đá chính: trần 1.25 lần
    const r11 = plan.rows.find((r) => r.player_id === 11)!;
    expect(r11.wage_note).toMatch(/thấp hơn mặt bằng đội 40%/);
    expect(r11.wage_ladder!.target).toBe(100000);
    expect(r11.wage_ladder!.target).toBeGreaterThan(r11.wage);
  });

  it("tổng hợp mức tăng quỹ lương và cảnh báo khi vượt số còn trống", () => {
    const s = world();
    s.user.manager.budget.wage = 10000;
    const plan = renewalPlan(s, 1);
    expect(plan.totals.to_renew).toBeGreaterThan(0);
    expect(plan.totals.extra_wage_max).toBeGreaterThan(plan.totals.extra_wage_target);
    expect(plan.warnings.join(" ")).toContain("vượt số còn trống");
    expect(plan.warnings.join(" ")).toContain("dưới 6 tháng");
    expect(plan.rows[0].urgency).toBe("urgent"); // gấp xếp trước
  });

  it("route /manager/renewals: không khả dụng khi chưa có hợp đồng", () => {
    const s = world();
    s.data.contracts.clear();
    expect(handleRequest(s, "GET", "/manager/renewals").json).toMatchObject({ available: false, rows: [] });
    expect(handleRequest(world(), "GET", "/manager/renewals").json).toMatchObject({ available: true, players: 14 });
  });
});
