from datetime import date

import pytest
from sqlmodel import select

from app.importers.live_editor import MappingError, days_to_date, import_exports, load_mapping
from app.importers.run import main as run_cli
from app.models import Fixture, Player, SquadMember, Team, TeamLineup, TeamStanding, UserProfile
from tests.sample_data import MAPPING, write_csv, write_sample_export


def report_by_name(report):
    return {t.table: t for t in report.tables}


def test_days_to_date_matches_known_birthdates():
    # Đối chiếu với 3 cầu thủ thật trong lần xuất đầu (ngày sinh đã biết)
    assert days_to_date(150444) == date(1994, 9, 8)
    assert days_to_date(153303) == date(2002, 7, 7)


def test_import_converts_values(session, exports):
    report = report_by_name(import_exports(session, exports, MAPPING))
    session.commit()
    assert report["players"].read == 5 and report["players"].inserted == 5

    p = session.get(Player, 101)
    assert p.overall == 88 and p.birth_date == date(1994, 9, 8)
    assert p.positions == [18]  # -1 bị bỏ
    assert p.first_name_id == 5 and p.common_name_id == 0  # game dùng 0 cho "không có tên thông dụng"
    team = session.get(Team, 11)
    assert team.captain_id == 101 and team.penalty_taker_id is None  # -1 -> null cho cột id
    assert p.name == "Anh Nguyễn" and p.jersey_name == "A.Nguyen"
    assert session.get(Player, 103).positions == [25, 23, 27]

    sm = session.get(SquadMember, (11, 101))
    assert (sm.position, sm.jersey_number, sm.form) == (18, 8, 4)

    st = session.get(TeamStanding, 11)
    assert st.form_raw == "22122" and st.points == 10 and st.home_wins == 2
    assert session.get(TeamStanding, 33).league_id == 383  # tham chiếu thiếu vẫn nhập được

    fx = session.get(Fixture, 900)
    assert fx.fixture_date == date(2026, 5, 31) and fx.fixture_time == 66600

    user = session.get(UserProfile, 0)
    assert user.user_team_id == 11 and user.surname == "Carrick"


def test_lineup_is_built_from_teamsheet_and_formation(session, exports):
    import_exports(session, exports, MAPPING)
    session.commit()
    lu = session.get(TeamLineup, 11)
    assert lu.formation_name == "4-2-3-1" and lu.formation_id == 46
    assert lu.captain_id == 101 and lu.penalty_taker_id is None
    assert len(lu.slots) == 11
    assert lu.slots[0] == {"slot": 0, "position": 0, "role": 4162, "player_id": 102}
    assert lu.slots[1]["player_id"] == 101 and lu.slots[1]["position"] == 18
    assert lu.slots[5]["player_id"] is None  # slot -1: đội thiếu người
    assert session.get(TeamLineup, 22).formation_name == "4-3-3"  # dùng dòng formations riêng của đội, không phải teamid=-1


def test_import_is_idempotent(session, exports):
    import_exports(session, exports, MAPPING)
    session.commit()
    second = report_by_name(import_exports(session, exports, MAPPING))
    session.commit()
    for name in ("leagues", "teams", "players", "squad", "standings", "fixtures", "user", "lineups"):
        assert second[name].inserted == 0, name
        assert second[name].deleted == 0, name
    assert len(session.exec(select(Player)).all()) == 5
    assert len(session.exec(select(SquadMember)).all()) == 5


def test_reimport_updates_changed_rows_and_prunes_stale_links(session, exports):
    import_exports(session, exports, MAPPING)
    session.commit()

    players = [dict(p) for p in __import__("tests.sample_data", fromlist=["PLAYERS"]).PLAYERS]
    players[0]["overallrating"] = "90"
    from tests.sample_data import table_header
    write_csv(exports / "players.csv", table_header("players"), players)
    # Cầu thủ 103 rời đội 11; trận 900 đã đá nên biến khỏi lịch
    write_csv(exports / "teamplayerlinks.csv", table_header("squad"), [
        dict(teamid="11", playerid="101", position="18"), dict(teamid="11", playerid="102", position="0"),
        dict(teamid="22", playerid="201", position="5"), dict(teamid="22", playerid="202", position="29"),
    ])
    write_csv(exports / "fixtures.csv", table_header("fixtures"), [
        dict(fixtureid="901", competitionid="13", hometeamid="22", awayteamid="11", fixturedate="162040"),
    ])

    report = report_by_name(import_exports(session, exports, MAPPING))
    session.commit()
    session.expire_all()
    assert session.get(Player, 101).overall == 90
    assert report["players"].inserted == 0
    assert session.get(SquadMember, (11, 103)) is None and report["squad"].deleted == 1
    assert session.get(Fixture, 900) is None and session.get(Fixture, 901) is not None
    assert len(session.exec(select(Player)).all()) == 5  # cầu thủ không bị xóa khi rời đội


def test_missing_file_is_skipped(session, tmp_path):
    d = tmp_path / "partial"
    write_sample_export(d, with_fixtures=False)
    report = report_by_name(import_exports(session, d, MAPPING))
    assert report["fixtures"].status == "skipped"
    assert report["players"].status == "ok"


def test_missing_column_raises_clear_error_and_writes_nothing(session, exports):
    (exports / "teams.csv").write_text("teamid,teamname\n11,Manchester Utd\n", encoding="utf-8")
    with pytest.raises(MappingError, match="teams.csv: thiếu cột"):
        import_exports(session, exports, MAPPING)
    session.rollback()
    assert session.exec(select(Player)).all() == []  # bảng sau teams không được nhập


def test_bad_value_raises(session, exports):
    from tests.sample_data import PLAYERS, table_header
    bad = [dict(PLAYERS[0], overallrating="abc")]
    write_csv(exports / "players.csv", table_header("players"), bad)
    with pytest.raises(MappingError, match="players.csv"):
        import_exports(session, exports, MAPPING)


def test_cli_imports_into_given_db(tmp_path, exports, capsys):
    db = tmp_path / "cli.db"
    assert run_cli([str(exports), "--db", str(db)]) == 0
    out = capsys.readouterr().out
    assert "players" in out and db.exists()
    assert run_cli([str(tmp_path / "nope"), "--db", str(db)]) == 2


def test_names_use_common_name_else_first_and_last(session, exports):
    import_exports(session, exports, MAPPING)
    session.commit()
    assert session.get(Player, 101).name == "Anh Nguyễn"      # commonnameid = 0 -> tên + họ
    assert session.get(Player, 102).name == "Big Jon"          # có tên thông dụng
    assert session.get(Player, 103).name == "Marta Østergaard"  # họ lấy từ dcplayernames
    assert session.get(Player, 202).name is None                # mọi id tên = 0
    assert session.get(Player, 202).name_search is None


def test_edited_names_override_and_unknown_players_are_ignored(session, exports):
    import_exports(session, exports, MAPPING)
    session.commit()
    p = session.get(Player, 201)
    assert p.name == "Linh Trần" and p.jersey_name == "L. TRAN"  # không phải "Anh Nguyễn"
    assert session.get(Player, 999) is None


def test_search_key_is_folded(session, exports):
    import_exports(session, exports, MAPPING)
    session.commit()
    assert session.get(Player, 103).name_search == "marta ostergaard"
    assert "gudjohnsen" in session.get(Player, 102).name_search and "jon" in session.get(Player, 102).name_search


def test_names_reimport_changes_nothing_then_follows_edits(session, exports):
    import_exports(session, exports, MAPPING)
    session.commit()
    again = report_by_name(import_exports(session, exports, MAPPING))
    assert again["names"].updated == 0
    (exports / "editedplayernames.csv").unlink()  # người dùng bỏ chỉnh sửa tên
    third = report_by_name(import_exports(session, exports, MAPPING))
    session.commit()
    session.expire_all()
    assert third["names"].updated == 1 and session.get(Player, 201).name == "Anh Nguyễn"


def test_missing_names_file_is_skipped_and_keeps_existing_names(session, exports, tmp_path):
    import_exports(session, exports, MAPPING)
    session.commit()
    for f in ("playernames.csv", "dcplayernames.csv", "editedplayernames.csv"):
        (exports / f).unlink()
    report = report_by_name(import_exports(session, exports, MAPPING))
    session.commit()
    assert report["names"].status == "skipped"
    assert session.get(Player, 102).name == "Big Jon"
