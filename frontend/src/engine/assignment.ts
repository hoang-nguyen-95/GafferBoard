// Thuật toán Hungarian (khớp từng dòng với backend/app/services/assignment.py để chọn y hệt khi điểm bằng nhau).
export function solveAssignment(score: number[][]): number[] {
  const n = score.length;
  if (n === 0) return [];
  const m = score[0].length;
  if (n > m) throw new Error("Cần số cột >= số hàng");
  const INF = Infinity;
  const cost = score.map((row) => row.map((v) => -v));
  const u = new Array<number>(n + 1).fill(0);
  const v = new Array<number>(m + 1).fill(0);
  const way = new Array<number>(m + 1).fill(0);
  const match = new Array<number>(m + 1).fill(0);
  for (let i = 1; i <= n; i++) {
    match[0] = i;
    let j0 = 0;
    const minv = new Array<number>(m + 1).fill(INF);
    const used = new Array<boolean>(m + 1).fill(false);
    for (;;) {
      used[j0] = true;
      const i0 = match[j0];
      let delta = INF;
      let j1 = 0;
      for (let j = 1; j <= m; j++) {
        if (!used[j]) {
          const cur = cost[i0 - 1][j - 1] - u[i0] - v[j];
          if (cur < minv[j]) { minv[j] = cur; way[j] = j0; }
          if (minv[j] < delta) { delta = minv[j]; j1 = j; }
        }
      }
      for (let j = 0; j <= m; j++) {
        if (used[j]) { u[match[j]] += delta; v[j] -= delta; } else minv[j] -= delta;
      }
      j0 = j1;
      if (match[j0] === 0) break;
    }
    while (j0) {
      const j1 = way[j0];
      match[j0] = match[j1];
      j0 = j1;
    }
  }
  const result = new Array<number>(n).fill(0);
  for (let j = 1; j <= m; j++) if (match[j]) result[match[j] - 1] = j - 1;
  return result;
}
