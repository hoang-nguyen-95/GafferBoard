import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "../../..");

describe("script xuất phát hành kèm trang web", () => {
  it("bản commit sẵn trong public/ trùng với bản gốc ở tools/ (chạy `npm run sync-assets` nếu lệch)", () => {
    const copy = path.join(root, "public/export_tables.lua");
    const source = path.join(root, "../tools/live_editor/export_tables.lua");
    expect(existsSync(copy), "thiếu public/export_tables.lua").toBe(true);
    if (existsSync(source)) expect(readFileSync(copy, "utf8")).toBe(readFileSync(source, "utf8"));
  });
});
