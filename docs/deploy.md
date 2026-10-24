# Đưa trang web lên mạng

Trang web (`frontend/`, bản build mặc định `npm run build`) là **site tĩnh** gồm cẩm nang người chơi và trang tải ứng dụng Windows:
`frontend/out/` chỉ có HTML/JS/CSS, không máy chủ, không API, không cơ sở dữ liệu, không nhận dữ liệu game của ai. Công cụ phân tích nằm trong
ứng dụng Windows (xem `docs/desktop.md`); các trang công cụ trên web chỉ hiện hướng dẫn tải ứng dụng.

**Nút tải** trỏ tới `https://github.com/hoang-nguyen-95/GafferBoard/releases/latest/download/CounterPickFC-Setup.exe`: GitHub trả file về máy ngay
(không mở trang). Vì vậy file trong Release phải có tên cố định `CounterPickFC-Setup.exe` / `CounterPickFC-Portable.exe` (workflow `desktop` đã đặt như vậy)
và phải có ít nhất một Release (xem `docs/desktop.md`, mục Phát hành). Nếu đổi tên repo, sửa `frontend/src/lib/links.ts`.

Yêu cầu build: Node 20.9+ (khuyến nghị 22) và `npm`. Repo phải có cả thư mục `tools/` (script xuất `export_tables.lua` được
chép vào `frontend/public/` trong bước `prebuild` để người dùng tải về từ trang Hướng dẫn).

## Netlify

Repo đã có `netlify.toml` ở thư mục gốc. Chỉ cần: **Add new site → Import an existing project** → chọn repo → Deploy.
Hoặc kéo thả thư mục `frontend/out/` (sau khi build ở máy) vào https://app.netlify.com/drop.

## Cloudflare Pages

**Workers & Pages → Create → Pages → Connect to Git**, chọn repo và điền:

| Mục | Giá trị |
| --- | --- |
| Root directory | `frontend` |
| Build command | `npm ci && npm run build` |
| Build output directory | `out` |
| Biến môi trường | `NODE_VERSION` = `22` |

Hoặc dùng Wrangler sau khi build ở máy: `npx wrangler pages deploy frontend/out`.

## Hosting tĩnh khác

Bất kỳ nơi nào phục vụ được file tĩnh đều dùng được, miễn là địa chỉ không kèm đường dẫn con (site ở gốc tên miền), và
`/team` được phục vụ bằng `team.html` (Netlify, Cloudflare Pages, Vercel, nginx với `try_files $uri $uri.html` đều làm vậy).
GitHub Pages cần thêm `basePath` trong `frontend/next.config.ts`, chưa được cấu hình sẵn.

## Kiểm thử trước khi đưa lên

```bash
cd frontend
npm run build
node e2e/web.cjs               # trang chủ, nút tải (tải thẳng file .exe), cẩm nang, các trang công cụ bị chặn (cần Playwright + Chromium)
```

`npm test` chạy test engine (gồm đối chiếu với bản Python, cần `python3` có `fastapi sqlmodel pyyaml`) và test cẩm nang; xem `docs/engine-parity.md`.

## Giao diện và hình minh họa

Trang web dùng bộ icon [lucide-react](https://lucide.dev) (giấy phép ISC) và các hình minh họa sân bóng, sơ đồ, thang giá vẽ bằng SVG ngay trong mã nguồn
(`frontend/src/components/brand/`): không có ảnh ngoài, không dùng logo hay hình cầu thủ/CLB nào, nên không vướng bản quyền. Màu và họa tiết sân cỏ nằm ở `globals.css`.
