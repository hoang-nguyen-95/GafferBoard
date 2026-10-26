// Nhập tiền nhanh: "35m", "35tr", "1,2 tỷ", "500k", "35.000.000" đều được. Trả null nếu không đọc được.
const SUFFIX: [RegExp, number][] = [
  [/(?:ty|tỷ|b)$/i, 1e9], [/(?:tr|triệu|trieu|m)$/i, 1e6], [/(?:k|nghìn|nghin|ngàn|ngan)$/i, 1e3],
];

export function parseMoney(text: string): number | null {
  const raw = text.trim().replace(/\s+/g, "");
  if (!raw) return null;
  let mult = 1;
  let body = raw;
  for (const [re, m] of SUFFIX) {
    if (re.test(raw)) { mult = m; body = raw.replace(re, ""); break; }
  }
  if (!/^\d[\d.,]*$/.test(body)) return null;
  let n: number;
  if (mult === 1) {
    // không có hậu tố: dấu chấm/phẩy là ngăn cách hàng nghìn (35.000.000, 35,000,000) hoặc thập phân (35.5)
    if (/^\d{1,3}([.,]\d{3})+$/.test(body)) n = Number(body.replace(/[.,]/g, ""));
    else n = Number(body.replace(",", "."));
  } else {
    n = Number(body.replace(",", "."));
  }
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * mult);
}
