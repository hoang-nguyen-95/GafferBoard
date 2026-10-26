import { describe, expect, it } from "vitest";
import { handleRequest } from "../api";
import { nextStep, offerStats, priceAnalysis, priorValue, wageModel, estimateWage, valueModel } from "../pricing";
import "../routes/register";
import { Store } from "../store";
import { emptyManager, newPlayer, type Contract, type Offer, type Player } from "../types";

const REF = "2025-08-01";

function player(id: number, overall: number, o: Partial<Player> & { born?: string; pos?: number } = {}): Player {
  const p = newPlayer(id);
  const pos = o.pos ?? 14;
  Object.assign(p, { name: `P${id}`, overall, potential: o.potential ?? overall, primary_position: pos, positions: [pos], birth_date: o.born ?? "1999-01-01", contract_until: o.contract_until ?? 2029, gender: 0 });
  return p;
}
const contract = (id: number, wage: number): Contract => ({ player_id: id, team_id: 1, wage, duration_months: 24, start_date: null, end_date: "2028-06-30", signon_bonus: 0, status: 0, loan_wage_split: -1 });

function world(withContracts = true) {
  const s = new Store();
  s.data.teams.set(1, { team_id: 1, name: "Mine" } as never);
  s.data.fixtures.set(1, { fixture_id: 1, fixture_date: REF } as never);
  s.user.settings.set("user_team_id", "1");
  s.user.manager.season_end_year = 2026;
  if (withContracts) {
    // 12 cầu thủ trường + 4 thủ môn với lương đúng theo ln(lương) = 2 + 0.12 × OVR (thủ môn thấp hơn 30%)
    for (let i = 0; i < 12; i++) {
      const ovr = 60 + i * 2;
      s.data.players.set(100 + i, player(100 + i, ovr));
      s.data.contracts.set(100 + i, contract(100 + i, Math.round(Math.exp(2 + 0.12 * ovr))));
    }
    for (let i = 0; i < 4; i++) {
      const ovr = 66 + i * 4;
      s.data.players.set(200 + i, player(200 + i, ovr, { pos: 0 }));
      s.data.contracts.set(200 + i, contract(200 + i, Math.round(Math.exp(2 + 0.12 * ovr) * 0.7)));
    }
  }
  s.data.players.set(1, player(1, 80));
  s.data.players.set(2, player(2, 80, { born: "2006-01-01", potential: 90 }));
  s.data.players.set(3, player(3, 80, { born: "1992-01-01" }));
  s.data.players.set(4, player(4, 80, { contract_until: 2026 }));
  s.data.players.set(5, player(5, 80, { pos: 0 }));
  s.reindex();
  return s;
}

describe("giá trị chuyển nhượng theo công thức mặc định", () => {
  const s = world();
  const v = (id: number) => priorValue(s.data.players.get(id)!, id === 2 ? 19 : id === 3 ? 33 : 26, id === 4 ? 1 : 4);
  it("tăng mạnh theo OVR", () => {
    const p70 = player(9, 70), p80 = player(9, 80);
    expect(priorValue(p80, 26, 4) / priorValue(p70, 26, 4)).toBeGreaterThan(5);
  });
  it("trẻ tiềm năng đắt hơn, lớn tuổi rẻ hơn, hợp đồng sắp hết và thủ môn rẻ hơn", () => {
    expect(v(2)).toBeGreaterThan(v(1) * 1.5);
    expect(v(3)).toBeLessThan(v(1) * 0.4);
    expect(v(4)).toBeLessThan(v(1) * 0.8);
    expect(priorValue(s.data.players.get(5)!, 26, 4)).toBeLessThan(v(1));
  });
  it("cho giá cỡ hợp lý với cầu thủ OVR 75 ở độ tuổi đỉnh cao (vài triệu tới vài chục triệu)", () => {
    const x = priorValue(player(9, 75), 26, 3);
    expect(x).toBeGreaterThan(3_000_000);
    expect(x).toBeLessThan(30_000_000);
  });
});

describe("mô hình lương khớp trên hợp đồng của đội", () => {
  it("khôi phục đúng đường lương và báo độ khớp", () => {
    const s = world();
    const m = wageModel(s, 1);
    expect(m.source).toBe("club_fit");
    expect(m.slope).toBeCloseTo(0.12, 3);
    expect(m.r2).toBeGreaterThan(0.999);
    expect(m.gkOffset).toBeCloseTo(Math.log(0.7), 3);
    expect(estimateWage(m, s.data.players.get(1)!)).toBeCloseTo(Math.exp(2 + 0.12 * 80), -2); // OVR 80 trường
    expect(estimateWage(m, s.data.players.get(5)!)).toBeCloseTo(Math.exp(2 + 0.12 * 80) * 0.7, -2); // thủ môn
  });
  it("ít hợp đồng thì dùng đường mặc định và nói rõ", () => {
    const m = wageModel(world(false), 1);
    expect(m.source).toBe("default");
    expect(m.r2).toBeNull();
  });
  it("lương thấy trong game của cầu thủ khác đội dịch cả đường", () => {
    const s = world();
    const base = estimateWage(wageModel(s, 1), s.data.players.get(1)!);
    for (const id of [1, 2, 3]) s.user.manager.observations.push({ id, player_id: id, value: null, wage: Math.round(base * 2), at: "" });
    expect(estimateWage(wageModel(s, 1), s.data.players.get(4)!)).toBeGreaterThan(base * 1.4);
  });
});

describe("hiệu chỉnh giá trị bằng số trong game", () => {
  it("chưa hiệu chỉnh: độ lệch lớn; có số thì ước tính dịch về phía số thật và độ lệch giảm", () => {
    const s = world();
    const before = priceAnalysis(s, 1, s.data.players.get(1)!, null, null);
    expect(before.value.calibrated).toBe(false);
    expect(before.value.high / before.value.low).toBeGreaterThan(2);
    for (const id of [1, 3, 4, 5]) {
      const p = s.data.players.get(id)!;
      s.user.manager.observations.push({ id, player_id: id, value: Math.round(priorValue(p, id === 3 ? 33 : 26, id === 4 ? 1 : 4) * 2), wage: null, at: "" });
    }
    expect(valueModel(s).points).toBe(4);
    const after = priceAnalysis(s, 1, s.data.players.get(2)!, null, null);
    const priorOnly = priceAnalysis(world(), 1, world().data.players.get(2)!, null, null);
    expect(after.value.estimate).toBeGreaterThan(priorOnly.value.estimate * 1.4);
    expect(after.value.spread_percent).toBeLessThan(before.value.spread_percent);
    expect(after.value.source).toBe("estimate");
  });
  it("giá trị nhập cho chính cầu thủ đó được dùng nguyên", () => {
    const s = world();
    s.user.manager.observations.push({ id: 1, player_id: 1, value: 33_000_000, wage: 150_000, at: "" });
    const a = priceAnalysis(s, 1, s.data.players.get(1)!, null, null);
    expect(a.value).toMatchObject({ estimate: 33_000_000, source: "game" });
    expect(a.wage).toMatchObject({ estimate: 150_000, source: "game" });
  });
});

describe("nhật ký đề nghị", () => {
  const ladder = { open: 8_000_000, target: 10_000_000, walk: 12_000_000 };
  const offer = (o: Partial<Offer>): Offer => ({ id: 1, player_id: 1, kind: "fee", amount: 1, result: "rejected", counter: null, estimate: 10_000_000, at: "", ...o });

  it("chưa có đề nghị: bắt đầu ở mức mở giá", () => {
    expect(nextStep([], "fee", ladder).amount).toBe(8_000_000);
  });
  it("bị từ chối thì nâng khoảng 6%, chạm trần thì dừng", () => {
    expect(nextStep([offer({ amount: 8_000_000 })], "fee", ladder).amount).toBe(8_500_000);
    const stop = nextStep([offer({ amount: 11_800_000 })], "fee", ladder);
    expect(stop.amount).toBeNull();
    expect(stop.text).toContain("vượt mức tối đa");
  });
  it("bên kia ra giá lại: trong trần thì nên chấp nhận, vượt trần thì từ chối", () => {
    expect(nextStep([offer({ amount: 8_000_000, result: "counter", counter: 11_000_000 })], "fee", ladder).amount).toBe(11_000_000);
    expect(nextStep([offer({ amount: 8_000_000, result: "counter", counter: 15_000_000 })], "fee", ladder).amount).toBeNull();
  });
  it("tính tỉ lệ đề nghị so với ước tính", () => {
    const st = offerStats([offer({ amount: 7_000_000 }), offer({ amount: 9_000_000, result: "accepted" }), offer({ amount: 11_000_000, result: "accepted" })], "fee");
    expect(st).toMatchObject({ accepted: 2, rejected: 1, highestRejectedRatio: 0.7, lowestAcceptedRatio: 0.9, medianAcceptedRatio: 1 });
  });

  it("đủ 3 lần được chấp nhận thì bậc giá học từ nhật ký", () => {
    const s = world();
    const p = s.data.players.get(1)!;
    const est = priceAnalysis(s, 1, p, null, null).value.estimate;
    const before = priceAnalysis(s, 1, p, null, null);
    for (const r of [0.7, 0.72, 0.74]) {
      s.user.manager.offers.push(offer({ id: s.user.manager.offers.length + 1, player_id: 9, amount: est * r, result: "accepted", estimate: est }));
    }
    const after = priceAnalysis(s, 1, p, null, null);
    expect(after.fee.source).toBe("history");
    expect(after.fee.ladder.target).toBeLessThan(before.fee.ladder.target);
    expect(after.fee.ladder.target).toBeCloseTo(est * 0.72, -5);
  });

  it("route: ghi nhật ký, kiểm tra dữ liệu, xóa", () => {
    const s = world();
    const post = handleRequest(s, "POST", "/manager/offers", { player_id: 1, kind: "fee", amount: 8_000_000, result: "rejected" });
    expect(post.status).toBe(201);
    expect(s.user.manager.offers).toHaveLength(1);
    expect(s.user.manager.offers[0].estimate).toBeGreaterThan(0);
    expect(handleRequest(s, "POST", "/manager/offers", { player_id: 1, kind: "fee", amount: 8_000_000, result: "counter" }).status).toBe(422);
    expect(handleRequest(s, "POST", "/manager/offers", { player_id: 1, kind: "xyz", amount: 1, result: "accepted" }).status).toBe(422);
    expect(handleRequest(s, "POST", "/manager/offers", { player_id: 99, kind: "fee", amount: 1, result: "accepted" }).status).toBe(404);
    const a = handleRequest(s, "GET", "/manager/pricing?player_id=1").json as { offers: unknown[]; fee: { next: { amount: number } } };
    expect(a.offers).toHaveLength(1);
    expect(a.fee.next.amount).toBeGreaterThan(8_000_000);
    expect(handleRequest(s, "DELETE", `/manager/offers/${s.user.manager.offers[0].id}`).status).toBe(200);
    expect(s.user.manager.offers).toHaveLength(0);
  });

  it("route: số hiệu chỉnh cần giá trị hoặc lương", () => {
    const s = world();
    expect(handleRequest(s, "POST", "/manager/observations", { player_id: 1 }).status).toBe(422);
    expect(handleRequest(s, "POST", "/manager/observations", { player_id: 1, value: 30_000_000 }).status).toBe(201);
    expect(handleRequest(s, "DELETE", "/manager/observations/999").status).toBe(404);
  });

  it("dữ liệu Manager cũ (chưa có observations/offers) được bổ sung mặc định", () => {
    const old = { budget: { transfer: null, wage: null }, season_end_year: null, shortlist: [], sales: [] };
    const merged = { ...emptyManager(), ...old };
    expect(merged.offers).toEqual([]);
    expect(merged.nextId).toEqual({ observation: 1, offer: 1 });
  });
});
