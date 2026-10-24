from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from app.db import get_session
from app.importers.names import fold_text
from app.models import Player, SquadMember
from app.schemas import PlayerSummary
from app.services.meta import age_on, reference_date
from app.services.analysis import analyze_player, club_of_player
from app.services.positions import LINE_OF_ROLE, ROLE_LABELS_VI, role_of_player

router = APIRouter()


def player_summary(
    player: Player, member: Optional[SquadMember] = None, in_xi: Optional[bool] = None, ref: Optional[date] = None
) -> PlayerSummary:
    out = PlayerSummary.model_validate(player)
    if ref is not None:
        out.age = age_on(player.birth_date, ref)
    role = role_of_player(player.positions, player.primary_position)
    out.role, out.role_label, out.line = role, ROLE_LABELS_VI[role], LINE_OF_ROLE[role]
    out.in_xi = in_xi
    if member is not None:
        out.team_id = member.team_id
        out.squad_position = member.position
        out.jersey_number = member.jersey_number
        out.injury = member.injury
        out.form = member.form
    return out


@router.get("/players", response_model=list[PlayerSummary])
def list_players(
    team: Optional[int] = Query(None, description="team_id"),
    q: Optional[str] = Query(None, description="Tìm theo tên, không phân biệt hoa thường và dấu"),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    session: Session = Depends(get_session),
):
    if team is not None:
        stmt = select(Player, SquadMember).join(SquadMember, SquadMember.player_id == Player.player_id)
        stmt = stmt.where(SquadMember.team_id == team)
    else:
        stmt = select(Player)
    if q and fold_text(q):
        # Mỗi từ phải xuất hiện trong tên (thứ tự bất kỳ): "fernandes bruno" vẫn khớp.
        for word in fold_text(q).split():
            stmt = stmt.where(Player.name_search.contains(word, autoescape=True))
    stmt = stmt.order_by(Player.overall.desc(), Player.player_id).limit(limit).offset(offset)
    rows = session.exec(stmt).all()
    ref = reference_date(session)
    return [player_summary(*r, ref=ref) for r in rows] if team is not None else [player_summary(p, ref=ref) for p in rows]


@router.get("/players/{player_id}")
def get_player(player_id: int, session: Session = Depends(get_session)) -> dict:
    """Toàn bộ chỉ số của cầu thủ, kèm tuổi (tính theo ngày tham chiếu của game)."""
    player = session.get(Player, player_id)
    if player is None:
        raise HTTPException(404, "Không tìm thấy cầu thủ")
    return {**player.model_dump(mode="json"), "age": age_on(player.birth_date, reference_date(session))}


@router.get("/players/{player_id}/analysis")
def get_player_analysis(
    player_id: int,
    scope: str = Query("auto", pattern="^(auto|league|all)$", description="Nhóm so sánh: cùng giải, toàn bộ, hoặc tự chọn"),
    session: Session = Depends(get_session),
):
    player = session.get(Player, player_id)
    if player is None:
        raise HTTPException(404, "Không tìm thấy cầu thủ")
    result = analyze_player(session, player, scope)
    club = club_of_player(session, player_id)
    result["club"] = (
        {"team_id": club[0].team_id, "name": club[0].name, "league_id": club[1], "league_name": club[2]}
        if club else None
    )
    result["name"] = player.name
    return result
