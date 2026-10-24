"""Engine gợi ý đấu pháp theo luật (Giai đoạn 5).

Mỗi luật là một `Rule` độc lập: điều kiện (trả về bằng chứng hoặc None), độ ưu tiên cơ bản, văn bản gợi ý bằng
tiếng Việt, gợi ý chiến thuật và trọng số nhấn mạnh chỉ số (dùng ở Giai đoạn 6 khi chọn đội hình). Thêm luật mới
chỉ cần thêm một `Rule` vào `RULES`.

Điều kiện dựa trên phân vị so với giải (không hard-code ngưỡng chỉ số tuyệt đối); khi chưa có đủ đội cùng giải để
tính phân vị thì so với chính đội của người dùng. Các gợi ý chiến thuật là gợi ý chung bằng lời, không gắn với tên
tùy chọn cụ thể trong menu game (tên menu đổi theo bản FC).
"""
from dataclasses import dataclass, field
from typing import Callable, Optional

from app.services.counters import counters_for

LOW_PCT = 25.0    # phân vị <= LOW_PCT: thấp rõ so với giải
HIGH_PCT = 75.0   # phân vị >= HIGH_PCT: cao rõ so với giải
PACE_EDGE = 4.0   # chênh tốc độ (điểm) giữa hai đội đủ để khai thác khi không có phân vị
FLANK_GAP = 8.0   # chênh phòng ngự hai biên (điểm) để coi một biên là yếu hơn rõ rệt
HEIGHT_EDGE = 4.0  # chênh chiều cao (cm)


@dataclass
class Ctx:
    """Dữ liệu một luật được phép nhìn thấy: đội đối thủ và (nếu biết) đội của người dùng."""

    values: dict
    percentiles: dict
    extras: dict
    injuries: list = field(default_factory=list)
    dangerous: dict = field(default_factory=dict)
    formation_name: Optional[str] = None
    mine_values: dict = field(default_factory=dict)
    mine_extras: dict = field(default_factory=dict)
    verified_form: Optional[dict] = None

    def v(self, key: str) -> Optional[float]:
        return self.values.get(key)

    def p(self, key: str) -> Optional[float]:
        return self.percentiles.get(key)

    def mine(self, key: str) -> Optional[float]:
        return self.mine_values.get(key)


@dataclass
class Evidence:
    strength: float  # 0..1: mức độ rõ rệt của tình huống
    lines: list[str]


@dataclass
class Rule:
    id: str
    priority: int
    title: str
    advice: str
    tactics: list[str]
    condition: Callable[[Ctx], Optional[Evidence]]
    # {tuyến hoặc vai trò: {chỉ số: trọng số}} khi luật kích hoạt (nhân với strength), Giai đoạn 6 dùng
    emphasis: dict[str, dict[str, float]] = field(default_factory=dict)


@dataclass
class Suggestion:
    rule_id: str
    priority: float
    title: str
    advice: str
    tactics: list[str]
    evidence: list[str]
    strength: float
    emphasis: dict[str, dict[str, float]]

    def as_dict(self) -> dict:
        return {
            "rule_id": self.rule_id, "priority": round(self.priority, 1), "title": self.title,
            "advice": self.advice, "tactics": self.tactics, "evidence": self.evidence,
            "strength": round(self.strength, 2), "emphasis": self.emphasis,
        }


def _scale(x: float, full: float) -> float:
    """Đưa x (>= 0) về 0.4..1.0 theo tỷ lệ với `full` (x = full -> 1.0). Có điều kiện là đã kích hoạt nên tối thiểu 0.4."""
    return round(0.4 + 0.6 * max(0.0, min(1.0, x / full)), 3)


def _pct_text(ctx: Ctx, key: str) -> str:
    p = ctx.p(key)
    return f" (phân vị {round(p)} trong giải)" if p is not None else ""


# ---------- điều kiện của từng luật ----------

def cond_slow_defence(c: Ctx) -> Optional[Evidence]:
    pace, pct, mine = c.v("def_pace"), c.p("def_pace"), c.mine("att_pace")
    if pace is None:
        return None
    by_pct = pct is not None and pct <= LOW_PCT
    edge = (mine - pace) if mine is not None else None
    by_edge = edge is not None and edge >= PACE_EDGE
    if not (by_pct or by_edge):
        return None
    lines = [f"Tốc độ chạy TB hàng thủ đối thủ: {pace}{_pct_text(c, 'def_pace')}"]
    if mine is not None:
        lines.append(f"Tốc độ chạy TB hàng công của bạn: {mine}")
    slow = c.extras.get("slowest_defender")
    if slow:
        lines.append(f"Hậu vệ chậm nhất: {slow['name']} (tốc độ {slow['sprint_speed']})")
    s = [_scale(LOW_PCT - pct, LOW_PCT) if by_pct else 0, _scale(edge, 12) if by_edge else 0]
    return Evidence(max(s), lines)


def cond_weak_midfield(c: Ctx) -> Optional[Evidence]:
    pct, v = c.p("mid_defense"), c.v("mid_defense")
    if v is None or pct is None or pct > LOW_PCT:
        return None
    return Evidence(_scale(LOW_PCT - pct, LOW_PCT),
                    [f"Phòng ngự tiền vệ (cắt/tắc/ý thức) của đối thủ: {v}{_pct_text(c, 'mid_defense')}"])


def cond_weak_flank(c: Ctx) -> Optional[Evidence]:
    left, right = c.v("flank_left_defense"), c.v("flank_right_defense")
    pl, pr = c.p("flank_left_defense"), c.p("flank_right_defense")
    weak = [(side, v, p) for side, v, p in (("trái", left, pl), ("phải", right, pr)) if v is not None and p is not None and p <= LOW_PCT]
    if weak:
        lines = [f"Biên {side} của đối thủ: phòng ngự {v}{_pct_text(c, 'flank_left_defense' if side == 'trái' else 'flank_right_defense')}" for side, v, _ in weak]
        return Evidence(max(_scale(LOW_PCT - p, LOW_PCT) for _, _, p in weak), lines)
    gap = abs(left - right) if left is not None and right is not None else None
    side = c.extras.get("weaker_flank")
    if gap is not None and gap >= FLANK_GAP and side:
        name = "trái" if side == "left" else "phải"
        return Evidence(_scale(gap, 20), [f"Biên {name} của đối thủ yếu hơn biên còn lại {round(gap, 1)} điểm phòng ngự (trái {left}, phải {right})"])
    return None


def cond_aerial_threat(c: Ctx) -> Optional[Evidence]:
    h_pct, a_pct = c.p("def_height"), c.p("def_aerial")
    h, a = c.v("def_height"), c.v("def_aerial")
    if h_pct is not None and a_pct is not None:
        if h_pct >= HIGH_PCT and a_pct >= HIGH_PCT:
            return Evidence(_scale(min(h_pct, a_pct) - HIGH_PCT, 100 - HIGH_PCT),
                            [f"Hàng thủ đối thủ cao TB {h} cm{_pct_text(c, 'def_height')}, không chiến {a}{_pct_text(c, 'def_aerial')}"])
        return None
    mine_h, opp_h = c.mine("team_height"), c.v("team_height")
    if opp_h is not None and mine_h is not None and opp_h - mine_h >= HEIGHT_EDGE:
        return Evidence(_scale(opp_h - mine_h, 10), [f"Đội hình đối thủ cao TB {opp_h} cm, bạn {mine_h} cm"])
    return None


def cond_fast_striker(c: Ctx) -> Optional[Evidence]:
    pct, pace = c.p("att_pace"), c.v("att_pace")
    fast = c.extras.get("fastest_attacker")
    mine_def = c.mine("def_pace")
    by_pct = pct is not None and pct >= HIGH_PCT
    edge = (fast["sprint_speed"] - mine_def) if fast and mine_def is not None else None
    by_edge = edge is not None and edge >= PACE_EDGE + 2
    if not (by_pct or by_edge):
        return None
    lines = []
    if pace is not None:
        lines.append(f"Tốc độ chạy TB hàng công đối thủ: {pace}{_pct_text(c, 'att_pace')}")
    if fast:
        lines.append(f"Tiền đạo nhanh nhất: {fast['name']} (tốc độ {fast['sprint_speed']})")
    if mine_def is not None:
        lines.append(f"Tốc độ chạy TB hàng thủ của bạn: {mine_def}")
    s = [_scale(pct - HIGH_PCT, 100 - HIGH_PCT) if by_pct else 0, _scale(edge, 14) if by_edge else 0]
    return Evidence(max(s), lines)


def cond_weak_goalkeeper(c: Ctx) -> Optional[Evidence]:
    lines, strengths = [], []
    for key, text in (("gk_reflexes", "Phản xạ thủ môn đối thủ"), ("gk_aerial", "Bóng bổng thủ môn đối thủ")):
        pct, v = c.p(key), c.v(key)
        if v is not None and pct is not None and pct <= LOW_PCT:
            lines.append(f"{text}: {v}{_pct_text(c, key)}")
            strengths.append(_scale(LOW_PCT - pct, LOW_PCT))
    return Evidence(max(strengths), lines) if lines else None


def cond_weak_aerial_defence(c: Ctx) -> Optional[Evidence]:
    h_pct, a_pct = c.p("def_height"), c.p("def_aerial")
    if h_pct is None or a_pct is None or h_pct > LOW_PCT or a_pct > LOW_PCT:
        return None
    return Evidence(_scale(LOW_PCT - max(h_pct, a_pct), LOW_PCT),
                    [f"Hàng thủ đối thủ thấp (TB {c.v('def_height')} cm{_pct_text(c, 'def_height')}) và không chiến yếu ({c.v('def_aerial')}{_pct_text(c, 'def_aerial')})"])


def cond_tired(c: Ctx) -> Optional[Evidence]:
    pct, v = c.p("team_stamina"), c.v("team_stamina")
    if v is None or pct is None or pct > LOW_PCT:
        return None
    return Evidence(_scale(LOW_PCT - pct, LOW_PCT), [f"Thể lực TB đội hình đối thủ: {v}{_pct_text(c, 'team_stamina')}"])


def cond_thin_bench(c: Ctx) -> Optional[Evidence]:
    pct, v = c.p("bench_quality"), c.v("bench_quality")
    if v is None or pct is None or pct > LOW_PCT:
        return None
    return Evidence(_scale(LOW_PCT - pct, LOW_PCT), [f"OVR TB dự bị tốt nhất của đối thủ: {v}{_pct_text(c, 'bench_quality')}"])


def cond_injured_starters(c: Ctx) -> Optional[Evidence]:
    out = [i for i in c.injuries if i.get("in_xi")]
    if not out:
        return None
    return Evidence(_scale(len(out), 3), [f"Đối thủ vắng cầu thủ đá chính: {', '.join(i['name'] for i in out)}"])


def cond_key_players(c: Ctx) -> Optional[Evidence]:
    attackers, playmakers = c.dangerous.get("attackers") or [], c.dangerous.get("playmakers") or []
    if not attackers and not playmakers:
        return None
    lines = []
    if attackers:
        lines.append(f"Tấn công nguy hiểm nhất: {attackers[0]['name']} ({attackers[0]['why']})")
    if playmakers:
        lines.append(f"Kiến tạo chính: {playmakers[0]['name']} ({playmakers[0]['why']})")
    return Evidence(0.5, lines)


RULES: list[Rule] = [
    Rule(
        id="slow_defence", priority=90,
        title="Hàng thủ đối thủ chậm: khai thác khoảng trống sau lưng",
        advice="Đá bóng dài/chọc khe sau lưng hàng thủ và để tiền đạo chạy chỗ; tránh dồn bóng vào chân chậm rãi.",
        tactics=["Lên bóng nhanh, ưu tiên chuyền dài và chuyền xuyên tuyến",
                 "Tiền đạo/tiền đạo cánh: chạy chỗ vào khoảng trống sau hàng thủ",
                 "Đẩy đường chắn của đội cao vừa phải để nhanh chóng bật lên khi cướp bóng"],
        condition=cond_slow_defence,
        emphasis={"ATT": {"sprint_speed": 0.30, "acceleration": 0.20}},
    ),
    Rule(
        id="weak_flank", priority=85,
        title="Biên đối thủ hở: tấn công cánh",
        advice="Dồn lực lên phía biên yếu của đối thủ: kéo biên rộng, tạt hoặc cắt vào trong nhờ cầu thủ chạy cánh.",
        tactics=["Hai cầu thủ chạy cánh bám biên, hậu vệ biên dâng cao hỗ trợ ở phía biên yếu",
                 "Tiền đạo cánh phía biên yếu cắt vào trong sút hoặc chuyền",
                 "Đổi cánh nhanh để kéo giãn hàng thủ"],
        condition=cond_weak_flank,
        emphasis={"ATT": {"sprint_speed": 0.15, "dribbling": 0.20}, "MID": {"crossing": 0.10, "dribbling": 0.10}},
    ),
    Rule(
        id="weak_midfield", priority=80,
        title="Tiền vệ phòng ngự yếu: chơi qua trung lộ",
        advice="Đẩy bóng qua trung lộ; tiền vệ tấn công dạt vào kẽ giữa các tuyến để nhận bóng và xoay người.",
        tactics=["Lối chơi chuyền ngắn qua trung lộ, tiền vệ tấn công chơi giữa hai tuyến",
                 "Tiền vệ trung tâm lên hỗ trợ, rê dắt qua tuyến giữa",
                 "Không quá phụ thuộc vào tạt bóng"],
        condition=cond_weak_midfield,
        emphasis={"MID": {"short_passing": 0.20, "ball_control": 0.20, "dribbling": 0.15, "vision": 0.10}},
    ),
    Rule(
        id="fast_striker", priority=80,
        title="Đối thủ có tiền đạo tốc độ cao: giữ đường chắn thấp",
        advice="Lùi sâu đường chắn và giữ đội hình thấp, tránh để hậu vệ bị bỏ lại với khoảng trống sau lưng.",
        tactics=["Đường chắn của đội: thấp hoặc vừa phải, không dâng cao dồn ép",
                 "Hậu vệ giữ vị trí, hạn chế lên cao đơn lẻ; trung vệ nhanh kèm tiền đạo tốc độ",
                 "Cầu thủ kèm người chuyên trách cho tiền đạo nhanh nhất"],
        condition=cond_fast_striker,
        emphasis={"DEF": {"sprint_speed": 0.30, "acceleration": 0.15, "defensive_awareness": 0.10}},
    ),
    Rule(
        id="weak_goalkeeper", priority=75,
        title="Thủ môn đối thủ yếu: sút xa và bóng bổng",
        advice="Thử thủ môn bằng các cú sút xa và bóng bổng/tạt vào vòng cấm; phản xạ yếu thì sút từ xa, bóng bổng yếu thì tạt và phạt góc.",
        tactics=["Khuyến khích sút xa khi có khoảng trống", "Tạt bóng bổng, phạt góc nhiều hơn nếu thủ môn yếu bóng bổng",
                 "Tiền đạo bám theo cú sút để đá bồi"],
        condition=cond_weak_goalkeeper,
        emphasis={"MID": {"long_shots": 0.20, "shot_power": 0.10}, "ATT": {"shot_power": 0.15, "heading_accuracy": 0.10}},
    ),
    Rule(
        id="aerial_threat", priority=70,
        title="Hàng thủ đối thủ cao và đánh đầu tốt: hạn chế bóng bổng",
        advice="Hạn chế tạt bóng bổng vào vòng cấm; chơi dưới thấp và phòng thủ phạt góc/đá phạt kỹ lưỡng.",
        tactics=["Ưu tiên chuyền ngắn, chuyền sệt, tạt sệt thay vì tạt bổng",
                 "Phạt góc: kèm người kỹ, giữ lại cầu thủ cao ở vòng cấm nhà",
                 "Hạn chế để đối thủ có nhiều đá phạt/phạt góc (không phạm lỗi gần vòng cấm)"],
        condition=cond_aerial_threat,
        emphasis={"DEF": {"jumping": 0.20, "heading_accuracy": 0.20, "strength": 0.10}},
    ),
    Rule(
        id="weak_aerial_defence", priority=65,
        title="Hàng thủ đối thủ thấp và yếu không chiến: tạt bóng bổng",
        advice="Tạt bóng bổng và phạt góc vào vòng cấm, dùng tiền đạo cao đánh đầu.",
        tactics=["Hai cầu thủ chạy cánh tạt bổng vào vòng cấm", "Tiền đạo cắm cao to chơi đánh đầu/tì đè",
                 "Tận dụng phạt góc và đá phạt"],
        condition=cond_weak_aerial_defence,
        emphasis={"ATT": {"heading_accuracy": 0.25, "jumping": 0.20, "strength": 0.10}},
    ),
    Rule(
        id="tired_team", priority=60,
        title="Thể lực đối thủ thấp: nhịp độ cao",
        advice="Duy trì nhịp độ cao và pressing, đối thủ dễ hụt hơi hiệp hai.",
        tactics=["Nhịp độ lên bóng cao, pressing liên tục", "Giữ sức bằng cách xoay vòng/thay người hợp lý để tận dụng cuối trận"],
        condition=cond_tired,
        emphasis={"MID": {"stamina": 0.20}, "ATT": {"stamina": 0.10}},
    ),
    Rule(
        id="injured_starters", priority=55,
        title="Đối thủ thiếu cầu thủ đá chính",
        advice="Đội hình của đối thủ có thể mất cân bằng; kiểm tra vị trí của cầu thủ vắng và tấn công vào khu vực đó.",
        tactics=["Tập trung tấn công vào phía có cầu thủ thay thế yếu hơn"],
        condition=cond_injured_starters,
    ),
    Rule(
        id="thin_bench", priority=45,
        title="Băng ghế dự bị đối thủ mỏng",
        advice="Duy trì áp lực tới cuối trận: chất lượng người vào thay của đối thủ thấp hơn.",
        tactics=["Giữ cường độ cao, cuối trận tấn công thêm khi đối thủ thay người"],
        condition=cond_thin_bench,
    ),
    Rule(
        id="key_players", priority=40,
        title="Kèm chặt cầu thủ nguy hiểm",
        advice="Giám sát cầu thủ tấn công nguy hiểm nhất và ngắt nguồn kiến tạo của đối thủ.",
        tactics=["Kèm người chuyên trách cho cầu thủ nguy hiểm nhất", "Tiền vệ phòng ngự chặn đường chuyền của cầu thủ kiến tạo chính"],
        condition=cond_key_players,
    ),
]


def evaluate(ctx: Ctx, rules: Optional[list[Rule]] = None) -> list[Suggestion]:
    """Chạy mọi luật, trả về các gợi ý đã kích hoạt, ưu tiên cao nhất trước.
    Điểm ưu tiên = độ ưu tiên cơ bản của luật x (0.5 + 0.5 x mức độ rõ rệt)."""
    out = []
    for rule in rules or RULES:
        evidence = rule.condition(ctx)
        if evidence is None:
            continue
        scaled = {
            group: {attr: round(w * evidence.strength, 3) for attr, w in attrs.items()}
            for group, attrs in rule.emphasis.items()
        }
        out.append(Suggestion(
            rule_id=rule.id, priority=rule.priority * (0.5 + 0.5 * evidence.strength), title=rule.title,
            advice=rule.advice, tactics=list(rule.tactics), evidence=evidence.lines, strength=evidence.strength,
            emphasis=scaled,
        ))
    return sorted(out, key=lambda s: -s.priority)


def formation_counters(opponent_formation: Optional[str]) -> list[dict]:
    return counters_for(opponent_formation)
