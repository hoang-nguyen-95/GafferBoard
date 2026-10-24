// Chép script xuất Live Editor vào public/ để người dùng tải từ trang Nhập dữ liệu (chạy được trên cả Windows lẫn Linux).
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const dest = resolve(here, "../public/export_tables.lua");
mkdirSync(dirname(dest), { recursive: true });
copyFileSync(resolve(here, "../../tools/live_editor/export_tables.lua"), dest);
