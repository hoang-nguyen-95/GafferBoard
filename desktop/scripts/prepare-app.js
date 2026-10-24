// Gom giao diện bản desktop (frontend/out, build bằng `npm run build:desktop`) và script xuất vào desktop/app để đóng gói.
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const web = path.join(root, "frontend", "out");
const dest = path.resolve(__dirname, "../app");

if (!fs.existsSync(path.join(web, "index.html"))) {
  console.error("Chưa có frontend/out. Chạy trước: cd frontend && npm ci && npm run build:desktop");
  process.exit(1);
}
fs.rmSync(dest, { recursive: true, force: true });
fs.mkdirSync(dest, { recursive: true });
fs.cpSync(web, path.join(dest, "web"), { recursive: true });
// Bộ dữ liệu cầu thủ công khai (~5 MB) chỉ dành cho trang web; ứng dụng đọc dữ liệu save của người dùng nên không đóng gói file này.
fs.rmSync(path.join(dest, "web", "data", "players.json"), { force: true });
fs.mkdirSync(path.join(dest, "scripts"), { recursive: true });
for (const f of ["export_tables.lua", "probe_loop.lua", "export_loop.lua"]) {
  fs.copyFileSync(path.join(root, "tools", "live_editor", f), path.join(dest, "scripts", f));
}
// Danh sách file CSV mà bộ nhập thật sự dùng (từ mapping của engine): phần còn lại trong thư mục xuất bị bỏ qua.
const mapping = JSON.parse(fs.readFileSync(path.join(root, "frontend", "src", "engine", "data", "mapping.json"), "utf8"));
const known = new Set(Object.values(mapping.tables).map((t) => t.file.toLowerCase()));
if (mapping.names) {
  known.add(mapping.names.names_file.toLowerCase());
  for (const f of mapping.names.extra_names_files ?? []) known.add(f.toLowerCase());
  known.add(mapping.names.edited_file.toLowerCase());
}
if (mapping.lineups) {
  known.add(mapping.lineups.teamsheets_file.toLowerCase());
  known.add(mapping.lineups.formations_file.toLowerCase());
}
fs.writeFileSync(path.join(dest, "known-files.json"), JSON.stringify([...known].sort(), null, 2));
console.log("Đã chuẩn bị desktop/app từ", web, `(${known.size} file CSV được dùng)`);
