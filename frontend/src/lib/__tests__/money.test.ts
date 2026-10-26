import { describe, expect, it } from "vitest";
import { parseMoney } from "../money";

describe("nhập tiền nhanh", () => {
  it.each([
    ["35m", 35_000_000], ["35 tr", 35_000_000], ["1,2 tỷ", 1_200_000_000], ["1.5b", 1_500_000_000], ["500k", 500_000],
    ["35.000.000", 35_000_000], ["35,000,000", 35_000_000], ["35000000", 35_000_000], ["2.5m", 2_500_000], ["12", 12], ["0,5tr", 500_000],
  ])("%s -> %d", (text, expected) => expect(parseMoney(text)).toBe(expected));
  it.each(["", "abc", "-5", "1..2.3", "m"])("%j không hợp lệ", (text) => expect(parseMoney(text)).toBeNull());
});
