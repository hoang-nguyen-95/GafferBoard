const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { resolveAppPath } = require("../src/protocol");
const { createWatcher } = require("../src/watcher");
const { findScriptDir, installScript, installScripts, renderScript, SCRIPTS } = require("../src/lesetup");
const { createConfig } = require("../src/config");

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "cp-desktop-"));

test("protocol: URL sạch, index, và chặn thoát khỏi thư mục gốc", () => {
  const root = tmp();
  fs.mkdirSync(path.join(root, "manual"));
  fs.writeFileSync(path.join(root, "index.html"), "home");
  fs.writeFileSync(path.join(root, "team.html"), "team");
  fs.writeFileSync(path.join(root, "manual", "index.html"), "manual");
  fs.writeFileSync(path.join(root, "manual.html"), "manual-page");
  fs.writeFileSync(path.join(path.dirname(root), "secret.txt"), "secret");
  assert.equal(resolveAppPath(root, "/"), path.join(root, "index.html"));
  assert.equal(resolveAppPath(root, "/team"), path.join(root, "team.html"));
  assert.equal(resolveAppPath(root, "/manual"), path.join(root, "manual.html"));
  assert.equal(resolveAppPath(root, "/nope"), null);
  assert.equal(resolveAppPath(root, "/../secret.txt"), null);
  assert.equal(resolveAppPath(root, "/%2e%2e/secret.txt"), null);
  assert.equal(resolveAppPath(root, "/..%5Csecret.txt"), null);
});

test("watcher: chỉ gửi file mới/đổi, sau khi yên lặng, và không gửi lại file không đổi", () => {
  const dir = tmp();
  const batches = [];
  const w = createWatcher({ dir, onBatch: (b) => batches.push(b), quietMs: 1000 });
  fs.writeFileSync(path.join(dir, "Players.CSV"), "a,b\n1,2\n");
  fs.writeFileSync(path.join(dir, "ghi-chu.txt"), "bỏ qua");
  const t0 = 1_000_000;
  w.tick(t0);               // vừa thấy file: bắt đầu đếm yên lặng
  w.tick(t0 + 500);         // chưa đủ lâu
  assert.equal(batches.length, 0);
  w.tick(t0 + 1500);
  assert.equal(batches.length, 1);
  assert.deepEqual(batches[0].map((x) => x.name), ["players.csv"]);
  assert.equal(batches[0][0].text, "a,b\n1,2\n");
  w.tick(t0 + 5000);
  w.tick(t0 + 9000);
  assert.equal(batches.length, 1, "file không đổi thì không nhập lại");

  fs.writeFileSync(path.join(dir, "players.csv"), "a,b\n1,2\n3,4\n");
  w.tick(t0 + 10_000);
  assert.equal(batches.length, 1, "vừa đổi: phải chờ yên lặng");
  w.tick(t0 + 12_000);
  assert.equal(batches.length, 2);
});

test("watcher: file đã nhập từ lần trước (known) không bị gửi lại, rescan thì gửi lại tất cả", () => {
  const dir = tmp();
  fs.writeFileSync(path.join(dir, "teams.csv"), "x\n1\n");
  const st = fs.statSync(path.join(dir, "teams.csv"));
  const sig = `${st.size}:${Math.trunc(st.mtimeMs)}`;
  const batches = [];
  const w = createWatcher({ dir, onBatch: (b) => batches.push(b), known: { "teams.csv": sig }, quietMs: 0 });
  w.tick(1);
  w.tick(2);
  assert.equal(batches.length, 0);
  w.resendAll();
  w.tick(3, true);
  assert.equal(batches.length, 1);
});

test("watcher: thư mục không tồn tại không làm hỏng gì", () => {
  const w = createWatcher({ dir: path.join(tmp(), "khong-co"), onBatch: () => assert.fail("không được gọi") });
  w.tick(1);
  assert.equal(w.count(), 0);
});

test("lesetup: điền thư mục xuất vào script, đường dẫn Windows đổi sang dấu /", () => {
  const tpl = 'local x = 1\nlocal OUT_DIR = "D:/XboxGames/fc_exports"\nprint(OUT_DIR)\n';
  assert.equal(renderScript(tpl, "E:\\Games\\fc out"), 'local x = 1\nlocal OUT_DIR = "E:/Games/fc out"\nprint(OUT_DIR)\n');
  assert.throws(() => renderScript("print(1)", "E:/x"), /OUT_DIR/);
});

test("lesetup: tìm thư mục script và chép script", () => {
  const le = tmp();
  assert.equal(findScriptDir(le), null);
  fs.mkdirSync(path.join(le, "lua", "scripts"), { recursive: true });
  assert.equal(findScriptDir(le), path.join(le, "lua", "scripts"));
  const tpl = path.join(tmp(), "t.lua");
  fs.writeFileSync(tpl, 'local OUT_DIR = "old"\n');
  const out = installScript({ templatePath: tpl, targetDir: findScriptDir(le), exportDir: path.join(tmp(), "exports") });
  assert.match(fs.readFileSync(out, "utf8"), /^local OUT_DIR = "[^"]*exports"\n$/);
});

test("config: lưu và đọc lại, file hỏng thì dùng mặc định", () => {
  const dir = tmp();
  const c = createConfig(dir);
  assert.equal(c.get().exportDir, null);
  c.set({ exportDir: "D:/x", imported: { "a.csv": "1:2" } });
  assert.deepEqual(createConfig(dir).get().imported, { "a.csv": "1:2" });
  fs.writeFileSync(path.join(dir, "config.json"), "{hỏng");
  assert.equal(createConfig(dir).get().exportDir, null);
});

test("watcher: chỉ theo dõi file trong danh sách `only`, bỏ qua bảng xuất thêm", () => {
  const dir = tmp();
  fs.writeFileSync(path.join(dir, "players.csv"), "a\n1\n");
  fs.writeFileSync(path.join(dir, "transfers.csv"), "x\n" + "1\n".repeat(1000));
  const batches = [];
  const w = createWatcher({ dir, onBatch: (b) => batches.push(b), quietMs: 0, only: new Set(["players.csv"]) });
  w.tick(1);
  w.tick(2);
  assert.deepEqual(batches.flat().map((x) => x.name), ["players.csv"]);
  assert.equal(w.count(), 1);
});

test("lesetup: cài đủ các script, mỗi script đã điền thư mục xuất", () => {
  const live = path.resolve(__dirname, "../../tools/live_editor");
  const target = tmp();
  const exportDir = path.join(tmp(), "exp ort");
  const done = installScripts({ templateDir: live, targetDir: target, exportDir });
  assert.deepEqual(done.map((d) => path.basename(d.file)), SCRIPTS.map((s) => s.target));
  for (const d of done) {
    const text = fs.readFileSync(d.file, "utf8");
    assert.ok(text.includes(`local OUT_DIR = "${exportDir.replace(/\\/g, "/")}"`), `${path.basename(d.file)} chưa điền thư mục xuất`);
    assert.ok(!text.includes("D:/XboxGames/fc_exports"), "không được còn đường dẫn mẫu");
  }
});

test("describe: chỉ báo cáo bảng chưa dùng, đủ cột, dòng mẫu và số dòng", () => {
  const { describeUnused, splitCsvLine } = require("../src/describe");
  assert.deepEqual(splitCsvLine('a,"b,c","d""e",'), ["a", "b,c", 'd"e', ""]);
  const dir = tmp();
  fs.writeFileSync(path.join(dir, "players.csv"), "playerid,overall\n1,80\n");
  fs.writeFileSync(path.join(dir, "Career_PlayerContract.csv"), "﻿playerid,teamid,wage,note\n10,1,50000,\"x, y\"\n11,1,75000,z\n12,2,1000,w\n13,2,2000,v\n");
  fs.writeFileSync(path.join(dir, "notes.txt"), "bỏ qua");
  const { count, text } = describeUnused(dir, new Set(["players.csv"]));
  assert.equal(count, 1);
  assert.match(text, /## Career_PlayerContract\.csv {2}\(4 dòng\)/);
  assert.match(text, /Cột \(4\): playerid, teamid, wage, note/);
  assert.match(text, /Mẫu 1: playerid=10 \| teamid=1 \| wage=50000 \| note=x, y/);
  assert.match(text, /Mẫu 3: playerid=12/);
  assert.doesNotMatch(text, /players\.csv/);
  assert.match(text, /Không thấy export_log\.txt: script xuất đã chạy là bản cũ/);
  fs.writeFileSync(path.join(dir, "export_log.txt"), "2026-10-25 14:42:00 Bat dau: counterpick_export v3\n2026-10-25 14:42:01 LOI khi xuat career_transferblock: boom\n");
  const withLog = describeUnused(dir, new Set(["players.csv"])).text;
  assert.match(withLog, /NHẬT KÝ SCRIPT XUẤT \(export_log\.txt, 2 dòng\)/);
  assert.match(withLog, /LOI khi xuat career_transferblock: boom/);
  assert.match(describeUnused(dir, new Set(["players.csv", "career_playercontract.csv"])).text, /Không có file nào chưa dùng/);
  assert.match(describeUnused(path.join(dir, "khong-co")).text, /Không đọc được thư mục/);
});
