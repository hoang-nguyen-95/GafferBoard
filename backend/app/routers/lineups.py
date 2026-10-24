from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session

from app.db import get_session
from app.routers.players import player_summary
from app.schemas import SlotOut
from app.services import settings
from app.services.advice import advise_full
from app.services.meta import reference_date
from app.services.opponent import analyze_team
from app.services.optimizer import LineupOption, recommend_lineups
from app.services.positions import position_name, line_of_position

router = APIRouter()


def option_to_dict(option: LineupOption, ref) -> dict:
    f = option.formation
    return {
        "formation": {"id": f.formation_id, "name": f.name, "positions": [position_name(p) for p in f.positions]},
        "score": round(option.score, 1),
        "baseline_score": round(option.baseline_score, 1),
        "valid": option.valid,
        "is_usual": option.is_usual,
        "why_formation": option.why_formation,
        "warnings": option.warnings,
        "slots": [
            {
                **SlotOut(
                    slot=s.slot, position=s.position, position_name=position_name(s.position),
                    line=line_of_position(s.position), inferred=False,
                    player=player_summary(s.player, in_xi=True, ref=ref) if s.player else None,
                ).model_dump(mode="json"),
                "rating": round(s.rating, 1), "fit_penalty": s.fit_penalty,
                "form_bonus": round(s.form_bonus, 1), "rule_bonus": round(s.rule_bonus, 1),
                "score": round(s.score, 1), "reasons": s.reasons,
            }
            for s in option.slots
        ],
        "added": option.added,
        "removed": option.removed,
    }


@router.get("/teams/{team_id}/counter-lineups")
def counter_lineups(
    team_id: int,
    mine: Optional[int] = Query(None, description="team_id của đội bạn; mặc định là đội của người dùng"),
    limit: int = Query(3, ge=1, le=5),
    session: Session = Depends(get_session),
) -> dict:
    """2–3 phương án đội hình (sơ đồ khác nhau) của đội bạn để đáp trả đội này, kèm giải thích."""
    report = analyze_team(session, team_id)
    if report is None:
        raise HTTPException(404, "Không tìm thấy đội")
    mine_id = mine if mine is not None else settings.effective_user_team(session)[0]
    if mine_id is None:
        raise HTTPException(409, "Chưa biết đội của bạn: chọn đội trên trang chủ trước")
    if mine_id == team_id:
        raise HTTPException(422, "Đội của bạn trùng với đối thủ")
    suggestions, advice = advise_full(session, report, mine_id)
    result = recommend_lineups(session, mine_id, suggestions, advice["formation_counters"], limit)
    ref = reference_date(session)
    return {
        "opponent": report.name,
        "my_team_id": mine_id,
        "usual_formation": result["usual_formation"],
        "available_players": result["available"],
        "injured": result["injured"],
        "rules_applied": result["rules"],
        "options": [option_to_dict(o, ref) for o in result["options"]],
    }
