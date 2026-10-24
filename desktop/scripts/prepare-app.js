// Gom bản web tĩnh (frontend/out) và script xuất vào desktop/app để đóng gói.
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const web = path.join(root, "frontend", "out");
const dest = path.resolve(__dirname, "../app");

if (!fs.existsSync(path.join(web, "index.html"))) {
  console.error("Chưa có frontend/out. Chạy trước: cd frontend && npm ci && npm run build");
  process.exit(1);
}
fs.rmSync(dest, { recursive: true, force: true });
fs.mkdirSync(dest, { recursive: true });
fs.cpSync(web, path.join(dest, "web"), { recursive: true });
fs.copyFileSync(path.join(root, "tools", "live_editor", "export_tables.lua"), path.join(dest, "export_tables.lua"));
console.log("Đã chuẩn bị desktop/app từ", web);
