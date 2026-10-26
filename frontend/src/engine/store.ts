import type {
  Fixture, FormationDef, ImportRun, League, ManualLineup, MatchResult, Meeting, Player, SquadMember, Team,
  TeamLineup, TeamNote, TeamStanding, UserProfile, ManagerData, Contract, Loan,
} from "./types";
import { emptyManager } from "./types";

/** Dữ liệu nhập từ file xuất của game (được thay mới mỗi lần import). */
export interface GameData {
  leagues: Map<number, League>;
  teams: Map<number, Team>;
  players: Map<number, Player>;
  formations: Map<number, FormationDef>;
  squad: Map<string, SquadMember>; // khóa `${team_id}:${player_id}`, giữ thứ tự chèn
  standings: Map<number, TeamStanding>;
  lineups: Map<number, TeamLineup>;
  fixtures: Map<number, Fixture>;
  users: Map<number, UserProfile>;
  /** Hợp đồng theo player_id (chỉ đội của bạn và đội dự bị); rỗng nếu save chưa xuất career_playercontract. */
  contracts: Map<number, Contract>;
  loans: Map<number, Loan>;
}

/** Dữ liệu cá nhân của người dùng: KHÔNG bị xóa khi import lại. */
export interface UserData {
  settings: Map<string, string>;
  results: MatchResult[];
  notes: Map<number, TeamNote>;
  meetings: Meeting[];
  manual: ManualLineup[];
  importRuns: ImportRun[];
  manager: ManagerData;
  nextId: { result: number; meeting: number; manual: number; importRun: number };
}

export interface Indexes {
  squadByTeam: Map<number, SquadMember[]>;
  squadByPlayer: Map<number, SquadMember[]>;
  playersByPrimary: Map<number, Player[]>;
}

export class Store {
  data: GameData = emptyGameData();
  user: UserData = emptyUserData();
  idx: Indexes = { squadByTeam: new Map(), squadByPlayer: new Map(), playersByPrimary: new Map() };
  /** Tăng mỗi khi dữ liệu đổi; dùng để làm mới bộ nhớ đệm benchmark. */
  version = 0;
  benchCache = new Map<string, unknown>();
  /** Gọi sau mỗi thay đổi dữ liệu cá nhân để lưu (IndexedDB). */
  onChange: (() => void) | null = null;

  touch(): void {
    this.onChange?.();
  }

  reindex(): void {
    const byTeam = new Map<number, SquadMember[]>();
    const byPlayer = new Map<number, SquadMember[]>();
    for (const m of this.data.squad.values()) {
      (byTeam.get(m.team_id) ?? byTeam.set(m.team_id, []).get(m.team_id)!).push(m);
      (byPlayer.get(m.player_id) ?? byPlayer.set(m.player_id, []).get(m.player_id)!).push(m);
    }
    const byPrimary = new Map<number, Player[]>();
    for (const p of this.data.players.values()) {
      if (p.primary_position === null) continue;
      (byPrimary.get(p.primary_position) ?? byPrimary.set(p.primary_position, []).get(p.primary_position)!).push(p);
    }
    this.idx = { squadByTeam: byTeam, squadByPlayer: byPlayer, playersByPrimary: byPrimary };
    this.benchCache.clear();
    this.version++;
  }

  get dataVersion(): number {
    return this.user.importRuns.length ? this.user.importRuns[this.user.importRuns.length - 1].id : 0;
  }
}

export function emptyGameData(): GameData {
  return {
    leagues: new Map(), teams: new Map(), players: new Map(), formations: new Map(), squad: new Map(),
    standings: new Map(), lineups: new Map(), fixtures: new Map(), users: new Map(), contracts: new Map(), loans: new Map(),
  };
}

export function emptyUserData(): UserData {
  return {
    settings: new Map(), results: [], notes: new Map(), meetings: [], manual: [], importRuns: [], manager: emptyManager(),
    nextId: { result: 1, meeting: 1, manual: 1, importRun: 1 },
  };
}

export const squadKey = (teamId: number, playerId: number) => `${teamId}:${playerId}`;
