"""Dựng đội hình và số liệu tổng hợp của một đội."""
from dataclasses import dataclass, field
from typing import Optional

from sqlalchemy import select
from sqlmodel import Session

from app.models import FormationDef, Player, SquadMember, Team, TeamLineup, TeamStanding
from app.services.lineup import assign_players
from app.services.positions import (
    LINES, line_of_position, position_name, role_of_player,
)

# Chỉ số trung bình theo tuyến (trên 11 cầu thủ ra sân)
LINE_METRICS = [
    "overall", "sprint_speed", "acceleration", "stamina", "strength", "jumping", "height",
    "defensive_awareness", "interceptions", "standing_tackle", "sliding_tackle",
    "heading_accuracy", "short_passing", "vision", "dribbling", "finishing",
]

# Slot "ngoài danh sách thi đấu" / dự bị trong teamplayerlinks.position
SQUAD_POSITION_BENCH = 28


@dataclass
class SlotView:
    slot: int
    position: Optional[int]
    player: Optional[Player]
    inferred: bool = False  # slot trống trong đội hình gốc, được điền bằng thuật toán

    @property
    def position_name(self) -> str:
        return position_name(self.position)

    @property
    def line(self) -> Optional[str]:
        return line_of_position(self.position)


@dataclass
class LineupView:
    source: str  # "teamsheet" | "inferred" | "none"
    formation_id: Optional[int] = None
    relative_formation_id: Optional[int] = None
    formation_name: Optional[str] = None
    captain_id: Optional[int] = None
    slots: list[SlotView] = field(default_factory=list)


def squad_players(session: Session, team_id: int) -> list[tuple[Player, SquadMember]]:
    stmt = (
        select(Player, SquadMember)
        .join(SquadMember, SquadMember.player_id == Player.player_id)
        .where(SquadMember.team_id == team_id)
        .order_by(Player.overall.desc(), Player.player_id)
    )
    return [(p, m) for p, m in session.execute(stmt).all()]


def _default_formation(session: Session) -> Optional[FormationDef]:
    for name in ("4-3-3", "4-4-2"):
        f = session.execute(select(FormationDef).where(FormationDef.name == name).order_by(FormationDef.formation_id)).scalars().first()
        if f:
            return f
    return session.execute(select(FormationDef).order_by(FormationDef.formation_id)).scalars().first()


def resolve_lineup(session: Session, team_id: int, squad: Optional[list[tuple[Player, SquadMember]]] = None) -> LineupView:
    """Đội hình xuất phát của đội. Ưu tiên bảng default_teamsheets; slot trống (-1) được điền bằng
    cầu thủ khả dụng phù hợp nhất; thiếu cả bảng thì suy ra từ sơ đồ mặc định + squad."""
    squad = squad if squad is not None else squad_players(session, team_id)
    by_id = {p.player_id: p for p, _ in squad}
    sheet = session.get(TeamLineup, team_id)

    if sheet is None or not sheet.slots:
        formation = _default_formation(session)
        if formation is None or not squad:
            return LineupView(source="none")
        available = [p for p, m in squad if not m.injury]
        picked = assign_players(formation.positions, available)
        return LineupView(
            source="inferred", formation_id=formation.formation_id, relative_formation_id=formation.formation_id,
            formation_name=formation.name,
            slots=[SlotView(a.slot, a.position, a.player, inferred=True) for a in picked],
        )

    slots = []
    for s in sheet.slots:
        player = by_id.get(s["player_id"]) if s["player_id"] is not None else None
        if player is None and s["player_id"] is not None:
            player = session.get(Player, s["player_id"])
        slots.append(SlotView(s["slot"], s["position"], player))

    missing = [sv for sv in slots if sv.player is None]
    if missing:
        used = {sv.player.player_id for sv in slots if sv.player}
        pool = [p for p, m in squad if p.player_id not in used and not m.injury]
        for sv, a in zip(missing, assign_players([sv.position for sv in missing], pool)):
            if a.player is not None:
                sv.player, sv.inferred = a.player, True
    return LineupView(
        source="teamsheet", formation_id=sheet.formation_id, relative_formation_id=sheet.relative_formation_id,
        formation_name=sheet.formation_name, captain_id=sheet.captain_id, slots=slots,
    )


def line_averages(slots: list[SlotView]) -> dict[str, dict]:
    """Trung bình các chỉ số theo tuyến trên các cầu thủ trong đội hình (theo vị trí của slot)."""
    out: dict[str, dict] = {}
    for line in LINES:
        players = [sv.player for sv in slots if sv.player and sv.line == line]
        row: dict = {"count": len(players)}
        for metric in LINE_METRICS:
            vals = [getattr(p, metric) for p in players if getattr(p, metric) is not None]
            row[metric] = round(sum(vals) / len(vals), 1) if vals else None
        out[line] = row
    return out


def group_squad_by_line(squad: list[tuple[Player, SquadMember]], starter_ids: set[int]) -> dict[str, list[dict]]:
    groups: dict[str, list[dict]] = {line: [] for line in LINES}
    from app.services.positions import LINE_OF_ROLE
    for player, member in squad:
        line = LINE_OF_ROLE[role_of_player(player.positions, player.primary_position)]
        groups[line].append({"player": player, "member": member, "in_xi": player.player_id in starter_ids})
    return groups


def get_team_with_standing(session: Session, team_id: int):
    return session.execute(
        select(Team, TeamStanding).join(TeamStanding, TeamStanding.team_id == Team.team_id, isouter=True)
        .where(Team.team_id == team_id)
    ).first()
