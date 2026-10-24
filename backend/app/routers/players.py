from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from app.db import get_session
from app.importers.names import fold_text
from app.models import Player, SquadMember
from app.schemas import PlayerSummary

router = APIRouter()


def _summary(player: Player, member: Optional[SquadMember] = None) -> PlayerSummary:
    out = PlayerSummary.model_validate(player)
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
    return [_summary(*r) for r in rows] if team is not None else [_summary(p) for p in rows]


@router.get("/players/{player_id}", response_model=Player)
def get_player(player_id: int, session: Session = Depends(get_session)):
    player = session.get(Player, player_id)
    if player is None:
        raise HTTPException(404, "Không tìm thấy cầu thủ")
    return player
