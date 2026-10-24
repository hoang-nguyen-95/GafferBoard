"""Lịch thi đấu: trận kế tiếp của một đội.

Bảng `fixtures` của game chỉ chứa các trận sắp diễn ra (trận đã đá biến khỏi bảng, xem docs/data-schema.md),
nên trận kế tiếp là trận có ngày sớm nhất. Tiền mùa giải có thể chưa có lịch của giải bạn.
"""
from sqlalchemy import or_, select
from sqlmodel import Session

from app.models import Fixture


def upcoming_fixtures(session: Session, team_id: int, limit: int = 5) -> list[Fixture]:
    stmt = (
        select(Fixture)
        .where(or_(Fixture.home_team_id == team_id, Fixture.away_team_id == team_id))
        .order_by(Fixture.fixture_date.asc().nulls_last(), Fixture.fixture_time.asc().nulls_last(), Fixture.fixture_id)
        .limit(limit)
    )
    return list(session.execute(stmt).scalars())


def opponent_of(fixture: Fixture, team_id: int) -> int:
    return fixture.away_team_id if fixture.home_team_id == team_id else fixture.home_team_id
