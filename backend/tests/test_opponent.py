from app.models import ImportRun, Player, SquadMember, TeamStanding
from app.services.opponent import (
    BENCH_SIZE, DEFENSIVE_METRICS, METRICS, _BENCH_CACHE, analyze_team, compute_metrics, dangerous_players,
    league_benchmark, percentiles_vs,
)
from app.services.teams import SlotView
from datetime import datetime, timezone
from tests.helpers import POSITIONS_433, add_team, make_player


def slots_of(players, positions):
    return [SlotView(i, pos, p) for i, (pos, p) in enumerate(zip(positions, players))]


def test_defence_metrics_use_slot_line_not_player_role():
    # 4 hậu vệ (slot 3,4,6,7) có tốc độ khác nhau
    speeds = {3: 70, 4: 60, 6: 80, 7: 50}
    players = [make_player(i, positions=[pos], sprint_speed=speeds.get(pos, 99), acceleration=60,
                           height=180 + i, jumping=70, heading_accuracy=60, strength=50)
               for i, pos in enumerate(POSITIONS_433)]
    values, extras = compute_metrics(slots_of(players, POSITIONS_433), [])
    assert values["def_pace"] == 65.0 and values["def_slowest"] == 50
    assert extras["slowest_defender"]["sprint_speed"] == 50
    assert values["def_aerial"] == 60.0                         # (70+60+50)/3
    assert extras["back_line_size"] == 4


def test_flanks_and_weaker_side():
    def fb(pid, pos, score):
        return make_player(pid, positions=[pos], defensive_awareness=score, standing_tackle=score,
                           interceptions=score, sprint_speed=score)
    players = [make_player(i, positions=[pos]) for i, pos in enumerate(POSITIONS_433)]
    players[1], players[4] = fb(1, 3, 80), fb(4, 7, 60)   # RB mạnh, LB yếu
    values, extras = compute_metrics(slots_of(players, POSITIONS_433), [])
    assert values["flank_right_defense"] == 80.0 and values["flank_left_defense"] == 60.0
    assert extras["weaker_flank"] == "left"


def test_three_at_the_back_uses_wing_backs_as_flanks():
    positions = [0, 4, 5, 6, 2, 8, 10, 13, 15, 25, 26]  # 3-5-2 với RWB/LWB
    players = [make_player(i, positions=[pos], defensive_awareness=50 + i, standing_tackle=50, interceptions=50,
                           sprint_speed=50) for i, pos in enumerate(positions)]
    values, extras = compute_metrics(slots_of(players, positions), [])
    assert values["flank_right_defense"] is not None and values["flank_left_defense"] is not None
    assert extras["back_line_size"] == 3        # RWB/LWB không tính vào hàng thủ khi đá 3 trung vệ


def test_midfield_defence_prefers_defensive_midfielders():
    players = [make_player(i, positions=[pos], interceptions=90 if pos == 10 else 40, standing_tackle=90 if pos == 10 else 40,
                           defensive_awareness=90 if pos == 10 else 40) for i, pos in enumerate(POSITIONS_433)]
    values, _ = compute_metrics(slots_of(players, POSITIONS_433), [])
    assert values["mid_defense"] == 90.0  # chỉ tính CDM, không tính hai tiền vệ trung tâm yếu


def test_depth_uses_top_bench_players_only():
    players = [make_player(i, overall=80, positions=[pos]) for i, pos in enumerate(POSITIONS_433)]
    bench = [make_player(100 + i, overall=o) for i, o in enumerate([70, 69, 68, 67, 66, 65, 64, 30, 20])]
    values, _ = compute_metrics(slots_of(players, POSITIONS_433), bench)
    assert BENCH_SIZE == 7
    assert values["bench_quality"] == 67.0 and values["depth_drop"] == 13.0


def test_missing_players_give_none_without_crashing():
    values, extras = compute_metrics([SlotView(0, 0, None), SlotView(1, 5, None)], [])
    assert all(v is None for v in values.values())
    assert extras["slowest_defender"] is None and extras["weaker_flank"] is None


def test_dangerous_players_exclude_goalkeeper_and_explain_why():
    players = [make_player(i, positions=[pos], finishing=40, positioning=40, shot_power=40, sprint_speed=40,
                           dribbling=40, ball_control=40, composure=40, vision=40, short_passing=40,
                           long_passing=40, crossing=40, curve=40) for i, pos in enumerate(POSITIONS_433)]
    striker = players[9]
    striker.finishing, striker.positioning, striker.sprint_speed = 95, 92, 90
    gk = players[0]
    gk.finishing = gk.positioning = gk.vision = gk.short_passing = 99  # thủ môn không được xếp
    playmaker = players[6]
    playmaker.vision, playmaker.short_passing, playmaker.long_passing = 94, 93, 90
    out = dangerous_players(slots_of(players, POSITIONS_433))
    assert out["attackers"][0]["player_id"] == striker.player_id
    assert out["playmakers"][0]["player_id"] == playmaker.player_id
    assert all(e["player_id"] != gk.player_id for e in out["attackers"] + out["playmakers"])
    assert "dứt điểm 95" in out["attackers"][0]["why"]


def test_percentiles_need_enough_teams():
    rows = [{"def_pace": v} for v in (60, 62, 64, 66, 68, 70)]
    assert percentiles_vs({"def_pace": 71, "other": None}, rows)["def_pace"] > 90
    assert percentiles_vs({"def_pace": 60}, rows)["def_pace"] < 10
    assert percentiles_vs({"def_pace": 60}, rows[:3])["def_pace"] is None
    assert percentiles_vs({"def_pace": None}, rows)["def_pace"] is None


def test_slow_team_gets_team_level_weak_point_vs_league(session):
    for tid in range(1, 9):
        add_team(session, tid, speed=75)
    add_team(session, 9, speed=40)                      # hàng thủ rất chậm so với giải
    report = analyze_team(session, 9)
    assert report.benchmark == {"league_id": 13, "league_name": "Giải 13", "teams": 9}
    assert report.percentiles["def_pace"] < 15
    team_points = [w for w in report.weak_points if w["kind"] == "team"]
    assert any(w["metric"] == "def_pace" for w in team_points)
    assert all(w["metric"] in DEFENSIVE_METRICS for w in team_points)
    fast = analyze_team(session, 1)
    assert not any(w["kind"] == "team" and w["metric"] == "def_pace" for w in fast.weak_points)


def test_attack_metrics_are_never_listed_as_team_weaknesses(session):
    for tid in range(1, 9):
        add_team(session, tid, speed=75)
    add_team(session, 9, speed=75)
    for pid in (9 * 100 + 8, 9 * 100 + 9, 9 * 100 + 10):
        session.get(Player, pid).sprint_speed = 30                              # hàng công chậm
    session.commit()
    report = analyze_team(session, 9)
    assert report.percentiles["att_pace"] is not None and report.percentiles["att_pace"] < 15
    assert not any(w.get("metric") == "att_pace" for w in report.weak_points)


def test_benchmark_cache_follows_import_runs(session):
    for tid in range(1, 7):
        add_team(session, tid)
    _BENCH_CACHE.clear()
    assert league_benchmark(session, 13) and not _BENCH_CACHE        # chưa có ImportRun: không lưu đệm
    session.add(ImportRun(finished_at=datetime.now(timezone.utc)))
    session.commit()
    first = league_benchmark(session, 13)
    assert league_benchmark(session, 13) is first                     # lấy từ đệm
    session.add(ImportRun(finished_at=datetime.now(timezone.utc)))
    session.commit()
    assert league_benchmark(session, 13) is not first                 # lần import mới -> tính lại


def test_injured_players_are_listed_and_excluded_from_bench(session):
    add_team(session, 1)
    session.get(SquadMember, (1, 150)).injury = 3   # một cầu thủ dự bị
    session.get(SquadMember, (1, 100)).injury = 2   # thủ môn chính
    session.commit()
    report = analyze_team(session, 1)
    assert {i["player_id"] for i in report.injuries} == {150, 100}
    assert next(i for i in report.injuries if i["player_id"] == 100)["in_xi"] is True
    assert METRICS["bench_quality"]


def test_analyze_unknown_team_returns_none(session):
    assert analyze_team(session, 12345) is None


def test_five_at_the_back_with_full_backs_keeps_all_five_defenders():
    positions = [0, 3, 4, 5, 6, 7, 10, 13, 15, 24, 26]  # 5-3-2: RB RCB CB LCB LB
    players = [make_player(i, positions=[pos], sprint_speed=60) for i, pos in enumerate(positions)]
    _, extras = compute_metrics(slots_of(players, positions), [])
    assert extras["back_line_size"] == 5
