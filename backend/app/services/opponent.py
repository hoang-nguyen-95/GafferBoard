"""Phân tích đội hình đối thủ (Giai đoạn 3). Dùng chung cho đội trong DB và đội hình nhập tay (Giai đoạn 7):
mọi hàm tính toán nhận danh sách slot + dự bị, không phụ thuộc đội có trong DB hay không."""
from dataclasses import dataclass, field
from typing import Optional

from sqlalchemy import func, select
from sqlmodel import Session

from app.models import ImportRun, League, Player, Team, TeamStanding
from app.services.analysis import WEAKNESS_PCT, analyze_player, percentile
from app.services.form import team_form
from app.services.positions import line_of_position, role_of_player, role_of_position
from app.services.teams import LineupView, SlotView, resolve_lineup, squad_players

BENCH_SIZE = 7  # số cầu thủ dự bị tốt nhất dùng để đo độ sâu đội hình
MIN_BENCHMARK_TEAMS = 5  # ít đội hơn thì không tính phân vị so với giải
WING_BACK_POSITIONS = {2, 8}  # RWB, LWB
MIN_CENTRE_BACKS_FOR_WING_BACKS = 3

# key -> (nhãn, chiều: True nếu giá trị cao là điểm mạnh của đội)
METRICS: dict[str, tuple[str, bool]] = {
    "def_pace": ("Tốc độ chạy TB hàng thủ", True),
    "def_accel": ("Tăng tốc TB hàng thủ", True),
    "def_slowest": ("Tốc độ hậu vệ chậm nhất", True),
    "def_height": ("Chiều cao TB hàng thủ (cm)", True),
    "def_aerial": ("Không chiến hàng thủ (nhảy/đánh đầu/sức mạnh)", True),
    "gk_reflexes": ("Phản xạ thủ môn (phản xạ/bay người)", True),
    "gk_aerial": ("Bóng bổng thủ môn (bật nhảy/bắt bóng/vị trí)", True),
    "mid_defense": ("Phòng ngự tiền vệ (cắt/tắc/ý thức)", True),
    "flank_left_defense": ("Phòng ngự biên trái", True),
    "flank_right_defense": ("Phòng ngự biên phải", True),
    "team_height": ("Chiều cao TB đội hình (cm)", True),
    "team_stamina": ("Thể lực TB đội hình", True),
    "att_pace": ("Tốc độ chạy TB hàng công", True),
    "att_finishing": ("Dứt điểm TB hàng công", True),
    "xi_overall": ("OVR TB đội hình xuất phát", True),
    "bench_quality": ("OVR TB dự bị tốt nhất", True),
    "depth_drop": ("Chênh lệch OVR đội hình chính – dự bị", False),
}
# Chỉ các chỉ số này được coi là "điểm yếu của đội" khi phân vị thấp (chỉ số tấn công thấp không phải điểm yếu để khai thác)
DEFENSIVE_METRICS = [
    "def_pace", "def_accel", "def_slowest", "def_aerial", "gk_reflexes", "gk_aerial", "mid_defense",
    "flank_left_defense", "flank_right_defense", "team_stamina", "bench_quality",
]

ATTACK_WEIGHTS = {"finishing": .25, "positioning": .15, "shot_power": .10, "sprint_speed": .15,
                  "dribbling": .15, "ball_control": .10, "composure": .10}
CREATIVE_WEIGHTS = {"vision": .25, "short_passing": .20, "long_passing": .15, "ball_control": .15,
                    "dribbling": .10, "crossing": .05, "curve": .05, "composure": .05}
LABELS = {
    "finishing": "dứt điểm", "positioning": "chọn vị trí", "shot_power": "lực sút", "sprint_speed": "tốc độ",
    "dribbling": "rê bóng", "ball_control": "kiểm soát bóng", "composure": "bình tĩnh", "vision": "tầm nhìn",
    "short_passing": "chuyền ngắn", "long_passing": "chuyền dài", "crossing": "tạt bóng", "curve": "sút xoáy",
}
FULLBACK_LEFT, FULLBACK_RIGHT = {7, 8}, {2, 3}


def _avg(values) -> Optional[float]:
    vals = [v for v in values if v is not None]
    return round(sum(vals) / len(vals), 1) if vals else None


def _fullback_score(p: Player) -> Optional[float]:
    return _avg([p.defensive_awareness, p.standing_tackle, p.interceptions, p.sprint_speed])


def _brief(p: Player) -> dict:
    return {"player_id": p.player_id, "name": p.name or f"Cầu thủ #{p.player_id}", "overall": p.overall}


@dataclass
class OpponentReport:
    name: str
    team_id: Optional[int]
    lineup: LineupView
    values: dict[str, Optional[float]]
    extras: dict
    percentiles: dict[str, Optional[float]]
    benchmark: Optional[dict]
    dangerous: dict[str, list[dict]]
    weak_points: list[dict]
    form: Optional[dict]
    injuries: list[dict] = field(default_factory=list)
    ratings: dict = field(default_factory=dict)

    def metrics_list(self) -> list[dict]:
        return [
            {"key": k, "label": METRICS[k][0], "value": self.values.get(k), "percentile": self.percentiles.get(k),
             "higher_is_better": METRICS[k][1]}
            for k in METRICS
        ]


def compute_metrics(slots: list[SlotView], bench: list[Player]) -> tuple[dict, dict]:
    """Trả về (giá trị chỉ số, thông tin phụ). Không dùng DB."""
    starters = [(sv, sv.player) for sv in slots if sv.player is not None]

    def line(name: str) -> list[Player]:
        return [p for sv, p in starters if sv.line == name]

    # Đá 3 trung vệ thì wing-back thuộc tuyến giữa: không tính vào hàng thủ (vẫn tính ở chỉ số hai biên).
    centre_backs = [sv for sv, _ in starters if role_of_position(sv.position) == "CB"]
    three_at_back = len(centre_backs) >= MIN_CENTRE_BACKS_FOR_WING_BACKS
    defenders = [p for sv, p in starters if sv.line == "DEF" and not (three_at_back and sv.position in WING_BACK_POSITIONS)]
    attackers = line("ATT")
    goalkeepers = line("GK")
    dm = [p for sv, p in starters if role_of_position(sv.position) == "DM"]
    cm = [p for sv, p in starters if role_of_position(sv.position) == "CM"]
    mids = dm or cm or line("MID")
    left = [p for sv, p in starters if sv.position in FULLBACK_LEFT]
    right = [p for sv, p in starters if sv.position in FULLBACK_RIGHT]
    xi = [p for _, p in starters]

    def gk_avg(*attrs):
        return _avg([_avg([getattr(g, a) for a in attrs]) for g in goalkeepers])

    values = {
        "def_pace": _avg(p.sprint_speed for p in defenders),
        "def_accel": _avg(p.acceleration for p in defenders),
        "def_slowest": min((p.sprint_speed for p in defenders if p.sprint_speed is not None), default=None),
        "def_height": _avg(p.height for p in defenders),
        "def_aerial": _avg(_avg([p.jumping, p.heading_accuracy, p.strength]) for p in defenders),
        "gk_reflexes": gk_avg("gk_reflexes", "gk_diving"),
        "gk_aerial": gk_avg("jumping", "gk_handling", "gk_positioning"),
        "mid_defense": _avg(_avg([p.interceptions, p.standing_tackle, p.defensive_awareness]) for p in mids),
        "flank_left_defense": _avg(_fullback_score(p) for p in left),
        "flank_right_defense": _avg(_fullback_score(p) for p in right),
        "team_height": _avg(p.height for p in xi),
        "team_stamina": _avg(p.stamina for p in xi),
        "att_pace": _avg(p.sprint_speed for p in attackers),
        "att_finishing": _avg(p.finishing for p in attackers),
        "xi_overall": _avg(p.overall for p in xi),
    }
    best_bench = sorted(bench, key=lambda p: -p.overall)[:BENCH_SIZE]
    values["bench_quality"] = _avg(p.overall for p in best_bench)
    values["depth_drop"] = (
        round(values["xi_overall"] - values["bench_quality"], 1)
        if values["xi_overall"] is not None and values["bench_quality"] is not None else None
    )

    slowest = min((p for p in defenders if p.sprint_speed is not None), key=lambda p: p.sprint_speed, default=None)
    fastest = max((p for p in attackers if p.sprint_speed is not None), key=lambda p: p.sprint_speed, default=None)
    l_score, r_score = values["flank_left_defense"], values["flank_right_defense"]
    extras = {
        "slowest_defender": {**_brief(slowest), "sprint_speed": slowest.sprint_speed} if slowest else None,
        "fastest_attacker": {**_brief(fastest), "sprint_speed": fastest.sprint_speed} if fastest else None,
        "weaker_flank": (
            ("left" if l_score < r_score else "right") if l_score is not None and r_score is not None and l_score != r_score
            else None
        ),
        "back_line_size": len(defenders),
        "midfield_roles": sorted({role_of_position(sv.position) for sv, _ in starters if line_of_position(sv.position) == "MID"} - {None}),
    }
    return values, extras


def _weighted(p: Player, weights: dict[str, float]) -> float:
    total = sum(w for a, w in weights.items() if getattr(p, a) is not None)
    return sum(getattr(p, a) * w for a, w in weights.items() if getattr(p, a) is not None) / total if total else 0.0


def dangerous_players(slots: list[SlotView], top: int = 3) -> dict[str, list[dict]]:
    """Cầu thủ nguy hiểm nhất trong đội hình ra sân (không tính thủ môn) theo điểm tấn công và kiến tạo."""
    candidates = [sv.player for sv in slots if sv.player and sv.line != "GK"]

    def entries(weights: dict[str, float]) -> list[dict]:
        ranked = sorted(candidates, key=lambda p: -_weighted(p, weights))[:top]
        out = []
        for p in ranked:
            best = sorted((a for a in weights if getattr(p, a) is not None), key=lambda a: -getattr(p, a) * weights[a])[:3]
            out.append({
                **_brief(p), "role": role_of_player(p.positions, p.primary_position),
                "score": round(_weighted(p, weights), 1),
                "why": ", ".join(f"{LABELS[a]} {getattr(p, a)}" for a in best),
            })
        return out

    return {"attackers": entries(ATTACK_WEIGHTS), "playmakers": entries(CREATIVE_WEIGHTS)}


def weak_points(session: Session, slots: list[SlotView], percentiles: dict, values: dict, limit: int = 8) -> list[dict]:
    points: list[dict] = []
    team_level = [
        (percentiles[k], k) for k in DEFENSIVE_METRICS
        if percentiles.get(k) is not None and percentiles[k] <= WEAKNESS_PCT
    ]
    for pct, key in sorted(team_level):
        label = METRICS[key][0]
        points.append({
            "kind": "team", "metric": key, "label": label, "value": values[key], "percentile": pct,
            "text": f"{label}: {values[key]} (thuộc nhóm thấp nhất giải, phân vị {round(pct)})",
        })
    player_level = []
    for sv in slots:
        if sv.player is None:
            continue
        analysis = analyze_player(session, sv.player)
        for w in analysis["weaknesses"]:
            player_level.append((w["percentile"], sv, w))
    for pct, sv, w in sorted(player_level, key=lambda t: t[0]):
        p = sv.player
        points.append({
            "kind": "player", "player_id": p.player_id, "name": p.name or f"Cầu thủ #{p.player_id}",
            "position_name": sv.position_name, "attribute": w["key"], "label": w["label"], "value": w["value"],
            "percentile": pct, "peer_avg": w["peer_avg"],
            "text": f"{p.name or p.player_id} ({sv.position_name}): {w['label'].lower()} {w['value']} "
                    f"(nhóm trung bình {w['peer_avg']}, phân vị {round(pct)})",
        })
    return points[:limit]


_BENCH_CACHE: dict[tuple, list[dict]] = {}


def data_version(session: Session) -> int:
    return session.execute(select(func.max(ImportRun.id))).scalar() or 0


def league_benchmark(session: Session, league_id: int) -> list[dict]:
    """Chỉ số của mọi đội cùng giải, dùng để tính phân vị. Lưu đệm theo phiên bản dữ liệu (lần import)."""
    version = data_version(session)
    key = (str(session.get_bind().url), league_id, version)
    if version and key in _BENCH_CACHE:
        return _BENCH_CACHE[key]
    team_ids = session.execute(select(TeamStanding.team_id).where(TeamStanding.league_id == league_id)).scalars().all()
    rows = []
    for tid in team_ids:
        squad = squad_players(session, tid)
        if not squad:
            continue
        lineup = resolve_lineup(session, tid, squad)
        starters = {sv.player.player_id for sv in lineup.slots if sv.player}
        bench = [p for p, m in squad if p.player_id not in starters and not m.injury]
        rows.append(compute_metrics(lineup.slots, bench)[0])
    if version:
        _BENCH_CACHE[key] = rows
    return rows


def percentiles_vs(values: dict, rows: list[dict]) -> dict[str, Optional[float]]:
    out: dict[str, Optional[float]] = {}
    for key, value in values.items():
        series = sorted(r[key] for r in rows if r.get(key) is not None)
        out[key] = percentile(series, value) if value is not None and len(series) >= MIN_BENCHMARK_TEAMS else None
    return out


def build_report(
    session: Session, *, name: str, team_id: Optional[int], league_id: Optional[int], league_name: Optional[str],
    lineup: LineupView, bench: list[Player], form: Optional[dict], injuries: list[dict], ratings: dict,
) -> OpponentReport:
    values, extras = compute_metrics(lineup.slots, bench)
    rows = league_benchmark(session, league_id) if league_id is not None else []
    percentiles = percentiles_vs(values, rows)
    benchmark = (
        {"league_id": league_id, "league_name": league_name, "teams": len(rows)} if len(rows) >= MIN_BENCHMARK_TEAMS else None
    )
    return OpponentReport(
        name=name, team_id=team_id, lineup=lineup, values=values, extras=extras, percentiles=percentiles,
        benchmark=benchmark, dangerous=dangerous_players(lineup.slots),
        weak_points=weak_points(session, lineup.slots, percentiles, values), form=form, injuries=injuries,
        ratings=ratings,
    )


def analyze_team(session: Session, team_id: int) -> Optional[OpponentReport]:
    team = session.get(Team, team_id)
    if team is None:
        return None
    squad = squad_players(session, team_id)
    lineup = resolve_lineup(session, team_id, squad)
    starters = {sv.player.player_id for sv in lineup.slots if sv.player}
    bench = [p for p, m in squad if p.player_id not in starters and not m.injury]
    injuries = [
        {"player_id": p.player_id, "name": p.name or f"Cầu thủ #{p.player_id}", "in_xi": p.player_id in starters}
        for p, m in squad if m.injury
    ]
    standing = session.get(TeamStanding, team_id)
    league_id = standing.league_id if standing else None
    league_name = None
    if league_id is not None:
        league = session.get(League, league_id)
        league_name = league.name if league else None
    return build_report(
        session, name=team.name, team_id=team_id, league_id=league_id, league_name=league_name,
        lineup=lineup, bench=bench, form=team_form(session, team_id), injuries=injuries,
        ratings={"overall": team.overall, "attack": team.attack, "midfield": team.midfield, "defense": team.defense},
    )
