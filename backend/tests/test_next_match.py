from datetime import date, datetime, timezone

from sqlalchemy import delete

from app.models import AppSetting, Fixture, ImportRun, UserProfile
from app.services.schedule import opponent_of, upcoming_fixtures
from app.services.settings import effective_user_team, set_int
from tests.helpers import add_team


def fx(i, home, away, d=None, t=None):
    return Fixture(fixture_id=i, home_team_id=home, away_team_id=away, fixture_date=d, fixture_time=t)


def test_upcoming_fixtures_sorted_by_date_then_time_and_filtered(session):
    session.add_all([
        fx(1, 10, 20, date(2026, 8, 10), 70000), fx(2, 30, 10, date(2026, 8, 3), 80000),
        fx(3, 10, 40, date(2026, 8, 3), 60000), fx(4, 50, 60, date(2026, 8, 1), 50000), fx(5, 10, 70, None, None),
    ])
    session.commit()
    assert [f.fixture_id for f in upcoming_fixtures(session, 10)] == [3, 2, 1, 5]  # ngày không rõ xếp cuối
    assert upcoming_fixtures(session, 999) == []
    assert opponent_of(fx(2, 30, 10), 10) == 30 and opponent_of(fx(1, 10, 20), 10) == 20


def test_user_team_manual_choice_beats_game_profile(session):
    assert effective_user_team(session) == (None, None)
    session.add(UserProfile(user_id=0, user_team_id=11))
    session.commit()
    assert effective_user_team(session) == (11, "game")
    set_int(session, "user_team_id", 22)
    assert effective_user_team(session) == (22, "manual")
    set_int(session, "user_team_id", None)
    assert effective_user_team(session) == (11, "game")
    assert session.get(AppSetting, "user_team_id") is None


def test_next_match_from_fixtures(client):
    data = client.get("/next-match").json()
    assert data["user_team"]["name"] == "Manchester Utd" and data["user_team_source"] == "game"
    assert data["source"] == "fixture" and data["opponent"]["team_id"] == 22
    assert data["fixture"]["fixture_id"] == 900 and data["fixture"]["is_home"] is True
    assert data["fixture"]["date"] == "2026-05-31"
    assert [f["fixture_id"] for f in data["upcoming"]] == [900, 901]
    assert data["upcoming"][1]["is_home"] is False


def test_manual_opponent_overrides_and_can_be_cleared(client):
    data = client.put("/settings/opponent", json={"team_id": 33}).json()
    assert data["source"] == "manual" and data["opponent"]["team_id"] == 33
    assert data["fixture"] is None and len(data["upcoming"]) == 2   # vẫn liệt kê lịch thật
    assert client.get("/next-match").json()["opponent"]["team_id"] == 33   # lưu bền
    cleared = client.put("/settings/opponent", json={"team_id": None}).json()
    assert cleared["source"] == "fixture" and cleared["opponent"]["team_id"] == 22
    assert client.put("/settings/opponent", json={"team_id": 999}).status_code == 404


def test_changing_user_team_changes_opponent(client):
    meta = client.put("/settings/user-team", json={"team_id": 22}).json()
    assert meta["user_team"]["team_id"] == 22 and meta["user_team_source"] == "manual"
    nxt = client.get("/next-match").json()
    assert nxt["opponent"]["team_id"] == 11 and nxt["fixture"]["is_home"] is False
    assert client.put("/settings/user-team", json={"team_id": 999}).status_code == 404
    back = client.put("/settings/user-team", json={"team_id": None}).json()
    assert back["user_team"]["team_id"] == 11 and back["user_team_source"] == "game"


def test_no_fixtures_and_no_user_team_are_explained(client, imported):
    imported.execute(delete(Fixture))
    imported.commit()
    data = client.get("/next-match").json()
    assert data["source"] == "none" and data["reason"] == "no_fixtures" and data["opponent"] is None
    imported.execute(delete(UserProfile))
    imported.commit()
    data = client.get("/next-match").json()
    assert data["reason"] == "no_user_team" and data["user_team"] is None


def test_meta_reports_counts_and_last_import(client, imported):
    meta = client.get("/meta").json()
    assert meta["teams"] == 3 and meta["players"] == 5 and meta["fixtures"] == 2
    assert meta["last_import_at"] is None and meta["reference_date"] == "2026-05-31"
    imported.add(ImportRun(finished_at=datetime(2026, 8, 1, 12, 0, tzinfo=timezone.utc)))
    imported.commit()
    assert client.get("/meta").json()["last_import_at"].startswith("2026-08-01T12:00")


def test_next_match_after_reimport_follows_new_fixtures(session, exports):
    from app.importers.live_editor import import_exports
    from tests.sample_data import MAPPING, table_header, write_csv
    import_exports(session, exports, MAPPING)
    session.commit()
    # Mùa giải sang vòng mới: trận 900 đã đá, lịch có thêm trận mới sớm hơn trận 901
    write_csv(exports / "fixtures.csv", table_header("fixtures"), [
        dict(fixtureid="901", competitionid="13", hometeamid="22", awayteamid="11", fixturedate="162040"),
        dict(fixtureid="902", competitionid="13", hometeamid="11", awayteamid="33", fixturedate="162036"),
    ])
    import_exports(session, exports, MAPPING)
    session.commit()
    assert [f.fixture_id for f in upcoming_fixtures(session, 11)] == [902, 901]
