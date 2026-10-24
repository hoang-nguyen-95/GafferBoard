"""Ghép phân tích đối thủ với hồ sơ đội của người dùng rồi chạy engine luật."""
from typing import Optional

from sqlmodel import Session

from app.models import Team
from app.services.opponent import OpponentReport, compute_metrics
from app.services.rules import Ctx, Suggestion, evaluate, formation_counters
from app.services.teams import resolve_lineup, squad_players


def my_profile(session: Session, team_id: Optional[int]) -> tuple[dict, dict, Optional[str]]:
    """Chỉ số đội hình xuất phát của đội người dùng (không so với giải). Trả về (values, extras, tên đội)."""
    team = session.get(Team, team_id) if team_id is not None else None
    if team is None:
        return {}, {}, None
    squad = squad_players(session, team_id)
    lineup = resolve_lineup(session, team_id, squad)
    starters = {sv.player.player_id for sv in lineup.slots if sv.player}
    bench = [p for p, m in squad if p.player_id not in starters and not m.injury]
    values, extras = compute_metrics(lineup.slots, bench)
    return values, extras, team.name


def context_for(report: OpponentReport, mine_values: dict, mine_extras: dict) -> Ctx:
    form = report.form if report.form and report.form.get("verified") else None
    return Ctx(
        values=report.values, percentiles=report.percentiles, extras=report.extras, injuries=report.injuries,
        dangerous=report.dangerous, formation_name=report.lineup.formation_name,
        mine_values=mine_values, mine_extras=mine_extras, verified_form=form,
    )


def advise_full(session: Session, report: OpponentReport, mine_team_id: Optional[int]) -> tuple[list[Suggestion], dict]:
    """Trả về (các `Suggestion` gốc, payload JSON). Bước chọn đội hình dùng bản gốc (có trọng số nhấn mạnh)."""
    if mine_team_id is not None and mine_team_id == report.team_id:
        mine_team_id = None  # không so đội với chính nó
    mine_values, mine_extras, mine_name = my_profile(session, mine_team_id)
    suggestions = evaluate(context_for(report, mine_values, mine_extras))
    payload = {
        "opponent": report.name,
        "opponent_formation": report.lineup.formation_name,
        "my_team": {"team_id": mine_team_id, "name": mine_name} if mine_name else None,
        "compared_with_league": report.benchmark is not None,
        "suggestions": [s.as_dict() for s in suggestions],
        "formation_counters": formation_counters(report.lineup.formation_name),
        "notes": [
            *([] if report.benchmark else ["Chưa đủ đội cùng giải để so phân vị: nhiều luật chỉ so với đội của bạn."]),
            *([] if mine_name else ["Chưa biết đội của bạn: các luật so sánh với đội bạn không được xét."]),
        ],
    }
    return suggestions, payload


def advise(session: Session, report: OpponentReport, mine_team_id: Optional[int]) -> dict:
    return advise_full(session, report, mine_team_id)[1]
