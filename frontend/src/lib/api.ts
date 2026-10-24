// Địa chỉ API FastAPI (chỉ dùng phía server của Next.js). Trình duyệt dùng đường dẫn /api/... (xem next.config.ts).
const API_URL = process.env.API_URL ?? "http://localhost:8000";

export type Line = "GK" | "DEF" | "MID" | "ATT";

export type Team = {
  team_id: number;
  name: string;
  league_id: number | null;
  league_name: string | null;
  gender: number | null;
  overall: number | null;
  attack: number | null;
  midfield: number | null;
  defense: number | null;
};

export type League = {
  league_id: number;
  name: string;
  is_international: boolean;
  is_women: boolean;
};

export type PlayerSummary = {
  player_id: number;
  name: string | null;
  jersey_name: string | null;
  overall: number;
  potential: number | null;
  positions: number[];
  age: number | null;
  pac_div: number | null;
  sho_han: number | null;
  pas_kic: number | null;
  dri_ref: number | null;
  def_spe: number | null;
  phy_pos: number | null;
  team_id: number | null;
  squad_position: number | null;
  jersey_number: number | null;
  injury: number | null;
  form: number | null;
  role: string | null;
  role_label: string | null;
  line: Line | null;
  in_xi: boolean | null;
};

export type Standing = {
  league_id: number | null;
  position: number | null;
  points: number | null;
  played: number | null;
  home_wins: number | null;
  home_draws: number | null;
  home_losses: number | null;
  away_wins: number | null;
  away_draws: number | null;
  away_losses: number | null;
  home_gf: number | null;
  home_ga: number | null;
  away_gf: number | null;
  away_ga: number | null;
  form_raw: string | null;
};

export type Slot = {
  slot: number;
  position: number | null;
  position_name: string;
  line: Line | null;
  inferred: boolean;
  player: PlayerSummary | null;
};

export type TeamOverview = {
  team: Team;
  standing: Standing | null;
  lineup: {
    source: "teamsheet" | "inferred" | "none";
    formation_id: number | null;
    relative_formation_id: number | null;
    formation_name: string | null;
    slots: Slot[];
  };
  squad: Record<Line, PlayerSummary[]>;
  line_averages: Record<Line, Record<string, number | null>>;
  line_labels: Record<Line, string>;
};

export type AttributeScore = {
  key: string;
  label: string;
  value: number;
  peer_avg: number | null;
  percentile: number;
};

export type PlayerAnalysis = {
  player_id: number;
  name: string | null;
  role: string;
  role_label: string;
  line: Line;
  peer_group: { kind: "league" | "all"; name: string; size: number };
  radar: { key: string; label: string; value: number | null; peer_avg: number | null }[];
  attributes: AttributeScore[];
  strengths: AttributeScore[];
  weaknesses: AttributeScore[];
  summary: string;
  club: { team_id: number; name: string; league_id: number | null; league_name: string | null } | null;
};

export type Player = PlayerSummary & Record<string, number | string | number[] | null>;

export class ApiError extends Error {
  constructor(public status: number, path: string) {
    super(`API ${path} trả về ${status}`);
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  // Dữ liệu đổi mỗi khi người dùng nhập file xuất mới -> không được cache.
  const res = await fetch(`${API_URL}${path}`, { cache: "no-store" });
  if (!res.ok) throw new ApiError(res.status, path);
  return res.json() as Promise<T>;
}

export function playerName(p: { name: string | null; player_id: number }): string {
  return p.name ?? `Cầu thủ #${p.player_id}`;
}
