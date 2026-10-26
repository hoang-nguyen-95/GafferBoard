// Kiểu dữ liệu của engine: phản chiếu backend/app/models.py (cùng tên trường, cùng thứ tự) để JSON trả về khớp API gốc.

export const PLAYER_ATTRS = [
  "acceleration", "sprint_speed", "finishing", "shot_power", "long_shots", "positioning", "volleys", "penalties",
  "short_passing", "long_passing", "vision", "crossing", "curve", "free_kick_accuracy", "dribbling", "ball_control",
  "agility", "balance", "reactions", "composure", "defensive_awareness", "interceptions", "standing_tackle",
  "sliding_tackle", "strength", "stamina", "aggression", "jumping", "heading_accuracy", "gk_diving", "gk_handling",
  "gk_kicking", "gk_positioning", "gk_reflexes",
] as const;
export type PlayerAttr = (typeof PLAYER_ATTRS)[number];

const PLAYER_SCALARS = [
  "name", "jersey_name", "name_search", "first_name_id", "last_name_id", "common_name_id", "jersey_name_id",
  "birth_date", "gender", "nationality_id", "height", "weight", "potential", "primary_position", "preferred_foot",
  "weak_foot", "skill_moves", "international_rep", "contract_until", "trait1", "trait2", "icon_trait1", "icon_trait2",
  "pac_div", "sho_han", "pas_kic", "dri_ref", "def_spe", "phy_pos",
] as const;

export type Num = number | null;

export interface Player extends Record<PlayerAttr, Num> {
  player_id: number;
  name: string | null;
  jersey_name: string | null;
  name_search: string | null;
  first_name_id: Num; last_name_id: Num; common_name_id: Num; jersey_name_id: Num;
  birth_date: string | null;
  gender: Num; nationality_id: Num; height: Num; weight: Num;
  overall: number;
  potential: Num; primary_position: Num;
  positions: number[];
  preferred_foot: Num; weak_foot: Num; skill_moves: Num; international_rep: Num; contract_until: Num;
  trait1: Num; trait2: Num; icon_trait1: Num; icon_trait2: Num;
  pac_div: Num; sho_han: Num; pas_kic: Num; dri_ref: Num; def_spe: Num; phy_pos: Num;
}

/** Cầu thủ mới với đủ mọi khóa (giá trị mặc định như cột của DB) để JSON đầy đủ như API gốc. */
export function newPlayer(playerId: number): Player {
  const p: Record<string, unknown> = { player_id: playerId, overall: 0, positions: [] };
  for (const k of PLAYER_SCALARS) p[k] = null;
  for (const k of PLAYER_ATTRS) p[k] = null;
  return p as unknown as Player;
}

export interface League { league_id: number; name: string; country_id: Num; level: Num; is_international: boolean; is_women: boolean }

export interface Team {
  team_id: number; name: string; gender: Num; overall: Num; attack: Num; midfield: Num; defense: Num;
  build_up_play: Num; defensive_depth: Num; captain_id: Num; penalty_taker_id: Num; popularity: Num;
}

export interface SquadMember {
  team_id: number; player_id: number; position: Num; jersey_number: Num; injury: Num; form: Num;
  league_appearances: Num; league_goals: Num; yellows: Num; reds: Num;
}

export interface TeamStanding {
  team_id: number; league_id: Num; position: Num; previous_position: Num; points: Num; played: Num;
  home_wins: Num; home_draws: Num; home_losses: Num; home_gf: Num; home_ga: Num;
  away_wins: Num; away_draws: Num; away_losses: Num; away_gf: Num; away_ga: Num;
  form_raw: string | null; last_result: Num;
}

export interface LineupSlotData { slot: number; position: Num; role: Num; player_id: Num }

export interface TeamLineup {
  team_id: number; formation_id: Num; relative_formation_id: Num; formation_name: string | null;
  captain_id: Num; penalty_taker_id: Num; slots: LineupSlotData[];
}

export interface Fixture {
  fixture_id: number; competition_id: Num; home_team_id: number; away_team_id: number;
  fixture_date: string | null; fixture_time: Num; home_form_raw: string | null; away_form_raw: string | null;
  home_league_pos: Num; away_league_pos: Num; home_played: Num; away_played: Num; stadium_id: Num;
}

export interface UserProfile { user_id: number; user_team_id: Num; league_id: Num; first_name: string | null; surname: string | null }

export interface FormationDef {
  formation_id: number; name: string; full_name_id: Num; attackers: Num; midfielders: Num; defenders: Num; positions: number[];
}

export interface MatchResult {
  id: number; team_id: number; opponent_name: string | null; goals_for: number; goals_against: number;
  played_on: string | null; is_home: boolean | null; created_at: string;
}

export interface Meeting {
  id: number; opponent_team_id: number; goals_for: number; goals_against: number;
  played_on: string | null; is_home: boolean | null; note: string | null; created_at: string;
}

export interface TeamNote { team_id: number; text: string; updated_at: string }

export interface ManualLineup {
  id: number; name: string; formation_id: number; league_id: Num;
  slots: { slot: number; player_id: Num }[]; created_at: string; updated_at: string;
}

export interface ImportRun { id: number; finished_at: string; summary: string }

// ---- chế độ Manager: dữ liệu cá nhân, chỉ có ở bản web/ứng dụng (không có bản Python tương ứng) ----
export type ShortlistStatus = "target" | "negotiating" | "agreed";
export interface ShortlistItem { player_id: number; fee: number | null; wage: number | null; note: string; status: ShortlistStatus }
export interface SaleItem { player_id: number; expected_fee: number | null; wage: number | null }
export interface ManagerData {
  /** Số tiền còn lại bạn đọc trong màn Tài chính của game (đơn vị tùy bạn, nhưng nhất quán). */
  budget: { transfer: number | null; wage: number | null };
  /** Năm kết thúc mùa giải hiện tại (ví dụ 2026 cho mùa 2025/26); null = tự suy từ ngày tham chiếu. */
  season_end_year: number | null;
  shortlist: ShortlistItem[];
  sales: SaleItem[];
  /** Số bạn thấy trong game (giá trị, lương của một cầu thủ) dùng để hiệu chỉnh công thức ước tính giá. */
  observations: PriceObservation[];
  /** Nhật ký các đề nghị đã gửi và kết quả, dùng để tìm mức giá/lương thường được chấp nhận. */
  offers: Offer[];
  nextId: { observation: number; offer: number };
}
export interface PriceObservation { id: number; player_id: number; value: number | null; wage: number | null; at: string }
export type OfferKind = "fee" | "wage";
export type OfferResult = "accepted" | "rejected" | "counter";
export interface Offer {
  id: number; player_id: number; kind: OfferKind; amount: number; result: OfferResult;
  /** Giá bên kia ra lại (khi result = "counter"). */
  counter: number | null;
  /** Mức ước tính lúc ghi nhật ký, để tính tỉ lệ đề nghị / ước tính về sau. */
  estimate: number | null; at: string;
  /** Khi đề nghị là một gói (trao đổi, thưởng, % bán lại): thành phần của gói. `amount` là giá trị gói theo bên bán. */
  package?: PackageBreakdown | null;
}
export interface PackageBreakdown { cash: number; swap_ids: number[]; addons: number; sell_on_percent: number; sign_on: number }
export const emptyManager = (): ManagerData => ({
  budget: { transfer: null, wage: null }, season_end_year: null, shortlist: [], sales: [],
  observations: [], offers: [], nextId: { observation: 1, offer: 1 },
});

// ---- hợp đồng và cho mượn (chỉ có khi save có bảng career_playercontract/playerloans; không có bản Python tương ứng) ----
/** Hợp đồng hiện tại của một cầu thủ trong save (game chỉ lưu hợp đồng cho đội của bạn và đội dự bị, không có cho đội khác). */
export interface Contract {
  player_id: number; team_id: number;
  /** Số `wage` trong save (đơn vị game; game hiển thị theo tuần, chưa xác nhận). */
  wage: number;
  duration_months: number; start_date: string | null; end_date: string | null;
  signon_bonus: Num; status: Num; loan_wage_split: Num;
}
export interface Loan { player_id: number; from_team_id: number; ends_on: string | null; to_buy: boolean }
