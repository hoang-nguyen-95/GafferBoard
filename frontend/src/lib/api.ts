// Kiểu dữ liệu JSON do engine (src/engine) trả về, giống hệt API FastAPI của backend.

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

export function playerName(p: { name: string | null; player_id: number }): string {
  return p.name ?? `Cầu thủ #${p.player_id}`;
}

export type Metric = {
  key: string;
  label: string;
  value: number | null;
  percentile: number | null;
  higher_is_better: boolean;
};

export type FormInfo = {
  source: "manual" | "game";
  verified: boolean;
  matches: number;
  sequence: string | null;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  max_points: number;
  goals_for: number | null;
  goals_against: number | null;
  goal_difference: number | null;
  results: {
    id: number;
    opponent_name: string | null;
    goals_for: number;
    goals_against: number;
    played_on: string | null;
    is_home: boolean | null;
  }[];
};

export type DangerousPlayer = {
  player_id: number;
  name: string;
  overall: number;
  role: string;
  score: number;
  why: string;
};

export type WeakPoint = {
  kind: "team" | "player";
  label: string;
  value: number;
  percentile: number;
  text: string;
  player_id?: number;
};

export type OpponentAnalysis = {
  name: string;
  team_id: number | null;
  ratings: Record<string, number | null>;
  lineup: TeamOverview["lineup"];
  metrics: Metric[];
  extras: {
    slowest_defender: { player_id: number; name: string; sprint_speed: number } | null;
    fastest_attacker: { player_id: number; name: string; sprint_speed: number } | null;
    weaker_flank: "left" | "right" | null;
    back_line_size: number;
  };
  benchmark: { league_id: number; league_name: string | null; teams: number } | null;
  dangerous: { attackers: DangerousPlayer[]; playmakers: DangerousPlayer[] };
  weak_points: WeakPoint[];
  form: FormInfo | null;
  injuries: { player_id: number; name: string; in_xi: boolean }[];
};

export type TeamBrief = { team_id: number; name: string; league_id: number | null; overall: number | null };

export type FixtureBrief = {
  fixture_id: number;
  date: string | null;
  time_seconds: number | null;
  competition_id: number | null;
  is_home: boolean;
  home: TeamBrief | null;
  away: TeamBrief | null;
  opponent: TeamBrief | null;
};

export type NextMatch = {
  user_team: TeamBrief | null;
  user_team_source: "manual" | "game" | null;
  source: "manual" | "fixture" | "none";
  opponent: TeamBrief | null;
  fixture: FixtureBrief | null;
  upcoming: FixtureBrief[];
  reason: "no_user_team" | "no_fixtures" | null;
};

export type Meta = {
  teams: number;
  players: number;
  fixtures: number;
  last_import_at: string | null;
  reference_date: string;
  user_team: TeamBrief | null;
  user_team_source: "manual" | "game" | null;
};

export type Suggestion = {
  rule_id: string;
  priority: number;
  title: string;
  advice: string;
  tactics: string[];
  evidence: string[];
  strength: number;
  emphasis: Record<string, Record<string, number>>;
};

export type Advice = {
  opponent: string;
  opponent_formation: string | null;
  my_team: { team_id: number; name: string } | null;
  compared_with_league: boolean;
  suggestions: Suggestion[];
  formation_counters: { formation: string; reason: string }[];
  notes: string[];
};

export type CounterSlot = Slot & {
  rating: number;
  fit_penalty: number;
  form_bonus: number;
  rule_bonus: number;
  score: number;
  reasons: string[];
};

export type CounterOption = {
  formation: { id: number; name: string; positions: string[] };
  score: number;
  baseline_score: number;
  valid: boolean;
  is_usual: boolean;
  why_formation: string;
  warnings: string[];
  slots: CounterSlot[];
  added: { player_id: number; name: string; position: string; because: string }[];
  removed: { player_id: number; name: string }[];
};

export type CounterLineups = {
  opponent: string;
  my_team_id: number;
  usual_formation: string | null;
  available_players: number;
  injured: { player_id: number; name: string }[];
  rules_applied: string[];
  options: CounterOption[];
};

export type FormationOption = { id: number; name: string; positions: string[]; position_codes: number[] };

export type ManualDetail = {
  id: number;
  name: string;
  league_id: number | null;
  formation: { id: number; name: string | null; positions: string[] };
  slots: Slot[];
  updated_at: string;
};

export type ManualSummary = { id: number; name: string; formation_name: string | null; players: number; updated_at: string };

export type NotesData = {
  note: { text: string; updated_at: string } | null;
  meetings: { id: number; goals_for: number; goals_against: number; played_on: string | null; is_home: boolean | null; note: string | null }[];
  summary: { played: number; wins: number; draws: number; losses: number; goals_for: number; goals_against: number };
};

export type CompareRow = { key: string; label: string; a: number | null; b: number | null; diff: number | null; better: "a" | "b" | null };

export type PlayerCompare = {
  a: PlayerAnalysis & { player: PlayerSummary };
  b: PlayerAnalysis & { player: PlayerSummary };
  rows: CompareRow[];
  same_role: boolean;
};

export type TeamCompare = {
  a: { team_id: number; name: string; formation: string | null };
  b: { team_id: number; name: string; formation: string | null };
  ratings: CompareRow[];
  metrics: (CompareRow & { percentile_a: number | null; percentile_b: number | null })[];
};


// ---- chế độ Manager ----
export type ManagerPlayer = {
  player_id: number; name: string; overall: number; potential: number | null; age: number | null; positions: number[]; role: string;
  contract_until: number | null; seasons_left: number | null; international_rep: number | null;
};
export type ManagerNeed = {
  role: string; role_label: string; line: Line; slots: number; baseline_overall: number; starters: ManagerPlayer[]; backups: ManagerPlayer[];
  issues: string[]; priority: number;
};
export type ManagerOverview = {
  user_team: { team_id: number; name: string }; season_end_year: number; reference_date: string; xi_average: number; squad_size: number;
  xi_age_average: number | null; squad_age_average: number | null; old_players: number; needs: ManagerNeed[];
  expiring: (ManagerPlayer & { in_xi: boolean })[]; budget: { transfer: number | null; wage: number | null };
};
export type ScoreLine = { key: string; label: string; value: number; points: number };
export type ManagerTarget = ManagerPlayer & {
  score: number; breakdown: ScoreLine[]; upgrade: number; flags: string[];
  club: { team_id: number; name: string; league_name: string | null } | null;
};
export type ManagerTargets = {
  role: string; role_label: string; baseline_overall: number; min_overall: number; season_end_year: number; total_matches: number; items: ManagerTarget[];
};
export type ShortlistRow = {
  player_id: number; fee: number | null; wage: number | null; note: string; status: "target" | "negotiating" | "agreed";
  player: ManagerPlayer; club: { team_id: number; name: string } | null; score: number; points_per_million: number | null;
};
export type SaleRow = { player_id: number; expected_fee: number | null; wage: number | null; player: ManagerPlayer };
export type BudgetSummary = {
  budget: { transfer: number | null; wage: number | null }; season_end_year: number; items: ShortlistRow[]; sales: SaleRow[];
  totals: {
    planned_spend: number; committed_spend: number; sales_income: number; transfer_after: number | null;
    wage_added: number; wage_saved: number; wage_after: number | null;
  };
  warnings: string[]; allocation: { role: string; role_label: string; priority: number; share: number; amount: number }[];
};
export type NegotiationPlan = {
  player: { player_id: number; name: string; overall: number; potential: number | null }; value: number; asking: number | null; adjust_total: number;
  factors: { text: string; effect: "buyer" | "seller"; adjust: number }[];
  ladder: { step: string; percent_of_value: number; amount: number }[]; verdict: string | null; tips: string[]; disclaimer: string;
};

export type WageRow = { player_id: number; name: string; wage: number; end_date: string | null; months_left: number | null; on_loan_from: number | null };
export type WagesSummary = { available: boolean; team_id: number | null; ref_date: string; players: number; total: number; expiring: WageRow[]; top: WageRow[] };
export type PlayerContractInfo = {
  contract: { wage: number; duration_months: number; start_date: string | null; end_date: string | null; months_left: number | null; signon_bonus: number | null; loan_wage_split: number | null } | null;
  loan: { from_team_id: number; from_team_name: string | null; ends_on: string | null; to_buy: boolean } | null;
};
