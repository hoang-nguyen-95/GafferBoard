import { describe, expect, it } from "vitest";
import { handleRequest } from "../api";
import { addMonths, monthsLeft, ymdToDate } from "../contracts";
import { runImport } from "../importer";
import "../routes/register";
import { Store } from "../store";
import { newPlayer } from "../types";

// Cột và dòng lấy từ một bản xuất thật (FC26 Live Editor): career_playercontract và playerloans.
const CONTRACTS = [
  "performancebonuscount,last_status_change_date,performancebonuscountachieved,playerrole,contract_date,duration_months,wage,performancebonustype,performancebonusvalue,signon_bonus,contract_status,isperformancebonusachieved,teamid,loan_wage_split,playerid",
  "-1,20260630,0,-1,20260630,12,220000,0,-1,0,0,0,11,-1,1",
  "-1,20260630,0,-1,20260630,48,170000,0,-1,0,0,0,11,-1,2",
  "-1,20260630,0,-1,20260630,24,4720,0,-1,0,0,0,112264,-1,3",
].join("\n");
const LOANS = ["teamidloanedfrom,loandateend,isloantobuy,playerid", "101085,162246,0,2", "110580,162160,1,3"].join("\n");

function world() {
  const s = new Store();
  for (const id of [1, 2, 3]) {
    const p = newPlayer(id);
    p.name = `P${id}`;
    s.data.players.set(id, p);
  }
  s.data.teams.set(11, { team_id: 11, name: "Mine" } as never);
  s.data.teams.set(101085, { team_id: 101085, name: "Parent FC" } as never);
  s.data.fixtures.set(1, { fixture_id: 1, fixture_date: "2026-07-01" } as never);
  s.user.settings.set("user_team_id", "11");
  return s;
}

describe("hợp đồng và lương", () => {
  it("tính ngày hết hạn và số tháng còn lại", () => {
    expect(ymdToDate(20260630)).toBe("2026-06-30");
    expect(ymdToDate(-1)).toBeNull();
    expect(addMonths("2026-06-30", 12)).toBe("2027-06-30");
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(monthsLeft("2027-06-30", "2026-07-01")).toBe(11);
    expect(monthsLeft("2026-06-30", "2026-07-01")).toBe(-1); // đã hết hạn
  });

  it("nhập hợp đồng và cho mượn, báo cáo từng bảng", () => {
    const s = world();
    const reports = runImport(s, new Map([["career_playercontract.csv", CONTRACTS], ["playerloans.csv", LOANS]]));
    expect(reports.find((r) => r.table === "contracts")).toMatchObject({ status: "ok", read: 3 });
    expect(reports.find((r) => r.table === "loans")).toMatchObject({ status: "ok", read: 2 });
    expect(s.data.contracts.get(2)).toMatchObject({ team_id: 11, wage: 170000, duration_months: 48, end_date: "2030-06-30" });
    expect(s.data.loans.get(3)).toMatchObject({ from_team_id: 110580, to_buy: true });
  });

  it("thiếu file thì bỏ qua, không xóa hợp đồng đã có", () => {
    const s = world();
    runImport(s, new Map([["career_playercontract.csv", CONTRACTS]]));
    const reports = runImport(s, new Map());
    expect(reports.find((r) => r.table === "contracts")?.status).toBe("skipped");
    expect(s.data.contracts.size).toBe(3);
  });

  it("file sai cấu trúc bị từ chối và không ghi gì", () => {
    const s = world();
    runImport(s, new Map([["career_playercontract.csv", CONTRACTS]]));
    expect(() => runImport(s, new Map([["career_playercontract.csv", "playerid,teamid\n1,11"]]))).toThrow(/thiếu cột/);
    expect(s.data.contracts.size).toBe(3);
  });

  it("route quỹ lương của đội bạn: tổng, hợp đồng sắp hết, lương cao nhất", () => {
    const s = world();
    runImport(s, new Map([["career_playercontract.csv", CONTRACTS], ["playerloans.csv", LOANS]]));
    const res = handleRequest(s, "GET", "/manager/wages").json as { expiring: { player_id: number }[]; top: Record<string, unknown>[] };
    expect(res).toMatchObject({ available: true, team_id: 11, players: 2, total: 390000 }); // đội dự bị (112264) không tính
    expect(res.expiring.map((e) => e.player_id)).toEqual([1]); // P1 còn 11 tháng, P2 còn 47
    expect(res.top[0]).toMatchObject({ player_id: 1, wage: 220000, months_left: 11 });
  });

  it("route hợp đồng của một cầu thủ, kèm đội gốc nếu đang mượn", () => {
    const s = world();
    runImport(s, new Map([["career_playercontract.csv", CONTRACTS], ["playerloans.csv", LOANS]]));
    const r = handleRequest(s, "GET", "/players/2/contract").json as { contract: unknown; loan: unknown };
    expect(r.contract).toMatchObject({ wage: 170000, months_left: 47 });
    expect(r.loan).toMatchObject({ from_team_name: "Parent FC", ends_on: "2026-12-31" });
    expect(handleRequest(s, "GET", "/players/99/contract").status).toBe(404);
  });

  it("chưa có dữ liệu hợp đồng thì /manager/wages báo không khả dụng", () => {
    const res = handleRequest(world(), "GET", "/manager/wages").json as Record<string, unknown>;
    expect(res.available).toBe(false);
  });
});
