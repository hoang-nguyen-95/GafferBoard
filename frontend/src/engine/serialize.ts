// Đóng gói đối tượng thành JSON đúng như các response_model của backend (backend/app/schemas.py).
import { LINE_OF_ROLE, ROLE_LABELS_VI, roleOfPlayer, positionName } from "./positions";
import type { Store } from "./store";
import type { Player, SquadMember, Team, TeamStanding } from "./types";
import { ageOn } from "./util";
import { lineOfPosition } from "./positions";
import type { SlotView } from "./teams";

export function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Ngày tham chiếu để tính tuổi: ngày sớm nhất trong lịch đã nhập, không có thì hôm nay. */
export function referenceDate(store: Store): string {
  let earliest: string | null = null;
  for (const f of store.data.fixtures.values()) {
    if (f.fixture_date !== null && (earliest === null || f.fixture_date < earliest)) earliest = f.fixture_date;
  }
  return earliest ?? todayLocal();
}

export function playerSummary(player: Player, member: SquadMember | null = null, inXi: boolean | null = null, ref: string | null = null) {
  const role = roleOfPlayer(player.positions, player.primary_position);
  return {
    player_id: player.player_id, name: player.name, jersey_name: player.jersey_name, overall: player.overall,
    potential: player.potential, positions: player.positions, birth_date: player.birth_date,
    age: ref !== null ? ageOn(player.birth_date, ref) : null, nationality_id: player.nationality_id,
    pac_div: player.pac_div, sho_han: player.sho_han, pas_kic: player.pas_kic, dri_ref: player.dri_ref,
    def_spe: player.def_spe, phy_pos: player.phy_pos,
    team_id: member ? member.team_id : null, squad_position: member ? member.position : null,
    jersey_number: member ? member.jersey_number : null, injury: member ? member.injury : null, form: member ? member.form : null,
    role, role_label: ROLE_LABELS_VI[role], line: LINE_OF_ROLE[role], in_xi: inXi,
  };
}

export function teamOut(store: Store, team: Team) {
  const standing = store.data.standings.get(team.team_id);
  const leagueId = standing?.league_id ?? null;
  const league = leagueId !== null ? store.data.leagues.get(leagueId) : undefined;
  return {
    team_id: team.team_id, name: team.name, league_id: leagueId, league_name: league?.name ?? null, gender: team.gender,
    overall: team.overall, attack: team.attack, midfield: team.midfield, defense: team.defense,
  };
}

export function standingOut(s: TeamStanding) {
  return {
    league_id: s.league_id, position: s.position, points: s.points, played: s.played,
    home_wins: s.home_wins, home_draws: s.home_draws, home_losses: s.home_losses,
    away_wins: s.away_wins, away_draws: s.away_draws, away_losses: s.away_losses,
    home_gf: s.home_gf, home_ga: s.home_ga, away_gf: s.away_gf, away_ga: s.away_ga, form_raw: s.form_raw,
  };
}

export function slotOut(sv: SlotView, ref: string) {
  return {
    slot: sv.slot, position: sv.position, position_name: positionName(sv.position), line: lineOfPosition(sv.position),
    inferred: sv.inferred, player: sv.player ? playerSummary(sv.player, null, true, ref) : null,
  };
}
