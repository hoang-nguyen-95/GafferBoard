from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session

from app.db import get_session
from app.models import Player
from app.routers.players import player_summary
from app.services.analysis import ATTRIBUTE_LABELS, ROLE_ATTRS, analyze_player, club_of_player
from app.services.meta import reference_date
from app.services.opponent import METRICS, analyze_team

router = APIRouter()

BASIC_ROWS = [("overall", "OVR"), ("potential", "Tiềm năng"), ("age", "Tuổi"), ("height", "Chiều cao (cm)"),
              ("weight", "Cân nặng (kg)"), ("weak_foot", "Chân yếu (sao)"), ("skill_moves", "Kỹ thuật (0-4)")]


def _better(a, b, higher_is_better: bool = True) -> Optional[str]:
    if a is None or b is None or a == b:
        return None
    return "a" if (a > b) == higher_is_better else "b"


def _row(key: str, label: str, a, b, higher_is_better: bool = True) -> dict:
    return {"key": key, "label": label, "a": a, "b": b,
            "diff": (a - b) if a is not None and b is not None else None,
            "better": _better(a, b, higher_is_better)}


def _player(session: Session, player_id: int, ref) -> tuple[Player, dict]:
    player = session.get(Player, player_id)
    if player is None:
        raise HTTPException(404, f"Không tìm thấy cầu thủ {player_id}")
    analysis = analyze_player(session, player)
    club = club_of_player(session, player_id)
    analysis["club"] = {"team_id": club[0].team_id, "name": club[0].name} if club else None
    analysis["player"] = player_summary(player, ref=ref).model_dump(mode="json")
    return player, analysis


@router.get("/compare/players")
def compare_players(a: int = Query(...), b: int = Query(...), session: Session = Depends(get_session)) -> dict:
    """So sánh hai cầu thủ: thông tin cơ bản, các chỉ số liên quan tới vị trí của một trong hai, radar và điểm mạnh/yếu."""
    if a == b:
        raise HTTPException(422, "Hãy chọn hai cầu thủ khác nhau")
    ref = reference_date(session)
    pa, an_a = _player(session, a, ref)
    pb, an_b = _player(session, b, ref)
    rows = [_row(k, label, an_a["player"].get(k) if k == "age" else getattr(pa, k), an_b["player"].get(k) if k == "age" else getattr(pb, k))
            for k, label in BASIC_ROWS]
    keys = [k for k in dict.fromkeys([*ROLE_ATTRS[an_a["role"]], *ROLE_ATTRS[an_b["role"]]]) if k != "height"]
    rows += [_row(k, ATTRIBUTE_LABELS[k], getattr(pa, k), getattr(pb, k)) for k in keys]
    return {"a": an_a, "b": an_b, "rows": rows, "same_role": an_a["role"] == an_b["role"]}


@router.get("/compare/teams")
def compare_teams(a: int = Query(...), b: int = Query(...), session: Session = Depends(get_session)) -> dict:
    """So sánh chỉ số hai đội (đội hình xuất phát) và rating tổng của game."""
    if a == b:
        raise HTTPException(422, "Hãy chọn hai đội khác nhau")
    ra, rb = analyze_team(session, a), analyze_team(session, b)
    for tid, rep in ((a, ra), (b, rb)):
        if rep is None:
            raise HTTPException(404, f"Không tìm thấy đội {tid}")
    rows = [
        {**_row(k, label, ra.values.get(k), rb.values.get(k), higher_is_better=hib),
         "percentile_a": ra.percentiles.get(k), "percentile_b": rb.percentiles.get(k)}
        for k, (label, hib) in METRICS.items()
    ]
    ratings = [_row(k, label, ra.ratings.get(k), rb.ratings.get(k))
               for k, label in (("overall", "OVR đội"), ("attack", "Tấn công"), ("midfield", "Tiền vệ"), ("defense", "Phòng ngự"))]
    return {
        "a": {"team_id": a, "name": ra.name, "formation": ra.lineup.formation_name},
        "b": {"team_id": b, "name": rb.name, "formation": rb.lineup.formation_name},
        "ratings": ratings, "metrics": rows,
    }
