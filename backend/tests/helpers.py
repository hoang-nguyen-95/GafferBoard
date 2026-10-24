"""Dựng đội/cầu thủ tổng hợp trực tiếp trong DB để test logic phân tích với số liệu kiểm soát được."""
from app.models import League, Player, SquadMember, Team, TeamLineup, TeamStanding

POSITIONS_433 = [0, 3, 4, 6, 7, 10, 13, 15, 23, 25, 27]  # GK RB RCB LCB LB CDM RCM LCM RW ST LW


def make_player(pid: int, overall: int = 70, positions=(25,), **attrs) -> Player:
    return Player(player_id=pid, overall=overall, gender=0, positions=list(positions),
                  primary_position=positions[0] if positions else None, **attrs)


def add_team(session, team_id: int, league_id: int = 13, *, speed: int = 70, bench_overall: int = 60,
             name: str | None = None, starter_overall: int = 75) -> list[Player]:
    """Một đội 4-3-3 đầy đủ 11 người + 8 dự bị; `speed` là sprint_speed của mọi cầu thủ ra sân."""
    if session.get(League, league_id) is None:
        session.add(League(league_id=league_id, name=f"Giải {league_id}"))
    session.add(Team(team_id=team_id, name=name or f"Đội {team_id}", gender=0, overall=starter_overall))
    session.add(TeamStanding(team_id=team_id, league_id=league_id))
    starters = []
    for i, pos in enumerate(POSITIONS_433):
        p = make_player(team_id * 100 + i, starter_overall, [pos], sprint_speed=speed, acceleration=speed,
                        height=180, stamina=70, strength=70, jumping=70, heading_accuracy=70,
                        defensive_awareness=70, standing_tackle=70, interceptions=70, finishing=70,
                        gk_reflexes=70, gk_diving=70, gk_handling=70, gk_positioning=70)
        session.add(p)
        session.add(SquadMember(team_id=team_id, player_id=p.player_id, position=pos))
        starters.append(p)
    for j in range(8):
        b = make_player(team_id * 100 + 50 + j, bench_overall, [14], sprint_speed=60)
        session.add(b)
        session.add(SquadMember(team_id=team_id, player_id=b.player_id, position=28))
    session.add(TeamLineup(
        team_id=team_id, formation_name="4-3-3",
        slots=[{"slot": i, "position": pos, "role": 0, "player_id": starters[i].player_id}
               for i, pos in enumerate(POSITIONS_433)],
    ))
    session.commit()
    return starters
