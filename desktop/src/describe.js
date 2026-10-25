// Báo cáo cấu trúc các bảng CSV mà ứng dụng CHƯA dùng (hợp đồng, chuyển nhượng, tuyển trạch...): tên cột, số dòng, vài dòng mẫu.
// Người dùng sao chép báo cáo gửi cho nhà phát triển để ánh xạ cột (lương, giá trị...) mà không phải tự mở từng file.
const fs = require("node:fs");
const path = require("node:path");

const SAMPLE_BYTES = 256 * 1024;
const COUNT_LIMIT = 50 * 1024 * 1024;
const CELL_MAX = 40;

/** Tách một dòng CSV (hỗ trợ ô có dấu ngoặc kép và dấu phẩy bên trong). */
function splitCsvLine(line) {
  const out = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

const clip = (s) => (s.length > CELL_MAX ? `${s.slice(0, CELL_MAX - 1)}…` : s);

function countLines(file, size) {
  if (size > COUNT_LIMIT) return null;
  const buf = fs.readFileSync(file);
  let n = 0;
  for (let i = 0; i < buf.length; i++) if (buf[i] === 10) n++;
  return Math.max(0, n - 1); // trừ dòng tiêu đề
}

/** Mô tả một file CSV: { name, rows, columns, samples }. */
function describeCsv(file) {
  const st = fs.statSync(file);
  const fd = fs.openSync(file, "r");
  let head;
  try {
    const buf = Buffer.alloc(Math.min(st.size, SAMPLE_BYTES));
    fs.readSync(fd, buf, 0, buf.length, 0);
    head = buf.toString("utf8").replace(/^﻿/, "");
  } finally {
    fs.closeSync(fd);
  }
  const lines = head.split(/\r?\n/).filter((l, i) => l.length > 0 || i === 0);
  const columns = splitCsvLine(lines[0] ?? "").map((c) => c.trim());
  // Bỏ dòng cuối nếu đọc bị cắt giữa chừng (file lớn hơn vùng đọc)
  const body = st.size > SAMPLE_BYTES ? lines.slice(1, -1) : lines.slice(1);
  return { name: path.basename(file), size: st.size, rows: countLines(file, st.size), columns, samples: body.slice(0, 3).map((l) => splitCsvLine(l)) };
}

/**
 * Báo cáo mọi CSV trong `dir` không nằm trong `known` (Set tên chữ thường; null = coi tất cả là chưa dùng).
 * Trả về { count, text }.
 */
function describeUnused(dir, known = null) {
  let names;
  try {
    names = fs.readdirSync(dir).filter((n) => n.toLowerCase().endsWith(".csv")).sort();
  } catch (e) {
    return { count: 0, text: `Không đọc được thư mục: ${e.message}` };
  }
  const unused = names.filter((n) => !known || !known.has(n.toLowerCase()));
  const parts = [`CÁC BẢNG CHƯA DÙNG (${unused.length}/${names.length} file CSV trong thư mục xuất)`];
  for (const n of unused) {
    try {
      const d = describeCsv(path.join(dir, n));
      parts.push("", `## ${d.name}  (${d.rows ?? "nhiều"} dòng)`, `Cột (${d.columns.length}): ${d.columns.join(", ")}`);
      d.samples.forEach((row, i) => parts.push(`Mẫu ${i + 1}: ${d.columns.map((c, j) => `${c}=${clip(row[j] ?? "")}`).join(" | ")}`));
    } catch (e) {
      parts.push("", `## ${n}`, `Không đọc được: ${e.message}`);
    }
  }
  if (unused.length === 0) parts.push("", "Không có file nào chưa dùng. Hãy chạy lại script xuất (counterpick_export.lua) để có thêm các bảng hợp đồng/chuyển nhượng.");
  return { count: unused.length, text: parts.join("\n") };
}

module.exports = { describeCsv, describeUnused, splitCsvLine };
