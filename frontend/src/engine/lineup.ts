// Độ phù hợp cầu thủ–vị trí và gán 11 người (khớp backend/app/services/lineup.py).
import { solveAssignment } from "./assignment";
import { lineOfPosition, roleOfPosition, sameFamily } from "./positions";
import type { Player } from "./types";

export const PENALTY_SAME_FAMILY = 1;
export const PENALTY_ALT_POSITION = 2;
export const PENALTY_SAME_ROLE = 4;
export const PENALTY_SAME_LINE = 12;
export const PENALTY_OTHER_LINE = 20;
export const PENALTY_GK_MISMATCH = 60;
export const PENALTY_UNKNOWN_SLOT = 10;

export function positionPenalty(positions: number[], slot: number | null): number {
  if (slot === null || roleOfPosition(slot) === null) return PENALTY_UNKNOWN_SLOT;
  if (positions.length && positions[0] === slot) return 0;
  if (positions.includes(slot)) return PENALTY_ALT_POSITION;
  if (positions.some((p) => sameFamily(p, slot))) return PENALTY_SAME_FAMILY;
  const slotIsGk = slot === 0;
  const playerIsGk = positions.length > 0 && positions[0] === 0;
  if (slotIsGk !== playerIsGk) return PENALTY_GK_MISMATCH;
  const slotRole = roleOfPosition(slot);
  if (positions.some((p) => roleOfPosition(p) === slotRole)) return PENALTY_SAME_ROLE;
  const slotLine = lineOfPosition(slot);
  if (positions.some((p) => lineOfPosition(p) === slotLine)) return PENALTY_SAME_LINE;
  return PENALTY_OTHER_LINE;
}

export const positionRating = (p: Player, slot: number | null): number => p.overall - positionPenalty(p.positions, slot);

export interface Assignment { slot: number; position: number | null; player: Player | null; score: number }

export function assignPlayers(
  slotPositions: (number | null)[],
  candidates: Player[],
  bonus?: (p: Player, slot: number | null) => number,
): Assignment[] {
  const n = slotPositions.length;
  const m = candidates.length;
  if (n === 0 || m === 0) return slotPositions.map((position, slot) => ({ slot, position, player: null, score: 0 }));
  const score = (i: number, j: number) =>
    positionRating(candidates[j], slotPositions[i]) + (bonus ? bonus(candidates[j], slotPositions[i]) : 0);
  if (m >= n) {
    const matrix = Array.from({ length: n }, (_, i) => Array.from({ length: m }, (_, j) => score(i, j)));
    const cols = solveAssignment(matrix);
    return slotPositions.map((position, i) => ({ slot: i, position, player: candidates[cols[i]], score: matrix[i][cols[i]] }));
  }
  const matrix = Array.from({ length: m }, (_, j) => Array.from({ length: n }, (_, i) => score(i, j)));
  const rows = solveAssignment(matrix);
  const bySlot = new Map<number, [number, number]>();
  rows.forEach((slot, j) => bySlot.set(slot, [j, matrix[j][slot]]));
  return slotPositions.map((position, i) => {
    const hit = bySlot.get(i);
    return hit ? { slot: i, position, player: candidates[hit[0]], score: hit[1] } : { slot: i, position, player: null, score: 0 };
  });
}
