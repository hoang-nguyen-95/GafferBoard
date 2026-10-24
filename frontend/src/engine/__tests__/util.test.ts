import { describe, expect, it } from "vitest";
import { ageOn, avg, daysToDate, displayName, foldText, likeContains, parseCsv, percentile, pyFloat, pyRound, searchKey } from "../util";

describe("pyRound khớp round() của Python", () => {
  it("đúng một nửa làm tròn về số chẵn", () => {
    expect(pyRound(0.5)).toBe(0);
    expect(pyRound(1.5)).toBe(2);
    expect(pyRound(2.5)).toBe(2);
    expect(pyRound(0.25, 1)).toBe(0.2);
    expect(pyRound(0.75, 1)).toBe(0.8);
    expect(pyRound(-2.5)).toBe(-2);
  });
  it("dùng giá trị nhị phân chính xác, không phải chuỗi thập phân", () => {
    expect(pyRound(2.675, 2)).toBe(2.67); // 2.675 thật ra nhỏ hơn 2.675 một chút
    expect(pyRound(1.005, 2)).toBe(1);
    expect(pyRound(84.04, 1)).toBe(84);
  });
  it("giữ nguyên số đã tròn và số đặc biệt", () => {
    expect(pyRound(83.3, 1)).toBe(83.3);
    expect(pyRound(0, 1)).toBe(0);
    expect(pyRound(100, 0)).toBe(100);
    expect(pyRound(Number.NaN)).toBeNaN();
  });
});

describe("pyFloat", () => {
  it("số nguyên có .0 như Python", () => {
    expect(pyFloat(84)).toBe("84.0");
    expect(pyFloat(72.5)).toBe("72.5");
    expect(pyFloat(-1.3)).toBe("-1.3");
  });
});

describe("foldText / searchKey", () => {
  it("bỏ dấu và ký tự đặc biệt", () => {
    expect(foldText("Østergaard")).toBe("ostergaard");
    expect(foldText("Guðjohnsen")).toBe("gudjohnsen");
    expect(foldText("  Nguyễn   Văn ")).toBe("nguyen van");
    expect(foldText("Müller-Weiß")).toBe("muller-weiss");
    expect(foldText("")).toBe("");
  });
  it("searchKey khử trùng theo từ", () => {
    expect(searchKey("Marta Østergaard", "Marta", "Østergaard", "", "M.Ostergaard")).toBe("marta ostergaard m.ostergaard");
  });
  it("displayName ưu tiên tên thông dụng", () => {
    expect(displayName("Bruno Miguel", "Borges Fernandes", "Bruno Fernandes")).toBe("Bruno Fernandes");
    expect(displayName("Senne", "Lammens", "")).toBe("Senne Lammens");
    expect(displayName("", "Lammens", " ")).toBe("Lammens");
  });
});

describe("percentile / avg / likeContains", () => {
  it("nửa số bằng nhau", () => {
    const v = [10, 20, 20, 30];
    expect(percentile(v, 30)).toBe(87.5);
    expect(percentile(v, 20)).toBe(50);
    expect(percentile(v, 5)).toBe(0);
    expect(percentile([], 50)).toBe(50);
  });
  it("avg bỏ null", () => {
    expect(avg([1, null, 2])).toBe(1.5);
    expect(avg([])).toBeNull();
  });
  it("LIKE chỉ phân biệt hoa thường với ASCII", () => {
    expect(likeContains("Manchester Utd", "CHESTER")).toBe(true);
    expect(likeContains("Östersund", "ÖSTERSUND")).toBe(true);   // chữ ASCII được gập, Ö giữ nguyên
    expect(likeContains("Östersund", "östersund")).toBe(false);  // SQLite không gập Ö thành ö (đã đối chiếu với SQLite thật)
  });
});

describe("ngày", () => {
  it("giải mã ngày của game", () => {
    expect(daysToDate(150444)).toBe("1994-09-08");
    expect(daysToDate(153303)).toBe("2002-07-07");
    expect(daysToDate(162032)).toBe("2026-05-31");
  });
  it("tính tuổi", () => {
    expect(ageOn("1999-05-27", "2026-05-31")).toBe(27);
    expect(ageOn("1994-09-08", "2026-05-31")).toBe(31);
    expect(ageOn(null, "2026-05-31")).toBeNull();
  });
});

describe("parseCsv", () => {
  it("ngoặc kép, dấu phẩy, xuống dòng trong ô, CRLF, BOM", () => {
    const { header, rows } = parseCsv('﻿id,name\r\n1,"A ""q"", b"\r\n2,"dòng 1\ndòng 2"\r\n3,\r\n');
    expect(header).toEqual(["id", "name"]);
    expect(rows).toEqual([["1", 'A "q", b'], ["2", "dòng 1\ndòng 2"], ["3", ""]]);
  });
  it("không có dòng trống cuối", () => {
    expect(parseCsv("a,b\n1,2\n").rows).toEqual([["1", "2"]]);
    expect(parseCsv("a,b\n1,2").rows).toEqual([["1", "2"]]);
    expect(parseCsv("").rows).toEqual([]);
  });
});
