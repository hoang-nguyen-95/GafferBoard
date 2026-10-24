from functools import lru_cache
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import Engine, event
from sqlmodel import Session, create_engine

from app.config import BACKEND_DIR, database_url


@lru_cache
def get_engine(url: str | None = None) -> Engine:
    url = url or database_url()
    if url.startswith("sqlite:///"):
        Path(url.removeprefix("sqlite:///")).parent.mkdir(parents=True, exist_ok=True)
    engine = create_engine(url, connect_args={"check_same_thread": False})

    @event.listens_for(engine, "connect")
    def _pragmas(dbapi_conn, _):  # noqa: ANN001
        cur = dbapi_conn.cursor()
        cur.execute("PRAGMA journal_mode=WAL")
        cur.close()

    return engine


def get_session():
    with Session(get_engine()) as session:
        yield session


def run_migrations(url: str | None = None) -> None:
    """Đưa DB lên phiên bản mới nhất bằng Alembic."""
    cfg = Config(str(BACKEND_DIR / "alembic.ini"))
    cfg.set_main_option("script_location", str(BACKEND_DIR / "alembic"))
    cfg.set_main_option("sqlalchemy.url", (url or database_url()).replace("%", "%%"))
    command.upgrade(cfg, "head")
