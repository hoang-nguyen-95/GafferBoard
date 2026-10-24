import pytest
from sqlalchemy import select

from app.models import FormationDef, Player, SquadMember
from app.services.optimizer import (
    FORM_WEIGHT, MAX_EMPHASIS_WEIGHT, MAX_RULE_BONUS, Candidate, _rule_weights, evaluate_formation, recommend_lineups,
)
from app.services.rules import Suggestion
from tests.helpers import POSITIONS_433, add_formations, add_team, make_player

F433 = FormationDef(formation_id=8, name="4-3-3", positions=POSITIONS_433)


def rule(emphasis, title="Hàng thủ đối thủ chậm: khai thác khoảng trống sau lưng", rule_id="slow_defence") -> Suggestion:
    return Suggestion(rule_id=rule_id, priority=90, title=title, advice="", tactics=[], evidence=[], strength=1.0, emphasis=emphasis)


def cands(session, team_id=1):
    from app.services.optimizer import eligible_candidates
    return eligible_candidates(session, team_id)


def test_lineup_is_valid_complete_and_natural(session):
    add_team(session, 1)
    candidates, _ = cands(session)
    option = evaluate_formation(F433, candidates, [])
    assert option.valid and len(option.slots) == 11
    assert option.slots[0].position == 0 and option.slots[0].player.positions == [0]   # đúng thủ môn ở khung gỗ
    assert all(s.fit_penalty == 0 for s in option.slots)                                  # đủ người đúng sở trường
    assert len({s.player.player_id for s in option.slots}) == 11
    assert option.score == pytest.approx(option.baseline_score)                          # không luật, phong độ mặc định -> bằng nhau
    assert option.added == [] and option.removed == []


def test_injured_players_are_never_selected(session):
    add_team(session, 1)
    session.get(SquadMember, (1, 109)).injury = 4   # tiền đạo cắm chính
    session.commit()
    candidates, injured = cands(session)
    assert injured == [{"player_id": 109, "name": "Cầu thủ #109"}]
    option = evaluate_formation(F433, candidates, [])
    assert 109 not in {s.player.player_id for s in option.slots if s.player}
    assert option.valid


def prepare_striker_dilemma(session):
    add_team(session, 1)
    a = session.get(Player, 109)                 # ST chính: OVR cao, chậm
    a.overall, a.sprint_speed, a.acceleration = 80, 60, 60
    b = make_player(190, overall=77, positions=[25], sprint_speed=92, acceleration=92)
    session.add(b)
    session.add(SquadMember(team_id=1, player_id=190, position=28))
    session.commit()


def striker(option):
    return next(s for s in option.slots if s.position == 25).player.player_id


def test_rule_emphasis_can_change_the_pick_and_is_explained(session):
    prepare_striker_dilemma(session)
    candidates, _ = cands(session)
    plain = evaluate_formation(F433, candidates, [])
    assert striker(plain) == 109                                              # chỉ xét OVR: chọn người OVR cao
    boosted = evaluate_formation(F433, candidates, [rule({"ATT": {"sprint_speed": 0.3, "acceleration": 0.2}})])
    assert striker(boosted) == 190                                            # đối thủ hàng thủ chậm: ưu tiên tốc độ
    slot = next(s for s in boosted.slots if s.position == 25)
    assert slot.rule_bonus > 0 and slot.fit_penalty == 0
    assert any("Tốc độ chạy nước rút 92" in r and "hàng thủ đối thủ chậm" in r for r in slot.reasons)
    assert [a["player_id"] for a in boosted.added] == [190] and "sprint" not in boosted.added[0]["because"].lower()
    assert "Tốc độ chạy nước rút" in boosted.added[0]["because"]
    assert [r["player_id"] for r in boosted.removed] == [109]
    assert boosted.valid


def test_emphasis_applies_only_to_the_slot_line_it_names(session):
    prepare_striker_dilemma(session)
    candidates, _ = cands(session)
    option = evaluate_formation(F433, candidates, [rule({"DEF": {"sprint_speed": 0.5}})])   # luật cho hàng thủ
    assert striker(option) == 109                                              # không ảnh hưởng tiền đạo
    assert all(s.rule_bonus == 0 for s in option.slots if s.position in (23, 25, 27, 0))


def test_form_bonus_prefers_in_form_player(session):
    add_team(session, 1)
    # Hai tiền đạo cắm cùng OVR: người phong độ tốt được chọn
    twin = make_player(190, overall=75, positions=[25], sprint_speed=70)
    session.add(twin)
    session.add(SquadMember(team_id=1, player_id=190, position=28, form=5))
    session.get(SquadMember, (1, 109)).form = 1
    session.commit()
    candidates, _ = cands(session)
    option = evaluate_formation(F433, candidates, [])
    chosen = next(s for s in option.slots if s.position == 25)
    assert chosen.player.player_id == 190 and chosen.form_bonus == 2 * FORM_WEIGHT
    assert any("Phong độ tốt" in r for r in chosen.reasons)


def test_out_of_position_player_is_penalised_and_explained(session):
    add_team(session, 1)
    session.get(SquadMember, (1, 109)).injury = 3       # mất tiền đạo cắm: phải dùng người khác
    session.commit()
    candidates, _ = cands(session)
    option = evaluate_formation(F433, candidates, [])
    st = next(s for s in option.slots if s.position == 25)
    assert st.fit_penalty > 0 and any("lệch vị trí" in r for r in st.reasons)
    assert st.rating == st.player.overall - st.fit_penalty


def test_emphasis_weights_are_capped_when_many_rules_stack():
    many = [rule({"ATT": {"sprint_speed": 0.5}}, rule_id=f"r{i}") for i in range(4)]
    table = _rule_weights(many)
    assert sum(w for _, w in table[("ATT", "sprint_speed")]) == pytest.approx(MAX_EMPHASIS_WEIGHT)
    single = _rule_weights(many[:1])
    assert sum(w for _, w in single[("ATT", "sprint_speed")]) == pytest.approx(0.5)   # dưới trần: giữ nguyên


def test_recommend_returns_distinct_formations_sorted_with_reasons(session):
    add_team(session, 1)
    add_formations(session)
    counters = [{"formation": "4-2-3-1", "reason": "Hai tiền vệ phòng ngự chặn trung lộ."},
                {"formation": "4-4-2", "reason": "Hai tiền đạo ghìm trung vệ."}]
    result = recommend_lineups(session, 1, [], counters, limit=3)
    options = result["options"]
    assert 2 <= len(options) <= 3
    assert len({o.formation.name for o in options}) == len(options)
    assert [o.score for o in options] == sorted((o.score for o in options), reverse=True)
    assert all(o.valid for o in options)
    by_name = {o.formation.name: o for o in options}
    assert "Hai tiền vệ phòng ngự" in by_name["4-2-3-1"].why_formation
    assert by_name["4-3-3"].is_usual and "thường dùng" in by_name["4-3-3"].why_formation
    assert result["usual_formation"] == "4-3-3" and result["available"] == 19


def test_recommend_limit_and_explicit_formations(session):
    add_team(session, 1)
    add_formations(session)
    assert len(recommend_lineups(session, 1, [], [], limit=1)["options"]) == 1
    only = recommend_lineups(session, 1, [], [], formation_names=["4-4-2"])["options"]
    assert [o.formation.name for o in only] == ["4-4-2"]


def test_too_few_players_gives_warning_and_invalid_lineup(session):
    add_team(session, 1)
    for p in session.execute(select(SquadMember).where(SquadMember.team_id == 1, SquadMember.player_id >= 100 + 4)).scalars():
        p.injury = 1                                      # chỉ còn 4 người khả dụng
    session.commit()
    candidates, injured = cands(session)
    assert len(candidates) == 4 and len(injured) == 15
    option = evaluate_formation(F433, candidates, [])
    assert not option.valid and option.warnings and "Chỉ có 4" in option.warnings[0]
    assert sum(1 for s in option.slots if s.player is None) == 7
    ids = [s.player.player_id for s in option.slots if s.player]
    assert len(ids) == len(set(ids)) == 4


def test_every_slot_has_a_reason_for_the_player_chosen(session):
    add_team(session, 1)
    option = evaluate_formation(F433, cands(session)[0], [rule({"MID": {"short_passing": 0.2}})])
    assert all(s.reasons for s in option.slots)


def test_rule_bonus_never_exceeds_the_cap(session):
    prepare_striker_dilemma(session)
    candidates, _ = cands(session)
    huge = [rule({"ATT": {"sprint_speed": 0.6, "acceleration": 0.6}, "MID": {"short_passing": 0.6}}, rule_id=f"r{i}") for i in range(3)]
    option = evaluate_formation(F433, candidates, huge)
    assert all(abs(s.rule_bonus) <= MAX_RULE_BONUS + 1e-6 for s in option.slots)
    assert any(s.rule_bonus > 0 for s in option.slots)


def test_misplaced_player_is_not_bought_back_by_rule_bonus(session):
    """Tiền đạo cánh rất giỏi rê bóng không được kéo xuống làm tiền vệ phòng ngự chỉ vì luật thưởng kỹ năng.
    Dùng sơ đồ tối giản (GK + CDM) để cô lập: nếu có ô cánh, anh ta sẽ tự đá vị trí sở trường."""
    add_team(session, 1)
    for p in session.execute(select(Player).where(Player.player_id >= 100, Player.player_id < 200)).scalars():
        p.dribbling = p.ball_control = p.short_passing = 70
    winger = make_player(190, overall=82, positions=[23, 12], dribbling=99, ball_control=99, short_passing=99)
    session.add(winger)
    session.add(SquadMember(team_id=1, player_id=190, position=28))
    session.commit()
    candidates, _ = cands(session)
    mini = FormationDef(formation_id=99, name="mini", positions=[0, 10])
    emphasis = {"MID": {"dribbling": 0.6, "ball_control": 0.6, "short_passing": 0.6}}
    option = evaluate_formation(mini, candidates, [rule(emphasis, title="Tiền vệ phòng ngự yếu: chơi qua trung lộ", rule_id="weak_midfield")])
    cdm = option.slots[1]
    assert cdm.player.player_id != 190 and cdm.fit_penalty == 0               # CDM vẫn là người đúng sở trường
    # bonus của người cánh khi đá lệch bị chặn thấp: không đủ bù 12 điểm phạt
    out_of_place = evaluate_formation(FormationDef(formation_id=98, name="x", positions=[10]), [Candidate(winger, candidates[0].member)], [rule(emphasis)])
    assert out_of_place.slots[0].fit_penalty > 0
    assert out_of_place.slots[0].rule_bonus <= MAX_RULE_BONUS * 0.5


def test_added_players_are_explained_by_positive_reasons_only(session):
    prepare_striker_dilemma(session)
    candidates, _ = cands(session)
    option = evaluate_formation(F433, candidates, [rule({"ATT": {"sprint_speed": 0.3}, "DEF": {"sprint_speed": 0.3}})])
    for added in option.added:
        assert "thấp hơn" not in added["because"]
    chosen = next(s for s in option.slots if s.player.player_id == 190)
    assert chosen.rule_reasons and all("cao hơn" in r for r in chosen.rule_reasons)


def test_family_position_is_described_as_same_family_not_out_of_position(session):
    add_team(session, 1)
    cb = session.get(Player, 103)                 # trung vệ trái (LCB) của đội mẫu -> đổi sở trường thành CB
    cb.positions, cb.primary_position = [5], 5
    session.commit()
    option = evaluate_formation(F433, cands(session)[0], [])
    lcb = next(s for s in option.slots if s.position == 6)
    assert lcb.fit_penalty == 1
    assert any("cùng họ vị trí" in r for r in lcb.reasons) and not any("lệch vị trí" in r for r in lcb.reasons)
