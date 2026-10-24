from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session

from app.db import get_session
from app.routers.players import player_summary
from app.schemas import SlotOut
from app.services import settings
from app.services.advice import advise
from app.services.meta import reference_date
from app.services.opponent import OpponentReport, analyze_team
from app.services.positions import LINE_LABELS_VI

router = APIRouter()


def report_to_dict(report: OpponentReport, session: Session) -> dict:
    ref = reference_date(session)
    lineup = report.lineup
    return {
        "name": report.name,
        "team_id": report.team_id,
        "ratings": report.ratings,
        "lineup": {
            "source": lineup.source,
            "formation_id": lineup.formation_id,
            "relative_formation_id": lineup.relative_formation_id,
            "formation_name": lineup.formation_name,
            "slots": [
                SlotOut(
                    slot=sv.slot, position=sv.position, position_name=sv.position_name, line=sv.line,
                    inferred=sv.inferred,
                    player=player_summary(sv.player, in_xi=True, ref=ref) if sv.player else None,
                ).model_dump(mode="json")
                for sv in lineup.slots
            ],
        },
        "metrics": report.metrics_list(),
        "extras": report.extras,
        "benchmark": report.benchmark,
        "dangerous": report.dangerous,
        "weak_points": report.weak_points,
        "form": report.form,
        "injuries": report.injuries,
        "line_labels": LINE_LABELS_VI,
    }


@router.get("/teams/{team_id}/analysis")
def team_analysis(team_id: int, session: Session = Depends(get_session)) -> dict:
    """Phân tích đối thủ: đội hình, chỉ số theo tuyến, cầu thủ nguy hiểm, điểm yếu, phong độ."""
    report = analyze_team(session, team_id)
    if report is None:
        raise HTTPException(404, "Không tìm thấy đội")
    return report_to_dict(report, session)


@router.get("/teams/{team_id}/suggestions")
def team_suggestions(
    team_id: int,
    mine: Optional[int] = Query(None, description="team_id của đội bạn; mặc định là đội của người dùng"),
    session: Session = Depends(get_session),
) -> dict:
    """Gợi ý đấu pháp (có thứ tự ưu tiên, kèm bằng chứng) khi đối đầu đội này."""
    report = analyze_team(session, team_id)
    if report is None:
        raise HTTPException(404, "Không tìm thấy đội")
    mine_id = mine if mine is not None else settings.effective_user_team(session)[0]
    return advise(session, report, mine_id)
