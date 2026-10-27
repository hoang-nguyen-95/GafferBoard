// Nạp file dữ liệu cầu thủ công khai (public/data/players.json, sinh bởi backend/tools/build_players_dataset.py) vào Store,
// để trang web dùng lại đúng engine phân tích của ứng dụng (danh sách, tìm kiếm, phân tích cầu thủ theo phân vị).
import { Store } from "./store";
import { newPlayer, type League, type Player, type SquadMember, type Team, type TeamStanding } from "./types";

interface DatasetTable { columns: string[]; rows: unknown[][] }
export interface PlayersDataset {
  version: number;
  generated_at: string;
  /** Ngày dùng để tính tuổi (ngày sớm nhất trong lịch thi đấu đã xuất). */
  reference_date: string | null;
  tables: Record<"leagues" | "teams" | "standings" | "squad" | "players", DatasetTable>;
}

export interface DatasetMeta { generatedAt: string; referenceDate: string | null }

const SUPPORTED_VERSION = 1;

function records(t: DatasetTable): Record<string, unknown>[] {
  return t.rows.map((r) => Object.fromEntries(t.columns.map((c, i) => [c, r[i]])));
}

/** Thay toàn bộ dữ liệu game trong `store` bằng nội dung bộ dữ liệu (dữ liệu cá nhân giữ nguyên). */
export function loadDataset(store: Store, ds: PlayersDataset): DatasetMeta {
  if (ds.version !== SUPPORTED_VERSION) throw new Error(`Phiên bản dữ liệu ${ds.version} không được hỗ trợ`);
  const data = store.data;
  data.leagues.clear(); data.teams.clear(); data.players.clear(); data.squad.clear(); data.standings.clear(); data.fixtures.clear();
  data.contracts.clear(); data.loans.clear(); data.gameState = null; // bộ dữ liệu công khai không có hợp đồng (chỉ là của một save cụ thể)

  for (const r of records(ds.tables.leagues)) {
    data.leagues.set(r.league_id as number, { country_id: null, ...r, is_international: Boolean(r.is_international), is_women: Boolean(r.is_women) } as League);
  }
  const nullTeam = { overall: null, attack: null, midfield: null, defense: null, build_up_play: null, defensive_depth: null, captain_id: null, penalty_taker_id: null, popularity: null };
  for (const r of records(ds.tables.teams)) data.teams.set(r.team_id as number, { ...nullTeam, ...r } as Team);
  const nullStanding = {
    position: null, previous_position: null, points: null, played: null, home_wins: null, home_draws: null, home_losses: null, home_gf: null, home_ga: null,
    away_wins: null, away_draws: null, away_losses: null, away_gf: null, away_ga: null, form_raw: null, last_result: null,
  };
  for (const r of records(ds.tables.standings)) data.standings.set(r.team_id as number, { ...nullStanding, ...r } as TeamStanding);
  for (const r of records(ds.tables.squad)) {
    const m = { position: null, injury: null, form: null, league_appearances: null, league_goals: null, yellows: null, reds: null, ...r } as SquadMember;
    data.squad.set(`${m.team_id}:${m.player_id}`, m);
  }
  for (const r of records(ds.tables.players)) {
    const p: Player = Object.assign(newPlayer(r.player_id as number), r);
    p.positions = (r.positions as number[]) ?? [];
    data.players.set(p.player_id, p);
  }
  // Ngày tham chiếu được lấy từ lịch thi đấu, nên đặt một trận giả để referenceDate(store) trả đúng ngày của bộ dữ liệu.
  if (ds.reference_date) {
    data.fixtures.set(-1, {
      fixture_id: -1, competition_id: null, home_team_id: -1, away_team_id: -1, fixture_date: ds.reference_date, fixture_time: null,
      home_form_raw: null, away_form_raw: null, home_league_pos: null, away_league_pos: null, home_played: null, away_played: null, stadium_id: null,
    });
  }
  store.reindex();
  return { generatedAt: ds.generated_at, referenceDate: ds.reference_date };
}
