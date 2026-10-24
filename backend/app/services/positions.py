"""Mã vị trí của game (đã đối chiếu với sơ đồ và đội hình thật, xem docs/data-schema.md) và vai trò."""

POSITION_NAMES = {
    0: "GK", 1: "SW", 2: "RWB", 3: "RB", 4: "RCB", 5: "CB", 6: "LCB", 7: "LB", 8: "LWB",
    9: "RDM", 10: "CDM", 11: "LDM", 12: "RM", 13: "RCM", 14: "CM", 15: "LCM", 16: "LM",
    17: "RAM", 18: "CAM", 19: "LAM", 20: "RF", 21: "CF", 22: "LF", 23: "RW", 24: "RS",
    25: "ST", 26: "LS", 27: "LW",
}

# Vai trò = nhóm vị trí dùng để so sánh cầu thủ với nhau.
ROLE_POSITIONS = {
    "GK": [0],
    "CB": [1, 4, 5, 6],
    "FB": [2, 3, 7, 8],
    "DM": [9, 10, 11],
    "CM": [13, 14, 15],
    "WM": [12, 16],
    "AM": [17, 18, 19],
    "W": [23, 27],
    "ST": [20, 21, 22, 24, 25, 26],
}
ROLE_LABELS_VI = {
    "GK": "Thủ môn", "CB": "Trung vệ", "FB": "Hậu vệ biên", "DM": "Tiền vệ phòng ngự",
    "CM": "Tiền vệ trung tâm", "WM": "Tiền vệ cánh", "AM": "Tiền vệ tấn công",
    "W": "Tiền đạo cánh", "ST": "Tiền đạo cắm",
}
LINE_OF_ROLE = {"GK": "GK", "CB": "DEF", "FB": "DEF", "DM": "MID", "CM": "MID", "WM": "MID", "AM": "MID", "W": "ATT", "ST": "ATT"}
LINE_LABELS_VI = {"GK": "Thủ môn", "DEF": "Hàng thủ", "MID": "Tiền vệ", "ATT": "Hàng công"}
LINES = ["GK", "DEF", "MID", "ATT"]

_ROLE_BY_POSITION = {pos: role for role, positions in ROLE_POSITIONS.items() for pos in positions}

# Họ vị trí: các mã gần như tương đương (vd trung vệ trái/giữa/phải), chuyển qua lại gần như không mất chất lượng.
POSITION_FAMILIES = [{4, 5, 6}, {9, 10, 11}, {13, 14, 15}, {17, 18, 19}, {20, 21, 22, 24, 25, 26}]


def same_family(a: int | None, b: int | None) -> bool:
    return a is not None and b is not None and any(a in fam and b in fam for fam in POSITION_FAMILIES)


# Vị trí biên (để đánh giá độ hở hai cánh)
FLANK_DEFENDER_POSITIONS = {2, 3, 7, 8}
WIDE_MIDFIELDER_POSITIONS = {12, 16}
WINGER_POSITIONS = {23, 27}


def position_name(code: int | None) -> str:
    return POSITION_NAMES.get(code, "?") if code is not None else "?"


def role_of_position(code: int | None) -> str | None:
    return _ROLE_BY_POSITION.get(code) if code is not None else None


def line_of_position(code: int | None) -> str | None:
    role = role_of_position(code)
    return LINE_OF_ROLE[role] if role else None


def role_of_player(positions: list[int], primary_position: int | None = None) -> str:
    """Vai trò chính của cầu thủ (theo vị trí ưa thích đầu tiên); mặc định tiền vệ trung tâm."""
    for code in ([primary_position] if primary_position is not None else []) + list(positions):
        role = role_of_position(code)
        if role:
            return role
    return "CM"
