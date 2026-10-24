from tests.helpers import add_team


def test_suggestions_endpoint_for_sample_data(client):
    data = client.get("/teams/22/suggestions").json()
    assert data["opponent"] == "Test City" and data["my_team"]["name"] == "Manchester Utd"   # đội mình từ career_users
    assert data["compared_with_league"] is False
    assert any("Chưa đủ đội cùng giải" in n for n in data["notes"])
    assert data["formation_counters"] and data["opponent_formation"] == "4-3-3"
    for s in data["suggestions"]:
        assert {"rule_id", "priority", "title", "advice", "tactics", "evidence", "strength", "emphasis"} <= set(s)
    assert client.get("/teams/999/suggestions").status_code == 404


def test_suggestion_ignores_my_team_when_same_as_opponent(client):
    data = client.get("/teams/11/suggestions").json()    # đội mình = đối thủ
    assert data["my_team"] is None
    assert any("Chưa biết đội của bạn" in n for n in data["notes"])


def test_explicit_mine_parameter_changes_comparison(session):
    from fastapi.testclient import TestClient
    from app.db import get_session
    from app.main import app
    for tid in range(1, 9):
        add_team(session, tid, speed=75)
    add_team(session, 9, speed=45)       # đối thủ có hàng thủ rất chậm
    app.dependency_overrides[get_session] = lambda: session
    try:
        c = TestClient(app)
        data = c.get("/teams/9/suggestions", params={"mine": 1}).json()
        assert data["compared_with_league"] is True
        top = data["suggestions"][0]
        assert top["rule_id"] == "slow_defence"
        assert any("phân vị" in e for e in top["evidence"]) and any("của bạn" in e for e in top["evidence"])
        assert top["emphasis"]["ATT"]["sprint_speed"] > 0
        fast = c.get("/teams/1/suggestions", params={"mine": 9}).json()
        assert "slow_defence" not in [s["rule_id"] for s in fast["suggestions"]]
        assert "fast_striker" in [s["rule_id"] for s in fast["suggestions"]]   # tiền đạo 75 tốc độ vs hàng thủ 45 của bạn
    finally:
        app.dependency_overrides.clear()
