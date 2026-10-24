"""Phân tích cầu thủ: điểm mạnh/yếu tự động theo phân vị so với cầu thủ cùng vai trò (và cùng giải).

Không hard-code ngưỡng chỉ số tuyệt đối (chỉ số game đổi giữa các bản cập nhật, xem PLAN §6): mọi đánh giá
dựa trên phân vị trong nhóm so sánh.
"""
from bisect import bisect_left, bisect_right
from dataclasses import dataclass, field

from sqlalchemy import select
from sqlmodel import Session

from app.models import League, Player, SquadMember, Team, TeamStanding
from app.services.positions import (
    LINE_OF_ROLE, ROLE_LABELS_VI, ROLE_POSITIONS, role_of_player,
)

# Phân vị >= STRENGTH_PCT là điểm mạnh, <= WEAKNESS_PCT là điểm yếu (so với nhóm so sánh).
STRENGTH_PCT = 85.0
WEAKNESS_PCT = 15.0
MAX_ITEMS = 4
MIN_PEERS = 30  # ít hơn thì mở rộng nhóm so sánh ra toàn bộ cơ sở dữ liệu

ATTRIBUTE_LABELS = {
    "acceleration": "Tăng tốc", "sprint_speed": "Tốc độ chạy nước rút", "finishing": "Dứt điểm",
    "shot_power": "Lực sút", "long_shots": "Sút xa", "positioning": "Chọn vị trí", "volleys": "Vô lê",
    "penalties": "Penalty", "short_passing": "Chuyền ngắn", "long_passing": "Chuyền dài",
    "vision": "Tầm nhìn", "crossing": "Tạt bóng", "curve": "Sút xoáy", "free_kick_accuracy": "Đá phạt",
    "dribbling": "Rê bóng", "ball_control": "Kiểm soát bóng", "agility": "Nhanh nhẹn", "balance": "Thăng bằng",
    "reactions": "Phản ứng", "composure": "Bình tĩnh", "defensive_awareness": "Ý thức phòng ngự",
    "interceptions": "Cắt bóng", "standing_tackle": "Tắc bóng", "sliding_tackle": "Xoạc bóng",
    "strength": "Sức mạnh", "stamina": "Thể lực", "aggression": "Quyết liệt", "jumping": "Bật nhảy",
    "heading_accuracy": "Đánh đầu", "gk_diving": "Bay người", "gk_handling": "Bắt bóng",
    "gk_kicking": "Phát bóng", "gk_positioning": "Chọn vị trí (TM)", "gk_reflexes": "Phản xạ (TM)",
    "height": "Chiều cao",
}

# Chỉ số liên quan theo vai trò: chỉ những chỉ số này mới được xét là mạnh/yếu
# (hậu vệ sút kém không phải "điểm yếu").
ROLE_ATTRS = {
    "GK": ["gk_diving", "gk_handling", "gk_kicking", "gk_positioning", "gk_reflexes", "jumping", "height"],
    "CB": ["sprint_speed", "acceleration", "defensive_awareness", "interceptions", "standing_tackle",
           "sliding_tackle", "strength", "jumping", "heading_accuracy", "aggression", "short_passing",
           "long_passing", "height"],
    "FB": ["sprint_speed", "acceleration", "stamina", "defensive_awareness", "standing_tackle",
           "sliding_tackle", "interceptions", "crossing", "dribbling", "short_passing"],
    "DM": ["defensive_awareness", "interceptions", "standing_tackle", "sliding_tackle", "strength",
           "stamina", "aggression", "short_passing", "long_passing", "vision"],
    "CM": ["short_passing", "long_passing", "vision", "ball_control", "dribbling", "stamina",
           "interceptions", "positioning", "long_shots", "strength"],
    "WM": ["crossing", "dribbling", "sprint_speed", "acceleration", "stamina", "short_passing", "vision",
           "ball_control", "agility"],
    "AM": ["vision", "short_passing", "ball_control", "dribbling", "long_shots", "positioning", "finishing",
           "agility", "composure"],
    "W": ["sprint_speed", "acceleration", "dribbling", "ball_control", "agility", "crossing", "finishing",
          "composure", "short_passing"],
    "ST": ["finishing", "shot_power", "positioning", "composure", "sprint_speed", "acceleration",
           "heading_accuracy", "strength", "ball_control", "volleys", "jumping", "height"],
}

# Trục radar: chỉ số tổng hợp trên thẻ cầu thủ (thủ môn có bộ riêng).
RADAR_OUTFIELD = [("pac_div", "PAC"), ("sho_han", "SHO"), ("pas_kic", "PAS"),
                  ("dri_ref", "DRI"), ("def_spe", "DEF"), ("phy_pos", "PHY")]
RADAR_GK = [("pac_div", "DIV"), ("sho_han", "HAN"), ("pas_kic", "KIC"),
            ("dri_ref", "REF"), ("def_spe", "SPE"), ("phy_pos", "POS")]

ALL_ATTRS = sorted({a for attrs in ROLE_ATTRS.values() for a in attrs})
RADAR_FIELDS = [f for f, _ in RADAR_OUTFIELD]


@dataclass
class PeerGroup:
    kind: str  # "league" | "all"
    name: str
    role: str
    size: int
    rows: list[dict] = field(repr=False, default_factory=list)


def club_of_player(session: Session, player_id: int) -> tuple[Team, int | None, str | None] | None:
    """Đội CLB (không phải đội tuyển) của cầu thủ, kèm id/tên giải."""
    stmt = (
        select(Team, TeamStanding.league_id, League.name, League.is_international)
        .join(SquadMember, SquadMember.team_id == Team.team_id)
        .join(TeamStanding, TeamStanding.team_id == Team.team_id, isouter=True)
        .join(League, League.league_id == TeamStanding.league_id, isouter=True)
        .where(SquadMember.player_id == player_id)
    )
    rows = session.execute(stmt).all()
    clubs = [r for r in rows if not r[3]]
    if not clubs:
        return None
    team, league_id, league_name, _ = clubs[0]
    return team, league_id, league_name


def _peer_rows(session: Session, role: str, gender: int | None, league_id: int | None) -> list[dict]:
    fields = list(dict.fromkeys([*ALL_ATTRS, *RADAR_FIELDS]))
    cols = [Player.player_id, *[getattr(Player, f) for f in fields]]
    stmt = select(*cols).where(Player.primary_position.in_(ROLE_POSITIONS[role]))
    if gender is not None:
        stmt = stmt.where(Player.gender == gender)
    if league_id is not None:
        stmt = (
            stmt.join(SquadMember, SquadMember.player_id == Player.player_id)
            .join(TeamStanding, TeamStanding.team_id == SquadMember.team_id)
            .where(TeamStanding.league_id == league_id)
        )
    return [dict(r._mapping) for r in session.execute(stmt)]


def peer_group(session: Session, player: Player, role: str, scope: str) -> PeerGroup:
    club = club_of_player(session, player.player_id)
    league_id, league_name = (club[1], club[2]) if club else (None, None)
    if scope in ("auto", "league") and league_id is not None:
        rows = _peer_rows(session, role, player.gender, league_id)
        if scope == "league" or len(rows) >= MIN_PEERS:
            return PeerGroup("league", league_name or f"giải {league_id}", role, len(rows), rows)
    rows = _peer_rows(session, role, player.gender, None)
    return PeerGroup("all", "toàn bộ dữ liệu", role, len(rows), rows)


def percentile(sorted_values: list[int], value: int) -> float:
    """Phân vị 0..100: tỷ lệ nhóm thấp hơn, tính một nửa số bằng nhau."""
    if not sorted_values:
        return 50.0
    below = bisect_left(sorted_values, value)
    equal = bisect_right(sorted_values, value) - below
    return round(100.0 * (below + equal / 2) / len(sorted_values), 1)


def _lower_first(text: str) -> str:
    return text[:1].lower() + text[1:]


def _summarize(name: str, role_label: str, strengths: list[dict], weaknesses: list[dict]) -> str:
    notes = []
    if strengths:
        notes.append("mạnh về " + ", ".join(_lower_first(s["label"]) for s in strengths))
    if weaknesses:
        notes.append("yếu về " + ", ".join(_lower_first(w["label"]) for w in weaknesses))
    if not notes:
        notes.append("không có điểm mạnh hay yếu nổi bật so với nhóm cùng vị trí")
    return f"{name} ({role_label}): " + "; ".join(notes) + "."


def analyze_player(session: Session, player: Player, scope: str = "auto") -> dict:
    role = role_of_player(player.positions, player.primary_position)
    group = peer_group(session, player, role, scope)
    sorted_by_attr = {
        a: sorted(r[a] for r in group.rows if r[a] is not None) for a in ROLE_ATTRS[role]
    }

    attributes = []
    for attr in ROLE_ATTRS[role]:
        value = getattr(player, attr)
        if value is None:
            continue
        values = sorted_by_attr[attr]
        attributes.append({
            "key": attr, "label": ATTRIBUTE_LABELS[attr], "value": value,
            "peer_avg": round(sum(values) / len(values), 1) if values else None,
            "percentile": percentile(values, value),
        })
    strengths = sorted((a for a in attributes if a["percentile"] >= STRENGTH_PCT),
                       key=lambda a: -a["percentile"])[:MAX_ITEMS]
    weaknesses = sorted((a for a in attributes if a["percentile"] <= WEAKNESS_PCT),
                        key=lambda a: a["percentile"])[:MAX_ITEMS]

    axes = RADAR_GK if role == "GK" else RADAR_OUTFIELD
    radar = []
    for f, label in axes:
        values = [r[f] for r in group.rows if r[f] is not None]
        radar.append({
            "key": f, "label": label, "value": getattr(player, f),
            "peer_avg": round(sum(values) / len(values), 1) if values else None,
        })
    return {
        "player_id": player.player_id,
        "role": role,
        "role_label": ROLE_LABELS_VI[role],
        "line": LINE_OF_ROLE[role],
        "peer_group": {"kind": group.kind, "name": group.name, "size": group.size},
        "radar": radar,
        "attributes": attributes,
        "strengths": strengths,
        "weaknesses": weaknesses,
        "summary": _summarize(player.name or f"Cầu thủ #{player.player_id}", ROLE_LABELS_VI[role], strengths, weaknesses),
    }
