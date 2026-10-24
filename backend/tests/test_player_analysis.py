import pytest

from app.models import League, Player, SquadMember, Team, TeamStanding
from app.services.analysis import (
    MIN_PEERS, STRENGTH_PCT, WEAKNESS_PCT, analyze_player, percentile,
)


def test_percentile_counts_ties_as_half():
    values = [10, 20, 20, 30]
    assert percentile(values, 30) == 87.5
    assert percentile(values, 20) == 50.0
    assert percentile(values, 5) == 0.0
    assert percentile([], 50) == 50.0


def add_players(session, n, league_id=13, team_id=1, role_pos=25, start_id=1000):
    session.add(League(league_id=league_id, name=f"Giải {league_id}"))
    session.add(Team(team_id=team_id, name=f"Đội {team_id}"))
    session.add(TeamStanding(team_id=team_id, league_id=league_id))
    players = []
    for i in range(n):
        p = Player(
            player_id=start_id + i, overall=60 + i, gender=0, positions=[role_pos], primary_position=role_pos,
            finishing=40 + i, heading_accuracy=90 - i, strength=50, composure=50, sprint_speed=50,
            acceleration=50, shot_power=50, positioning=50, ball_control=50, volleys=50, jumping=50, height=180,
            pac_div=50, sho_han=50, pas_kic=50, dri_ref=50, def_spe=50, phy_pos=50,
        )
        session.add(p)
        session.add(SquadMember(team_id=team_id, player_id=p.player_id))
        players.append(p)
    session.commit()
    return players


def test_strengths_and_weaknesses_from_percentiles(session):
    players = add_players(session, 50)
    best_finisher_worst_header = players[-1]   # finishing cao nhất, đánh đầu thấp nhất
    result = analyze_player(session, best_finisher_worst_header, "auto")
    strengths = {a["key"] for a in result["strengths"]}
    weaknesses = {a["key"] for a in result["weaknesses"]}
    assert "finishing" in strengths and "heading_accuracy" in weaknesses
    by_key = {a["key"]: a for a in result["attributes"]}
    assert by_key["finishing"]["percentile"] >= STRENGTH_PCT
    assert by_key["heading_accuracy"]["percentile"] <= WEAKNESS_PCT
    # Chỉ số bằng nhau cả nhóm (strength=50) -> phân vị giữa, không phải mạnh/yếu
    assert 40 <= by_key["strength"]["percentile"] <= 60
    assert result["role"] == "ST" and result["line"] == "ATT"
    assert "mạnh về" in result["summary"] and "yếu về" in result["summary"]


def test_only_role_relevant_attributes_are_judged(session):
    players = add_players(session, 50)
    keys = {a["key"] for a in analyze_player(session, players[0], "auto")["attributes"]}
    assert "gk_diving" not in keys and "finishing" in keys  # tiền đạo không bị xét chỉ số thủ môn


def test_peer_group_falls_back_to_all_when_league_is_small(session):
    players = add_players(session, MIN_PEERS - 5)
    assert analyze_player(session, players[0], "auto")["peer_group"]["kind"] == "all"
    assert analyze_player(session, players[0], "league")["peer_group"]["kind"] == "league"


def test_peer_group_uses_league_when_large_enough_and_excludes_other_leagues(session):
    players = add_players(session, MIN_PEERS + 5, league_id=13, team_id=1)
    add_players(session, 10, league_id=99, team_id=2, start_id=5000)  # giải khác
    result = analyze_player(session, players[0], "auto")
    assert result["peer_group"] == {"kind": "league", "name": "Giải 13", "size": MIN_PEERS + 5}
    assert analyze_player(session, players[0], "all")["peer_group"]["size"] == MIN_PEERS + 15


def test_goalkeeper_uses_goalkeeper_radar_and_attributes(session):
    session.add(League(league_id=13, name="PL"))
    session.add(Team(team_id=1, name="Đội"))
    session.add(TeamStanding(team_id=1, league_id=13))
    gk = Player(player_id=1, overall=80, gender=0, positions=[0], primary_position=0, gk_diving=85, gk_handling=70,
                gk_kicking=60, gk_positioning=75, gk_reflexes=82, pac_div=80, sho_han=70, pas_kic=60, dri_ref=82,
                def_spe=40, phy_pos=75, jumping=50, height=190)
    session.add(gk)
    session.add(SquadMember(team_id=1, player_id=1))
    session.commit()
    result = analyze_player(session, gk, "auto")
    assert [r["label"] for r in result["radar"]] == ["DIV", "HAN", "KIC", "REF", "SPE", "POS"]
    assert result["role"] == "GK" and {"gk_diving", "gk_reflexes"} <= {a["key"] for a in result["attributes"]}


def test_player_without_club_still_analyzed_against_everyone(session):
    p = Player(player_id=1, overall=70, gender=0, positions=[25], primary_position=25, finishing=70,
               pac_div=50, sho_han=50, pas_kic=50, dri_ref=50, def_spe=50, phy_pos=50)
    session.add(p)
    session.commit()
    result = analyze_player(session, p, "auto")
    assert result["peer_group"]["kind"] == "all"


def test_api_player_analysis_and_404(client):
    data = client.get("/players/101/analysis").json()
    assert data["player_id"] == 101 and data["club"]["name"] == "Manchester Utd"
    assert data["role"] == "AM" and len(data["radar"]) == 6
    assert client.get("/players/101/analysis", params={"scope": "bad"}).status_code == 422
    assert client.get("/players/999999/analysis").status_code == 404
