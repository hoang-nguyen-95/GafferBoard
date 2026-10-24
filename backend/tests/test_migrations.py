from sqlalchemy import inspect
from sqlmodel import SQLModel

from app.db import get_engine


def test_migrations_create_every_model_table(db_url):
    tables = set(inspect(get_engine(db_url)).get_table_names())
    assert set(SQLModel.metadata.tables) <= tables
    assert "alembic_version" in tables
