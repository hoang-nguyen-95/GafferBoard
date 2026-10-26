// Kiểm thử đầu-cuối của ứng dụng desktop bằng Electron thật (cần frontend/out đã build, Playwright, và màn hình ảo trên Linux):
//   cd frontend && npm run build && cd ../desktop && xvfb-run -a node test/e2e-electron.cjs
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { _electron: electron } = require("playwright");

const ROOT = path.resolve(__dirname, "../..");
const tmp = (p) => fs.mkdtempSync(path.join(os.tmpdir(), p));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function check(cond, msg) {
  if (!cond) throw new Error("THẤT BẠI: " + msg);
  console.log("  ok:", msg);
}

const exportDir = tmp("e2e-desktop-exports-");
execFileSync("python3", [path.join(ROOT, "backend/tools/make_synthetic_exports.py"), exportDir], { stdio: "ignore" });
const userData = tmp("e2e-desktop-user-");
const leDir = tmp("e2e-desktop-le-");
fs.mkdirSync(path.join(leDir, "lua", "scripts"), { recursive: true });
fs.writeFileSync(path.join(userData, "config.json"), JSON.stringify({ exportDir, leDir, imported: {} }));
// bảng xuất thêm mà ứng dụng chưa dùng (rất lớn trong save thật): phải bị bỏ qua
fs.writeFileSync(path.join(exportDir, "transfers.csv"), "a,b\n" + "1,2\n".repeat(50000));
const mapping = JSON.parse(fs.readFileSync(path.join(ROOT, "frontend/src/engine/data/mapping.json"), "utf8"));
const knownFile = path.join(userData, "known-files.json");
const extraFiles = JSON.parse(fs.readFileSync(path.join(ROOT, "frontend/src/engine/data/extra-files.json"), "utf8"));
fs.writeFileSync(knownFile, JSON.stringify([...Object.values(extraFiles), ...Object.values(mapping.tables).map((t) => t.file), mapping.names.names_file, ...mapping.names.extra_names_files, mapping.names.edited_file, mapping.lineups.teamsheets_file, mapping.lineups.formations_file].map((f) => f.toLowerCase())));

async function launch() {
  const app = await electron.launch({
    executablePath: path.join(__dirname, "../node_modules/electron/dist/electron"),
    args: ["--no-sandbox", path.join(__dirname, "../main.js")],
    env: {
      ...process.env,
      COUNTERPICK_WEB_ROOT: path.join(ROOT, "frontend/out"),
      COUNTERPICK_SCRIPTS_DIR: path.join(ROOT, "tools/live_editor"),
      COUNTERPICK_USER_DATA: userData,
      COUNTERPICK_KNOWN_FILES: knownFile,
      COUNTERPICK_POLL_MS: "300",
      COUNTERPICK_QUIET_MS: "900",
    },
  });
  const page = await app.firstWindow();
  const problems = [];
  page.on("pageerror", (e) => problems.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") problems.push("console: " + m.text()); });
  return { app, page, problems };
}
const api = (page, method, p, body) => page.evaluate(async ([m, u, b]) => {
  const r = await fetch("/api" + u, { method: m, headers: { "content-type": "application/json" }, body: b ? JSON.stringify(b) : undefined });
  return { status: r.status, json: await r.json().catch(() => null) };
}, [method, p, body]);

(async () => {
  let { app, page, problems } = await launch();
  try {
    console.log("1. Mở app lần đầu: tự nhập từ thư mục, không kéo thả");
    check(page.url().startsWith("app://counterpick/"), `chạy trên origin cố định (${page.url()})`);
    check(await page.evaluate(() => Boolean(window.desktop && window.desktop.isDesktop)), "có cầu nối desktop");
    await page.waitForSelector("text=Trận kế tiếp", { timeout: 60000 });
    check(true, "dữ liệu tự được nhập và hiện trang chủ");
    const meta1 = (await api(page, "GET", "/meta")).json;
    check(meta1.teams > 0 && meta1.players > 0, `đã nhập ${meta1.teams} đội, ${meta1.players} cầu thủ`);
    const state = await page.evaluate(() => window.desktop.getState());
    check(state.csvCount === fs.readdirSync(exportDir).filter((f) => f.endsWith(".csv") && f !== "transfers.csv").length, "bảng xuất thêm (transfers.csv) bị bỏ qua, không đếm, không gửi");

    console.log("2. Sửa file trong thư mục: app tự cập nhật");
    const teamsFile = path.join(exportDir, "teams.csv");
    const rows = fs.readFileSync(teamsFile, "utf8").split("\n");
    const header = rows[0].split(",");
    const nameCol = header.indexOf("teamname");
    const idCol = header.indexOf("teamid");
    const cells = rows[1].split(",");
    const teamId = Number(cells[idCol]);
    cells[nameCol] = "Đội Đã Đổi Tên";
    rows[1] = cells.join(",");
    await sleep(1200); // đảm bảo thời điểm sửa khác lần trước
    fs.writeFileSync(teamsFile, rows.join("\n"));
    let renamed = false;
    for (let i = 0; i < 60 && !renamed; i++) {
      await sleep(250);
      renamed = (await api(page, "GET", `/teams/${teamId}`)).json?.name === "Đội Đã Đổi Tên";
    }
    check(renamed, "tên đội mới xuất hiện sau khi sửa file, không thao tác gì");

    console.log("3. File hỏng: báo lỗi, giữ dữ liệu cũ, không lặp vô hạn");
    await page.goto("app://counterpick/import");
    await page.waitForSelector("text=Tự động cập nhật từ Live Editor");
    const before = (await api(page, "GET", "/meta")).json;
    await sleep(1200);
    fs.writeFileSync(path.join(exportDir, "players.csv"), "foo,bar\n1,2\n");
    await page.waitForSelector("text=thiếu cột", { timeout: 20000 });
    check(true, "hiện thông báo lỗi khi file sai cấu trúc");
    await sleep(2500);
    const after = (await api(page, "GET", "/meta")).json;
    check(after.players === before.players && after.last_import_at === before.last_import_at, "dữ liệu cũ nguyên vẹn và không thử nhập lại liên tục");

    console.log("4. Cài script vào Live Editor");
    const res = await page.evaluate(() => window.desktop.installScript());
    check(res.ok && ["counterpick_export.lua", "counterpick_probe_loop.lua", "counterpick_export_loop.lua"].every((f) => fs.existsSync(path.join(leDir, "lua", "scripts", f))), "cả 3 script được chép vào thư mục script");
    const lua = fs.readFileSync(path.join(leDir, "lua", "scripts", "counterpick_export.lua"), "utf8");
    check(lua.includes(`local OUT_DIR = "${exportDir.replace(/\\/g, "/")}"`), "script đã điền sẵn thư mục xuất");

    const req = await page.evaluate(() => window.desktop.requestExport());
    check(req.ok && fs.existsSync(path.join(exportDir, "request_full.txt")), "nút yêu cầu xuất tạo file request_full.txt cho script lặp");
    check((await page.evaluate(() => window.desktop.getState())).heartbeat === null, "chưa có script lặp thì không có nhịp tim");
    fs.writeFileSync(path.join(exportDir, "heartbeat.txt"), "1\nidle\n");
    const hb = (await page.evaluate(() => window.desktop.getState())).heartbeat;
    check(hb && hb.state === "idle" && hb.ageSeconds < 10, "đọc được nhịp tim của script lặp");
    await page.reload({ waitUntil: "networkidle" });
    await page.goto("app://counterpick/import");
    await page.waitForSelector("text=Script xuất lặp đang chạy");
    check(true, "giao diện báo script xuất lặp đang chạy");


    // Bảng hợp đồng giả (chưa được ứng dụng dùng): nút báo cáo phải liệt kê cột và dòng mẫu, không liệt kê bảng đã dùng
    fs.writeFileSync(path.join(exportDir, "career_scouts.csv"), "scoutid,firstname,lastname\n1,An,Binh\n2,Cuong,Dung\n");
    await page.click("text=Xem cấu trúc các bảng chưa dùng");
    const report = await page.inputValue("textarea[aria-label='Báo cáo các bảng chưa dùng']");
    check(/## career_scouts\.csv {2}\(2 dòng\)/.test(report) && /Cột \(3\): scoutid, firstname, lastname/.test(report) && /Mẫu 1: scoutid=1 \| firstname=An \| lastname=Binh/.test(report), "báo cáo liệt kê bảng chưa dùng với cột và dòng mẫu");
    check(!/## players\.csv/.test(report) && !/## teams\.csv/.test(report), "không liệt kê bảng ứng dụng đã dùng");

    check(problems.length === 0, `không có lỗi console (${problems.slice(0, 3).join(" | ") || "không"})`);

    console.log("5. Mở lại app: dữ liệu còn, không nhập lại file không đổi");
    // sửa lại players.csv hợp lệ để mọi file ở trạng thái đã nhập
    execFileSync("python3", [path.join(ROOT, "backend/tools/make_synthetic_exports.py"), exportDir], { stdio: "ignore" });
    await sleep(2500);

    // Hợp đồng của đội bạn: tự nhập khi file xuất hiện, hiện cột Lương, quỹ lương và hợp đồng sắp hết ở tab Ngân sách
    const mine = await page.evaluate(async () => {
      const meta = await (await fetch("/api/meta")).json();
      const ov = await (await fetch(`/api/teams/${meta.user_team.team_id}/overview`)).json();
      return { team: meta.user_team.team_id, ids: Object.values(ov.squad).flat().slice(0, 5).map((p) => p.player_id) };
    });
    const contractHeader = "performancebonuscount,last_status_change_date,performancebonuscountachieved,playerrole,contract_date,duration_months,wage,performancebonustype,performancebonusvalue,signon_bonus,contract_status,isperformancebonusachieved,teamid,loan_wage_split,playerid";
    fs.writeFileSync(path.join(exportDir, "career_playercontract.csv"), [contractHeader, ...mine.ids.map((id, i) => `-1,20260630,0,-1,20260630,${i === 0 ? 12 : 36},${10000 * (i + 1)},0,-1,0,0,0,${mine.team},-1,${id}`)].join("\n") + "\n");
    for (let i = 0; i < 60; i++) {
      if ((await page.evaluate(async () => (await (await fetch("/api/manager/wages")).json()).available)) === true) break;
      await sleep(250);
    }
    const wages = await page.evaluate(async () => (await fetch("/api/manager/wages")).json());
    check(wages.players === 5 && wages.total === 150000, `quỹ lương đọc từ hợp đồng trong save (${wages.players} người, ${wages.total})`);
    check(wages.expiring.length === 1 && wages.top[0].wage === 50000, "có một hợp đồng sắp hết hạn và lương cao nhất đứng đầu");
    await page.goto("app://counterpick/cau-thu");
    await page.waitForSelector("th:has-text('Lương')");
    check(await page.isVisible("th:has-text('HĐ hết hạn')"), "bảng cầu thủ có cột Lương và HĐ hết hạn khi save có hợp đồng");
    await page.goto("app://counterpick/manager?tab=budget");
    await page.waitForSelector("text=Quỹ lương hiện tại (đọc từ save)");
    check(true, "tab Ngân sách hiện quỹ lương hiện tại");
    await page.goto("app://counterpick/import");
    await page.goto("app://counterpick/");
    await page.waitForSelector("text=Đã cập nhật từ", { timeout: 1000 }).catch(() => null);
    await sleep(3000);
    const runs1 = (await api(page, "GET", "/meta")).json.last_import_at;
    await app.close();
    ({ app, page, problems } = await launch());
    await page.waitForSelector("text=Trận kế tiếp", { timeout: 30000 });
    await sleep(3000);
    const meta2 = (await api(page, "GET", "/meta")).json;
    check(meta2.teams === meta1.teams, "dữ liệu còn nguyên sau khi mở lại (IndexedDB giữ qua các lần chạy)");
    check(meta2.last_import_at === runs1, "không nhập lại khi các file không đổi");
    console.log("\nE2E DESKTOP: ĐẠT");
  } catch (e) {
    console.error("\n" + e.message);
    if (problems.length) console.error("Lỗi trình duyệt:\n" + problems.slice(0, 5).join("\n"));
    process.exitCode = 1;
  } finally {
    await app.close().catch(() => undefined);
  }
})();
