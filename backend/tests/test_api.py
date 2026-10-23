def test_health(client):
    assert client.get("/health").json() == {"status": "ok"}


def test_teams_list_includes_league_from_standings(client):
    teams = {t["team_id"]: t for t in client.get("/teams").json()}
    assert teams[11]["name"] == "Manchester Utd"
    assert teams[11]["league_id"] == 13 and teams[11]["league_name"] == "Premier League"
    assert teams[33]["league_name"] is None  # leagueid 383 không có trong leagues


def test_teams_filters(client):
    assert {t["team_id"] for t in client.get("/teams", params={"league": 13}).json()} == {11, 22}
    assert [t["team_id"] for t in client.get("/teams", params={"q": "city"}).json()] == [22]


def test_team_detail_and_404(client):
    assert client.get("/teams/22").json()["name"] == "Test City"
    assert client.get("/teams/999").status_code == 404


def test_players_by_team_sorted_by_overall_with_squad_info(client):
    rows = client.get("/players", params={"team": 11}).json()
    assert [r["player_id"] for r in rows] == [101, 102, 103]
    top = rows[0]
    assert top["overall"] == 88 and top["positions"] == [18]
    assert top["team_id"] == 11 and top["squad_position"] == 18 and top["jersey_number"] == 8
    assert top["name"] is None


def test_players_without_filter_and_pagination(client):
    assert len(client.get("/players").json()) == 5
    page = client.get("/players", params={"limit": 2, "offset": 1}).json()
    assert [r["player_id"] for r in page] == [102, 103]


def test_player_detail_has_all_attributes(client):
    p = client.get("/players/103").json()
    assert p["sprint_speed"] == 90 and p["positions"] == [25, 23, 27]
    assert client.get("/players/999999").status_code == 404


def test_leagues(client):
    assert [l["league_id"] for l in client.get("/leagues").json()] == [13, 53]
