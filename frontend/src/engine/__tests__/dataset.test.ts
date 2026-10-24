// Bộ dữ liệu cầu thủ công khai phải cho CÙNG kết quả phân tích như nhập thẳng CSV (không mất thông tin nào mà phân tích cần).
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { handleRequest } from "../api";
import { loadDataset, type PlayersDataset } from "../dataset";
import { runImport, type FileMap } from "../importer";
import "../routes/register";
import { Store } from "../store";

const BACKEND = path.resolve(__dirname, "../../../../backend");

function pythonAvailable(): boolean {
  try { execFileSync("python3", ["-c", "import fastapi, sqlmodel, yaml"], { stdio: "ignore" }); return true; } catch { return false; }
}

// Các cột cố ý không đưa vào bộ dữ liệu công khai (ID tên và bitfield chưa giải mã): bỏ qua khi so sánh.
const DROPPED = ["first_name_id", "last_name_id", "common_name_id", "jersey_name_id", "trait1", "trait2", "icon_trait1", "icon_trait2"];
// Đội không thuộc giải nào (không có bảng xếp hạng) bị loại khỏi bộ dữ liệu: "club" của cầu thủ đó là null.
const normalise = (res: unknown): string =>
  JSON.stringify(res, (k, v) => {
    if (DROPPED.includes(k)) return undefined;
    if (k === "club" && v && v.league_id === null) return null;
    return v;
  });

describe("bộ dữ liệu cầu thủ công khai", () => {
  const run = pythonAvailable() ? it : it.skip;

  run("tải lại cho kết quả giống nhập thẳng CSV", () => {
    const tmp = mkdtempSync(path.join(tmpdir(), "dataset-"));
    const exportsDir = path.join(tmp, "exports");
    const out = path.join(tmp, "players.json");
    execFileSync("python3", [path.join(BACKEND, "tools/make_synthetic_exports.py"), exportsDir], { cwd: BACKEND, stdio: "ignore" });
    execFileSync("python3", [path.join(BACKEND, "tools/build_players_dataset.py"), exportsDir, out], { cwd: BACKEND, stdio: "ignore" });

    const files: FileMap = new Map();
    for (const f of readdirSync(exportsDir)) if (f.toLowerCase().endsWith(".csv")) files.set(f.toLowerCase(), readFileSync(path.join(exportsDir, f), "utf8"));
    const direct = new Store();
    runImport(direct, files);
    const ds = JSON.parse(readFileSync(out, "utf8")) as PlayersDataset;
    const fromDataset = new Store();
    const meta = loadDataset(fromDataset, ds);

    expect(fromDataset.data.players.size).toBe(direct.data.players.size);
    expect(meta.referenceDate).toBeTruthy();
    const ids = [...direct.data.players.keys()].sort((a, b) => a - b);
    const sample = ids.filter((_, i) => i % 7 === 0);
    expect(sample.length).toBeGreaterThan(20);
    const problems: string[] = [];
    for (const id of sample) {
      for (const suffix of ["", "/analysis"]) {
        const a = handleRequest(direct, "GET", `/players/${id}${suffix}`);
        const b = handleRequest(fromDataset, "GET", `/players/${id}${suffix}`);
        {
          const na = normalise(a), nb = normalise(b);
          if (na !== nb) {
            let i = 0;
            while (na[i] === nb[i]) i++;
            problems.push(`/players/${id}${suffix} @${i}\n A=…${na.slice(Math.max(0, i - 150), i + 250)}\n B=…${nb.slice(Math.max(0, i - 150), i + 250)}`);
          }
        }
      }
    }
    for (const q of ["a", "ma", "jo", "er"]) {
      const a = handleRequest(direct, "GET", `/players?q=${q}&limit=60`);
      const b = handleRequest(fromDataset, "GET", `/players?q=${q}&limit=60`);
      if (normalise(a) !== normalise(b)) problems.push(`/players?q=${q}`);
    }
    expect(problems).toEqual([]);
  });
});
