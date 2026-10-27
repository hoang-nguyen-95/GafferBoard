import { describe, expect, it } from "vitest";
import { handleRequest } from "../api";
import { plausibleDate, prepareGameState } from "../gamestate";
import { runImport } from "../importer";
import "../routes/register";
import { referenceDate } from "../serialize";
import { Store } from "../store";

const HEADER = "user_team_id,transfer_budget,game_date,last_event,export_kind,exported_at,script_version";
const state = (row: string) => new Map([["cp_state.csv", `${HEADER}\n${row}\n`]]);
const ROW = "11,77000000,2026-08-05,15,fast,2026-10-27 21:30:00,counterpick_auto v1";

function world() {
  const s = new Store();
  s.data.teams.set(11, { team_id: 11, name: "Mine" } as never);
  s.data.fixtures.set(1, { fixture_id: 1, fixture_date: "2026-05-27" } as never);
  s.user.settings.set("user_team_id", "11");
  return s;
}

describe("trạng thái game (cp_state.csv)", () => {
  it("đọc ngân sách, ngày và đội người chơi", () => {
    expect(prepareGameState(state(ROW))).toEqual({
      user_team_id: 11, transfer_budget: 77000000, date: "2026-08-05", last_event: 15, exported_at: "2026-10-27 21:30:00",
    });
  });

  it("giá trị thiếu hoặc không đáng tin thì thành null, riêng ngày mặc định 2008 của career_calendar bị loại", () => {
    expect(prepareGameState(state(",,,,,,"))).toMatchObject({ user_team_id: null, transfer_budget: null, date: null });
    expect(prepareGameState(state("11,-5,2008-01-01,,,,"))).toMatchObject({ transfer_budget: null, date: null });
    expect(plausibleDate("2026-13-01")).toBeNull();
    expect(plausibleDate("2026-08-05")).toBe("2026-08-05");
  });

  it("không có file, file rỗng hoặc thiếu cột thì bỏ qua, không làm hỏng đợt nhập", () => {
    expect(prepareGameState(new Map())).toBeNull();
    expect(prepareGameState(new Map([["cp_state.csv", `${HEADER}\n`]]))).toBeNull();
    const s = world();
    const reports = runImport(s, new Map([["cp_state.csv", "foo,bar\n1,2\n"]]));
    expect(reports.find((r) => r.table === "state")?.status).toBe("skipped");
    expect(s.data.gameState).toBeNull();
  });

  it("nhập vào store, báo cáo từng bảng và không bị xóa khi lần nhập sau thiếu file", () => {
    const s = world();
    const reports = runImport(s, state(ROW));
    expect(reports.find((r) => r.table === "state")).toMatchObject({ status: "ok", read: 1 });
    expect(s.data.gameState?.transfer_budget).toBe(77000000);
    runImport(s, new Map());
    expect(s.data.gameState?.transfer_budget).toBe(77000000);
  });

  it("ngày trong game thay ngày sớm nhất của lịch làm ngày tham chiếu", () => {
    const s = world();
    expect(referenceDate(s)).toBe("2026-05-27");
    runImport(s, state(ROW));
    expect(referenceDate(s)).toBe("2026-08-05");
    runImport(s, state("11,1,2008-01-01,,,,")); // ngày không đáng tin: quay về lịch
    expect(referenceDate(s)).toBe("2026-05-27");
  });

  it("ngân sách chuyển nhượng tự điền từ game, số nhập tay được ưu tiên", () => {
    const s = world();
    type Budget = { effective_budget: { transfer: number | null; transfer_source: string | null }; totals: { transfer_after: number | null }; warnings: string[]; game: { date: string } | null };
    let res = handleRequest(s, "GET", "/manager/shortlist").json as Budget;
    expect(res.effective_budget).toEqual({ transfer: null, transfer_source: null });
    expect(res.game).toBeNull();
    expect(res.warnings.some((w) => w.includes("Chưa nhập ngân sách"))).toBe(true);

    runImport(s, state(ROW));
    res = handleRequest(s, "GET", "/manager/shortlist").json as Budget;
    expect(res.effective_budget).toEqual({ transfer: 77000000, transfer_source: "game" });
    expect(res.totals.transfer_after).toBe(77000000);
    expect(res.game?.date).toBe("2026-08-05");
    expect(res.warnings.some((w) => w.includes("Chưa nhập ngân sách"))).toBe(false);

    handleRequest(s, "PUT", "/manager/budget", { transfer: 50000000 });
    res = handleRequest(s, "GET", "/manager/shortlist").json as Budget;
    expect(res.effective_budget).toEqual({ transfer: 50000000, transfer_source: "manual" });

    handleRequest(s, "PUT", "/manager/budget", { transfer: null });
    res = handleRequest(s, "GET", "/manager/shortlist").json as Budget;
    expect(res.effective_budget.transfer_source).toBe("game");
  });
});
