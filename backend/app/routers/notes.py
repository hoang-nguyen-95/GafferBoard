from datetime import date, datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlmodel import Session

from app.db import get_session
from app.models import Meeting, Team, TeamNote
from app.services.form import outcome

router = APIRouter()
MAX_NOTE = 5000


class NoteIn(BaseModel):
    text: str = Field(max_length=MAX_NOTE)


class MeetingIn(BaseModel):
    goals_for: int = Field(ge=0, le=30)
    goals_against: int = Field(ge=0, le=30)
    played_on: Optional[date] = None
    is_home: Optional[bool] = None
    note: Optional[str] = Field(default=None, max_length=500)


def _team(session: Session, team_id: int) -> Team:
    team = session.get(Team, team_id)
    if team is None:
        raise HTTPException(404, "Không tìm thấy đội")
    return team


def team_notes(session: Session, team_id: int) -> dict:
    note = session.get(TeamNote, team_id)
    meetings = list(session.execute(
        select(Meeting).where(Meeting.opponent_team_id == team_id)
        .order_by(Meeting.played_on.desc().nulls_last(), Meeting.id.desc())
    ).scalars())
    letters = [outcome(m.goals_for, m.goals_against) for m in meetings]
    return {
        "note": {"text": note.text, "updated_at": note.updated_at.isoformat()} if note else None,
        "meetings": [
            {"id": m.id, "goals_for": m.goals_for, "goals_against": m.goals_against,
             "played_on": m.played_on.isoformat() if m.played_on else None, "is_home": m.is_home, "note": m.note}
            for m in meetings
        ],
        "summary": {
            "played": len(meetings), "wins": letters.count("W"), "draws": letters.count("D"), "losses": letters.count("L"),
            "goals_for": sum(m.goals_for for m in meetings), "goals_against": sum(m.goals_against for m in meetings),
        },
    }


@router.get("/teams/{team_id}/notes")
def get_notes(team_id: int, session: Session = Depends(get_session)) -> dict:
    _team(session, team_id)
    return team_notes(session, team_id)


@router.put("/teams/{team_id}/note")
def put_note(team_id: int, body: NoteIn, session: Session = Depends(get_session)) -> dict:
    """Ghi chú rỗng nghĩa là xóa ghi chú."""
    _team(session, team_id)
    existing = session.get(TeamNote, team_id)
    text = body.text.strip()
    if not text:
        if existing:
            session.delete(existing)
    elif existing:
        existing.text, existing.updated_at = text, datetime.now(timezone.utc)
        session.add(existing)
    else:
        session.add(TeamNote(team_id=team_id, text=text, updated_at=datetime.now(timezone.utc)))
    session.commit()
    return team_notes(session, team_id)


@router.post("/teams/{team_id}/meetings", status_code=201)
def add_meeting(team_id: int, body: MeetingIn, session: Session = Depends(get_session)) -> dict:
    _team(session, team_id)
    session.add(Meeting(opponent_team_id=team_id, created_at=datetime.now(timezone.utc), **body.model_dump()))
    session.commit()
    return team_notes(session, team_id)


@router.delete("/meetings/{meeting_id}")
def delete_meeting(meeting_id: int, session: Session = Depends(get_session)) -> dict:
    meeting = session.get(Meeting, meeting_id)
    if meeting is None:
        raise HTTPException(404, "Không tìm thấy trận")
    team_id = meeting.opponent_team_id
    session.delete(meeting)
    session.commit()
    return team_notes(session, team_id)
