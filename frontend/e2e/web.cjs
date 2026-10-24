// Kiểm thử bản web (cẩm nang + trang tải) trên bản build tĩnh:
//   npm run build && node e2e/web.cjs      (cần Playwright + Chromium)
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

const OUT = path.resolve(__dirname, "../out");
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".txt": "text/plain", ".ico": "image/x-icon", ".lua": "text/plain", ".json": "application/json" };
function serve() {
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(new URL(req.url, "http://x").pathname);
    const file = [url, `${url}.html`, path.join(url, "index.html")].map((p) => path.join(OUT, p)).find((p) => p.startsWith(OUT) && fs.existsSync(p) && fs.statSync(p).isFile());
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
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const problems = [];
  page.on("pageerror", (e) => problems.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") problems.push("console: " + m.text()); });
  const external = [];
  // GitHub giả: trả file như một bản phát hành thật (Content-Disposition: attachment)
  await page.route("https://github.com/**", async (route) => {
    external.push(route.request().url());
    await route.fulfill({ status: 200, headers: { "content-type": "application/octet-stream", "content-disposition": 'attachment; filename="CounterPickFC-Setup.exe"' }, body: "MZ-fake-installer" });
  });

  try {
    console.log("1. Trang chủ bản web");
    await page.goto(base + "/", { waitUntil: "networkidle" });
    check(await page.isVisible("text=mua đúng người"), "trang chủ giới thiệu cẩm nang");
    check(!(await page.isVisible("text=Nhập dữ liệu")), "không còn khu vực nhập file CSV trên web");

    console.log("2. Nút tải");
    const href = await page.getAttribute("a:has-text('Tải ứng dụng cho Windows')", "href");
    check(/releases\/latest\/download\/CounterPickFC-Setup\.exe$/.test(href), `nút trỏ thẳng tới file cài đặt (${href})`);
    const [download] = await Promise.all([page.waitForEvent("download"), page.click("a:has-text('Tải ứng dụng cho Windows')")]);
    check(download.suggestedFilename() === "CounterPickFC-Setup.exe", "bấm là tải file .exe về máy, không mở trang khác");
    check(page.url() === base + "/", "vẫn ở lại trang web sau khi bấm tải");

    console.log("3. Trang tải riêng từ menu");
    await page.click("header a:has-text('Tải ứng dụng')");
    await page.waitForSelector("text=CounterPick FC cho Windows");
    check(page.url().endsWith("/tai-ung-dung"), "menu dẫn tới màn tải");
    check(await page.isVisible("a:has-text('bản chạy thẳng')"), "có bản chạy thẳng");
    const [dl2] = await Promise.all([page.waitForEvent("download"), page.click("main a:has-text('Tải ứng dụng cho Windows')")]);
    check(dl2.suggestedFilename().endsWith(".exe"), "nút trên màn tải cũng tải thẳng");

    console.log("4. Cẩm nang");
    for (const [p, expect] of [
      ["/cam-nang", "Cẩm nang người chơi"],
      ["/cam-nang/chi-so", "Tốc độ chạy nước rút"],
      ["/cam-nang/vi-tri", "Đá lệch vị trí thì mất bao nhiêu"],
      ["/cam-nang/chien-thuat", "Hàng thủ đối thủ chậm"],
      ["/cam-nang/so-do", "Đối thủ đá 4-3-3"],
      ["/cam-nang/doc-phan-tich", "Phân vị (P) là gì"],
      ["/cam-nang/mua-cau-thu", "Mua cầu thủ: đọc gì trước khi chi tiền"],
      ["/cam-nang/tuoi-va-tiem-nang", "Đọc POT cho đúng"],
      ["/cam-nang/mua-theo-vi-tri", "Tiền đạo cắm"],
      ["/cam-nang/dam-phan-gia", "Ba bậc giá"],
      ["/cam-nang/tai-chinh", "Hai ngân sách khác nhau"],
      ["/huong-dan", "Hướng dẫn xuất dữ liệu"],
    ]) {
      await page.goto(base + p, { waitUntil: "networkidle" });
      check(await page.isVisible(`text=${expect}`), `${p} hiển thị "${expect}"`);
    }
    const rules = await (async () => { await page.goto(base + "/cam-nang/chien-thuat", { waitUntil: "networkidle" }); return page.locator("main section[id]").count(); })();
    check(rules === 11, "trang đấu pháp liệt kê đủ 11 luật");

    console.log("5. Công cụ phân tích không có trên web");
    for (const p of ["/teams", "/team?id=1", "/analysis?id=1", "/import", "/manual", "/compare/players", "/manager"]) {
      await page.goto(base + p, { waitUntil: "networkidle" });
      check(await page.isVisible("text=Tính năng này nằm trong ứng dụng Windows"), `${p} chỉ hiện hướng dẫn tải ứng dụng`);
    }

    console.log("6. Danh sách cầu thủ (bộ dữ liệu công khai)");
    await page.goto(base + "/cau-thu", { waitUntil: "networkidle" });
    await page.waitForSelector("table tbody tr td a", { timeout: 20000 });
    const total = await page.textContent("[data-testid=count]");
    check(/\d/.test(total) && !/^\s*0 \//.test(total.trim()), `bảng có dữ liệu (${total.trim()})`);
    check(await page.isVisible("text=Giá trị chuyển nhượng và lương chưa có"), "ghi rõ chưa có giá trị chuyển nhượng, không đoán số");
    const first = await page.textContent("table tbody tr:first-child td:first-child");
    await page.fill("input[placeholder^='Ví dụ']", first.slice(0, 4));
    await page.waitForFunction((n) => document.querySelector("table tbody tr td a")?.textContent.startsWith(n), first.slice(0, 4));
    await page.selectOption("select >> nth=0", "GK");
    await page.click("button:has-text('+ 34 chỉ số chi tiết')");
    check(await page.isVisible("th:has-text('Tốc độ chạy nước rút')"), "bộ cột chi tiết hiện đủ chỉ số");
    await page.fill("input[placeholder^='Ví dụ']", "");
    await page.selectOption("select >> nth=0", "");
    await page.click("table tbody tr:first-child td:first-child a");
    await page.waitForSelector("text=Tất cả chỉ số");
    check(page.url().includes("/player?id="), "bấm tên mở trang phân tích cầu thủ");
    check(await page.isVisible("text=Radar"), "trang cầu thủ có radar phân vị");
    check(!(await page.isVisible("text=Gợi ý đàm phán")), "không có nút Manager trên web");

    check(external.every((u) => u.includes("/releases/latest/download/")), "chỉ có request tải file khi bấm nút");
    check(problems.length === 0, `không có lỗi console (${problems.slice(0, 3).join(" | ") || "không"})`);
    console.log("\nE2E WEB: ĐẠT");
  } catch (e) {
    console.error("\n" + e.message);
    if (problems.length) console.error("Lỗi trình duyệt:\n" + problems.slice(0, 5).join("\n"));
    process.exitCode = 1;
  } finally {
    await browser.close();
    server.close();
  }
})();
