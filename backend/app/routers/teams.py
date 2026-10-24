from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from app.db import get_session
from app.models import League, Team, TeamStanding
from app.routers.players import player_summary
from app.schemas import LeagueOut, LineupOut, SlotOut, StandingOut, TeamOut, TeamOverview
from app.services.positions import LINE_LABELS_VI, LINES
from app.services.meta import reference_date
from app.services.teams import group_squad_by_line, line_averages, resolve_lineup, squad_players

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


@router.get("/teams/{team_id}/overview", response_model=TeamOverview)
def get_team_overview(team_id: int, session: Session = Depends(get_session)):
    row = session.exec(_team_query().where(Team.team_id == team_id)).first()
    if row is None:
        raise HTTPException(404, "Không tìm thấy đội")
    squad = squad_players(session, team_id)
    lineup = resolve_lineup(session, team_id, squad)
    starter_ids = {sv.player.player_id for sv in lineup.slots if sv.player}
    standing = session.get(TeamStanding, team_id)
    ref = reference_date(session)
    grouped = group_squad_by_line(squad, starter_ids)
    return TeamOverview(
        team=_team_out(*row),
        standing=StandingOut.model_validate(standing) if standing else None,
        lineup=LineupOut(
            source=lineup.source, formation_id=lineup.formation_id,
            relative_formation_id=lineup.relative_formation_id, formation_name=lineup.formation_name,
            slots=[
                SlotOut(
                    slot=sv.slot, position=sv.position, position_name=sv.position_name, line=sv.line,
                    inferred=sv.inferred,
                    player=player_summary(sv.player, in_xi=True, ref=ref) if sv.player else None,
                )
                for sv in lineup.slots
            ],
        ),
        squad={
            line: [player_summary(e["player"], e["member"], e["in_xi"], ref) for e in grouped[line]] for line in LINES
        },
        line_averages=line_averages(lineup.slots),
        line_labels=LINE_LABELS_VI,
    )
