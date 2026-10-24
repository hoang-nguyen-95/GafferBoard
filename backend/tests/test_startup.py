import sqlite3

from fastapi.testclient import TestClient

from app.db import get_engine


def test_api_startup_upgrades_an_old_database(tmp_path, monkeypatch):
    """DB tạo bằng phiên bản cũ (thiếu bảng mới) không được làm API lỗi: lifespan chạy migration."""
    db = tmp_path / "old.db"
    sqlite3.connect(db).close()                        # DB rỗng, chưa có bảng nào
    monkeypatch.setenv("COUNTERPICK_DB", str(db))
    get_engine.cache_clear()
    from app.main import app

    with TestClient(app) as client:                   # `with` mới chạy lifespan
        assert client.get("/health").json() == {"status": "ok"}
        assert client.get("/meta").json()["teams"] == 0   # bảng team/appsetting đã tồn tại
        assert client.get("/next-match").json()["reason"] == "no_user_team"
    get_engine.cache_clear()
