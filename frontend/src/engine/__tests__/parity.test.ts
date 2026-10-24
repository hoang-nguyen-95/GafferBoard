// Đối chiếu engine TypeScript với bản Python: cùng bộ CSV, cùng kịch bản yêu cầu, phản hồi phải khớp.
//   PARITY_EXPORTS=/đường/dẫn/csv npm test           dùng dữ liệu thật (không commit)
//   mặc định: sinh dữ liệu giả có seed bằng backend/tools/make_synthetic_exports.py
//   PARITY_STRICT=1: route chưa cài đặt cũng bị tính là lỗi
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { handleRequest } from "../api";
import { runImport, type FileMap } from "../importer";
import { Store } from "../store";
import "../routes/register";

const ROOT = path.resolve(__dirname, "../../../..");
const BACKEND = path.join(ROOT, "backend");
const STRICT = process.env.PARITY_STRICT === "1";
const IGNORED_KEY = /_at$/;

interface GoldenStep { method: string; path: string; body?: unknown; status: number; json?: unknown; text?: string }

function pythonAvailable(): boolean {
  try { execFileSync("python3", ["-c", "import fastapi, sqlmodel, yaml"], { stdio: "ignore" }); return true; } catch { return false; }
}

function prepare(): { exportsDir: string; steps: GoldenStep[] } | null {
  if (process.env.PARITY_EXPORTS) {
    const dir = process.env.PARITY_EXPORTS;
    const golden = process.env.PARITY_GOLDEN ?? path.join(mkdtempSync(path.join(tmpdir(), "golden-")), "golden.json");
    if (!existsSync(golden)) execFileSync("python3", [path.join(BACKEND, "tools/make_golden.py"), dir, golden], { cwd: BACKEND, stdio: "inherit" });
    return { exportsDir: dir, steps: JSON.parse(readFileSync(golden, "utf8")).steps };
  }
  if (!pythonAvailable()) return null;
  const tmp = mkdtempSync(path.join(tmpdir(), "parity-"));
  const exportsDir = path.join(tmp, "exports");
  execFileSync("python3", [path.join(BACKEND, "tools/make_synthetic_exports.py"), exportsDir], { cwd: BACKEND, stdio: "ignore" });
  const golden = path.join(tmp, "golden.json");
  execFileSync("python3", [path.join(BACKEND, "tools/make_golden.py"), exportsDir, golden], { cwd: BACKEND, stdio: "ignore" });
  return { exportsDir, steps: JSON.parse(readFileSync(golden, "utf8")).steps };
}

function loadFiles(dir: string): FileMap {
  const files: FileMap = new Map();
  for (const f of readdirSync(dir)) if (f.toLowerCase().endsWith(".csv")) files.set(f.toLowerCase(), readFileSync(path.join(dir, f), "utf8"));
  return files;
}

function diff(a: unknown, b: unknown, where: string, out: string[]): void {
  if (out.length >= 12) return;
  if (typeof a === "number" && typeof b === "number") {
    if (Math.abs(a - b) > 1e-9 * Math.max(1, Math.abs(a), Math.abs(b))) out.push(`${where}: python=${a} ts=${b}`);
    return;
  }
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b)) return void out.push(`${where}: kiểu khác (python=${JSON.stringify(a)?.slice(0, 60)} ts=${JSON.stringify(b)?.slice(0, 60)})`);
    if (a.length !== b.length) out.push(`${where}: độ dài python=${a.length} ts=${b.length}`);
    for (let i = 0; i < Math.min(a.length, b.length); i++) diff(a[i], b[i], `${where}[${i}]`, out);
    return;
  }
  if (a && b && typeof a === "object" && typeof b === "object") {
    const ka = Object.keys(a).filter((k) => !IGNORED_KEY.test(k)).sort();
    const kb = Object.keys(b).filter((k) => !IGNORED_KEY.test(k)).sort();
    if (ka.join() !== kb.join()) out.push(`${where}: khóa khác (chỉ python: ${ka.filter((k) => !kb.includes(k))}; chỉ ts: ${kb.filter((k) => !ka.includes(k))})`);
    for (const k of ka) if (kb.includes(k)) diff((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], `${where}.${k}`, out);
    return;
  }
  if (a !== b) out.push(`${where}: python=${JSON.stringify(a)?.slice(0, 80)} ts=${JSON.stringify(b)?.slice(0, 80)}`);
}

const dropGeneratedDate = (t: string) => t.split("\n").filter((l) => !l.startsWith("- Xuất ngày")).join("\n");

describe("đối chiếu với bản Python", () => {
  const data = prepare();
  const run = data ? it : it.skip;

  run("mọi phản hồi trong kịch bản khớp bản Python", () => {
    const { exportsDir, steps } = data!;
    const store = new Store();
    runImport(store, loadFiles(exportsDir));

    const failures: string[] = [];
    let compared = 0;
    const missing = new Map<string, number>();
    for (const [i, step] of steps.entries()) {
      const res = handleRequest(store, step.method, step.path, step.body);
      const goldenDetail = (step.json as { detail?: unknown } | undefined)?.detail;
      if (res.status === 404 && (res.json as { detail?: string })?.detail === "Not Found" && goldenDetail !== "Not Found") {
        const key = `${step.method} ${step.path.split("?")[0].replace(/\/\d+/g, "/{id}")}`;
        missing.set(key, (missing.get(key) ?? 0) + 1);
        continue;
      }
      compared++;
      const problems: string[] = [];
      if (res.status !== step.status) problems.push(`mã trạng thái python=${step.status} ts=${res.status} (${JSON.stringify(res.json)?.slice(0, 120)})`);
      else if (step.json !== undefined && res.status < 400) diff(step.json, res.json, "$", problems);
      else if (step.json !== undefined) {
        const a = (step.json as { detail?: unknown }).detail;
        const b = (res.json as { detail?: unknown })?.detail;
        if (typeof a === "string") diff(a, b, "detail", problems); // lỗi nghiệp vụ: thông điệp phải khớp; lỗi kiểm tra đầu vào chỉ cần khớp mã
      } else if (step.text !== undefined && dropGeneratedDate(step.text) !== dropGeneratedDate(res.text ?? "")) {
        const a = dropGeneratedDate(step.text).split("\n"), b = dropGeneratedDate(res.text ?? "").split("\n");
        const n = a.findIndex((l, k) => l !== b[k]);
        problems.push(`báo cáo khác ở dòng ${n + 1}:\n   python: ${a[n]}\n   ts:     ${b[n]}`);
      }
      if (problems.length) failures.push(`#${i} ${step.method} ${step.path}\n   ${problems.join("\n   ")}`);
    }
    const total = steps.length;
    console.log(`đối chiếu ${compared}/${total} bước; chưa cài đặt: ${[...missing].map(([k, v]) => `${k} (${v})`).join(", ") || "không"}`);
    if (STRICT) expect([...missing.keys()], "route chưa cài đặt").toEqual([]);
    expect(failures.slice(0, 15).join("\n\n"), `${failures.length} bước lệch`).toBe("");
  });
});
