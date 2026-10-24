from app.models import Player
from app.services.lineup import (
    PENALTY_ALT_POSITION, PENALTY_GK_MISMATCH, PENALTY_OTHER_LINE, PENALTY_SAME_LINE, PENALTY_SAME_ROLE,
    assign_players, position_penalty, position_rating,
)


def mk(pid, overall, positions):
    return Player(player_id=pid, overall=overall, positions=positions, primary_position=positions[0])


def test_position_penalty_levels():
    assert position_penalty([5], 5) == 0                         # đúng sở trường
    assert position_penalty([5, 4], 4) == PENALTY_ALT_POSITION   # vị trí phụ
    assert position_penalty([3], 7) == PENALTY_SAME_ROLE         # RB -> LB
    assert position_penalty([5], 3) == PENALTY_SAME_LINE         # CB -> RB
    assert position_penalty([5], 25) == PENALTY_OTHER_LINE       # CB -> ST
    assert position_penalty([0], 5) == PENALTY_GK_MISMATCH       # GK ra sân
    assert position_penalty([25], 0) == PENALTY_GK_MISMATCH      # ngoài sân vào khung gỗ
    assert position_penalty([5], None) > 0 and position_penalty([5], 31) > 0  # slot lạ (vd mã 29/31)


def test_position_rating_subtracts_penalty():
    assert position_rating(mk(1, 80, [5]), 3) == 80 - PENALTY_SAME_LINE


def test_assign_prefers_natural_positions_over_higher_overall():
    gk, cb, st = mk(1, 70, [0]), mk(2, 75, [5]), mk(3, 80, [25])
    best_cb_poor_st = mk(4, 90, [5])  # trung vệ rất giỏi, nhưng ST trống phải thuộc về tiền đạo
    result = assign_players([0, 5, 25], [gk, cb, st, best_cb_poor_st])
    chosen = {a.position: a.player.player_id for a in result}
    assert chosen == {0: 1, 5: 4, 25: 3}


def test_assign_never_uses_a_player_twice_and_leaves_extra_slots_empty():
    players = [mk(1, 70, [0]), mk(2, 70, [5])]
    result = assign_players([0, 5, 25, 27], players)
    assert [a.player.player_id if a.player else None for a in result][:2] == [1, 2]
    assert result[2].player is None and result[3].player is None


def test_bonus_can_change_the_pick():
    slow, fast = mk(1, 80, [25]), mk(2, 78, [25])
    plain = assign_players([25], [slow, fast])
    boosted = assign_players([25], [slow, fast], bonus=lambda p, pos: 10 if p.player_id == 2 else 0)
    assert plain[0].player.player_id == 1 and boosted[0].player.player_id == 2
