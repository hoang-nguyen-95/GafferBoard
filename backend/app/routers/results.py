from datetime import date, datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlmodel import Session

from app.db import get_session
from app.models import MatchResult, Team
from app.services.form import team_form

router = APIRouter()


class ResultIn(BaseModel):
    goals_for: int = Field(ge=0, le=30)
    goals_against: int = Field(ge=0, le=30)
    opponent_name: Optional[str] = Field(default=None, max_length=80)
    played_on: Optional[date] = None
    is_home: Optional[bool] = None


@router.get("/teams/{team_id}/form")
def get_form(team_id: int, session: Session = Depends(get_session)) -> dict:
    if session.get(Team, team_id) is None:
        raise HTTPException(404, "Không tìm thấy đội")
    return {"form": team_form(session, team_id)}


@router.post("/teams/{team_id}/results", status_code=201)
def add_result(team_id: int, body: ResultIn, session: Session = Depends(get_session)) -> dict:
    if session.get(Team, team_id) is None:
        raise HTTPException(404, "Không tìm thấy đội")
    result = MatchResult(team_id=team_id, created_at=datetime.now(timezone.utc), **body.model_dump())
    session.add(result)
    session.commit()
    return {"id": result.id, "form": team_form(session, team_id)}


@router.delete("/results/{result_id}")
def delete_result(result_id: int, session: Session = Depends(get_session)) -> dict:
    result = session.get(MatchResult, result_id)
    if result is None:
        raise HTTPException(404, "Không tìm thấy kết quả")
    team_id = result.team_id
    session.delete(result)
    session.commit()
    return {"form": team_form(session, team_id)}
