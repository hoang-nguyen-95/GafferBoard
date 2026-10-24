import pytest
from fastapi.testclient import TestClient

from app.db import get_session
from app.main import app
from app.models import AppSetting, ManualLineup
from app.services.manual import MIN_SHARE_FOR_LEAGUE, analyze_manual, infer_league
from app.services.opponent import analyze_team
from tests.helpers import POSITIONS_433, add_formations, add_team, make_player

F433 = 8


@pytest.fixture
def league(session):
    """9 đội cùng giải 13; đội 9 có hàng thủ rất chậm. Đội của người dùng = đội 1."""
    for tid in range(1, 9):
        add_team(session, tid, speed=75)
    add_team(session, 9, speed=45)
    add_formations(session)
    session.add(AppSetting(key="user_team_id", value="1"))
    session.commit()
    return session


@pytest.fixture
def api(league):
    app.dependency_overrides[get_session] = lambda: league
    yield TestClient(app)
    app.dependency_overrides.clear()


def team_ids(team_id):
    return [team_id * 100 + i for i in range(11)]   # 11 cầu thủ ra sân theo thứ tự 4-3-3 của add_team


def body(player_ids, name="Đối thủ thử", formation_id=F433, **extra):
    return {"name": name, "formation_id": formation_id, "player_ids": player_ids, **extra}


def test_crud_roundtrip(api):
    created = api.post("/manual-lineups", json=body(team_ids(9))).json()
    assert created["name"] == "Đối thủ thử" and created["formation"]["name"] == "4-3-3"
    assert [s["position_name"] for s in created["slots"]][:3] == ["GK", "RB", "RCB"]
    assert created["slots"][0]["player"]["player_id"] == 900
    lid = created["id"]
    assert [m["id"] for m in api.get("/manual-lineups").json()] == [lid]
    assert api.get("/manual-lineups").json()[0]["players"] == 11

    ids = team_ids(9)
    ids[10] = None                                                     # bỏ cầu thủ cuối
    updated = api.put(f"/manual-lineups/{lid}", json=body(ids, name="Đổi tên", formation_id=16)).json()
    assert updated["name"] == "Đổi tên" and updated["formation"]["name"] == "4-4-2"
    assert updated["slots"][10]["player"] is None
    assert api.get(f"/manual-lineups/{lid}").json()["name"] == "Đổi tên"

    assert api.delete(f"/manual-lineups/{lid}").json() == {"deleted": lid}
    assert api.get(f"/manual-lineups/{lid}").status_code == 404
    assert api.delete(f"/manual-lineups/{lid}").status_code == 404


def test_validation(api):
    ok = team_ids(9)
    assert api.post("/manual-lineups", json=body(ok, formation_id=999)).status_code == 404
    assert api.post("/manual-lineups", json=body(ok[:10])).status_code == 422                   # thiếu phần tử
    assert api.post("/manual-lineups", json=body([None] * 11)).status_code == 422               # không có ai
    assert api.post("/manual-lineups", json=body([900] * 11)).status_code == 422                # trùng người
    assert api.post("/manual-lineups", json=body([*ok[:10], 424242])).status_code == 404        # cầu thủ không tồn tại
    assert api.post("/manual-lineups", json=body(ok, name="")).status_code == 422
    assert api.post("/manual-lineups", json=body(ok, league_id=12345)).status_code == 404
    assert api.put("/manual-lineups/77", json=body(ok)).status_code == 404


def test_formations_endpoint_lists_variants(api):
    data = api.get("/formations").json()
    assert {f["name"] for f in data} == {"4-3-3", "4-4-2", "4-2-3-1"}
    f433 = next(f for f in data if f["name"] == "4-3-3")
    assert f433["positions"][:3] == ["GK", "RB", "RCB"] and len(f433["position_codes"]) == 11


def test_manual_analysis_matches_team_analysis_for_the_same_eleven(league):
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    manual = ManualLineup(name="bản sao đội 9", formation_id=F433, created_at=now, updated_at=now,
                          slots=[{"slot": i, "player_id": pid} for i, pid in enumerate(team_ids(9))])
    league.add(manual)
    league.commit()
    from_manual, from_team = analyze_manual(league, manual), analyze_team(league, 9)
    shared = [k for k in from_team.values if k not in ("bench_quality", "depth_drop")]
    for k in shared:
        assert from_manual.values[k] == from_team.values[k], k
        assert from_manual.percentiles[k] == from_team.percentiles[k], k           # cùng giải suy ra: 13
    assert from_manual.benchmark["league_id"] == 13 == from_team.benchmark["league_id"]
    assert from_manual.values["bench_quality"] is None and from_manual.values["depth_drop"] is None  # không có dự bị
    assert from_manual.extras["slowest_defender"] == from_team.extras["slowest_defender"]
    assert from_manual.dangerous == from_team.dangerous
    assert from_manual.team_id is None and from_manual.form is None


def test_analysis_endpoint_and_weak_points(api):
    lid = api.post("/manual-lineups", json=body(team_ids(9))).json()["id"]
    data = api.get(f"/manual-lineups/{lid}/analysis").json()
    assert data["name"] == "Đối thủ thử" and data["team_id"] is None
    assert data["lineup"]["source"] == "manual" and data["lineup"]["formation_name"] == "4-3-3"
    assert len(data["lineup"]["slots"]) == 11
    metrics = {m["key"]: m for m in data["metrics"]}
    assert metrics["def_pace"]["percentile"] < 15                                 # hàng thủ rất chậm so với giải
    assert any(w["kind"] == "team" and w["metric"] == "def_pace" for w in data["weak_points"])
    assert data["benchmark"]["league_id"] == 13


def test_suggestions_and_counter_lineups_for_manual_opponent(api):
    lid = api.post("/manual-lineups", json=body(team_ids(9))).json()["id"]
    sug = api.get(f"/manual-lineups/{lid}/suggestions").json()
    assert sug["opponent"] == "Đối thủ thử" and sug["my_team"]["team_id"] == 1
    assert sug["suggestions"][0]["rule_id"] == "slow_defence"
    assert any("của bạn" in e for e in sug["suggestions"][0]["evidence"])
    counter = api.get(f"/manual-lineups/{lid}/counter-lineups").json()
    assert counter["opponent"] == "Đối thủ thử" and counter["my_team_id"] == 1
    assert counter["options"] and all(o["valid"] and len(o["slots"]) == 11 for o in counter["options"])
    assert any("Hàng thủ đối thủ chậm" in r for r in counter["rules_applied"])


def test_counter_lineups_for_manual_requires_my_team(league):
    from fastapi.testclient import TestClient
    league.delete(league.get(AppSetting, "user_team_id"))
    league.commit()
    app.dependency_overrides[get_session] = lambda: league
    try:
        c = TestClient(app)
        lid = c.post("/manual-lineups", json=body(team_ids(9))).json()["id"]
        assert c.get(f"/manual-lineups/{lid}/counter-lineups").status_code == 409
        assert c.get(f"/manual-lineups/{lid}/counter-lineups", params={"mine": 1}).status_code == 200
    finally:
        app.dependency_overrides.clear()


def test_partial_lineup_is_analysed_without_crashing(api):
    ids = [None] * 11
    ids[0], ids[9] = 900, 909                      # chỉ thủ môn và tiền đạo cắm
    lid = api.post("/manual-lineups", json=body(ids)).json()["id"]
    data = api.get(f"/manual-lineups/{lid}/analysis").json()
    assert data["lineup"]["slots"][1]["player"] is None
    metrics = {m["key"]: m["value"] for m in data["metrics"]}
    assert metrics["def_pace"] is None and metrics["gk_reflexes"] is not None
    assert api.get(f"/manual-lineups/{lid}/suggestions").status_code == 200


def test_league_inference(league):
    from app.models import Player
    players = [league.get(Player, pid) for pid in team_ids(9)]
    assert infer_league(league, players) == (13, "Giải 13")
    stray = make_player(8000, positions=[25])      # không có CLB
    league.add(stray)
    league.commit()
    mixed = [stray] * 8 + players[:2]              # chỉ 20% có giải
    assert infer_league(league, mixed) == (None, None)
    assert infer_league(league, []) == (None, None)
    assert MIN_SHARE_FOR_LEAGUE == 0.5


def test_explicit_league_overrides_inference(api):
    lid = api.post("/manual-lineups", json=body(team_ids(9), league_id=13)).json()["id"]
    assert api.get(f"/manual-lineups/{lid}/analysis").json()["benchmark"]["league_name"] == "Giải 13"
