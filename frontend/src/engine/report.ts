// Xuất báo cáo Markdown từ kết quả phân tích (khớp backend/app/services/report.py).
import { pyFloat, pyRound } from "./util";

type Dict = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const cell = (c: unknown): string => (c === null || c === undefined ? "" : String(c));
const row = (...cells: unknown[]): string => "| " + cells.map(cell).join(" | ") + " |";
const nameOf = (p: Dict | null | undefined): string => (!p ? "—" : p.name || `Cầu thủ #${p.player_id}`);

export function slug(text: string): string {
  const ascii = text.replace(/đ/g, "d").replace(/Đ/g, "D").normalize("NFKD").replace(/[^\x00-\x7f]/g, "");
  return ascii.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase() || "bao-cao";
}

const signedInt = (n: number): string => (n >= 0 ? `+${n}` : String(n));

export function renderReport(analysis: Dict, advice: Dict | null, counter: Dict | null, notes: Dict | null, generatedOn: string | null): string {
  const out: string[] = [`# Phân tích đối thủ: ${analysis.name}`, ""];
  const formation = analysis.lineup.formation_name;
  const bench = analysis.benchmark;
  out.push(
    `- Sơ đồ: ${formation || "chưa rõ"}` +
      (bench ? `\n- So sánh với ${bench.teams} đội ${bench.league_name || "cùng giải"}` : "\n- Chưa đủ đội cùng giải để so phân vị"),
  );
  if (generatedOn) out.push(`- Xuất ngày: ${generatedOn}`);
  out.push("");

  out.push("## Đội hình ra sân", "", row("Vị trí", "Cầu thủ", "OVR"), row("---", "---", "---:"));
  for (const slot of analysis.lineup.slots) {
    const player = slot.player;
    out.push(row(slot.position_name, nameOf(player) + (slot.inferred ? " (tự điền)" : ""), player ? player.overall : "—"));
  }
  out.push("");

  out.push("## Chỉ số đội", "", row("Chỉ số", "Giá trị", "Phân vị trong giải"), row("---", "---:", "---:"));
  for (const m of analysis.metrics) {
    const pct = m.percentile !== null && m.percentile !== undefined ? `P${pyRound(m.percentile)}` : "";
    // def_slowest là số nguyên (min của tốc độ), các chỉ số còn lại là số thực kiểu Python
    const value = m.value === null ? "—" : m.key === "def_slowest" ? String(m.value) : pyFloat(m.value);
    out.push(row(m.label, value, pct));
  }
  out.push("");

  out.push("## Điểm yếu rõ nhất", "");
  if (analysis.weak_points.length) out.push(...analysis.weak_points.map((w: Dict) => `- ${w.text}`));
  else out.push("- Không có điểm yếu nổi bật so với giải.");
  out.push("", "## Cầu thủ nguy hiểm", "");
  for (const [title, key] of [["Tấn công", "attackers"], ["Kiến tạo", "playmakers"]]) {
    for (const p of analysis.dangerous[key] ?? []) out.push(`- ${title}: **${p.name}** (OVR ${p.overall}) — ${p.why}`);
  }
  if (analysis.injuries?.length) {
    out.push("", "Chấn thương: " + analysis.injuries.map((i: Dict) => `${i.name}${i.in_xi ? " (đá chính)" : ""}`).join(", "));
  }

  const form = analysis.form;
  if (form) {
    out.push("", "## Phong độ", "");
    let text = `${form.matches} trận gần nhất: ${form.wins} thắng, ${form.draws} hòa, ${form.losses} thua (${form.points}/${form.max_points} điểm)`;
    if (form.goal_difference !== null && form.goal_difference !== undefined) text += `, hiệu số ${signedInt(form.goal_difference)}`;
    out.push(text + ".");
    if (!form.verified) out.push("_Ước tính từ chuỗi phong độ của game, cách đọc chưa được xác nhận, không có tỷ số._");
  }

  if (advice) {
    out.push("", "## Gợi ý đấu pháp", "");
    if (!advice.suggestions.length) out.push("Không có tình huống nào nổi bật để khai thác theo các luật hiện có.");
    advice.suggestions.forEach((s: Dict, idx: number) => {
      out.push(`### ${idx + 1}. ${s.title}`, "", s.advice, "", "Lý do (chỉ số):");
      out.push(...s.evidence.map((e: string) => `- ${e}`));
      out.push("", "Gợi ý chiến thuật:", ...s.tactics.map((t: string) => `- ${t}`), "");
    });
    if (advice.formation_counters?.length) {
      out.push(`### Sơ đồ khắc chế ${advice.opponent_formation || ""}`.trimEnd(), "");
      out.push(...advice.formation_counters.map((c: Dict) => `- **${c.formation}**: ${c.reason}`));
    }
  }

  if (counter?.options?.length) {
    out.push("", "## Đội hình đáp trả đề xuất", "");
    counter.options.forEach((opt: Dict, idx: number) => {
      const usual = opt.is_usual ? " (sơ đồ hiện tại)" : "";
      out.push(`### Phương án ${idx + 1}: ${opt.formation.name}${usual} — điểm ${pyFloat(opt.score)}`, "", opt.why_formation, "");
      out.push(row("Vị trí", "Cầu thủ", "OVR", "Ghi chú"), row("---", "---", "---:", "---"));
      for (const s of opt.slots) {
        const p = s.player;
        const reasons: string[] = s.reasons ?? [];
        const note = reasons.length && (s.rule_bonus ?? 0) > 0 ? reasons[reasons.length - 1] : reasons.length ? reasons[0] : "";
        out.push(row(s.position_name, nameOf(p), p ? p.overall : "—", note.replaceAll("|", "/")));
      }
      out.push("");
    });
  }

  if (notes) {
    out.push("", "## Ghi chú cá nhân và lịch sử gặp", "");
    if (notes.note) out.push(notes.note.text, "");
    const summ = notes.summary;
    if (summ.played) {
      out.push(`Lịch sử đối đầu: ${summ.played} trận, ${summ.wins} thắng, ${summ.draws} hòa, ${summ.losses} thua (bàn thắng ${summ.goals_for}, bàn thua ${summ.goals_against}).`);
      for (const m of notes.meetings) out.push(`- ${m.played_on || "không rõ ngày"}: ${m.goals_for}–${m.goals_against}` + (m.note ? ` — ${m.note}` : ""));
    } else if (!notes.note) {
      out.push("Chưa có ghi chú hay lịch sử đối đầu.");
    }
  }
  return out.join("\n").trimEnd() + "\n";
}
