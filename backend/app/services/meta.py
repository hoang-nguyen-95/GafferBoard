from datetime import date

from sqlalchemy import func, select
from sqlmodel import Session

from app.models import Fixture


def reference_date(session: Session) -> date:
    """Ngày dùng để tính tuổi. `career_calendar` của game không đọc được (xem docs/data-schema.md),
    nên lấy ngày sớm nhất trong lịch thi đấu đã nhập; không có lịch thì dùng ngày hiện tại của máy."""
    earliest = session.execute(select(func.min(Fixture.fixture_date))).scalar()
    return earliest or date.today()


def age_on(birth_date: date | None, ref: date) -> int | None:
    if birth_date is None:
        return None
    return ref.year - birth_date.year - ((ref.month, ref.day) < (birth_date.month, birth_date.day))
