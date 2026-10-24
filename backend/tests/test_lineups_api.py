from fastapi.testclient import TestClient

from app.db import get_session
from app.main import app
from app.models import AppSetting, SquadMember
from tests.helpers import add_formations, add_team


def make_client(session):
    app.dependency_overrides[get_session] = lambda: session
    return TestClient(app)


def test_counter_lineups_endpoint_returns_valid_explained_options(session):
    for tid in range(1, 9):
        add_team(session, tid, speed=75)
    add_team(session, 9, speed=45)               # đối thủ có hàng thủ rất chậm
    add_formations(session)
    session.add(AppSetting(key="user_team_id", value="1"))
    session.commit()
    try:
        data = make_client(session).get("/teams/9/counter-lineups").json()
    finally:
        app.dependency_overrides.clear()
    assert data["opponent"] == "Đội 9" and data["my_team_id"] == 1 and data["available_players"] == 19
    assert 1 <= len(data["options"]) <= 3
    assert any("Hàng thủ đối thủ chậm" in r for r in data["rules_applied"])   # luật khai thác tốc độ đã tác động
    for o in data["options"]:
        assert o["valid"] and len(o["slots"]) == 11
        ids = [s["player"]["player_id"] for s in o["slots"]]
        assert len(set(ids)) == 11 and o["slots"][0]["position_name"] == "GK"
        assert all(s["reasons"] for s in o["slots"])
        assert o["why_formation"] and o["formation"]["name"] in {"4-3-3", "4-4-2", "4-2-3-1"}


def test_counter_lineups_errors(client):
    assert client.get("/teams/999/counter-lineups").status_code == 404
    assert client.get("/teams/11/counter-lineups").status_code == 422          # đội mình = đối thủ
    r = client.get("/teams/22/counter-lineups")                                 # squad mẫu chỉ có 3 người
    assert r.status_code == 200
    options = r.json()["options"]
    assert options and all(not o["valid"] and o["warnings"] for o in options)


def test_counter_lineups_without_user_team_is_explained(session):
    add_team(session, 1)
    add_team(session, 2)
    add_formations(session)
    try:
        r = make_client(session).get("/teams/2/counter-lineups")
    finally:
        app.dependency_overrides.clear()
    assert r.status_code == 409 and "chọn đội" in r.json()["detail"]
