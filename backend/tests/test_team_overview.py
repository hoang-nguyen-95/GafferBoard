from app.models import Player
from app.services.teams import line_averages, resolve_lineup, squad_players, SlotView


def test_overview_for_team_with_partial_teamsheet(client):
    data = client.get("/teams/11/overview").json()
    assert data["team"]["name"] == "Manchester Utd" and data["standing"]["position"] == 3
    lineup = data["lineup"]
    assert lineup["source"] == "teamsheet" and lineup["formation_name"] == "4-2-3-1"
    assert lineup["relative_formation_id"] == 3 and len(lineup["slots"]) == 11
    slots = lineup["slots"]
    assert slots[0]["player"]["player_id"] == 102 and not slots[0]["inferred"]
    assert slots[1]["player"]["player_id"] == 101
    filled = [s for s in slots[2:] if s["player"]]
    assert len(filled) == 1 and filled[0]["inferred"] and filled[0]["player"]["player_id"] == 103  # squad chỉ còn 1 người
    assert sum(1 for s in slots if s["player"] is None) == 8
    assert slots[0]["position_name"] == "GK" and slots[0]["line"] == "GK"


def test_squad_grouped_by_line_with_xi_flag(client):
    squad = client.get("/teams/11/overview").json()["squad"]
    assert [p["player_id"] for p in squad["GK"]] == [102]
    assert [p["player_id"] for p in squad["MID"]] == [101]      # CAM thuộc tuyến tiền vệ
    assert [p["player_id"] for p in squad["ATT"]] == [103]
    assert all(p["in_xi"] for line in squad.values() for p in line)  # 103 được điền vào đội hình
    assert squad["MID"][0]["jersey_number"] == 8 and squad["MID"][0]["role"] == "AM"


def test_line_averages_use_slot_position_not_player_role(client):
    data = client.get("/teams/11/overview").json()["line_averages"]
    assert data["GK"]["count"] == 1 and data["GK"]["overall"] == 81.0
    assert data["MID"]["count"] == 1 and data["MID"]["overall"] == 88.0
    assert data["ATT"]["count"] == 0 and data["ATT"]["overall"] is None


def test_team_without_players_has_no_lineup(client):
    data = client.get("/teams/33/overview").json()
    assert data["lineup"]["source"] == "none" and data["lineup"]["slots"] == []
    assert data["squad"] == {"GK": [], "DEF": [], "MID": [], "ATT": []}


def test_team_without_teamsheet_infers_default_formation(client, imported):
    from app.models import TeamLineup
    imported.delete(imported.get(TeamLineup, 22))
    imported.commit()
    view = resolve_lineup(imported, 22)
    assert view.source == "inferred" and view.formation_name == "4-3-3"
    assert [sv.player.player_id for sv in view.slots if sv.player] and all(sv.inferred for sv in view.slots)


def test_overview_404(client):
    assert client.get("/teams/999/overview").status_code == 404


def test_line_averages_ignores_empty_slots():
    p = Player(player_id=1, overall=80, positions=[5], sprint_speed=70)
    avg = line_averages([SlotView(0, 5, p), SlotView(1, 4, None)])
    assert avg["DEF"]["count"] == 1 and avg["DEF"]["sprint_speed"] == 70.0
