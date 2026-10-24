// Chép script xuất Live Editor vào public/ để người dùng tải từ trang Hướng dẫn (chạy được trên cả Windows lẫn Linux).
// Bản đã chép được commit sẵn trong public/: nếu build chạy ở nơi không thấy thư mục tools/ (vd Vercel với Root Directory = frontend
// mà tắt "Include source files outside of the Root Directory") thì giữ nguyên bản đó thay vì làm hỏng build.
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const source = resolve(here, "../../tools/live_editor/export_tables.lua");
const dest = resolve(here, "../public/export_tables.lua");

if (existsSync(source)) {
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(source, dest);
} else if (existsSync(dest)) {
  console.warn("sync-assets: không thấy tools/live_editor, dùng bản đã commit trong public/");
} else {
  console.error("sync-assets: thiếu cả tools/live_editor/export_tables.lua lẫn public/export_tables.lua");
  process.exit(1);
}
