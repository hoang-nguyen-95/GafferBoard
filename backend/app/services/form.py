"""Phong độ gần đây của một đội.

Nguồn đáng tin: kết quả người dùng nhập tay (có tỷ số). Dự phòng: chuỗi phong độ của game
(`leagueteamlinks.teamform`) — cách đọc các chữ số 0/1/2 CHƯA được kiểm chứng (xem docs/data-schema.md §4.3
và mục "vướng mắc"), nên kết quả luôn mang cờ `verified = False`.
"""
from typing import Optional

from sqlalchemy import select
from sqlmodel import Session

from app.models import MatchResult, TeamStanding

FORM_MATCHES = 5
POINTS = {"W": 3, "D": 1, "L": 0}
# GIẢ THUYẾT chưa xác nhận: 0 = thua, 1 = hòa, 2 = thắng. Sửa ở đây khi đã kiểm chứng.
GAME_FORM_DIGITS = {"0": "L", "1": "D", "2": "W"}


def outcome(goals_for: int, goals_against: int) -> str:
    return "W" if goals_for > goals_against else "D" if goals_for == goals_against else "L"


def form_from_results(results: list[MatchResult]) -> dict:
    """`results` đã sắp theo thời gian giảm dần (mới nhất trước)."""
    last = results[:FORM_MATCHES]
    letters = [outcome(r.goals_for, r.goals_against) for r in last]
    return {
        "source": "manual",
        "verified": True,
        "matches": len(last),
        "sequence": "".join(letters),  # mới nhất trước
        "wins": letters.count("W"), "draws": letters.count("D"), "losses": letters.count("L"),
        "points": sum(POINTS[x] for x in letters),
        "max_points": POINTS["W"] * len(last),
        "goals_for": sum(r.goals_for for r in last),
        "goals_against": sum(r.goals_against for r in last),
        "goal_difference": sum(r.goals_for - r.goals_against for r in last),
        "results": [
            {"id": r.id, "opponent_name": r.opponent_name, "goals_for": r.goals_for,
             "goals_against": r.goals_against, "played_on": r.played_on.isoformat() if r.played_on else None,
             "is_home": r.is_home}
            for r in last
        ],
    }


def form_from_game(form_raw: Optional[str]) -> Optional[dict]:
    """Ước tính từ chuỗi của game. Chuỗi rỗng hoặc "0" nghĩa là chưa có trận (không thể phân biệt với thua)."""
    if not form_raw or form_raw == "0" or any(c not in GAME_FORM_DIGITS for c in form_raw):
        return None
    letters = [GAME_FORM_DIGITS[c] for c in form_raw]
    return {
        "source": "game", "verified": False, "matches": len(letters), "sequence": None,
        "wins": letters.count("W"), "draws": letters.count("D"), "losses": letters.count("L"),
        "points": sum(POINTS[x] for x in letters), "max_points": POINTS["W"] * len(letters),
        "goals_for": None, "goals_against": None, "goal_difference": None, "results": [],
    }


def team_results(session: Session, team_id: int) -> list[MatchResult]:
    stmt = (
        select(MatchResult).where(MatchResult.team_id == team_id)
        .order_by(MatchResult.played_on.desc().nulls_last(), MatchResult.id.desc())
    )
    return list(session.execute(stmt).scalars())


def team_form(session: Session, team_id: int) -> Optional[dict]:
    results = team_results(session, team_id)
    if results:
        return form_from_results(results)
    standing = session.get(TeamStanding, team_id)
    return form_from_game(standing.form_raw if standing else None)
