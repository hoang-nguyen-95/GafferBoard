from tests.helpers import add_team


def test_compare_players(client):
    data = client.get("/compare/players", params={"a": 101, "b": 103}).json()
    assert data["a"]["player"]["player_id"] == 101 and data["b"]["player"]["player_id"] == 103
    assert data["a"]["role"] == "AM" and data["b"]["role"] == "ST" and data["same_role"] is False
    rows = {r["key"]: r for r in data["rows"]}
    assert rows["overall"] == {"key": "overall", "label": "OVR", "a": 88, "b": 75, "diff": 13, "better": "a"}
    assert rows["sprint_speed"]["a"] == 66 and rows["sprint_speed"]["b"] == 90 and rows["sprint_speed"]["better"] == "b"
    assert rows["age"]["a"] == 31 and rows["age"]["b"] == 27                       # 1994-09-08 và 1999-05-27, tham chiếu 2026-05-31
    assert "finishing" in rows and "vision" in rows                                # hợp các chỉ số của cả hai vai trò
    assert len(data["a"]["radar"]) == len(data["b"]["radar"]) == 6
    assert data["a"]["club"]["name"] == "Manchester Utd"


def test_compare_players_validation(client):
    assert client.get("/compare/players", params={"a": 101, "b": 101}).status_code == 422
    assert client.get("/compare/players", params={"a": 101, "b": 999999}).status_code == 404
    assert client.get("/compare/players", params={"a": 101}).status_code == 422


def test_compare_teams(session):
    from fastapi.testclient import TestClient
    from app.db import get_session
    from app.main import app
    for tid in range(1, 9):
        add_team(session, tid, speed=75)
    add_team(session, 9, speed=45)
    app.dependency_overrides[get_session] = lambda: session
    try:
        c = TestClient(app)
        data = c.get("/compare/teams", params={"a": 1, "b": 9}).json()
        assert data["a"]["name"] == "Đội 1" and data["b"]["formation"] == "4-3-3"
        rows = {r["key"]: r for r in data["metrics"]}
        assert rows["def_pace"]["a"] == 75.0 and rows["def_pace"]["b"] == 45.0 and rows["def_pace"]["better"] == "a"
        assert rows["def_pace"]["percentile_b"] < rows["def_pace"]["percentile_a"]
        assert rows["depth_drop"]["better"] is None and rows["depth_drop"]["diff"] == 0   # cùng độ sâu
        assert {r["key"] for r in data["ratings"]} == {"overall", "attack", "midfield", "defense"}
        assert c.get("/compare/teams", params={"a": 1, "b": 1}).status_code == 422
        assert c.get("/compare/teams", params={"a": 1, "b": 404}).status_code == 404
    finally:
        app.dependency_overrides.clear()


def test_depth_drop_lower_is_better(session):
    from fastapi.testclient import TestClient
    from app.db import get_session
    from app.main import app
    add_team(session, 1, bench_overall=70)     # chênh nhỏ (75 vs 70)
    add_team(session, 2, bench_overall=50)     # chênh lớn
    app.dependency_overrides[get_session] = lambda: session
    try:
        rows = {r["key"]: r for r in TestClient(app).get("/compare/teams", params={"a": 1, "b": 2}).json()["metrics"]}
        assert rows["depth_drop"]["a"] < rows["depth_drop"]["b"] and rows["depth_drop"]["better"] == "a"
        assert rows["bench_quality"]["better"] == "a"
    finally:
        app.dependency_overrides.clear()
