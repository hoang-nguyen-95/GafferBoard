// Theo dõi thư mục xuất bằng cách quét định kỳ (đáng tin hơn fs.watch trên ổ mạng/ổ ngoài và giữa các hệ điều hành).
// Một file chỉ được coi là "mới" khi chữ ký (kích thước + thời điểm sửa) khác lần đã gửi VÀ đã yên lặng đủ lâu,
// tránh đọc file khi script Lua còn đang ghi dở.
const fs = require("node:fs");
const path = require("node:path");

const signatureOf = (st) => `${st.size}:${Math.trunc(st.mtimeMs)}`;

function listCsv(dir) {
  const out = new Map();
  let names;
  try {
    names = fs.readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of names) {
    if (!name.toLowerCase().endsWith(".csv")) continue;
    try {
      const st = fs.statSync(path.join(dir, name));
      if (st.isFile()) out.set(name.toLowerCase(), { file: path.join(dir, name), sig: signatureOf(st) });
    } catch {
      /* file biến mất giữa chừng: bỏ qua */
    }
  }
  return out;
}

/**
 * @param {object} o
 * @param {string} o.dir thư mục cần theo dõi
 * @param {(batch: {name: string, sig: string, text: string}[]) => void} o.onBatch
 * @param {Record<string, string>} [o.known] chữ ký các file đã nhập trước đó (tên chữ thường -> chữ ký)
 * @param {number} [o.pollMs] chu kỳ quét
 * @param {number} [o.quietMs] thời gian file phải không đổi trước khi đọc
 */
function createWatcher({ dir, onBatch, known = {}, pollMs = 2000, quietMs = 3000 }) {
  const delivered = new Map(Object.entries(known));
  let last = new Map(); // chữ ký ở lần quét trước
  let stableSince = 0;
  let timer = null;
  let forceAll = false;

  function pending(current) {
    return [...current].filter(([name, f]) => forceAll || delivered.get(name) !== f.sig);
  }

  function tick(now = Date.now(), force = false) {
    const current = listCsv(dir);
    const changedSinceLastScan = current.size !== last.size || [...current].some(([n, f]) => last.get(n)?.sig !== f.sig);
    if (changedSinceLastScan) stableSince = now;
    last = current;
    const todo = pending(current);
    if (!todo.length || (!force && now - stableSince < quietMs)) return;
    const batch = [];
    for (const [name, f] of todo) {
      try {
        batch.push({ name, sig: f.sig, text: fs.readFileSync(f.file, "utf8") });
      } catch {
        return; // đang bị khóa/ghi dở: thử lại ở lần quét sau
      }
    }
    forceAll = false;
    for (const b of batch) delivered.set(b.name, b.sig);
    onBatch(batch);
  }

  return {
    start() {
      if (timer) return;
      stableSince = Date.now();
      timer = setInterval(() => tick(), pollMs);
      timer.unref?.();
    },
    stop() {
      clearInterval(timer);
      timer = null;
    },
    tick,
    /** Gửi lại toàn bộ file (vd khi dữ liệu trong ứng dụng đã bị xóa). */
    resendAll() {
      forceAll = true;
    },
    /** Đánh dấu một file là chưa nhập được để lần quét sau thử lại. */
    forget(name) {
      delivered.delete(name);
    },
    count: () => listCsv(dir).size,
  };
}

module.exports = { createWatcher, listCsv };
