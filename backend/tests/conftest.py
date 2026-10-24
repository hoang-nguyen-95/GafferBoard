from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.db import get_engine, get_session, run_migrations
from app.importers.live_editor import import_exports
from app.main import app
from tests.sample_data import MAPPING, write_sample_export


@pytest.fixture
def db_url(tmp_path: Path) -> str:
    url = f"sqlite:///{tmp_path / 'test.db'}"
    run_migrations(url)
    return url


@pytest.fixture
def session(db_url):
    with Session(get_engine(db_url)) as s:
        yield s


@pytest.fixture
def exports(tmp_path: Path) -> Path:
    d = tmp_path / "exports"
    write_sample_export(d)
    return d


@pytest.fixture
def imported(session, exports):
    import_exports(session, exports, MAPPING)
    session.commit()
    return session


@pytest.fixture
def client(imported):
    app.dependency_overrides[get_session] = lambda: imported
    yield TestClient(app)
    app.dependency_overrides.clear()
