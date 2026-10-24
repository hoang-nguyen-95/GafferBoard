from datetime import date, datetime, timezone

from app.models import MatchResult, TeamStanding
from app.services.form import form_from_game, form_from_results, team_form, team_results
from tests.helpers import add_team


def result(i, gf, ga, played_on=None):
    return MatchResult(id=i, team_id=1, goals_for=gf, goals_against=ga, played_on=played_on,
                       created_at=datetime.now(timezone.utc))


def test_manual_form_uses_last_five_newest_first():
    rs = [result(i, gf, ga) for i, (gf, ga) in enumerate([(2, 0), (1, 1), (0, 3), (4, 1), (1, 0), (0, 5)])]
    form = form_from_results(rs)
    assert form["matches"] == 5 and form["sequence"] == "WDLWW"  # trận thứ 6 bị bỏ
    assert (form["wins"], form["draws"], form["losses"]) == (3, 1, 1)
    assert form["points"] == 10 and form["max_points"] == 15
    assert form["goals_for"] == 8 and form["goals_against"] == 5 and form["goal_difference"] == 3
    assert form["verified"] is True and form["source"] == "manual"


def test_game_form_is_flagged_unverified_and_ignores_empty():
    form = form_from_game("22122")
    assert form["source"] == "game" and form["verified"] is False
    assert (form["wins"], form["draws"], form["losses"], form["points"]) == (4, 1, 0, 13)
    assert form["goal_difference"] is None and form["sequence"] is None
    assert form_from_game("0") is None and form_from_game("") is None and form_from_game(None) is None
    assert form_from_game("2a1") is None


def test_team_form_prefers_manual_results_over_game_string(session):
    add_team(session, 1)
    session.get(TeamStanding, 1).form_raw = "22122"
    session.commit()
    assert team_form(session, 1)["source"] == "game"
    session.add_all([result(None, 1, 0, date(2026, 8, 1)), result(None, 0, 2, date(2026, 8, 8))])
    session.commit()
    form = team_form(session, 1)
    assert form["source"] == "manual" and form["sequence"] == "LW"  # mới nhất (8/8) trước


def test_results_ordered_by_date_then_id(session):
    add_team(session, 1)
    session.add_all([result(None, 1, 0, date(2026, 8, 8)), result(None, 2, 0, date(2026, 8, 1)), result(None, 3, 0, None)])
    session.commit()
    assert [r.goals_for for r in team_results(session, 1)] == [1, 2, 3]  # ngày không rõ xếp cuối
