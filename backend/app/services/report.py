"""Xuất báo cáo Markdown từ kết quả phân tích (nhận các dict do API trả về, không phụ thuộc DB)."""
import re
import unicodedata
from datetime import date
from typing import Optional

LINE_ORDER = ["GK", "DEF", "MID", "ATT"]


def _row(*cells) -> str:
    return "| " + " | ".join("" if c is None else str(c) for c in cells) + " |"


def _name(player: Optional[dict]) -> str:
    if not player:
        return "—"
    return player.get("name") or f"Cầu thủ #{player['player_id']}"


def slug(text: str) -> str:
    """Tên file an toàn ASCII."""
    ascii_text = unicodedata.normalize("NFKD", text.replace("đ", "d").replace("Đ", "D")).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-zA-Z0-9]+", "-", ascii_text).strip("-").lower() or "bao-cao"


def render_report(
    analysis: dict, advice: Optional[dict] = None, counter: Optional[dict] = None, notes: Optional[dict] = None,
    generated_on: Optional[date] = None,
) -> str:
    out = [f"# Phân tích đối thủ: {analysis['name']}", ""]
    formation = analysis["lineup"].get("formation_name")
    bench = analysis.get("benchmark")
    out.append(
        f"- Sơ đồ: {formation or 'chưa rõ'}"
        + (f"\n- So sánh với {bench['teams']} đội {bench.get('league_name') or 'cùng giải'}" if bench else "\n- Chưa đủ đội cùng giải để so phân vị")
    )
    if generated_on:
        out.append(f"- Xuất ngày: {generated_on.isoformat()}")
    out.append("")

    out += ["## Đội hình ra sân", "", _row("Vị trí", "Cầu thủ", "OVR"), _row("---", "---", "---:")]
    for slot in analysis["lineup"]["slots"]:
        player = slot.get("player")
        mark = " (tự điền)" if slot.get("inferred") else ""
        out.append(_row(slot["position_name"], _name(player) + mark, player["overall"] if player else "—"))
    out.append("")

    out += ["## Chỉ số đội", "", _row("Chỉ số", "Giá trị", "Phân vị trong giải"), _row("---", "---:", "---:")]
    for m in analysis["metrics"]:
        pct = f"P{round(m['percentile'])}" if m.get("percentile") is not None else ""
        out.append(_row(m["label"], m["value"] if m["value"] is not None else "—", pct))
    out.append("")

    out += ["## Điểm yếu rõ nhất", ""]
    out += [f"- {w['text']}" for w in analysis["weak_points"]] or ["- Không có điểm yếu nổi bật so với giải."]
    out += ["", "## Cầu thủ nguy hiểm", ""]
    for title, key in (("Tấn công", "attackers"), ("Kiến tạo", "playmakers")):
        for p in analysis["dangerous"].get(key, []):
            out.append(f"- {title}: **{p['name']}** (OVR {p['overall']}) — {p['why']}")
    if analysis.get("injuries"):
        out += ["", "Chấn thương: " + ", ".join(f"{i['name']}{' (đá chính)' if i['in_xi'] else ''}" for i in analysis["injuries"])]

    form = analysis.get("form")
    if form:
        out += ["", "## Phong độ", ""]
        text = f"{form['matches']} trận gần nhất: {form['wins']} thắng, {form['draws']} hòa, {form['losses']} thua ({form['points']}/{form['max_points']} điểm)"
        if form.get("goal_difference") is not None:
            text += f", hiệu số {form['goal_difference']:+d}"
        out.append(text + ".")
        if not form["verified"]:
            out.append("_Ước tính từ chuỗi phong độ của game, cách đọc chưa được xác nhận, không có tỷ số._")

    if advice:
        out += ["", "## Gợi ý đấu pháp", ""]
        if not advice["suggestions"]:
            out.append("Không có tình huống nào nổi bật để khai thác theo các luật hiện có.")
        for i, s in enumerate(advice["suggestions"], 1):
            out += [f"### {i}. {s['title']}", "", s["advice"], "", "Lý do (chỉ số):"]
            out += [f"- {e}" for e in s["evidence"]]
            out += ["", "Gợi ý chiến thuật:"] + [f"- {t}" for t in s["tactics"]] + [""]
        if advice.get("formation_counters"):
            out += [f"### Sơ đồ khắc chế {advice.get('opponent_formation') or ''}".rstrip(), ""]
            out += [f"- **{c['formation']}**: {c['reason']}" for c in advice["formation_counters"]]

    if counter and counter.get("options"):
        out += ["", "## Đội hình đáp trả đề xuất", ""]
        for i, opt in enumerate(counter["options"], 1):
            usual = " (sơ đồ hiện tại)" if opt["is_usual"] else ""
            out += [f"### Phương án {i}: {opt['formation']['name']}{usual} — điểm {opt['score']}", "", opt["why_formation"], ""]
            out += [_row("Vị trí", "Cầu thủ", "OVR", "Ghi chú"), _row("---", "---", "---:", "---")]
            for s in opt["slots"]:
                p = s.get("player")
                note = s["reasons"][-1] if s.get("reasons") and s.get("rule_bonus", 0) > 0 else (s["reasons"][0] if s.get("reasons") else "")
                out.append(_row(s["position_name"], _name(p), p["overall"] if p else "—", note.replace("|", "/")))
            out.append("")

    if notes:
        out += ["", "## Ghi chú cá nhân và lịch sử gặp", ""]
        if notes.get("note"):
            out += [notes["note"]["text"], ""]
        summ = notes["summary"]
        if summ["played"]:
            out.append(
                f"Lịch sử đối đầu: {summ['played']} trận, {summ['wins']} thắng, {summ['draws']} hòa, {summ['losses']} thua "
                f"(bàn thắng {summ['goals_for']}, bàn thua {summ['goals_against']})."
            )
            for m in notes["meetings"]:
                out.append(f"- {m['played_on'] or 'không rõ ngày'}: {m['goals_for']}–{m['goals_against']}" + (f" — {m['note']}" if m.get("note") else ""))
        elif not notes.get("note"):
            out.append("Chưa có ghi chú hay lịch sử đối đầu.")
    return "\n".join(out).rstrip() + "\n"
