import { describe, expect, it } from "vitest";
import { ATTRIBUTE_LABELS, ROLE_ATTRS } from "@/engine/analysis";
import { METRICS } from "@/engine/opponent";
import { RULES } from "@/engine/rules";
import { ATTRIBUTE_NOTES, METRIC_NOTES, RULE_TRIGGERS, STAT_GROUPS } from "../content";

// Cẩm nang lấy danh sách từ engine; test này bảo đảm thêm chỉ số/luật mới thì không quên viết phần giải thích.
describe("cẩm nang khớp công cụ", () => {
  it("mọi chỉ số (trừ chiều cao) nằm đúng một nhóm và có giải thích", () => {
    const grouped = STAT_GROUPS.flatMap((g) => g.attrs);
    expect(new Set(grouped).size).toBe(grouped.length);
    const expected = Object.keys(ATTRIBUTE_LABELS).filter((k) => k !== "height").sort();
    expect([...grouped].sort()).toEqual(expected);
    for (const k of expected) expect(ATTRIBUTE_NOTES[k], k).toBeTruthy();
  });
  it("mọi chỉ số then chốt của vai trò đều có nhãn", () => {
    for (const attrs of Object.values(ROLE_ATTRS)) for (const a of attrs) expect(ATTRIBUTE_LABELS[a], a).toBeTruthy();
  });
  it("mọi luật có mô tả điều kiện kích hoạt, mọi chỉ số đội có cách tính", () => {
    for (const r of RULES) expect(RULE_TRIGGERS[r.id], r.id).toBeTruthy();
    for (const k of Object.keys(METRICS)) expect(METRIC_NOTES[k], k).toBeTruthy();
  });
});
