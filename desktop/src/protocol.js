// Đổi đường dẫn app://counterpick/... thành file trong thư mục web tĩnh, giống cách hosting thật phục vụ
// (/team -> team.html, / -> index.html) và chặn đọc ra ngoài thư mục gốc.
const fs = require("node:fs");
const path = require("node:path");

const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json", ".txt": "text/plain; charset=utf-8", ".ico": "image/x-icon", ".svg": "image/svg+xml",
  ".png": "image/png", ".woff": "font/woff", ".woff2": "font/woff2", ".lua": "text/plain; charset=utf-8", ".map": "application/json",
};

function resolveAppPath(root, urlPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    return null;
  }
  const base = path.resolve(root);
  const candidates = [decoded, `${decoded}.html`, path.join(decoded, "index.html")].map((p) => path.resolve(base, "." + path.posix.normalize("/" + p.replace(/\\/g, "/"))));
  for (const file of candidates) {
    if (!file.startsWith(base + path.sep)) continue;
    try {
      if (fs.statSync(file).isFile()) return file;
    } catch {
      /* thử ứng viên tiếp theo */
    }
  }
  return null;
}

const mimeOf = (file) => MIME[path.extname(file).toLowerCase()] ?? "application/octet-stream";

module.exports = { resolveAppPath, mimeOf };
