"""Chọn 11 người tối ưu cho đội của người dùng khi đối đầu một đối thủ (Giai đoạn 6).

Điểm của một cầu thủ ở một vị trí = OVR theo vị trí (đã trừ điểm lệch vị trí) + bonus phong độ + bonus theo
các luật khắc chế đang kích hoạt (vd đối thủ hàng thủ chậm -> thưởng tốc độ cho tiền đạo). Bonus của luật là
`trọng số x (chỉ số của cầu thủ − trung bình chỉ số cùng tuyến trong đội)`, nên không phụ thuộc ngưỡng tuyệt đối.
Mỗi sơ đồ giải bằng bài toán gán (Hungarian) nên không bao giờ trùng người hay thiếu vị trí.
"""
from dataclasses import dataclass, field
from typing import Optional

from sqlalchemy import select
from sqlmodel import Session

from app.models import FormationDef, Player, SquadMember, TeamLineup
from app.services.analysis import ATTRIBUTE_LABELS
from app.services.lineup import PENALTY_OTHER_LINE, PENALTY_SAME_FAMILY, assign_players, position_penalty
from app.services.positions import LINE_OF_ROLE, line_of_position, position_name, role_of_player
from app.services.rules import Suggestion
from app.services.teams import squad_players

DEFAULT_FORMATIONS = ["4-3-3", "4-2-3-1", "4-4-2"]
FORM_NEUTRAL = 3          # SquadMember.form: 3 là mức bình thường (giá trị phổ biến nhất trong dữ liệu)
FORM_WEIGHT = 1.0         # điểm cộng/trừ cho mỗi bậc phong độ lệch khỏi mức bình thường
MAX_EMPHASIS_WEIGHT = 0.6  # trần tổng trọng số của một chỉ số (tránh nhiều luật cộng dồn làm lấn át OVR)
MIN_REASON_BONUS = 1.0    # chỉ nêu lý do khi bonus của một luật cho cầu thủ >= ngưỡng này (điểm)
MAX_RULE_BONUS = 6.0      # trần tổng bonus luật của một cầu thủ ở một vị trí (điểm): luật chỉ "nghiêng" lựa chọn, không đảo OVR
DEFAULT_OPTIONS = 3


@dataclass
class SlotChoice:
    slot: int
    position: int
    player: Optional[Player]
    rating: float = 0.0        # OVR theo vị trí
    fit_penalty: float = 0.0
    form_bonus: float = 0.0
    rule_bonus: float = 0.0
    reasons: list[str] = field(default_factory=list)
    rule_reasons: list[str] = field(default_factory=list)  # lý do TÍCH CỰC đến từ luật khắc chế (mạnh nhất trước)

    @property
    def score(self) -> float:
        return self.rating + self.form_bonus + self.rule_bonus


@dataclass
class LineupOption:
    formation: FormationDef
    slots: list[SlotChoice]
    baseline_score: float                 # điểm nếu chỉ xét OVR theo vị trí (không bonus)
    added: list[dict] = field(default_factory=list)
    removed: list[dict] = field(default_factory=list)
    is_usual: bool = False
    why_formation: str = ""
    warnings: list[str] = field(default_factory=list)

    @property
    def score(self) -> float:
        return sum(s.score for s in self.slots)

    @property
    def valid(self) -> bool:
        ids = [s.player.player_id for s in self.slots if s.player]
        return len(self.slots) == 11 and len(ids) == 11 and len(set(ids)) == 11


@dataclass
class Candidate:
    player: Player
    member: SquadMember


def _line_means(candidates: list[Candidate], attrs: set[str]) -> dict[str, dict[str, float]]:
    means: dict[str, dict[str, float]] = {}
    for line in ("GK", "DEF", "MID", "ATT"):
        group = [c.player for c in candidates if LINE_OF_ROLE[role_of_player(c.player.positions, c.player.primary_position)] == line]
        means[line] = {}
        for attr in attrs:
            vals = [getattr(p, attr) for p in group if getattr(p, attr) is not None]
            if vals:
                means[line][attr] = sum(vals) / len(vals)
    return means


def _rule_weights(suggestions: list[Suggestion]) -> dict[tuple[str, str], list[tuple[Suggestion, float]]]:
    """(tuyến, chỉ số) -> [(luật, trọng số)], trần tổng trọng số theo MAX_EMPHASIS_WEIGHT."""
    table: dict[tuple[str, str], list[tuple[Suggestion, float]]] = {}
    for s in suggestions:
        for group, attrs in s.emphasis.items():
            for attr, w in attrs.items():
                table.setdefault((group, attr), []).append((s, w))
    for key, items in table.items():
        total = sum(w for _, w in items)
        if total > MAX_EMPHASIS_WEIGHT:
            table[key] = [(s, w * MAX_EMPHASIS_WEIGHT / total) for s, w in items]
    return table


def _usual_formation(session: Session, team_id: int) -> Optional[str]:
    sheet = session.get(TeamLineup, team_id)
    return sheet.formation_name if sheet else None


def _formation_variants(session: Session, names: list[str]) -> list[FormationDef]:
    stmt = select(FormationDef).where(FormationDef.name.in_(names)).order_by(FormationDef.formation_id)
    return list(session.execute(stmt).scalars())


def evaluate_formation(
    formation: FormationDef, candidates: list[Candidate], suggestions: list[Suggestion],
) -> LineupOption:
    weights = _rule_weights(suggestions)
    means = _line_means(candidates, {attr for _, attr in weights})
    by_id = {c.player.player_id: c for c in candidates}

    def form_bonus(c: Candidate) -> float:
        form = c.member.form
        return (form - FORM_NEUTRAL) * FORM_WEIGHT if form else 0.0

    def rule_contributions(p: Player, slot_position: int) -> list[tuple[Suggestion, str, float]]:
        """(luật, chỉ số, điểm bonus). Bonus giảm theo mức lệch vị trí (cầu thủ đá sai vị trí không được thưởng
        kỹ năng thô) và tổng bị chặn trong ±MAX_RULE_BONUS."""
        line = line_of_position(slot_position)
        fit = max(0.0, 1.0 - position_penalty(p.positions, slot_position) / PENALTY_OTHER_LINE)
        out = []
        for (group, attr), items in weights.items():
            if group != line or getattr(p, attr) is None or attr not in means.get(line, {}):
                continue
            diff = getattr(p, attr) - means[line][attr]
            for suggestion, w in items:
                out.append((suggestion, attr, w * diff * fit))
        total = sum(v for _, _, v in out)
        limit = MAX_RULE_BONUS * fit      # trần cũng giảm theo mức lệch vị trí
        if abs(total) > limit:
            scale = limit / abs(total) if total else 0.0
            out = [(s_, a_, v * scale) for s_, a_, v in out]
        return out

    def bonus(p: Player, slot_position: Optional[int]) -> float:
        c = by_id[p.player_id]
        extra = sum(v for _, _, v in rule_contributions(p, slot_position)) if slot_position is not None else 0.0
        return form_bonus(c) + extra

    positions = list(formation.positions)
    players = [c.player for c in candidates]
    assigned = assign_players(positions, players, bonus=bonus)
    baseline = assign_players(positions, players)

    slots = []
    for a in assigned:
        choice = SlotChoice(a.slot, a.position, a.player)
        if a.player is not None:
            p, c = a.player, by_id[a.player.player_id]
            choice.fit_penalty = position_penalty(p.positions, a.position)
            choice.rating = p.overall - choice.fit_penalty
            choice.form_bonus = form_bonus(c)
            contribs = rule_contributions(p, a.position)
            choice.rule_bonus = sum(v for _, _, v in contribs)
            choice.reasons, choice.rule_reasons = _reasons(p, c, a.position, choice, contribs)
        slots.append(choice)

    option = LineupOption(formation=formation, slots=slots, baseline_score=sum(
        (b.player.overall - position_penalty(b.player.positions, b.position)) for b in baseline if b.player))
    base_by_slot = {b.player.player_id: b for b in baseline if b.player}
    chosen_by_id = {s.player.player_id: s for s in slots if s.player}
    for pid, s in chosen_by_id.items():
        if pid not in base_by_slot:
            option.added.append({
                "player_id": pid, "name": s.player.name or f"Cầu thủ #{pid}", "position": position_name(s.position),
                "because": (s.rule_reasons or s.reasons or [""])[0],
            })
    for pid, b in base_by_slot.items():
        if pid not in chosen_by_id:
            option.removed.append({"player_id": pid, "name": b.player.name or f"Cầu thủ #{pid}"})
    if len(candidates) < 11:
        option.warnings.append(f"Chỉ có {len(candidates)} cầu thủ khả dụng, không đủ 11 người.")
    return option


def _reasons(p: Player, c: Candidate, slot_position: int, choice: SlotChoice, contribs) -> tuple[list[str], list[str]]:
    """Trả về (mọi lý do, riêng lý do từ luật khắc chế)."""
    out, rule_reasons = [], []
    if choice.fit_penalty == 0:
        out.append(f"Đá đúng sở trường {position_name(slot_position)} (OVR {p.overall})")
    elif choice.fit_penalty <= PENALTY_SAME_FAMILY:
        out.append(f"Đá {position_name(slot_position)}, cùng họ vị trí với sở trường: OVR {p.overall} − {choice.fit_penalty:g} = {choice.rating:g}")
    else:
        out.append(f"Đá {position_name(slot_position)} lệch vị trí sở trường: OVR {p.overall} − {choice.fit_penalty:g} = {choice.rating:g}")
    form = c.member.form
    if form and form != FORM_NEUTRAL:
        out.append(f"Phong độ {'tốt' if form > FORM_NEUTRAL else 'kém'} (mức {form}/5): {choice.form_bonus:+g}")
    grouped: dict[str, tuple[Suggestion, str, float]] = {}
    for suggestion, attr, value in contribs:
        key = suggestion.rule_id
        if key not in grouped or abs(value) > abs(grouped[key][2]):
            grouped[key] = (suggestion, attr, value)
    for suggestion, attr, value in sorted(grouped.values(), key=lambda t: -abs(t[2])):
        if abs(value) >= MIN_REASON_BONUS:
            rel = "cao hơn" if value > 0 else "thấp hơn"
            text = (f"{ATTRIBUTE_LABELS.get(attr, attr)} {getattr(p, attr)} {rel} trung bình đội ở tuyến này — "
                    f"{suggestion.title.lower()} ({value:+.1f})")
            out.append(text)
            if value > 0:
                rule_reasons.append(text)
    return out, rule_reasons


def eligible_candidates(session: Session, team_id: int) -> tuple[list[Candidate], list[dict]]:
    """Cầu thủ khả dụng (không chấn thương) và danh sách cầu thủ bị loại vì chấn thương."""
    candidates, injured = [], []
    for player, member in squad_players(session, team_id):
        if member.injury:
            injured.append({"player_id": player.player_id, "name": player.name or f"Cầu thủ #{player.player_id}"})
        else:
            candidates.append(Candidate(player, member))
    return candidates, injured


def recommend_lineups(
    session: Session, my_team_id: int, suggestions: list[Suggestion], counters: list[dict],
    limit: int = DEFAULT_OPTIONS, formation_names: Optional[list[str]] = None,
) -> dict:
    candidates, injured = eligible_candidates(session, my_team_id)
    usual = _usual_formation(session, my_team_id)
    reasons_by_name = {c["formation"]: c["reason"] for c in counters}
    names = list(dict.fromkeys(
        formation_names or [*reasons_by_name, *([usual] if usual else []), *DEFAULT_FORMATIONS]
    ))
    variants = _formation_variants(session, names)
    best: dict[str, LineupOption] = {}
    for f in variants:
        option = evaluate_formation(f, candidates, suggestions)
        if f.name not in best or option.score > best[f.name].score:
            best[f.name] = option
    options = sorted(best.values(), key=lambda o: -o.score)[:limit]
    for o in options:
        o.is_usual = o.formation.name == usual
        if o.formation.name in reasons_by_name:
            o.why_formation = f"Sơ đồ khắc chế: {reasons_by_name[o.formation.name]}"
        elif o.is_usual:
            o.why_formation = "Sơ đồ đội bạn thường dùng."
        else:
            o.why_formation = "Sơ đồ phổ biến phù hợp với cầu thủ hiện có."
    return {"options": options, "injured": injured, "available": len(candidates), "usual_formation": usual,
            "rules": [s.title for s in suggestions if s.emphasis]}
