"""Chọn người cho các vị trí của một sơ đồ."""
from dataclasses import dataclass
from typing import Callable, Optional, Sequence

from app.models import Player
from app.services.assignment import solve_assignment
from app.services.positions import line_of_position, role_of_position, same_family

# Điểm trừ (vào overall) khi cầu thủ đá vị trí không phải sở trường.
PENALTY_SAME_FAMILY = 1     # cùng họ vị trí (vd CB <-> LCB), gần như tương đương
PENALTY_ALT_POSITION = 2     # vị trí ưa thích thứ 2..7 của cầu thủ
PENALTY_SAME_ROLE = 4        # cùng vai trò (vd RB <-> LB)
PENALTY_SAME_LINE = 12       # cùng tuyến nhưng khác vai trò (vd CB <-> RB, tiền đạo cánh <-> tiền vệ phòng ngự)
PENALTY_OTHER_LINE = 20      # khác tuyến
PENALTY_GK_MISMATCH = 60     # thủ môn <-> cầu thủ ngoài sân: gần như cấm
PENALTY_UNKNOWN_SLOT = 10


def position_penalty(positions: Sequence[int], slot_position: Optional[int]) -> float:
    if slot_position is None or role_of_position(slot_position) is None:
        return PENALTY_UNKNOWN_SLOT
    if positions and positions[0] == slot_position:
        return 0
    if slot_position in positions:
        return PENALTY_ALT_POSITION
    if any(same_family(p, slot_position) for p in positions):
        return PENALTY_SAME_FAMILY
    slot_is_gk = slot_position == 0
    player_is_gk = bool(positions) and positions[0] == 0
    if slot_is_gk != player_is_gk:
        return PENALTY_GK_MISMATCH
    slot_role = role_of_position(slot_position)
    if any(role_of_position(p) == slot_role for p in positions):
        return PENALTY_SAME_ROLE
    slot_line = line_of_position(slot_position)
    if any(line_of_position(p) == slot_line for p in positions):
        return PENALTY_SAME_LINE
    return PENALTY_OTHER_LINE


def position_rating(player: Player, slot_position: Optional[int]) -> float:
    """Overall của cầu thủ khi đá vị trí này (đã trừ điểm lệch vị trí)."""
    return player.overall - position_penalty(player.positions, slot_position)


@dataclass
class Assignment:
    slot: int
    position: Optional[int]
    player: Optional[Player]
    score: float = 0.0


def assign_players(
    slot_positions: Sequence[Optional[int]],
    candidates: Sequence[Player],
    bonus: Optional[Callable[[Player, Optional[int]], float]] = None,
) -> list[Assignment]:
    """Gán `candidates` vào các slot sao cho tổng (position_rating + bonus) lớn nhất, không trùng người.
    Số ứng viên ít hơn số slot thì các slot cuối để trống."""
    n, m = len(slot_positions), len(candidates)
    if n == 0 or m == 0:
        return [Assignment(i, pos, None) for i, pos in enumerate(slot_positions)]

    def score(i: int, j: int) -> float:
        p = candidates[j]
        return position_rating(p, slot_positions[i]) + (bonus(p, slot_positions[i]) if bonus else 0.0)

    if m >= n:
        matrix = [[score(i, j) for j in range(m)] for i in range(n)]
        cols = solve_assignment(matrix)
        return [Assignment(i, slot_positions[i], candidates[cols[i]], matrix[i][cols[i]]) for i in range(n)]
    # Ít người hơn slot: gán theo chiều ngược lại (mỗi người một slot), slot thừa để trống.
    matrix = [[score(i, j) for i in range(n)] for j in range(m)]
    rows = solve_assignment(matrix)
    by_slot = {slot: (j, matrix[j][slot]) for j, slot in enumerate(rows)}
    return [
        Assignment(i, slot_positions[i], candidates[by_slot[i][0]], by_slot[i][1]) if i in by_slot
        else Assignment(i, slot_positions[i], None)
        for i in range(n)
    ]
