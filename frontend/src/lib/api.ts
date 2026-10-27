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
  budget: { transfer: number | null; wage: number | null };
  /** Ngân sách đang dùng: số nhập tay nếu có, không thì số script Live Editor tự đọc từ game. */
  effective_budget: { transfer: number | null; transfer_source: "manual" | "game" | null };
  /** Trạng thái game script tự động đã ghi (cp_state.csv); null nếu chưa có. */
  game: { transfer_budget: number | null; date: string | null; exported_at: string | null } | null;
  season_end_year: number; items: ShortlistRow[]; sales: SaleRow[];
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

export type RenewalRow = {
  player_id: number; name: string; age: number | null; overall: number; potential: number | null; role: string;
  squad_role: "starter" | "prospect" | "rotation" | "surplus"; in_xi: boolean; wage: number; end_date: string | null; months_left: number | null;
  urgency: "urgent" | "soon" | "later" | "none"; action: "renew" | "renew_short" | "sell" | "hold" | "none"; reason: string;
  suggested_years: number | null; reference_wage: number | null; reference_peers: number;
  wage_ladder: { open: number; target: number; walk: number } | null; wage_note: string;
};
export type RenewalPlan = {
  available: boolean; reference_date: string; players: number; xi_average: number;
  totals: { to_renew: number; to_sell: number; wage_total: number; extra_wage_target: number; extra_wage_max: number; budget_wage: number | null } | null;
  warnings: string[]; rows: RenewalRow[];
};

export type Ladder = { open: number; target: number; walk: number };
export type OfferRow = { id: number; player_id: number; kind: "fee" | "wage"; amount: number; result: "accepted" | "rejected" | "counter"; counter: number | null; estimate: number | null; at: string; package?: { cash: number; swap_ids: number[]; addons: number; sell_on_percent: number; sign_on: number } | null };
export type ObservationRow = { id: number; player_id: number; value: number | null; wage: number | null; at: string };
export type OfferStatsRow = { kind: "fee" | "wage"; accepted: number; rejected: number; counters: number; medianAcceptedRatio: number | null; lowestAcceptedRatio: number | null; highestRejectedRatio: number | null };
export type PriceAnalysis = {
  player: { player_id: number; name: string; overall: number; potential: number | null; age: number | null; seasons_left: number | null; months_left: number | null };
  value: { estimate: number; low: number; high: number; source: "game" | "estimate"; calibration_points: number; calibrated: boolean; spread_percent: number; prior: number };
  wage: { estimate: number; low: number; high: number; source: "game" | "club_fit" | "default"; points: number; r2: number | null; spread_percent: number; shift_percent: number; team_estimate: number };
  fee: { ladder: Ladder; source: "default" | "history"; factors: { text: string; effect: "buyer" | "seller"; adjust: number }[]; next: { amount: number | null; text: string } };
  wage_offer: { ladder: Ladder; source: "default" | "history"; next: { amount: number | null; text: string } };
  verdicts: string[]; tips: string[]; stats: { fee: OfferStatsRow; wage: OfferStatsRow };
  offers: OfferRow[]; observations: ObservationRow[]; disclaimer: string;
};

export type PackageInputRow = { cash: number; swapIds: number[]; addons: number; sellOnPercent: number; signOn: number };
export type PackageEvaluation = {
  target: { player_id: number; name: string }; ladder: Ladder; verdict: "likely" | "possible" | "unlikely" | "below_open";
  perceived: { cash: number; swaps: { player_id: number; name: string; value: number; credit: number; in_xi: boolean; wage: number | null }[]; swap_credit: number; addons: number; sell_on: number; total: number; ratio_to_target: number };
  cost: { cash: number; swap_value_given: number; addons_expected: number; sell_on_expected: number; sign_on: number; total: number; wage_freed: number };
  resale_estimate: number; notes: string[]; weights: { swap_credit: number; addon: number; sell_on: number };
};
export type PackageSquadRow = { player_id: number; name: string; overall: number; potential: number | null; age: number | null; role: string; in_xi: boolean; value: number; wage: number | null; seasons_left: number | null };
export type PackagesResponse = {
  evaluation: PackageEvaluation | null;
  options: { label: string; why: string; input: PackageInputRow; evaluation: PackageEvaluation }[];
  squad: PackageSquadRow[];
};
