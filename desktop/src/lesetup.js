// Cài script xuất vào thư mục script của Live Editor, đã điền sẵn thư mục xuất (khỏi sửa OUT_DIR bằng tay).
const fs = require("node:fs");
const path = require("node:path");

const SCRIPT_DIR_CANDIDATES = ["lua/scripts", "Lua/Scripts", "lua/Scripts", "scripts", "Scripts", "lua", "Lua"];
const OUT_DIR_LINE = /^(\s*local\s+OUT_DIR\s*=\s*)"[^"\n]*"/m;

/** Thư mục script của Live Editor nằm trong `leDir`, hoặc null nếu không thấy chỗ nào hợp lý. */
function findScriptDir(leDir) {
  for (const rel of SCRIPT_DIR_CANDIDATES) {
    const full = path.join(leDir, rel);
    try {
      if (fs.statSync(full).isDirectory()) return full;
    } catch {
      /* thử tiếp */
    }
  }
  return null;
}

function renderScript(template, exportDir) {
  if (!OUT_DIR_LINE.test(template)) throw new Error("Script xuất không có dòng `local OUT_DIR = \"...\"` để điền thư mục.");
  const lua = exportDir.replace(/\\/g, "/").replace(/"/g, "");
  return template.replace(OUT_DIR_LINE, `$1"${lua}"`);
}

/** Ghi script đã điền thư mục xuất vào `targetDir`; trả về đường dẫn file. */
function installScript({ templatePath, targetDir, exportDir, fileName = "counterpick_export.lua" }) {
  const rendered = renderScript(fs.readFileSync(templatePath, "utf8"), exportDir);
  fs.mkdirSync(exportDir, { recursive: true });
  const out = path.join(targetDir, fileName);
  fs.writeFileSync(out, rendered, "utf8");
  return out;
}

/** Các script được cài: tên file trong Live Editor <- tên file mẫu trong thư mục mẫu. */
const SCRIPTS = [
  { target: "counterpick_export.lua", source: "export_tables.lua", note: "xuất một lần (chạy tay)" },
  { target: "counterpick_probe_loop.lua", source: "probe_loop.lua", note: "chạy thử vòng lặp (nên chạy trước)" },
  { target: "counterpick_export_loop.lua", source: "export_loop.lua", note: "xuất lặp lại tự động (thử nghiệm)" },
];

/** Cài toàn bộ script vào `targetDir`, mỗi script đã điền thư mục xuất. Trả về [{file, note}]. */
function installScripts({ templateDir, targetDir, exportDir }) {
  return SCRIPTS.map((s) => ({
    file: installScript({ templatePath: path.join(templateDir, s.source), targetDir, exportDir, fileName: s.target }),
    note: s.note,
  }));
}

module.exports = { findScriptDir, renderScript, installScript, installScripts, SCRIPTS };
