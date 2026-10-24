# Đưa bản web tĩnh lên mạng

Bản web (`frontend/`) là **site tĩnh**: `npm run build` sinh ra thư mục `frontend/out/` chỉ gồm HTML/JS/CSS. Không có
máy chủ, không có API, không cơ sở dữ liệu. Người dùng kéo thả file CSV xuất từ Live Editor vào trang `/import`; toàn bộ
phân tích chạy trong trình duyệt của họ (`frontend/src/engine/`) và dữ liệu được lưu trong IndexedDB của chính trình duyệt đó.
Người host không bao giờ nhận được dữ liệu game hay ghi chú của người dùng.

Yêu cầu build: Node 20.9+ (khuyến nghị 22) và `npm`. Repo phải có cả thư mục `tools/` (script xuất `export_tables.lua` được
chép vào `frontend/public/` trong bước `prebuild` để người dùng tải về từ trang nhập).

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
node e2e/static.cjs            # nhập CSV giả, phân tích, ghi chú, tải báo cáo... trên chính bản build (cần Playwright + Chromium)
```

`npm test` chạy bộ đối chiếu engine TypeScript với bản Python (cần `python3` có `fastapi sqlmodel pyyaml`); xem `docs/engine-parity.md`.
