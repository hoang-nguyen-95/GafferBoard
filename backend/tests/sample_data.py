"""Sinh file CSV mẫu nhỏ, giá trị bịa, đúng tên cột của lần xuất thật (không dùng dữ liệu game)."""
import csv
from pathlib import Path

from app.config import DEFAULT_MAPPING
from app.importers.live_editor import _source_columns, load_mapping

MAPPING = load_mapping(DEFAULT_MAPPING)


def write_csv(path: Path, header: list[str], rows: list[dict]) -> None:
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=header)
        w.writeheader()
        for r in rows:
            # Ô trống thật của game là -1 (vị trí), các cột khác mặc định 0
            w.writerow({h: r.get(h, "-1" if h.startswith("preferredposition") else "0") for h in header})


def table_header(name: str) -> list[str]:
    cols = [c for spec in MAPPING["tables"][name]["columns"].values() for c in _source_columns(spec)]
    return list(dict.fromkeys(cols))


def lineup_headers() -> tuple[list[str], list[str]]:
    sp = MAPPING["lineups"]
    n = sp["slots"]
    sheets = [sp["team_col"], sp["captain_col"], sp["penalty_taker_col"]] + [sp["slot_player_col"].format(i=i) for i in range(n)]
    forms = [sp["team_col"], sp["formation_id_col"], sp["formation_name_col"]] + [
        sp["slot_position_col"].format(i=i) for i in range(n)
    ] + [sp["slot_role_col"].format(i=i) for i in range(n)]
    return sheets, forms


# Cầu thủ 1xx thuộc đội 11, 2xx thuộc đội 22
PLAYERS = [
    # id, overall, positions, birthdate(days), first/last/common name ids
    dict(playerid="101", overallrating="88", preferredposition1="18", preferredposition2="-1", birthdate="150444",
         firstnameid="5", lastnameid="6", commonnameid="-1", sprintspeed="66", acceleration="68", pacdiv="67"),
    dict(playerid="102", overallrating="81", preferredposition1="0", preferredposition2="-1", birthdate="153303",
         firstnameid="7", lastnameid="8", commonnameid="9", gkdiving="80", pacdiv="80"),
    dict(playerid="103", overallrating="75", preferredposition1="25", preferredposition2="23", preferredposition3="27",
         birthdate="152166", sprintspeed="90", acceleration="91", pacdiv="90"),
    dict(playerid="201", overallrating="70", preferredposition1="5", preferredposition2="-1", birthdate="153000"),
    dict(playerid="202", overallrating="66", preferredposition1="14", preferredposition2="10", birthdate="153100"),
]


def write_sample_export(d: Path, *, with_fixtures: bool = True) -> None:
    d.mkdir(parents=True, exist_ok=True)
    write_csv(d / "leagues.csv", table_header("leagues"), [
        dict(leagueid="13", leaguename="Premier League", countryid="14", level="1", isinternationalleague="0", iswomencompetition="0"),
        dict(leagueid="53", leaguename="LALIGA EA SPORTS", countryid="45", level="1", isinternationalleague="0", iswomencompetition="0"),
    ])
    write_csv(d / "teams.csv", table_header("teams"), [
        dict(teamid="11", teamname="Manchester Utd", overallrating="80", attackrating="82", midfieldrating="82",
             defenserating="79", captainid="101", penaltytakerid="-1"),
        dict(teamid="22", teamname="Test City", overallrating="78", attackrating="80", midfieldrating="77", defenserating="76",
             captainid="-1", penaltytakerid="-1"),
        dict(teamid="33", teamname="Empty FC"),
    ])
    write_csv(d / "players.csv", table_header("players"), PLAYERS)
    write_csv(d / "teamplayerlinks.csv", table_header("squad"), [
        dict(teamid="11", playerid="101", position="18", jerseynumber="8", form="4", leagueappearances="3"),
        dict(teamid="11", playerid="102", position="0", jerseynumber="1", form="3"),
        dict(teamid="11", playerid="103", position="28", jerseynumber="9", form="3"),
        dict(teamid="22", playerid="201", position="5", jerseynumber="4"),
        dict(teamid="22", playerid="202", position="29", jerseynumber="8"),
    ])
    write_csv(d / "leagueteamlinks.csv", table_header("standings"), [
        dict(teamid="11", leagueid="13", currenttableposition="3", points="10", nummatchesplayed="5",
             homewins="2", awaywins="1", teamform="22122", lastgameresult="2"),
        dict(teamid="22", leagueid="13", currenttableposition="1", points="13", nummatchesplayed="5", teamform="0"),
        dict(teamid="33", leagueid="383", currenttableposition="0"),  # leagueid không có trong leagues
    ])
    sheets_h, forms_h = lineup_headers()
    sp = MAPPING["lineups"]
    sheet = dict(teamid="11", captainid="101", penaltytakerid="-1")
    form = dict(teamid="11", formationid="46", formationname="4-2-3-1")
    for i in range(11):
        sheet[sp["slot_player_col"].format(i=i)] = {0: "102", 1: "101"}.get(i, "-1")
        form[sp["slot_position_col"].format(i=i)] = {0: "0", 1: "18"}.get(i, str(i + 1))
        form[sp["slot_role_col"].format(i=i)] = "4162"
    write_csv(d / "default_teamsheets.csv", sheets_h, [sheet, dict(sheet, teamid="22", captainid="-1")])
    write_csv(d / "formations.csv", forms_h, [
        dict(form, teamid="-1", formationid="1", formationname="generic"),
        form,
        dict(form, teamid="22", formationid="7", formationname="4-3-3"),
    ])
    if with_fixtures:
        write_csv(d / "fixtures.csv", table_header("fixtures"), [
            dict(fixtureid="900", competitionid="13", hometeamid="11", awayteamid="22", fixturedate="162032",
                 fixturetime="66600", hometeamform="22122", awayteamform="0", hometeamleaguepos="3", awayteamleaguepos="1"),
            dict(fixtureid="901", competitionid="13", hometeamid="22", awayteamid="11", fixturedate="162040", fixturetime="58500"),
        ])
    write_csv(d / "career_users.csv", table_header("user"), [
        dict(userid="0", clubteamid="11", leagueid="13", firstname="Michael", surname="Carrick"),
    ])
