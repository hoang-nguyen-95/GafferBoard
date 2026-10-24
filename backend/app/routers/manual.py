from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlmodel import Session

from app.db import get_session
from app.models import FormationDef, League, ManualLineup, Player
from app.routers.analysis import report_to_dict
from app.routers.lineups import counter_payload
from app.routers.players import player_summary
from app.services import settings
from app.services.advice import advise
from app.services.manual import analyze_manual, build_lineup
from app.services.meta import reference_date
from app.services.positions import line_of_position, position_name

router = APIRouter()
SLOTS = 11


class ManualLineupIn(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    formation_id: int
    # đúng 11 phần tử theo thứ tự vị trí của sơ đồ; null = để trống
    player_ids: list[Optional[int]] = Field(min_length=SLOTS, max_length=SLOTS)
    league_id: Optional[int] = None


def _validate(session: Session, body: ManualLineupIn) -> None:
    if session.get(FormationDef, body.formation_id) is None:
        raise HTTPException(404, "Không tìm thấy sơ đồ")
    chosen = [pid for pid in body.player_ids if pid is not None]
    if not chosen:
        raise HTTPException(422, "Cần chọn ít nhất một cầu thủ")
    if len(chosen) != len(set(chosen)):
        raise HTTPException(422, "Một cầu thủ không thể đứng hai vị trí")
    missing = [pid for pid in chosen if session.get(Player, pid) is None]
    if missing:
        raise HTTPException(404, f"Không tìm thấy cầu thủ: {', '.join(map(str, missing))}")
    if body.league_id is not None and session.get(League, body.league_id) is None:
        raise HTTPException(404, "Không tìm thấy giải")


def _get(session: Session, lineup_id: int) -> ManualLineup:
    manual = session.get(ManualLineup, lineup_id)
    if manual is None:
        raise HTTPException(404, "Không tìm thấy đội hình nhập tay")
    return manual


def _detail(session: Session, manual: ManualLineup) -> dict:
    view = build_lineup(session, manual)
    formation = session.get(FormationDef, manual.formation_id)
    ref = reference_date(session)
    return {
        "id": manual.id, "name": manual.name, "league_id": manual.league_id,
        "formation": {"id": manual.formation_id, "name": formation.name if formation else None,
                      "positions": [position_name(p) for p in formation.positions] if formation else []},
        "slots": [
            {"slot": sv.slot, "position": sv.position, "position_name": sv.position_name, "line": line_of_position(sv.position),
             "inferred": False, "player": player_summary(sv.player, in_xi=True, ref=ref).model_dump(mode="json") if sv.player else None}
            for sv in view.slots
        ],
        "updated_at": manual.updated_at.isoformat(),
    }


@router.get("/formations")
def list_formations(session: Session = Depends(get_session)) -> list[dict]:
    rows = session.execute(select(FormationDef).order_by(FormationDef.name, FormationDef.formation_id)).scalars()
    return [
        {"id": f.formation_id, "name": f.name, "positions": [position_name(p) for p in f.positions],
         "position_codes": f.positions}
        for f in rows
    ]


@router.get("/manual-lineups")
def list_manual(session: Session = Depends(get_session)) -> list[dict]:
    rows = session.execute(select(ManualLineup).order_by(ManualLineup.updated_at.desc())).scalars()
    out = []
    for m in rows:
        formation = session.get(FormationDef, m.formation_id)
        out.append({"id": m.id, "name": m.name, "formation_name": formation.name if formation else None,
                    "players": sum(1 for s in m.slots if s["player_id"] is not None),
                    "updated_at": m.updated_at.isoformat()})
    return out


@router.post("/manual-lineups", status_code=201)
def create_manual(body: ManualLineupIn, session: Session = Depends(get_session)) -> dict:
    _validate(session, body)
    now = datetime.now(timezone.utc)
    manual = ManualLineup(
        name=body.name.strip(), formation_id=body.formation_id, league_id=body.league_id,
        slots=[{"slot": i, "player_id": pid} for i, pid in enumerate(body.player_ids)],
        created_at=now, updated_at=now,
    )
    session.add(manual)
    session.commit()
    return _detail(session, manual)


@router.get("/manual-lineups/{lineup_id}")
def get_manual(lineup_id: int, session: Session = Depends(get_session)) -> dict:
    return _detail(session, _get(session, lineup_id))


@router.put("/manual-lineups/{lineup_id}")
def update_manual(lineup_id: int, body: ManualLineupIn, session: Session = Depends(get_session)) -> dict:
    manual = _get(session, lineup_id)
    _validate(session, body)
    manual.name, manual.formation_id, manual.league_id = body.name.strip(), body.formation_id, body.league_id
    manual.slots = [{"slot": i, "player_id": pid} for i, pid in enumerate(body.player_ids)]
    manual.updated_at = datetime.now(timezone.utc)
    session.add(manual)
    session.commit()
    return _detail(session, manual)


@router.delete("/manual-lineups/{lineup_id}")
def delete_manual(lineup_id: int, session: Session = Depends(get_session)) -> dict:
    session.delete(_get(session, lineup_id))
    session.commit()
    return {"deleted": lineup_id}


@router.get("/manual-lineups/{lineup_id}/analysis")
def manual_analysis(lineup_id: int, session: Session = Depends(get_session)) -> dict:
    """Cùng pipeline phân tích đối thủ như đội trong DB (Giai đoạn 3), không có dự bị/phong độ/chấn thương."""
    return report_to_dict(analyze_manual(session, _get(session, lineup_id)), session)


@router.get("/manual-lineups/{lineup_id}/suggestions")
def manual_suggestions(lineup_id: int, mine: Optional[int] = Query(None), session: Session = Depends(get_session)) -> dict:
    report = analyze_manual(session, _get(session, lineup_id))
    mine_id = mine if mine is not None else settings.effective_user_team(session)[0]
    return advise(session, report, mine_id)


@router.get("/manual-lineups/{lineup_id}/counter-lineups")
def manual_counter_lineups(
    lineup_id: int, mine: Optional[int] = Query(None), limit: int = Query(3, ge=1, le=5),
    session: Session = Depends(get_session),
) -> dict:
    report = analyze_manual(session, _get(session, lineup_id))
    mine_id = mine if mine is not None else settings.effective_user_team(session)[0]
    return counter_payload(session, report, mine_id, limit)
