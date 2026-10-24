import pytest

from app.services.counters import counters_for, load_counters
from app.services.rules import (
    FLANK_GAP, HIGH_PCT, LOW_PCT, PACE_EDGE, RULES, Ctx, Suggestion, evaluate, formation_counters,
)


def ids(ctx):
    return [s.rule_id for s in evaluate(ctx)]


def one(ctx, rule_id) -> Suggestion:
    return next(s for s in evaluate(ctx) if s.rule_id == rule_id)


def test_rule_ids_are_unique_and_documented():
    assert len({r.id for r in RULES}) == len(RULES)
    for r in RULES:
        assert r.title and r.advice and r.tactics, r.id   # văn bản tiếng Việt, có gợi ý chiến thuật
        assert 0 < r.priority <= 100


def test_neutral_team_triggers_nothing():
    assert evaluate(Ctx(values={}, percentiles={}, extras={})) == []


# ---- slow_defence ----
def test_slow_defence_by_league_percentile():
    s = one(Ctx(values={"def_pace": 58}, percentiles={"def_pace": 10}, extras={"slowest_defender": {"name": "A", "sprint_speed": 45}}), "slow_defence")
    assert any("58" in e and "phân vị 10" in e for e in s.evidence)
    assert any("Hậu vệ chậm nhất: A" in e for e in s.evidence)
    assert s.emphasis["ATT"]["sprint_speed"] > 0


def test_slow_defence_by_comparison_with_my_forwards_when_no_benchmark():
    ctx = Ctx(values={"def_pace": 66}, percentiles={}, extras={}, mine_values={"att_pace": 66 + PACE_EDGE})
    assert "slow_defence" in ids(ctx)
    assert "slow_defence" not in ids(Ctx(values={"def_pace": 66}, percentiles={}, extras={}, mine_values={"att_pace": 66 + PACE_EDGE - 1}))


def test_slow_defence_not_triggered_for_fast_defence():
    assert "slow_defence" not in ids(Ctx(values={"def_pace": 80}, percentiles={"def_pace": 90}, extras={}, mine_values={"att_pace": 70}))


def test_slow_defence_strength_grows_with_how_slow():
    mild = one(Ctx(values={"def_pace": 1}, percentiles={"def_pace": LOW_PCT - 1}, extras={}), "slow_defence")
    severe = one(Ctx(values={"def_pace": 1}, percentiles={"def_pace": 0}, extras={}), "slow_defence")
    assert 0.4 <= mild.strength < severe.strength <= 1.0
    assert severe.emphasis["ATT"]["sprint_speed"] > mild.emphasis["ATT"]["sprint_speed"]


# ---- weak_midfield ----
def test_weak_midfield():
    assert "weak_midfield" in ids(Ctx(values={"mid_defense": 60}, percentiles={"mid_defense": 20}, extras={}))
    assert "weak_midfield" not in ids(Ctx(values={"mid_defense": 60}, percentiles={"mid_defense": 60}, extras={}))
    assert "weak_midfield" not in ids(Ctx(values={"mid_defense": 60}, percentiles={}, extras={}))   # không có phân vị -> không suy diễn


# ---- weak_flank ----
def test_weak_flank_by_percentile_names_the_side():
    ctx = Ctx(values={"flank_left_defense": 55, "flank_right_defense": 75},
              percentiles={"flank_left_defense": 8, "flank_right_defense": 70}, extras={})
    s = one(ctx, "weak_flank")
    assert len(s.evidence) == 1 and "Biên trái" in s.evidence[0]


def test_weak_flank_both_sides():
    ctx = Ctx(values={"flank_left_defense": 55, "flank_right_defense": 56},
              percentiles={"flank_left_defense": 8, "flank_right_defense": 12}, extras={})
    assert len(one(ctx, "weak_flank").evidence) == 2


def test_weak_flank_by_gap_without_benchmark():
    ctx = Ctx(values={"flank_left_defense": 70, "flank_right_defense": 70 - FLANK_GAP}, percentiles={}, extras={"weaker_flank": "right"})
    assert "Biên phải" in one(ctx, "weak_flank").evidence[0]
    small = Ctx(values={"flank_left_defense": 70, "flank_right_defense": 70 - FLANK_GAP + 1}, percentiles={}, extras={"weaker_flank": "right"})
    assert "weak_flank" not in ids(small)


# ---- aerial_threat / weak_aerial_defence ----
def test_aerial_threat_needs_both_height_and_aerial_ability():
    both = Ctx(values={"def_height": 190, "def_aerial": 85}, percentiles={"def_height": 90, "def_aerial": 80}, extras={})
    assert "aerial_threat" in ids(both)
    only_tall = Ctx(values={"def_height": 190, "def_aerial": 60}, percentiles={"def_height": 90, "def_aerial": 40}, extras={})
    assert "aerial_threat" not in ids(only_tall)


def test_aerial_threat_fallback_compares_with_my_height():
    ctx = Ctx(values={"team_height": 188}, percentiles={}, extras={}, mine_values={"team_height": 180})
    assert "aerial_threat" in ids(ctx)
    assert "aerial_threat" not in ids(Ctx(values={"team_height": 183}, percentiles={}, extras={}, mine_values={"team_height": 180}))


def test_weak_aerial_defence_is_the_opposite_case():
    ctx = Ctx(values={"def_height": 175, "def_aerial": 55}, percentiles={"def_height": 10, "def_aerial": 15}, extras={})
    assert "weak_aerial_defence" in ids(ctx) and "aerial_threat" not in ids(ctx)
    assert one(ctx, "weak_aerial_defence").emphasis["ATT"]["heading_accuracy"] > 0


# ---- fast_striker ----
def test_fast_striker_by_percentile_or_by_gap_with_my_defence():
    fast = {"name": "X", "sprint_speed": 93}
    assert "fast_striker" in ids(Ctx(values={"att_pace": 88}, percentiles={"att_pace": HIGH_PCT + 5}, extras={"fastest_attacker": fast}))
    by_gap = Ctx(values={}, percentiles={}, extras={"fastest_attacker": fast}, mine_values={"def_pace": 93 - PACE_EDGE - 2})
    assert "fast_striker" in ids(by_gap)
    s = one(by_gap, "fast_striker")
    assert any("Tiền đạo nhanh nhất: X (tốc độ 93)" in e for e in s.evidence) and s.emphasis["DEF"]["sprint_speed"] > 0
    slow = Ctx(values={"att_pace": 60}, percentiles={"att_pace": 20}, extras={"fastest_attacker": {"name": "Y", "sprint_speed": 70}}, mine_values={"def_pace": 72})
    assert "fast_striker" not in ids(slow)


# ---- weak_goalkeeper ----
def test_weak_goalkeeper_lists_only_the_weak_aspects():
    ctx = Ctx(values={"gk_reflexes": 60, "gk_aerial": 80}, percentiles={"gk_reflexes": 10, "gk_aerial": 80}, extras={})
    s = one(ctx, "weak_goalkeeper")
    assert len(s.evidence) == 1 and "Phản xạ" in s.evidence[0]
    both = Ctx(values={"gk_reflexes": 60, "gk_aerial": 60}, percentiles={"gk_reflexes": 10, "gk_aerial": 5}, extras={})
    assert len(one(both, "weak_goalkeeper").evidence) == 2 and one(both, "weak_goalkeeper").strength > s.strength
    assert "weak_goalkeeper" not in ids(Ctx(values={"gk_reflexes": 90}, percentiles={"gk_reflexes": 95}, extras={}))


# ---- tired / bench / injuries / key players ----
def test_tired_team_and_thin_bench():
    assert "tired_team" in ids(Ctx(values={"team_stamina": 60}, percentiles={"team_stamina": 5}, extras={}))
    assert "tired_team" not in ids(Ctx(values={"team_stamina": 60}, percentiles={"team_stamina": 50}, extras={}))
    assert "thin_bench" in ids(Ctx(values={"bench_quality": 60}, percentiles={"bench_quality": 10}, extras={}))


def test_injured_starters_only_counts_players_in_the_eleven():
    ctx = Ctx(values={}, percentiles={}, extras={}, injuries=[{"name": "A", "in_xi": True}, {"name": "B", "in_xi": False}])
    s = one(ctx, "injured_starters")
    assert "A" in s.evidence[0] and "B" not in s.evidence[0]
    assert "injured_starters" not in ids(Ctx(values={}, percentiles={}, extras={}, injuries=[{"name": "B", "in_xi": False}]))


def test_key_players_rule_uses_top_attacker_and_playmaker():
    ctx = Ctx(values={}, percentiles={}, extras={}, dangerous={
        "attackers": [{"name": "Striker", "why": "dứt điểm 90"}], "playmakers": [{"name": "Maestro", "why": "tầm nhìn 91"}]})
    s = one(ctx, "key_players")
    assert "Striker" in s.evidence[0] and "Maestro" in s.evidence[1]
    assert "key_players" not in ids(Ctx(values={}, percentiles={}, extras={}, dangerous={"attackers": [], "playmakers": []}))


# ---- thứ tự ưu tiên ----
def test_suggestions_ordered_by_priority_times_strength():
    ctx = Ctx(values={"def_pace": 50, "mid_defense": 50, "team_stamina": 50},
              percentiles={"def_pace": 0, "mid_defense": 24, "team_stamina": 0}, extras={})
    out = evaluate(ctx)
    assert [s.rule_id for s in out][0] == "slow_defence"          # ưu tiên cơ bản cao nhất + rất rõ rệt
    assert [s.priority for s in out] == sorted((s.priority for s in out), reverse=True)
    # Luật yếu nhẹ nhưng ưu tiên cao có thể bị luật rõ rệt hơn nhưng ưu tiên thấp hơn vượt qua
    mild_midfield = one(ctx, "weak_midfield")
    extreme_tired = one(ctx, "tired_team")
    assert extreme_tired.strength > mild_midfield.strength


def test_custom_rule_list_is_extensible():
    from app.services.rules import Evidence, Rule
    custom = Rule(id="x", priority=10, title="t", advice="a", tactics=["z"], condition=lambda c: Evidence(1.0, ["e"]),
                  emphasis={"ATT": {"finishing": 0.5}})
    out = evaluate(Ctx(values={}, percentiles={}, extras={}), [custom])
    assert [s.rule_id for s in out] == ["x"] and out[0].emphasis == {"ATT": {"finishing": 0.5}} and out[0].priority == 10


# ---- bảng khắc chế sơ đồ ----
def test_formation_counters_config_is_valid():
    table = load_counters()
    assert table, "bảng khắc chế rỗng"
    for opp, options in table.items():
        assert options, opp
        for o in options:
            assert o["formation"] and o["reason"]
            assert o["formation"] != opp


def test_formation_counters_lookup(tmp_path):
    assert formation_counters("4-3-3")[0]["formation"]
    assert formation_counters("không-tồn-tại") == [] and formation_counters(None) == []
    custom = tmp_path / "c.yaml"
    custom.write_text('counters:\n  "4-4-2":\n    - {formation: "3-5-2", reason: "thử"}\n', encoding="utf-8")
    assert counters_for("4-4-2", str(custom)) == [{"formation": "3-5-2", "reason": "thử"}]
