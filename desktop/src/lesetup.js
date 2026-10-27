// Cài script xuất vào Live Editor, đã điền sẵn thư mục xuất (khỏi sửa OUT_DIR bằng tay), và tự tìm Live Editor trên máy.
const fs = require("node:fs");
const path = require("node:path");

const SCRIPT_DIR_CANDIDATES = ["lua/scripts", "Lua/Scripts", "lua/Scripts", "scripts", "Scripts", "lua", "Lua"];
const AUTORUN_DIR_CANDIDATES = ["lua/autorun", "Lua/Autorun", "lua/Autorun"];
const OUT_DIR_LINE = /^(\s*local\s+OUT_DIR\s*=\s*)"[^"\n]*"/m;
// Tên thư mục Live Editor hay gặp: "FC 26 Live Editor", "FC 26 LE v26.3.6", "FC26 LiveEditor"...
const LE_FOLDER_NAME = /(live[ _-]?editor|\bFC ?\d+ ?[_ -]?LE\b)/i;

const isDir = (p) => {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
};
const mtime = (p) => {
  try {
    return fs.statSync(p).mtimeMs;
  } catch {
    return 0;
  }
};

/** Thư mục script của Live Editor nằm trong `leDir`, hoặc null nếu không thấy chỗ nào hợp lý. */
function findScriptDir(leDir) {
  for (const rel of SCRIPT_DIR_CANDIDATES) {
    const full = path.join(leDir, rel);
    if (isDir(full)) return full;
  }
  return null;
}

/** Thư mục autorun (script trong đó tự chạy khi mở game) nằm trong `leDir`, hoặc null. */
function findAutorunDir(leDir) {
  for (const rel of AUTORUN_DIR_CANDIDATES) {
    const full = path.join(leDir, rel);
    if (isDir(full)) return full;
  }
  return null;
}

/** Gốc để dò Live Editor: gốc từng ổ đĩa và vài thư mục game hay dùng. */
function defaultRoots() {
  const roots = [];
  if (process.platform === "win32") {
    for (let c = 67; c <= 90; c++) {
      const drive = `${String.fromCharCode(c)}:\\`;
      if (!isDir(drive)) continue;
      roots.push(drive);
      for (const sub of ["XboxGames", "Games", "Game", "Program Files", "Program Files (x86)"]) roots.push(path.join(drive, sub));
    }
  }
  return roots;
}

/**
 * Tìm Live Editor trên máy. Live Editor thường có hai thư mục: nơi chạy (có `lua/scripts`, `FCLiveEditor.DLL`) và nơi dữ liệu
 * (có `lua/autorun`). Trả về `{ leDir, scriptDir, autorunDirs }`; thư mục nào không thấy thì null / rỗng.
 */
function detectLiveEditor(roots = defaultRoots()) {
  const found = [];
  for (const root of roots) {
    let entries = [];
    try {
      entries = fs.readdirSync(root, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      if (!e.isDirectory() || !LE_FOLDER_NAME.test(e.name)) continue;
      const dir = path.join(root, e.name);
      found.push({ dir, scriptDir: findScriptDir(dir), autorunDir: findAutorunDir(dir),
        rank: Math.max(mtime(path.join(dir, "FCLiveEditor.DLL")), mtime(path.join(dir, "Launcher.exe"))) });
    }
  }
  // bản chạy mới nhất (DLL mới nhất) trước; chỉ nhận thư mục script nằm trong thư mục có Launcher/DLL hoặc tên "lua/scripts" đúng chuẩn
  const withScripts = found.filter((f) => f.scriptDir && /[\\/]scripts$/i.test(f.scriptDir)).sort((a, b) => b.rank - a.rank);
  const best = withScripts[0] ?? null;
  const autorunDirs = [...new Set(found.filter((f) => f.autorunDir).map((f) => f.autorunDir))];
  return { leDir: best?.dir ?? null, scriptDir: best?.scriptDir ?? null, autorunDirs };
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

/** Các script được cài: tên file trong Live Editor <- tên file mẫu trong thư mục mẫu. `autorun`: cũng chép vào thư mục autorun. */
const SCRIPTS = [
  { target: "counterpick_auto.lua", source: "auto_export.lua", note: "tự xuất theo sự kiện khi chơi (khuyên dùng, tự chạy khi mở game)", autorun: true },
  { target: "counterpick_export.lua", source: "export_tables.lua", note: "xuất một lần (chạy tay)" },
  { target: "counterpick_probe_loop.lua", source: "probe_loop.lua", note: "chạy thử vòng lặp (không bắt buộc)" },
  { target: "counterpick_export_loop.lua", source: "export_loop.lua", note: "xuất lặp bằng Sleep (thay bằng bản tự động ở trên)" },
];

/** Cài toàn bộ script vào `targetDir`, mỗi script đã điền thư mục xuất. Trả về [{file, note}]. */
function installScripts({ templateDir, targetDir, exportDir }) {
  return SCRIPTS.map((s) => ({
    file: installScript({ templatePath: path.join(templateDir, s.source), targetDir, exportDir, fileName: s.target }),
    note: s.note,
  }));
}

/**
 * Đồng bộ script vào Live Editor mà không hỏi gì: chỉ ghi file khác nội dung đã có, nên chạy mỗi lần mở app cũng không sao.
 * Trả về { written: [đường dẫn đã ghi], checked: số file đã xét, errors: [thông báo] }.
 */
function syncScripts({ templateDir, scriptDir, autorunDirs = [], exportDir }) {
  const result = { written: [], checked: 0, errors: [] };
  const targets = [];
  for (const s of SCRIPTS) {
    if (scriptDir) targets.push({ s, dir: scriptDir });
    if (s.autorun) for (const d of autorunDirs) targets.push({ s, dir: d });
  }
  for (const { s, dir } of targets) {
    result.checked++;
    try {
      const rendered = renderScript(fs.readFileSync(path.join(templateDir, s.source), "utf8"), exportDir);
      const out = path.join(dir, s.target);
      let current = null;
      try {
        current = fs.readFileSync(out, "utf8");
      } catch {
        /* chưa có */
      }
      if (current !== rendered) {
        fs.mkdirSync(exportDir, { recursive: true });
        fs.writeFileSync(out, rendered, "utf8");
        result.written.push(out);
      }
    } catch (e) {
      result.errors.push(`${path.join(dir, s.target)}: ${e.message}`);
    }
  }
  return result;
}

module.exports = {
  findScriptDir, findAutorunDir, detectLiveEditor, renderScript, installScript, installScripts, syncScripts, SCRIPTS,
};
