// CounterPick FC bản desktop: mở bản web tĩnh trong cửa sổ riêng và tự đọc thư mục xuất từ Live Editor.
const { app, BrowserWindow, Menu, dialog, ipcMain, protocol, shell } = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const { createConfig } = require("./src/config");
const { detectLiveEditor, findAutorunDir, findScriptDir, installScripts, syncScripts } = require("./src/lesetup");
const { mimeOf, resolveAppPath } = require("./src/protocol");
const { createWatcher, listCsv } = require("./src/watcher");
const { describeUnused } = require("./src/describe");

const ORIGIN = "app://counterpick";
const WEB_ROOT = process.env.COUNTERPICK_WEB_ROOT || path.join(__dirname, "app", "web");
const SCRIPTS_DIR = process.env.COUNTERPICK_SCRIPTS_DIR || path.join(__dirname, "app", "scripts");
const KNOWN_FILES = process.env.COUNTERPICK_KNOWN_FILES || path.join(__dirname, "app", "known-files.json");
const POLL_MS = Number(process.env.COUNTERPICK_POLL_MS) || 2000;
const QUIET_MS = Number(process.env.COUNTERPICK_QUIET_MS) || 5000;

if (process.env.COUNTERPICK_USER_DATA) app.setPath("userData", process.env.COUNTERPICK_USER_DATA);

// Origin cố định (không đổi theo mỗi lần chạy) để IndexedDB giữ được dữ liệu giữa các lần mở.
protocol.registerSchemesAsPrivileged([{ scheme: "app", privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } }]);

/** Danh sách file CSV mà ứng dụng dùng; thiếu file này thì theo dõi mọi CSV. */
function loadKnownFiles() {
  try {
    return new Set(JSON.parse(fs.readFileSync(KNOWN_FILES, "utf8")));
  } catch {
    return null;
  }
}
const knownFiles = loadKnownFiles();

let win = null;
let config = null;
let watcher = null;

const trusted = (event) => String(event.senderFrame?.url ?? "").startsWith(`${ORIGIN}/`);

function send(channel, payload) {
  if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
}

function stopWatching() {
  watcher?.stop();
  watcher = null;
}

function startWatching(hasData) {
  stopWatching();
  const { exportDir, imported } = config.get();
  if (!exportDir) return;
  watcher = createWatcher({
    dir: exportDir, known: hasData ? imported : {}, pollMs: POLL_MS, quietMs: QUIET_MS, only: knownFiles,
    onBatch: (batch) => send("desktop:files", batch),
  });
  watcher.start();
}

/** Nhịp tim do script xuất lặp ghi (heartbeat.txt): cho biết script còn chạy trong Live Editor không. */
function readHeartbeat(exportDir) {
  if (!exportDir) return null;
  const file = path.join(exportDir, "heartbeat.txt");
  try {
    const st = fs.statSync(file);
    const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
    return { ageSeconds: Math.max(0, Math.round((Date.now() - st.mtimeMs) / 1000)), state: (lines[1] || "").trim() || "unknown" };
  } catch {
    return null;
  }
}

/** Lần cuối script trong Live Editor xuất dữ liệu (cp_state.csv do script tự động ghi sau mỗi đợt xuất). */
function readLastExport(exportDir) {
  if (!exportDir) return null;
  try {
    return { ageSeconds: Math.max(0, Math.round((Date.now() - fs.statSync(path.join(exportDir, "cp_state.csv")).mtimeMs) / 1000)) };
  } catch {
    return null;
  }
}

// Kết quả lần tự cài script gần nhất, hiện trong giao diện để biết app đã tự làm gì.
let setupInfo = { scriptDir: null, autorunDirs: [], written: [], errors: [], detected: false };

/**
 * Tự thiết lập mà không hỏi: chọn thư mục xuất mặc định, dò Live Editor trên máy, rồi chép/cập nhật script
 * (kể cả vào thư mục autorun để Live Editor tự chạy khi mở game). Chỉ ghi file khác nội dung nên gọi nhiều lần cũng được.
 */
function autoSetup() {
  const cfg = config.get();
  const patch = {};
  if (!cfg.exportDir) patch.exportDir = path.join(app.getPath("documents"), "CounterPick FC", "exports");
  const detected = detectLiveEditor();
  if (!cfg.leDir && detected.leDir) patch.leDir = detected.leDir;
  if (Object.keys(patch).length) config.set(patch);
  const { exportDir, leDir } = config.get();
  const scriptDir = (leDir && findScriptDir(leDir)) || detected.scriptDir;
  const autorunDirs = [...new Set([leDir && findAutorunDir(leDir), ...detected.autorunDirs].filter(Boolean))];
  setupInfo = { scriptDir, autorunDirs, written: [], errors: [], detected: Boolean(detected.leDir || detected.autorunDirs.length) };
  if (!exportDir || (!scriptDir && autorunDirs.length === 0)) return setupInfo;
  const r = syncScripts({ templateDir: SCRIPTS_DIR, scriptDir, autorunDirs, exportDir });
  setupInfo.written = r.written;
  setupInfo.errors = r.errors;
  return setupInfo;
}

function state() {
  const { exportDir, leDir } = config.get();
  return {
    exportDir, leDir, csvCount: exportDir ? listCsv(exportDir, knownFiles).size : 0, watching: Boolean(watcher),
    heartbeat: readHeartbeat(exportDir), lastExport: readLastExport(exportDir),
    setup: { scriptDir: setupInfo.scriptDir, autorunDirs: setupInfo.autorunDirs, written: setupInfo.written.length, errors: setupInfo.errors },
  };
}

async function pickDir(title, defaultPath) {
  const res = await dialog.showOpenDialog(win, { title, defaultPath: defaultPath || undefined, properties: ["openDirectory", "createDirectory"] });
  return res.canceled || !res.filePaths[0] ? null : res.filePaths[0];
}

function registerIpc() {
  const handle = (channel, fn) => ipcMain.handle(channel, (event, ...args) => {
    if (!trusted(event)) throw new Error("Nguồn không được phép.");
    return fn(...args);
  });

  handle("desktop:get-state", () => state());

  handle("desktop:ready", (hasData) => {
    if (!hasData) config.set({ imported: {} });
    startWatching(hasData);
    return state();
  });

  handle("desktop:choose-export-dir", async () => {
    const dir = await pickDir("Chọn thư mục chứa file CSV xuất từ Live Editor", config.get().exportDir);
    if (dir) {
      config.set({ exportDir: dir, imported: {} });
      autoSetup(); // script đã cài phải trỏ tới thư mục xuất mới
      startWatching(false);
    }
    return state();
  });

  handle("desktop:choose-le-dir", async () => {
    const dir = await pickDir("Chọn thư mục cài đặt Live Editor", config.get().leDir);
    if (dir) {
      config.set({ leDir: dir });
      autoSetup();
    }
    return state();
  });

  handle("desktop:install-script", async () => {
    const { exportDir, leDir } = config.get();
    if (!exportDir) return { ok: false, message: "Hãy chọn thư mục xuất trước." };
    const info = autoSetup();
    let target = info.scriptDir;
    if (!target) {
      if (!leDir && info.autorunDirs.length === 0) return { ok: false, message: "Không tìm thấy Live Editor trên máy. Hãy chọn thư mục Live Editor trước." };
      target = await pickDir("Không thấy thư mục script trong Live Editor, hãy chọn thư mục để chép script vào", leDir || undefined);
      if (!target) return { ok: false, message: "Đã hủy." };
    }
    try {
      const files = installScripts({ templateDir: SCRIPTS_DIR, targetDir: target, exportDir });
      const auto = info.autorunDirs.length ? ` Script tự động cũng nằm trong thư mục autorun: ${info.autorunDirs.join(", ")}.` : "";
      return { ok: true, path: target, message: `Đã chép ${files.length} script vào ${target}: ${files.map((f) => path.basename(f.file)).join(", ")}.${auto}`, files: files.map((f) => ({ name: path.basename(f.file), note: f.note })) };
    } catch (e) {
      return { ok: false, message: `Không chép được script: ${e.message}` };
    }
  });

  handle("desktop:rescan", () => {
    watcher?.resendAll();
    watcher?.tick(Date.now(), true); // bỏ qua thời gian chờ yên lặng vì người dùng chủ động yêu cầu
    return state();
  });

  // Báo script xuất lặp (nếu đang chạy trong Live Editor) xuất toàn bộ ngay: nó thấy file này ở vòng kiểm tra kế tiếp.
  handle("desktop:request-export", () => {
    const { exportDir } = config.get();
    if (!exportDir) return { ok: false, message: "Hãy chọn thư mục xuất trước." };
    try {
      fs.writeFileSync(path.join(exportDir, "request_full.txt"), new Date().toISOString());
      return { ok: true, message: "Đã gửi yêu cầu. Nếu script xuất lặp đang chạy trong Live Editor, vài giây nữa file mới sẽ xuất hiện." };
    } catch (e) {
      return { ok: false, message: `Không ghi được file yêu cầu: ${e.message}` };
    }
  });

  // Cấu trúc các bảng chưa dùng (hợp đồng, chuyển nhượng...) để người dùng sao chép gửi đi ánh xạ cột.
  handle("desktop:describe-exports", () => {
    const { exportDir } = config.get();
    if (!exportDir) return { ok: false, count: 0, text: "Hãy chọn thư mục xuất trước." };
    return { ok: true, ...describeUnused(exportDir, knownFiles) };
  });

  handle("desktop:open-folder", () => {
    const { exportDir } = config.get();
    if (exportDir) void shell.openPath(exportDir);
  });

  ipcMain.on("desktop:ack", (event, items) => {
    if (!trusted(event) || !Array.isArray(items)) return;
    const imported = { ...config.get().imported };
    for (const it of items) if (it && it.ok && typeof it.name === "string" && typeof it.sig === "string") imported[it.name] = it.sig;
    config.set({ imported });
  });
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280, height: 860, minWidth: 900, minHeight: 600, title: "CounterPick FC", autoHideMenuBar: true, backgroundColor: "#ffffff",
    webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  win.setMenuBarVisibility(false);
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) void shell.openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith(`${ORIGIN}/`)) {
      event.preventDefault();
      if (/^https?:\/\//.test(url)) void shell.openExternal(url);
    }
  });
  win.on("closed", () => {
    stopWatching();
    win = null;
  });
  void win.loadURL(`${ORIGIN}/`);
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
  app.whenReady().then(() => {
    Menu.setApplicationMenu(null);
    config = createConfig(app.getPath("userData"));
    if (!process.env.COUNTERPICK_NO_AUTOSETUP) {
      try {
        autoSetup();
      } catch (e) {
        setupInfo = { ...setupInfo, errors: [`Tự thiết lập lỗi: ${e.message}`] };
      }
    }
    protocol.handle("app", (request) => {
      const file = resolveAppPath(WEB_ROOT, new URL(request.url).pathname);
      if (!file) {
        const notFound = resolveAppPath(WEB_ROOT, "/404");
        return new Response(notFound ? fs.readFileSync(notFound) : "Not found", { status: 404, headers: { "content-type": "text/html; charset=utf-8" } });
      }
      return new Response(fs.readFileSync(file), { headers: { "content-type": mimeOf(file) } });
    });
    registerIpc();
    createWindow();
  });
  app.on("window-all-closed", () => app.quit());
}
