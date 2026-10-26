// Kiểm thử đầu-cuối trên BẢN BUILD DESKTOP (NEXT_PUBLIC_TARGET=desktop, thư mục out/), không có backend nào chạy.
//   npm run build:desktop && node e2e/desktop-build.cjs [thư_mục_csv]
// Không truyền thư mục thì sinh dữ liệu giả bằng backend/tools/make_synthetic_exports.py. Cần Playwright + Chromium.
const http = require("node:http");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { chromium } = require("playwright");

const OUT = path.resolve(__dirname, "../out");
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".txt": "text/plain", ".ico": "image/x-icon", ".lua": "text/plain", ".json": "application/json" };

/** Máy chủ tĩnh giả lập hosting thật: /team -> team.html, không có API nào. */
function serve() {
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(new URL(req.url, "http://x").pathname);
    const candidates = [url, `${url}.html`, path.join(url, "index.html")].map((p) => path.join(OUT, p));
    const file = candidates.find((p) => p.startsWith(OUT) && fs.existsSync(p) && fs.statSync(p).isFile());
    if (!file) { res.writeHead(404, { "content-type": "text/html" }); res.end(fs.readFileSync(path.join(OUT, "404.html"))); return; }
    res.writeHead(200, { "content-type": MIME[path.extname(file)] ?? "application/octet-stream" });
    res.end(fs.readFileSync(file));
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

function check(cond, msg) {
  if (!cond) throw new Error("THẤT BẠI: " + msg);
  console.log("  ok:", msg);
}

(async () => {
  let exportsDir = process.argv[2];
  if (!exportsDir) {
    exportsDir = fs.mkdtempSync(path.join(os.tmpdir(), "e2e-exports-"));
    execFileSync("python3", [path.resolve(__dirname, "../../backend/tools/make_synthetic_exports.py"), exportsDir], { stdio: "ignore" });
  }
  const csvs = fs.readdirSync(exportsDir).filter((f) => f.toLowerCase().endsWith(".csv")).map((f) => path.join(exportsDir, f));
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const problems = [];
  page.on("pageerror", (e) => problems.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") problems.push("console: " + m.text()); });
  page.on("response", (r) => { if (r.status() === 404) problems.push("404: " + r.url()); });
  const external = [];
  page.on("request", (r) => { if (!r.url().startsWith(base) && !r.url().startsWith("data:")) external.push(r.url()); });
  const api = (method, p, body) => page.evaluate(async ([m, u, b]) => {
    const r = await fetch("/api" + u, { method: m, headers: { "content-type": "application/json" }, body: b ? JSON.stringify(b) : undefined });
    return { status: r.status, json: await r.json().catch(() => null) };
  }, [method, p, body]);

  try {
    console.log("1. Chưa có dữ liệu");
    await page.goto(base + "/", { waitUntil: "networkidle" });
    check(await page.isVisible("text=Bắt đầu: nhập dữ liệu từ game"), "trang chủ mời nhập dữ liệu");
    await page.goto(base + "/team?id=1", { waitUntil: "networkidle" });
    check(await page.isVisible("text=Chưa có dữ liệu"), "trang đội báo chưa có dữ liệu");

    console.log("2. Nhập file CSV bằng giao diện");
    await page.goto(base + "/import", { waitUntil: "networkidle" });
    check((await page.inputValue("input[type=file] >> nth=0").catch(() => "")) === "", "có ô chọn file");
    await page.setInputFiles("input[type=file][accept*='csv']", csvs);
    await page.click("button:has-text('Nhập dữ liệu')");
    await page.waitForSelector("text=Nhập xong.", { timeout: 120000 });
    check(true, "nhập xong và có báo cáo từng bảng");
    check(await page.isVisible("code:text-is('players')"), "báo cáo có bảng players");

    console.log("3. Dùng dữ liệu");
    await page.click("text=Về trang chủ");
    await page.waitForSelector("text=Trận kế tiếp");
    if (await page.isVisible("text=Chưa xác định được đối thủ")) {
      // tiền mùa giải: lịch trống nên bạn chọn đối thủ bằng tay
      await page.click("button:has-text('Chọn đối thủ')");
      await page.fill("input[placeholder='Gõ tên đội…']", "man");
      await page.locator("ul li button").first().click();
      await page.waitForSelector("a:has-text('Phân tích')");
    }
    const analysisLink = page.locator("a:has-text('Phân tích')").first();
    const href = await analysisLink.getAttribute("href");
    check(/^\/analysis\?id=\d+$/.test(href), `link phân tích dạng query (${href})`);
    await analysisLink.click();
    await page.waitForSelector("text=Cầu thủ nguy hiểm nhất");
    check(true, "trang phân tích đối thủ hiển thị");
    await page.waitForSelector("text=Đội hình đáp trả đề xuất");
    check(true, "có đội hình đáp trả cho đội của bạn");

    console.log("4. Ghi chú được lưu, sống sót qua tải lại");
    await page.fill("textarea", "Hay lùi sâu, đá phạt góc ngắn.");
    await page.click("text=Lưu ghi chú");
    await page.waitForSelector("text=Đã lưu.");
    await page.fill("section:has(h2:text('Lịch sử các trận gặp')) input[type=number] >> nth=0", "3");
    await page.fill("section:has(h2:text('Lịch sử các trận gặp')) input[type=number] >> nth=1", "1");
    await page.click("text=Thêm trận");
    await page.waitForSelector("text=1 thắng");
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForSelector("textarea");
    check((await page.inputValue("textarea")).startsWith("Hay lùi sâu"), "ghi chú còn sau khi tải lại (IndexedDB)");
    check(await page.isVisible("text=1 thắng"), "lịch sử gặp còn sau khi tải lại");

    console.log("5. Tải báo cáo Markdown");
    const [download] = await Promise.all([page.waitForEvent("download"), page.click("button:has-text('Tải báo cáo')")]);
    const text = fs.readFileSync(await download.path(), "utf8");
    check(text.startsWith("# Phân tích đối thủ:") && text.includes("Hay lùi sâu"), `báo cáo ${download.suggestedFilename()} có ghi chú cá nhân`);

    console.log("6. Cầu thủ, đội, so sánh, nhập tay");
    const teams = (await api("GET", "/teams?limit=3")).json;
    await page.goto(`${base}/team?id=${teams[0].team_id}`, { waitUntil: "networkidle" });
    check(await page.isVisible(`h1:text-is("${teams[0].name}")`), "trang đội");
    await page.click("table a >> nth=0");
    await page.waitForSelector("text=Chỉ số liên quan tới vị trí");
    check(page.url().includes("/player?id="), "bấm cầu thủ -> /player?id=");
    const players = (await api("GET", `/players?q=&limit=6`)).json;
    await page.goto(`${base}/compare/players?a=${players[0].player_id}&b=${players[1].player_id}`, { waitUntil: "networkidle" });
    await page.waitForSelector("table");
    check(true, "so sánh hai cầu thủ");
    await page.goto(`${base}/compare/teams?a=${teams[0].team_id}&b=${teams[1].team_id}`, { waitUntil: "networkidle" });
    await page.waitForSelector("text=Rating đội trong game");
    check(true, "so sánh hai đội");

    const formations = (await api("GET", "/formations")).json;
    const xi = (await api("GET", `/players?q=&limit=11`)).json.map((p) => p.player_id);
    const made = await api("POST", "/manual-lineups", { name: "Đội thử", formation_id: formations.find((f) => f.name === "4-3-3").id, player_ids: xi });
    check(made.status === 201, "tạo đội hình nhập tay qua cầu nối");
    await page.goto(`${base}/manual`, { waitUntil: "networkidle" });
    await page.click("text=Đội thử");
    await page.waitForSelector("text=Cầu thủ nguy hiểm nhất");
    check(page.url().includes("/manual/view?id="), "mở đội hình nhập tay");

    // dựng đội hình bằng giao diện: gõ tên, chọn từ gợi ý
    await page.goto(`${base}/manual/new`, { waitUntil: "networkidle" });
    await page.fill("input[placeholder='vd Real Madrid']", "Đội dựng tay");
    const three = (await api("GET", "/players?q=&limit=3")).json;
    for (const [i, pl] of three.entries()) {
      await page.fill("input[placeholder^='Gõ tên cầu thủ']", pl.name.slice(0, 7));
      await page.locator("[role=listbox] button").first().click();
      check((await page.innerText("text=vị trí đã có cầu thủ")).startsWith(`${i + 1}/11`), `chọn cầu thủ thứ ${i + 1} bằng ô tìm kiếm`);
    }
    await page.click("button:has-text('Lưu và phân tích')");
    await page.waitForSelector("text=Cầu thủ nguy hiểm nhất");
    check(page.url().includes("/manual/view?id="), "lưu đội hình dựng bằng giao diện rồi mở phân tích");
    await page.click("text=Sửa đội hình");
    await page.waitForSelector("text=Sửa đội hình đối thủ");
    await page.goBack();
    page.once("dialog", (d) => d.accept());
    await page.click("button:has-text('Xóa')");
    await page.waitForURL(/\/manual$/);
    check(true, "xóa đội hình");

    console.log("6c. Chế độ Manager");
    await page.goto(`${base}/manager`, { waitUntil: "networkidle" });
    await page.waitForSelector("text=Vị trí nên củng cố");
    check(true, "tab Nhu cầu liệt kê vị trí cần củng cố");
    await page.locator("text=Tìm cầu thủ cho vị trí này →").first().click();
    await page.waitForSelector("text=đáng cân nhắc");
    check(page.url().includes("tab=targets"), "bấm 'Tìm cầu thủ' chuyển sang tab Mục tiêu");
    check((await page.locator("tbody tr").count()) > 0, "có cầu thủ mục tiêu được chấm điểm");
    const firstName = await page.locator("tbody tr a").first().innerText();
    await page.locator("button:has-text('+ Shortlist')").first().click();
    await page.waitForSelector("button:has-text('Đã thêm')");
    await page.click("[role=tab]:has-text('Ngân sách')");
    await page.waitForSelector("text=Shortlist mua");
    check(await page.isVisible(`a:has-text("${firstName}")`), "cầu thủ vừa thêm nằm trong shortlist");
    await page.fill("label:has-text('Ngân sách chuyển nhượng còn lại') input", "50000000");
    await page.click("section:has(h2:text('Số liệu từ màn Tài chính')) button:has-text('Lưu')");
    await page.waitForSelector("text=Đã lưu");
    await page.fill(`input[aria-label^="Giá "]`, "20000000");
    await page.click("table button:has-text('Lưu') >> nth=0");
    await page.waitForSelector("text=30.000.000");
    check(true, "tổng kết: 50 triệu trừ 20 triệu còn 30 triệu");
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForSelector("text=Shortlist mua");
    check(await page.isVisible(`a:has-text("${firstName}")`) && (await page.isVisible("text=30.000.000")), "shortlist và ngân sách còn sau khi tải lại");
    await page.click("table button:has-text('Đàm phán') >> nth=0");
    await page.waitForSelector("text=Phí chuyển nhượng hợp lý");
    check(await page.isVisible("text=Tối đa nên trả") && await page.isVisible("text=Lương hợp lý khi vào đội bạn"), "đàm phán ước tính được giá và lương dù chưa nhập số nào từ game");
    check(await page.isVisible("text=Chưa hiệu chỉnh"), "nói rõ giá trị là ước tính chưa hiệu chỉnh");
    const fee0 = await page.evaluate(async () => {
      const pid = new URLSearchParams(location.search).get("pid");
      return (await (await fetch(`/api/manager/pricing?player_id=${pid}`)).json()).fee.ladder.open;
    });
    await page.fill("section[aria-label='Ghi lại đề nghị'] input[type=number] >> nth=0", String(fee0));
    await page.click("button:has-text('Ghi lại')");
    await page.waitForSelector("text=bị từ chối", { state: "attached", timeout: 3000 }).catch(() => null);
    await page.waitForSelector("li:has-text('Từ chối')");
    check(await page.isVisible("text=nâng khoảng 6%"), "ghi một đề nghị bị từ chối thì gợi ý nâng khoảng 6%");
    await page.reload({ waitUntil: "networkidle" });
    check(await page.isVisible("li:has-text('Từ chối')"), "nhật ký đề nghị còn sau khi tải lại");
    await page.goto(`${base}/player?id=${(await api("GET", "/players?q=&limit=1")).json[0].player_id}`, { waitUntil: "networkidle" });
    check(await page.isVisible("button:has-text('Thêm vào shortlist mua')"), "trang cầu thủ có nút thêm vào shortlist");

    console.log("6d. Danh sách cầu thủ từ dữ liệu save");
    await page.goto(base + "/cau-thu", { waitUntil: "networkidle" });
    await page.waitForSelector("table tbody tr td a", { timeout: 20000 });
    const listed = Number((await page.textContent("[data-testid=count]")).replace(/\D/g, ""));
    const apiCount = await page.evaluate(async () => (await (await fetch("/api/players?limit=1000")).json()).length);
    check(listed > 0 && listed <= (apiCount === 1000 ? 1e9 : apiCount), `bảng liệt kê cầu thủ của save (${listed}, API ${apiCount})`);
    check(await page.isVisible("text=Giá trị chuyển nhượng chưa có"), "báo chưa có giá trị chuyển nhượng");
    await page.click("table tbody tr:first-child td:first-child a");
    await page.waitForSelector("text=Tất cả chỉ số");
    check(await page.isVisible("a:has-text('Gợi ý đàm phán')"), "trang cầu thủ trong ứng dụng vẫn có nút Manager");

    console.log("7. Nhập lại dữ liệu mới không làm mất ghi chú");
    await page.goto(base + "/import", { waitUntil: "networkidle" });
    await page.setInputFiles("input[type=file][accept*='csv']", csvs);
    await page.click("button:has-text('Nhập dữ liệu')");
    await page.waitForSelector("text=Nhập xong.", { timeout: 120000 });
    const notes = (await api("GET", `/teams/${(await api("GET", "/next-match")).json.opponent.team_id}/notes`)).json;
    check(notes.note && notes.summary.played === 1, "ghi chú và lịch sử còn sau khi nhập lại");

    console.log("7b. File sai cấu trúc bị từ chối, dữ liệu cũ nguyên vẹn");
    const before = (await api("GET", "/meta")).json.players;
    await page.reload({ waitUntil: "networkidle" });
    await page.setInputFiles("input[type=file][accept*='csv']", [{ name: "players.csv", mimeType: "text/csv", buffer: Buffer.from("foo,bar\n1,2\n") }]);
    await page.click("button:has-text('Nhập dữ liệu')");
    await page.waitForSelector("text=thiếu cột");
    check((await api("GET", "/meta")).json.players === before, "nhập file hỏng không làm mất hay đổi dữ liệu đang có");

    console.log("8. Dữ liệu không rời máy");
    // Ngoại lệ duy nhất: ảnh chân dung tải theo mã cầu thủ từ máy chủ ảnh của EA (không kèm dữ liệu save hay ghi chú)
    const unexpected = external.filter((u) => !/^https:\/\/ratings-images-prod\.pulse\.ea\.com\/FC25\/full\/player-portraits\/p\d+\.png(\?padding=[\d.]+)?$/.test(u));
    check(unexpected.length === 0, `không có request nào ra ngoài trừ ảnh cầu thủ (${unexpected.join(", ") || "không"}; ${external.length} request ảnh)`);
    check(problems.length === 0, `không có lỗi console (${problems.slice(0, 3).join(" | ") || "không"})`);
    console.log("\nE2E TĨNH: ĐẠT");
  } catch (e) {
    console.error("\n" + e.message);
    if (problems.length) console.error("Lỗi trình duyệt:\n" + problems.slice(0, 5).join("\n"));
    process.exitCode = 1;
  } finally {
    await browser.close();
    server.close();
  }
})();
