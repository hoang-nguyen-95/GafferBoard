// Cấu hình nhỏ của ứng dụng (thư mục xuất, thư mục Live Editor, chữ ký file đã nhập) lưu trong thư mục dữ liệu người dùng.
const fs = require("node:fs");
const path = require("node:path");

const DEFAULTS = { exportDir: null, leDir: null, imported: {} };

function createConfig(userDataDir) {
  const file = path.join(userDataDir, "config.json");
  let data = { ...DEFAULTS };
  try {
    data = { ...DEFAULTS, ...JSON.parse(fs.readFileSync(file, "utf8")) };
  } catch {
    /* chưa có hoặc hỏng: dùng mặc định */
  }
  const save = () => {
    fs.mkdirSync(userDataDir, { recursive: true });
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  };
  return {
    get: () => data,
    set(patch) {
      data = { ...data, ...patch };
      save();
    },
  };
}

module.exports = { createConfig };
