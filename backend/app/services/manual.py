"""Đội hình đối thủ nhập tay (Giai đoạn 7): dựng lineup từ sơ đồ + cầu thủ rồi dùng chung pipeline phân tích."""
from collections import Counter
from typing import Optional

from sqlmodel import Session

from app.models import FormationDef, League, ManualLineup, Player
from app.services.analysis import club_of_player
from app.services.opponent import OpponentReport, build_report
from app.services.teams import LineupView, SlotView

MIN_SHARE_FOR_LEAGUE = 0.5  # giải được suy ra nếu >= 50% cầu thủ cùng một giải


def build_lineup(session: Session, manual: ManualLineup) -> LineupView:
    formation = session.get(FormationDef, manual.formation_id)
    if formation is None:
        return LineupView(source="none")
    slots = []
    for i, position in enumerate(formation.positions):
        entry = next((s for s in manual.slots if s["slot"] == i), None)
        player = session.get(Player, entry["player_id"]) if entry and entry["player_id"] is not None else None
        slots.append(SlotView(i, position, player))
    return LineupView(
        source="manual", formation_id=formation.formation_id, relative_formation_id=formation.formation_id,
        formation_name=formation.name, slots=slots,
    )


def infer_league(session: Session, players: list[Player]) -> tuple[Optional[int], Optional[str]]:
    """Giải mà phần lớn cầu thủ đang chơi (để so phân vị); None nếu không đủ rõ."""
    leagues = []
    for p in players:
        club = club_of_player(session, p.player_id)
        if club and club[1] is not None:
            leagues.append((club[1], club[2]))
    if not players or not leagues:
        return None, None
    (league_id, name), count = Counter(leagues).most_common(1)[0]
    return (league_id, name) if count / len(players) >= MIN_SHARE_FOR_LEAGUE else (None, None)


def analyze_manual(session: Session, manual: ManualLineup) -> OpponentReport:
    lineup = build_lineup(session, manual)
    players = [sv.player for sv in lineup.slots if sv.player]
    if manual.league_id is not None:
        league = session.get(League, manual.league_id)
        league_id, league_name = manual.league_id, league.name if league else None
    else:
        league_id, league_name = infer_league(session, players)
    return build_report(
        session, name=manual.name, team_id=None, league_id=league_id, league_name=league_name,
        lineup=lineup, bench=[], form=None, injuries=[], ratings={},
    )
