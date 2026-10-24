// Mã vị trí của game và vai trò (khớp backend/app/services/positions.py).
export const POSITION_NAMES: Record<number, string> = {
  0: "GK", 1: "SW", 2: "RWB", 3: "RB", 4: "RCB", 5: "CB", 6: "LCB", 7: "LB", 8: "LWB",
  9: "RDM", 10: "CDM", 11: "LDM", 12: "RM", 13: "RCM", 14: "CM", 15: "LCM", 16: "LM",
  17: "RAM", 18: "CAM", 19: "LAM", 20: "RF", 21: "CF", 22: "LF", 23: "RW", 24: "RS",
  25: "ST", 26: "LS", 27: "LW",
};

export type Role = "GK" | "CB" | "FB" | "DM" | "CM" | "WM" | "AM" | "W" | "ST";
export type Line = "GK" | "DEF" | "MID" | "ATT";

export const ROLE_POSITIONS: Record<Role, number[]> = {
  GK: [0], CB: [1, 4, 5, 6], FB: [2, 3, 7, 8], DM: [9, 10, 11], CM: [13, 14, 15], WM: [12, 16],
  AM: [17, 18, 19], W: [23, 27], ST: [20, 21, 22, 24, 25, 26],
};
export const ROLE_LABELS_VI: Record<Role, string> = {
  GK: "Thủ môn", CB: "Trung vệ", FB: "Hậu vệ biên", DM: "Tiền vệ phòng ngự", CM: "Tiền vệ trung tâm",
  WM: "Tiền vệ cánh", AM: "Tiền vệ tấn công", W: "Tiền đạo cánh", ST: "Tiền đạo cắm",
};
export const LINE_OF_ROLE: Record<Role, Line> = {
  GK: "GK", CB: "DEF", FB: "DEF", DM: "MID", CM: "MID", WM: "MID", AM: "MID", W: "ATT", ST: "ATT",
};
export const LINE_LABELS_VI: Record<Line, string> = { GK: "Thủ môn", DEF: "Hàng thủ", MID: "Tiền vệ", ATT: "Hàng công" };
export const LINES: Line[] = ["GK", "DEF", "MID", "ATT"];

const ROLE_BY_POSITION = new Map<number, Role>();
for (const [role, codes] of Object.entries(ROLE_POSITIONS) as [Role, number[]][]) for (const c of codes) ROLE_BY_POSITION.set(c, role);

const FAMILIES = [[4, 5, 6], [9, 10, 11], [13, 14, 15], [17, 18, 19], [20, 21, 22, 24, 25, 26]];
export function sameFamily(a: number | null, b: number | null): boolean {
  return a !== null && b !== null && FAMILIES.some((f) => f.includes(a) && f.includes(b));
}

export const positionName = (code: number | null): string => (code === null ? "?" : POSITION_NAMES[code] ?? "?");
export const roleOfPosition = (code: number | null): Role | null => (code === null ? null : ROLE_BY_POSITION.get(code) ?? null);
export function lineOfPosition(code: number | null): Line | null {
  const role = roleOfPosition(code);
  return role ? LINE_OF_ROLE[role] : null;
}

/** Vai trò chính theo vị trí ưa thích đầu tiên; mặc định tiền vệ trung tâm. */
export function roleOfPlayer(positions: number[], primary: number | null = null): Role {
  for (const code of [...(primary !== null ? [primary] : []), ...positions]) {
    const role = roleOfPosition(code);
    if (role) return role;
  }
  return "CM";
}
