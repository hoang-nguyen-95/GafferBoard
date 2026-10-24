// CounterPick FC bản desktop: mở bản web tĩnh trong cửa sổ riêng và tự đọc thư mục xuất từ Live Editor.
const { app, BrowserWindow, Menu, dialog, ipcMain, protocol, shell } = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const { createConfig } = require("./src/config");
const { findScriptDir, installScript } = require("./src/lesetup");
const { mimeOf, resolveAppPath } = require("./src/protocol");
const { createWatcher, listCsv } = require("./src/watcher");

const ORIGIN = "app://counterpick";
const WEB_ROOT = process.env.COUNTERPICK_WEB_ROOT || path.join(__dirname, "app", "web");
const SCRIPT_TEMPLATE = process.env.COUNTERPICK_SCRIPT || path.join(__dirname, "app", "export_tables.lua");
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

function state() {
  const { exportDir, leDir } = config.get();
  return { exportDir, leDir, csvCount: exportDir ? listCsv(exportDir, knownFiles).size : 0, watching: Boolean(watcher) };
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
      startWatching(false);
    }
    return state();
  });

  handle("desktop:choose-le-dir", async () => {
    const dir = await pickDir("Chọn thư mục cài đặt Live Editor", config.get().leDir);
    if (dir) config.set({ leDir: dir });
    return state();
  });

  handle("desktop:install-script", async () => {
    const { exportDir, leDir } = config.get();
    if (!exportDir) return { ok: false, message: "Hãy chọn thư mục xuất trước." };
    if (!leDir) return { ok: false, message: "Hãy chọn thư mục Live Editor trước." };
    let target = findScriptDir(leDir);
    if (!target) {
      target = await pickDir("Không thấy thư mục script trong Live Editor, hãy chọn thư mục để chép script vào", leDir);
      if (!target) return { ok: false, message: "Đã hủy." };
    }
    try {
      const file = installScript({ templatePath: SCRIPT_TEMPLATE, targetDir: target, exportDir });
      return { ok: true, path: file, message: `Đã chép script vào ${file}` };
    } catch (e) {
      return { ok: false, message: `Không chép được script: ${e.message}` };
    }
  });

  handle("desktop:rescan", () => {
    watcher?.resendAll();
    watcher?.tick(Date.now(), true); // bỏ qua thời gian chờ yên lặng vì người dùng chủ động yêu cầu
    return state();
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
