from typing import Optional

from sqlalchemy import select
from sqlmodel import Session

from app.models import AppSetting, UserProfile

USER_TEAM = "user_team_id"
OPPONENT_TEAM = "opponent_team_id"


def get_int(session: Session, key: str) -> Optional[int]:
    row = session.get(AppSetting, key)
    return int(row.value) if row else None


def set_int(session: Session, key: str, value: Optional[int]) -> None:
    row = session.get(AppSetting, key)
    if value is None:
        if row:
            session.delete(row)
    elif row:
        row.value = str(value)
        session.add(row)
    else:
        session.add(AppSetting(key=key, value=str(value)))
    session.commit()


def effective_user_team(session: Session) -> tuple[Optional[int], Optional[str]]:
    """Đội của người dùng: lựa chọn thủ công thắng dữ liệu của game (career_users)."""
    manual = get_int(session, USER_TEAM)
    if manual is not None:
        return manual, "manual"
    profile = session.execute(select(UserProfile).order_by(UserProfile.user_id)).scalars().first()
    if profile and profile.user_team_id is not None:
        return profile.user_team_id, "game"
    return None, None
