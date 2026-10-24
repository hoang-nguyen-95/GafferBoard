from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlmodel import Session

from app.db import get_session
from app.routers.analysis import report_to_dict
from app.routers.lineups import counter_payload
from app.routers.manual import _get as get_manual
from app.routers.notes import team_notes
from app.services import llm, settings
from app.services.advice import advise
from app.services.manual import analyze_manual
from app.services.opponent import analyze_team
from app.services.report import render_report

router = APIRouter()


class Toggle(BaseModel):
    enabled: bool


@router.get("/llm/status")
def llm_status(session: Session = Depends(get_session)) -> dict:
    return llm.status(session)


@router.put("/llm/enabled")
def llm_set_enabled(body: Toggle, session: Session = Depends(get_session)) -> dict:
    if body.enabled and not llm.sdk_installed():
        raise HTTPException(409, "Chưa cài thư viện anthropic (pip install anthropic).")
    llm.set_enabled(session, body.enabled)
    return llm.status(session)


def _explain(session: Session, report, mine: Optional[int], with_notes: Optional[dict]) -> dict:
    if not llm.is_enabled(session):
        raise HTTPException(403, "Diễn giải bằng LLM đang tắt. Bật trong phần cài đặt LLM (dữ liệu sẽ được gửi tới Claude API).")
    mine_id = mine if mine is not None else settings.effective_user_team(session)[0]
    counter = None
    if mine_id is not None and mine_id != report.team_id:
        counter = counter_payload(session, report, mine_id)
    text = render_report(report_to_dict(report, session), advise(session, report, mine_id), counter, with_notes,
                         generated_on=date.today())
    try:
        return llm.explain(text)
    except llm.LLMError as e:
        raise HTTPException(e.status, str(e)) from e


@router.post("/teams/{team_id}/explain")
def explain_team(team_id: int, mine: Optional[int] = Query(None), session: Session = Depends(get_session)) -> dict:
    report = analyze_team(session, team_id)
    if report is None:
        raise HTTPException(404, "Không tìm thấy đội")
    return _explain(session, report, mine, team_notes(session, team_id))


@router.post("/manual-lineups/{lineup_id}/explain")
def explain_manual(lineup_id: int, mine: Optional[int] = Query(None), session: Session = Depends(get_session)) -> dict:
    return _explain(session, analyze_manual(session, get_manual(session, lineup_id)), mine, None)
