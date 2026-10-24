// Tiện ích dùng chung của engine. Nhiều hàm tái hiện chính xác hành vi Python để bản web cho kết quả y hệt bản local.

/**
 * round(x, nd) của Python: làm tròn theo giá trị thập phân CHÍNH XÁC của số thực nhị phân, các trường hợp đúng
 * một nửa làm tròn về số chẵn (Math.round của JS làm tròn lên, nên cho kết quả khác).
 */
export function pyRound(x: number, nd = 0): number {
  if (!Number.isFinite(x) || x === 0) return x;
  const neg = x < 0;
  const s = Math.abs(x).toFixed(Math.min(100, nd + 60)); // đủ chữ số để thấy phần dư chính xác
  const [intPart, fracRaw = ""] = s.split(".");
  const frac = fracRaw.padEnd(nd + 1, "0");
  let kept = BigInt(intPart + frac.slice(0, nd));
  const next = frac[nd];
  const rest = frac.slice(nd + 1);
  const restNonZero = /[1-9]/.test(rest);
  if (next > "5" || (next === "5" && restNonZero)) kept += 1n;
  else if (next === "5" && !restNonZero && kept % 2n === 1n) kept += 1n; // đúng một nửa: về số chẵn
  const result = Number(`${kept}e-${nd}`);
  return neg ? -result : result;
}

/** str(float) của Python: số nguyên vẫn có ".0" (vd 72.0). Chỉ dùng cho giá trị mà Python giữ kiểu float. */
export function pyFloat(x: number): string {
  const s = String(x);
  return Number.isInteger(x) && !s.includes("e") ? `${s}.0` : s;
}

/** f"{x:+d}"/"{x:+g}" của Python cho số nguyên/thực: luôn có dấu. */
export function signed(x: number, digits = 1): string {
  const v = pyRound(x, digits);
  const text = Number.isInteger(v) ? String(v) : String(v);
  return v >= 0 ? `+${text}` : text;
}

/** Python `f"{x:g}"` đủ dùng cho điểm phạt (số nguyên hoặc thực ngắn). */
export function fmtG(x: number): string {
  return String(x);
}

const EXTRA_FOLD: Record<string, string> = {
  "ð": "d", "Ð": "d", "þ": "th", "Þ": "th", "ø": "o", "Ø": "o", "æ": "ae", "Æ": "ae",
  "œ": "oe", "Œ": "oe", "ß": "ss", "đ": "d", "Đ": "d", "ł": "l", "Ł": "l", "ı": "i",
};

/** Chữ thường, bỏ dấu, gộp khoảng trắng (khớp fold_text của backend). */
export function foldText(text: string): string {
  let replaced = "";
  for (const ch of text) replaced += EXTRA_FOLD[ch] ?? ch;
  const stripped = replaced.normalize("NFKD").replace(/[̀-ͯ]/g, "");
  return stripped.toLowerCase().split(/\s+/).filter(Boolean).join(" ");
}

export function displayName(first: string, last: string, common: string): string {
  return common.trim() || [first.trim(), last.trim()].filter(Boolean).join(" ");
}

export function searchKey(...parts: string[]): string {
  const tokens = foldText(parts.join(" ")).split(" ").filter(Boolean);
  return [...new Set(tokens)].join(" ");
}

/** LIKE '%q%' của SQLite: không phân biệt hoa thường CHỈ với ASCII. */
export function likeContains(text: string, q: string): boolean {
  const lower = (v: string) => v.replace(/[A-Z]/g, (c) => c.toLowerCase());
  return lower(text).includes(lower(q));
}

/** Phân vị 0..100 (nửa số bằng nhau tính một nửa), khớp percentile() của backend. */
export function percentile(sorted: number[], value: number): number {
  if (sorted.length === 0) return 50.0;
  let lo = 0, hi = sorted.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (sorted[m] < value) lo = m + 1; else hi = m; }
  const below = lo;
  hi = sorted.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (sorted[m] <= value) lo = m + 1; else hi = m; }
  const equal = lo - below;
  return pyRound((100.0 * (below + equal / 2)) / sorted.length, 1);
}

/**
 * sum() của Python ≥ 3.12: số nguyên cộng chính xác; khi có số thực thì cộng bù sai số (Neumaier) nên kết quả
 * có thể khác phép cộng tuần tự của JS ở bit cuối. Dùng hàm này ở mọi nơi Python gọi sum() trên số thực.
 */
export function pySum(values: number[]): number {
  let total = 0;
  let comp = 0;
  for (const x of values) {
    const t = total + x;
    if (Math.abs(total) >= Math.abs(x)) comp += total - t + x;
    else comp += x - t + total;
    total = t;
  }
  return comp !== 0 && Number.isFinite(comp) ? total + comp : total;
}

export function avg(values: Array<number | null | undefined>): number | null {
  const vals = values.filter((v): v is number => v !== null && v !== undefined);
  return vals.length ? pyRound(pySum(vals) / vals.length, 1) : null;
}

export const sum = pySum;

/** Số ngày kể từ 1582-10-14 -> "YYYY-MM-DD". */
const GAME_EPOCH_MS = Date.UTC(1582, 9, 14);
export function daysToDate(n: number): string {
  return new Date(GAME_EPOCH_MS + n * 86400000).toISOString().slice(0, 10);
}

export function ageOn(birth: string | null, ref: string): number | null {
  if (!birth) return null;
  const [by, bm, bd] = birth.split("-").map(Number);
  const [ry, rm, rd] = ref.split("-").map(Number);
  return ry - by - (rm < bm || (rm === bm && rd < bd) ? 1 : 0);
}

/** Đọc CSV (RFC 4180): ngoặc kép, "" thoát, xuống dòng trong ô. Bỏ BOM. */
export function parseCsv(text: string): { header: string[]; rows: string[][] } {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const n = text.length;
  for (let i = 0; i < n; i++) {
    const c = text.charCodeAt(i);
    if (inQuotes) {
      if (c === 34) {
        if (text.charCodeAt(i + 1) === 34) { field += '"'; i++; } else inQuotes = false;
      } else field += text[i];
    } else if (c === 34) inQuotes = true;
    else if (c === 44) { row.push(field); field = ""; }
    else if (c === 10 || c === 13) {
      if (c === 13 && text.charCodeAt(i + 1) === 10) i++;
      row.push(field); field = "";
      rows.push(row); row = [];
    } else field += text[i];
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  const header = rows.shift() ?? [];
  return { header, rows: rows.filter((r) => !(r.length === 1 && r[0] === "")) };
}

let lastStamp = 0;
/** Thời điểm hiện tại (ISO) luôn tăng ngặt, để thứ tự "mới cập nhật trước" giống bản Python (độ phân giải micro giây). */
export function nowIso(): string {
  lastStamp = Math.max(Date.now(), lastStamp + 1);
  return new Date(lastStamp).toISOString();
}

/** f"{x:+.1f}" của Python. */
export function signed1(x: number): string {
  const r = pyRound(x, 1);
  return `${x < 0 || Object.is(r, -0) ? "-" : "+"}${Math.abs(r).toFixed(1)}`;
}
