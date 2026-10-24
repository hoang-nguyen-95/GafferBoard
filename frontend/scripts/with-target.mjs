// Chạy một lệnh với NEXT_PUBLIC_TARGET được đặt (đa nền tảng, không cần cross-env): node scripts/with-target.mjs desktop next build
import { spawnSync } from "node:child_process";

const [target, ...cmd] = process.argv.slice(2);
if (!["web", "desktop"].includes(target) || cmd.length === 0) {
  console.error("Cách dùng: node scripts/with-target.mjs <web|desktop> <lệnh...>");
  process.exit(2);
}
const res = spawnSync(cmd[0], cmd.slice(1), { stdio: "inherit", shell: true, env: { ...process.env, NEXT_PUBLIC_TARGET: target } });
process.exit(res.status ?? 1);
