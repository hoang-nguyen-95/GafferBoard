from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlmodel import Session

from app.db import get_session
from app.models import Fixture, ImportRun, Player, Team, TeamStanding
from app.services import settings
from app.services.meta import reference_date
from app.services.schedule import opponent_of, upcoming_fixtures

router = APIRouter()


class TeamChoice(BaseModel):
    team_id: Optional[int] = None  # null = xóa lựa chọn thủ công


def _team_brief(session: Session, team_id: Optional[int]) -> Optional[dict]:
    team = session.get(Team, team_id) if team_id is not None else None
    if team is None:
        return None
    standing = session.get(TeamStanding, team_id)
    return {"team_id": team.team_id, "name": team.name, "league_id": standing.league_id if standing else None,
            "overall": team.overall}


def _fixture_dict(session: Session, f: Fixture, user_team_id: int) -> dict:
    return {
        "fixture_id": f.fixture_id, "date": f.fixture_date.isoformat() if f.fixture_date else None,
        "time_seconds": f.fixture_time, "competition_id": f.competition_id,
        "is_home": f.home_team_id == user_team_id,
        "home": _team_brief(session, f.home_team_id), "away": _team_brief(session, f.away_team_id),
        "opponent": _team_brief(session, opponent_of(f, user_team_id)),
    }


@router.get("/meta")
def get_meta(session: Session = Depends(get_session)) -> dict:
    last = session.execute(select(ImportRun).order_by(ImportRun.id.desc())).scalars().first()
    user_team_id, source = settings.effective_user_team(session)
    return {
        "teams": session.execute(select(func.count()).select_from(Team)).scalar(),
        "players": session.execute(select(func.count()).select_from(Player)).scalar(),
        "fixtures": session.execute(select(func.count()).select_from(Fixture)).scalar(),
        "last_import_at": last.finished_at.isoformat() if last else None,
        "reference_date": reference_date(session).isoformat(),
        "user_team": _team_brief(session, user_team_id),
        "user_team_source": source if _team_brief(session, user_team_id) else None,
    }


@router.put("/settings/user-team")
def put_user_team(body: TeamChoice, session: Session = Depends(get_session)) -> dict:
    if body.team_id is not None and session.get(Team, body.team_id) is None:
        raise HTTPException(404, "Không tìm thấy đội")
    settings.set_int(session, settings.USER_TEAM, body.team_id)
    return get_meta(session)


@router.put("/settings/opponent")
def put_opponent(body: TeamChoice, session: Session = Depends(get_session)) -> dict:
    if body.team_id is not None and session.get(Team, body.team_id) is None:
        raise HTTPException(404, "Không tìm thấy đội")
    settings.set_int(session, settings.OPPONENT_TEAM, body.team_id)
    return get_next_match(session)


@router.get("/next-match")
def get_next_match(session: Session = Depends(get_session)) -> dict:
    """Trận kế tiếp của đội người dùng và đối thủ cần phân tích.

    `source`: "manual" (người dùng chọn tay), "fixture" (từ lịch thi đấu), "none" (chưa xác định).
    """
    user_team_id, user_source = settings.effective_user_team(session)
    user_team = _team_brief(session, user_team_id)
    result = {"user_team": user_team, "user_team_source": user_source if user_team else None,
              "source": "none", "opponent": None, "fixture": None, "upcoming": [], "reason": None}
    if user_team is None:
        result["reason"] = "no_user_team"
        return result

    fixtures = upcoming_fixtures(session, user_team_id)
    result["upcoming"] = [_fixture_dict(session, f, user_team_id) for f in fixtures]
    manual = _team_brief(session, settings.get_int(session, settings.OPPONENT_TEAM))
    if manual:
        result.update(source="manual", opponent=manual)
        return result
    if fixtures:
        first = result["upcoming"][0]
        result.update(source="fixture", opponent=first["opponent"], fixture=first)
        return result
    result["reason"] = "no_fixtures"
    return result
