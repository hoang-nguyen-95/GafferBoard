import type { NextConfig } from "next";

// Xuất ra HTML/JS tĩnh (thư mục out/): đưa lên Netlify, Cloudflare Pages hoặc bất kỳ hosting tĩnh nào là chạy.
// Mọi tính toán nằm trong trình duyệt (src/engine), không có API hay máy chủ.
const nextConfig: NextConfig = {
  output: "export",
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
