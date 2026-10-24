// Phân tích cầu thủ theo phân vị (khớp backend/app/services/analysis.py).
import { LINE_OF_ROLE, ROLE_LABELS_VI, ROLE_POSITIONS, roleOfPlayer, type Line, type Role } from "./positions";
import type { Store } from "./store";
import type { Player, PlayerAttr, Team } from "./types";
import { percentile, pyRound } from "./util";

export const STRENGTH_PCT = 85.0;
export const WEAKNESS_PCT = 15.0;
export const MAX_ITEMS = 4;
export const MIN_PEERS = 30;

export const ATTRIBUTE_LABELS: Record<string, string> = {
  acceleration: "Tăng tốc", sprint_speed: "Tốc độ chạy nước rút", finishing: "Dứt điểm", shot_power: "Lực sút",
  long_shots: "Sút xa", positioning: "Chọn vị trí", volleys: "Vô lê", penalties: "Penalty", short_passing: "Chuyền ngắn",
  long_passing: "Chuyền dài", vision: "Tầm nhìn", crossing: "Tạt bóng", curve: "Sút xoáy", free_kick_accuracy: "Đá phạt",
  dribbling: "Rê bóng", ball_control: "Kiểm soát bóng", agility: "Nhanh nhẹn", balance: "Thăng bằng",
  reactions: "Phản ứng", composure: "Bình tĩnh", defensive_awareness: "Ý thức phòng ngự", interceptions: "Cắt bóng",
  standing_tackle: "Tắc bóng", sliding_tackle: "Xoạc bóng", strength: "Sức mạnh", stamina: "Thể lực",
  aggression: "Quyết liệt", jumping: "Bật nhảy", heading_accuracy: "Đánh đầu", gk_diving: "Bay người",
  gk_handling: "Bắt bóng", gk_kicking: "Phát bóng", gk_positioning: "Chọn vị trí (TM)", gk_reflexes: "Phản xạ (TM)",
  height: "Chiều cao",
};

type AttrKey = PlayerAttr | "height";
export const ROLE_ATTRS: Record<Role, AttrKey[]> = {
  GK: ["gk_diving", "gk_handling", "gk_kicking", "gk_positioning", "gk_reflexes", "jumping", "height"],
  CB: ["sprint_speed", "acceleration", "defensive_awareness", "interceptions", "standing_tackle", "sliding_tackle", "strength",
    "jumping", "heading_accuracy", "aggression", "short_passing", "long_passing", "height"],
  FB: ["sprint_speed", "acceleration", "stamina", "defensive_awareness", "standing_tackle", "sliding_tackle", "interceptions",
    "crossing", "dribbling", "short_passing"],
  DM: ["defensive_awareness", "interceptions", "standing_tackle", "sliding_tackle", "strength", "stamina", "aggression",
    "short_passing", "long_passing", "vision"],
  CM: ["short_passing", "long_passing", "vision", "ball_control", "dribbling", "stamina", "interceptions", "positioning",
    "long_shots", "strength"],
  WM: ["crossing", "dribbling", "sprint_speed", "acceleration", "stamina", "short_passing", "vision", "ball_control", "agility"],
  AM: ["vision", "short_passing", "ball_control", "dribbling", "long_shots", "positioning", "finishing", "agility", "composure"],
  W: ["sprint_speed", "acceleration", "dribbling", "ball_control", "agility", "crossing", "finishing", "composure", "short_passing"],
  ST: ["finishing", "shot_power", "positioning", "composure", "sprint_speed", "acceleration", "heading_accuracy", "strength",
    "ball_control", "volleys", "jumping", "height"],
};

export const RADAR_OUTFIELD: [keyof Player, string][] = [["pac_div", "PAC"], ["sho_han", "SHO"], ["pas_kic", "PAS"],
  ["dri_ref", "DRI"], ["def_spe", "DEF"], ["phy_pos", "PHY"]];
export const RADAR_GK: [keyof Player, string][] = [["pac_div", "DIV"], ["sho_han", "HAN"], ["pas_kic", "KIC"],
  ["dri_ref", "REF"], ["def_spe", "SPE"], ["phy_pos", "POS"]];

export interface AttributeScore { key: string; label: string; value: number; peer_avg: number | null; percentile: number }

export interface PeerGroup { kind: "league" | "all"; name: string; role: Role; size: number; rows: Player[] }

export interface ClubInfo { team: Team; leagueId: number | null; leagueName: string | null }

/** Đội CLB (không phải đội tuyển) của cầu thủ, kèm giải. */
export function clubOfPlayer(store: Store, playerId: number): ClubInfo | null {
  for (const m of store.idx.squadByPlayer.get(playerId) ?? []) {
    const team = store.data.teams.get(m.team_id);
    if (!team) continue;
    const standing = store.data.standings.get(m.team_id);
    const leagueId = standing?.league_id ?? null;
    const league = leagueId !== null ? store.data.leagues.get(leagueId) : undefined;
    if (league?.is_international) continue;
    return { team, leagueId, leagueName: league?.name ?? null };
  }
  return null;
}

function peerRows(store: Store, role: Role, gender: number | null, leagueId: number | null): Player[] {
  const positions = new Set(ROLE_POSITIONS[role]);
  const ok = (p: Player) => p.primary_position !== null && positions.has(p.primary_position) && (gender === null || p.gender === gender);
  if (leagueId === null) {
    const out: Player[] = [];
    for (const code of ROLE_POSITIONS[role]) for (const p of store.idx.playersByPrimary.get(code) ?? []) if (ok(p)) out.push(p);
    return out;
  }
  // Giống JOIN squadmember/teamstanding trong SQL: một cầu thủ thuộc hai đội cùng giải sẽ xuất hiện hai lần.
  const out: Player[] = [];
  for (const [teamId, standing] of store.data.standings) {
    if (standing.league_id !== leagueId) continue;
    for (const m of store.idx.squadByTeam.get(teamId) ?? []) {
      const p = store.data.players.get(m.player_id);
      if (p && ok(p)) out.push(p);
    }
  }
  return out;
}

export function peerGroup(store: Store, player: Player, role: Role, scope: string): PeerGroup {
  const club = clubOfPlayer(store, player.player_id);
  const leagueId = club?.leagueId ?? null;
  const leagueName = club?.leagueName ?? null;
  if ((scope === "auto" || scope === "league") && leagueId !== null) {
    const rows = peerRows(store, role, player.gender, leagueId);
    if (scope === "league" || rows.length >= MIN_PEERS) {
      return { kind: "league", name: leagueName ?? `giải ${leagueId}`, role, size: rows.length, rows };
    }
  }
  const rows = peerRows(store, role, player.gender, null);
  return { kind: "all", name: "toàn bộ dữ liệu", role, size: rows.length, rows };
}

const lowerFirst = (t: string) => t.slice(0, 1).toLowerCase() + t.slice(1);

function summarize(name: string, roleLabel: string, strengths: AttributeScore[], weaknesses: AttributeScore[]): string {
  const notes: string[] = [];
  if (strengths.length) notes.push("mạnh về " + strengths.map((s) => lowerFirst(s.label)).join(", "));
  if (weaknesses.length) notes.push("yếu về " + weaknesses.map((w) => lowerFirst(w.label)).join(", "));
  if (!notes.length) notes.push("không có điểm mạnh hay yếu nổi bật so với nhóm cùng vị trí");
  return `${name} (${roleLabel}): ${notes.join("; ")}.`;
}

const valueOf = (p: Player, key: string): number | null => (p as unknown as Record<string, number | null>)[key];

export interface PlayerAnalysis {
  player_id: number; role: Role; role_label: string; line: Line;
  peer_group: { kind: string; name: string; size: number };
  radar: { key: string; label: string; value: number | null; peer_avg: number | null }[];
  attributes: AttributeScore[]; strengths: AttributeScore[]; weaknesses: AttributeScore[]; summary: string;
}

export function analyzePlayer(store: Store, player: Player, scope = "auto"): PlayerAnalysis {
  const role = roleOfPlayer(player.positions, player.primary_position);
  const group = peerGroup(store, player, role, scope);
  const attributes: AttributeScore[] = [];
  for (const attr of ROLE_ATTRS[role]) {
    const value = valueOf(player, attr);
    if (value === null) continue;
    const values = group.rows.map((r) => valueOf(r, attr)).filter((v): v is number => v !== null).sort((a, b) => a - b);
    attributes.push({
      key: attr, label: ATTRIBUTE_LABELS[attr], value,
      peer_avg: values.length ? pyRound(values.reduce((a, b) => a + b, 0) / values.length, 1) : null,
      percentile: percentile(values, value),
    });
  }
  // Python sorted() ổn định: các phần tử bằng nhau giữ thứ tự gốc (Array.sort của JS cũng ổn định)
  const strengths = attributes.filter((a) => a.percentile >= STRENGTH_PCT).sort((a, b) => b.percentile - a.percentile).slice(0, MAX_ITEMS);
  const weaknesses = attributes.filter((a) => a.percentile <= WEAKNESS_PCT).sort((a, b) => a.percentile - b.percentile).slice(0, MAX_ITEMS);
  const axes = role === "GK" ? RADAR_GK : RADAR_OUTFIELD;
  const radar = axes.map(([f, label]) => {
    const values = group.rows.map((r) => valueOf(r, f as string)).filter((v): v is number => v !== null);
    return {
      key: f as string, label, value: valueOf(player, f as string),
      peer_avg: values.length ? pyRound(values.reduce((a, b) => a + b, 0) / values.length, 1) : null,
    };
  });
  return {
    player_id: player.player_id, role, role_label: ROLE_LABELS_VI[role], line: LINE_OF_ROLE[role],
    peer_group: { kind: group.kind, name: group.name, size: group.size },
    radar, attributes, strengths, weaknesses,
    summary: summarize(player.name ?? `Cầu thủ #${player.player_id}`, ROLE_LABELS_VI[role], strengths, weaknesses),
  };
}
