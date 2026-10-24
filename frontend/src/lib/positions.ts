// Tọa độ vẽ vị trí trên sân (x: trái→phải, y: trên=tấn công → dưới=thủ môn), theo mã vị trí của game.
export const PITCH_COORDS: Record<number, [number, number]> = {
  0: [50, 91],
  1: [50, 83],
  2: [91, 64], 3: [85, 73], 4: [66, 77], 5: [50, 78], 6: [34, 77], 7: [15, 73], 8: [9, 64],
  9: [65, 61], 10: [50, 62], 11: [35, 61],
  12: [89, 46], 13: [66, 49], 14: [50, 49], 15: [34, 49], 16: [11, 46],
  17: [70, 33], 18: [50, 33], 19: [30, 33],
  20: [63, 19], 21: [50, 17], 22: [37, 19], 23: [85, 25], 24: [62, 14], 25: [50, 13], 26: [38, 14], 27: [15, 25],
};

export const LINE_LABELS: Record<string, string> = {
  GK: "Thủ môn",
  DEF: "Hàng thủ",
  MID: "Tiền vệ",
  ATT: "Hàng công",
};

export const POSITION_NAMES: Record<number, string> = {
  0: "GK", 1: "SW", 2: "RWB", 3: "RB", 4: "RCB", 5: "CB", 6: "LCB", 7: "LB", 8: "LWB",
  9: "RDM", 10: "CDM", 11: "LDM", 12: "RM", 13: "RCM", 14: "CM", 15: "LCM", 16: "LM",
  17: "RAM", 18: "CAM", 19: "LAM", 20: "RF", 21: "CF", 22: "LF", 23: "RW", 24: "RS",
  25: "ST", 26: "LS", 27: "LW",
};

export function positionsLabel(positions: number[]): string {
  return positions.map((p) => POSITION_NAMES[p] ?? "?").join(" · ");
}

// Màu theo phân vị (0..100): thấp = đỏ, giữa = xám, cao = xanh.
export function percentileColor(p: number): string {
  if (p >= 85) return "bg-emerald-500";
  if (p >= 65) return "bg-emerald-400/70";
  if (p > 35) return "bg-zinc-400";
  if (p > 15) return "bg-amber-400";
  return "bg-red-500";
}

// Tuyến theo mã vị trí của game (khớp backend/app/services/positions.py)
export function lineOfPosition(code: number): "GK" | "DEF" | "MID" | "ATT" | null {
  if (code === 0) return "GK";
  if (code >= 1 && code <= 8) return "DEF";
  if (code >= 9 && code <= 19) return "MID";
  if (code >= 20 && code <= 27) return "ATT";
  return null;
}

/**
 * Giữ cầu thủ khi đổi sơ đồ: ưu tiên cùng mã vị trí, sau đó cùng tuyến; cầu thủ không còn chỗ thì bị bỏ.
 */
export function remapPlayers<T>(oldCodes: number[], oldPlayers: (T | null)[], newCodes: number[]): (T | null)[] {
  const result: (T | null)[] = newCodes.map(() => null);
  const used = new Set<number>();
  const take = (match: (oldCode: number, newCode: number) => boolean) => {
    newCodes.forEach((code, i) => {
      if (result[i] !== null) return;
      const j = oldCodes.findIndex((oc, k) => !used.has(k) && oldPlayers[k] !== null && match(oc, code));
      if (j >= 0) {
        result[i] = oldPlayers[j];
        used.add(j);
      }
    });
  };
  take((a, b) => a === b);
  take((a, b) => lineOfPosition(a) !== null && lineOfPosition(a) === lineOfPosition(b));
  return result;
}
