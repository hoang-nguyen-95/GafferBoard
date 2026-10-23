from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from app.db import get_session
from app.models import League, Team, TeamStanding
from app.schemas import LeagueOut, TeamOut

router = APIRouter()


def _team_out(team: Team, league_id: Optional[int], league_name: Optional[str]) -> TeamOut:
    return TeamOut(
        team_id=team.team_id, name=team.name, league_id=league_id, league_name=league_name,
        gender=team.gender, overall=team.overall, attack=team.attack,
        midfield=team.midfield, defense=team.defense,
    )


def _team_query():
    return (
        select(Team, TeamStanding.league_id, League.name)
        .join(TeamStanding, TeamStanding.team_id == Team.team_id, isouter=True)
        .join(League, League.league_id == TeamStanding.league_id, isouter=True)
    )


@router.get("/leagues", response_model=list[LeagueOut])
def list_leagues(session: Session = Depends(get_session)):
    return session.exec(select(League).order_by(League.league_id)).all()


@router.get("/teams", response_model=list[TeamOut])
def list_teams(
    league: Optional[int] = Query(None, description="league_id"),
    q: Optional[str] = Query(None, description="Tìm theo tên đội"),
    limit: int = Query(1000, ge=1, le=5000),
    offset: int = Query(0, ge=0),
    session: Session = Depends(get_session),
):
    stmt = _team_query()
    if league is not None:
        stmt = stmt.where(TeamStanding.league_id == league)
    if q:
        stmt = stmt.where(Team.name.ilike(f"%{q}%"))
    stmt = stmt.order_by(Team.name).limit(limit).offset(offset)
    return [_team_out(*row) for row in session.exec(stmt).all()]


@router.get("/teams/{team_id}", response_model=TeamOut)
def get_team(team_id: int, session: Session = Depends(get_session)):
    row = session.exec(_team_query().where(Team.team_id == team_id)).first()
    if row is None:
        raise HTTPException(404, "Không tìm thấy đội")
    return _team_out(*row)
