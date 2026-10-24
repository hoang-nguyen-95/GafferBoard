# CounterPick FC

**Trang web: https://gaffer-board-eta.vercel.app**

Hai phần, cùng một mã nguồn:

- **Trang web (cẩm nang)**: tổng hợp cách đọc chỉ số cầu thủ, vai trò, đấu pháp, sơ đồ khắc chế và nút **tải ứng dụng Windows** (tải thẳng file cài đặt).
  Đây là site tĩnh, đưa lên Netlify/Cloudflare Pages theo [docs/deploy.md](docs/deploy.md). Web **không** nhận file CSV hay phân tích dữ liệu.
- **Ứng dụng Windows (Electron)**: công cụ phân tích đối thủ. Tự đọc thư mục xuất từ Live Editor nên không phải kéo thả, mọi thứ chạy trên máy bạn,
  xem [docs/desktop.md](docs/desktop.md). Chỉ đọc file CSV bạn tự xuất; không đụng vào bộ nhớ game, save hay chế độ online.

Giao diện công cụ và trang web là một dự án Next.js (`frontend/`), chọn bản build bằng biến `NEXT_PUBLIC_TARGET` (`npm run build` = web, `npm run build:desktop` = ứng dụng).
Phần tính toán nằm ở `frontend/src/engine/` (TypeScript) và được đối chiếu với backend Python, xem [docs/engine-parity.md](docs/engine-parity.md).

Kế hoạch các giai đoạn: [PLAN.md](PLAN.md). Cấu trúc dữ liệu xuất: [docs/data-schema.md](docs/data-schema.md).

## Tính năng của ứng dụng

- **Chế độ Manager** (chuyển nhượng và tài chính): nhu cầu đội hình theo vị trí, mục tiêu chuyển nhượng được chấm điểm (nâng cấp, tiềm năng, tuổi, hợp đồng), shortlist và kế hoạch ngân sách (chi, thu từ bán, quỹ lương, cảnh báo vượt), gợi ý bậc giá đàm phán. Số tiền do bạn nhập từ màn Tài chính của game vì dữ liệu xuất chưa có giá/lương; xem [docs/manager.md](docs/manager.md).

- **Trang chủ**: trận kế tiếp của đội bạn (đọc từ `fixtures`), mở thẳng phân tích đối thủ; chọn đội/đối thủ thủ công.
- **Đội và cầu thủ**: sân đội hình, trung bình theo tuyến; trang cầu thủ có radar và điểm mạnh/yếu theo phân vị so với cầu thủ cùng vị trí (cùng giải).
- **Phân tích đối thủ**: chỉ số hàng thủ/thủ môn/tiền vệ/hai biên/thể lực/độ sâu so với các đội cùng giải, cầu thủ nguy hiểm, điểm yếu, phong độ (nhập tay kết quả).
- **Gợi ý đấu pháp** (11 luật có lý do bằng chỉ số) và **sơ đồ khắc chế** cấu hình được.
- **Đội hình đáp trả**: 2–3 phương án (sơ đồ khác nhau) chọn từ squad của bạn, loại cầu thủ chấn thương, kèm giải thích từng người.
- **Nhập tay đội hình đối thủ**: chọn sơ đồ, gõ tên từng vị trí; chạy cùng pipeline phân tích/gợi ý/đáp trả.
- **Ghi chú cá nhân, lịch sử các trận gặp, xuất báo cáo Markdown, so sánh 2 cầu thủ/2 đội**, giao diện sáng/tối theo hệ thống.
- **Diễn giải bằng LLM** (tùy chọn, mặc định tắt, dùng khóa API của bạn): xem mục bên dưới.

Giới hạn và những điểm chưa kiểm chứng: [docs/known-issues.md](docs/known-issues.md).

## Xuất dữ liệu từ game

1. Mở FC26, load Career, bật Live Editor (phím F9).
2. Tạo thư mục xuất (vd `D:/XboxGames/fc_exports`), sửa `OUT_DIR` ở đầu `tools/live_editor/export_tables.lua` (trên site có nút tải script này ở trang Nhập dữ liệu).
3. Live Editor → Features → Lua Engine → dán nội dung script → execute.
4. Kéo thả các file `.csv` vừa ra vào trang **Nhập dữ liệu** của web. (Dùng backend Python thì chép chúng vào `data/exports/`, thư mục này bị `.gitignore`, không bị commit.) Cần có `players`, `teams`, `teamplayerlinks`, `leagueteamlinks`, `leagues`, `default_teamsheets`, `formations`, `fixtures`, `career_users`, và `playernames` (+ `dcplayernames`, `editedplayernames`) để có tên cầu thủ; file nào thiếu thì importer bỏ qua.

## Chạy web ở máy bạn

```bash
cd frontend
npm install
npm run dev              # trang web (cẩm nang) ở http://localhost:3000
npm run dev:desktop      # giao diện công cụ phân tích, mở ở trình duyệt để phát triển (có trang "Nhập dữ liệu" kéo thả CSV)
npm run build            # site tĩnh bản web ở frontend/out (đưa nguyên thư mục này lên hosting)
npm run build:desktop    # giao diện của ứng dụng Windows (rồi cd ../desktop để chạy/đóng gói)
```

## Backend Python (bản tham chiếu, không bắt buộc)

Bản web không cần backend. Backend Python (FastAPI + SQLite) là bản cài đặt gốc đã được kiểm chứng kỹ, giữ lại làm chuẩn để
đối chiếu engine TypeScript và làm công cụ dòng lệnh (nhập CSV, watcher).


```bash
cd backend
pip install -r requirements.txt
python -m app.importers.run data/exports      # nhập dữ liệu (chạy lại nhiều lần được); thêm --db để chọn file SQLite
uvicorn app.main:app --port 8000               # API tại http://localhost:8000 (tài liệu: /docs)
pytest                                          # chạy test
```

DB mặc định: `data/app.db` (đổi bằng biến môi trường `COUNTERPICK_DB`). Ánh xạ cột CSV → mô hình nằm ở
`backend/app/importers/mappings/live_editor.yaml`; khi tên cột đổi giữa các bản game chỉ cần sửa file này.
Sửa `backend/app/models.py` thì tạo migration: `cd backend && alembic revision --autogenerate -m "<mô tả>"`.

Hành vi import: `leagues`, `teams`, `players` được cập nhật tại chỗ (không xóa); `squad` (cầu thủ thuộc đội),
`standings`, `lineups`, `fixtures` được đồng bộ đúng theo file xuất mới (dòng không còn trong file bị xóa).
File thiếu thì bị bỏ qua; cột thiếu/giá trị sai làm import dừng và không ghi gì.

## Tự cập nhật khi có file xuất mới (chỉ backend Python)

```bash
cd backend
python watcher.py data/exports      # theo dõi thư mục; thả/sửa file CSV thì tự nhập lại sau khi thư mục yên lặng 3 giây
```

Trang chủ hiển thị "Trận kế tiếp" của đội bạn (đội lấy từ `career_users`, đổi được bằng nút "Đổi đội") dựa trên bảng
`fixtures`; tải lại trang sau khi dữ liệu mới được nhập (bản web: nhập lại ở trang Nhập dữ liệu, ghi chú/kết quả của bạn được giữ nguyên). Nếu lịch của đội bạn chưa có (vd tiền mùa giải) thì chọn đối
thủ thủ công ngay trên trang chủ.

## Diễn giải bằng LLM (tùy chọn)

Mặc định **đóng** và không có gì rời khỏi máy bạn. Trong mục "Diễn giải bằng LLM" của trang phân tích, dán khóa API Anthropic của
chính bạn rồi bấm "Diễn giải": nội dung báo cáo (gồm ghi chú cá nhân nếu có) được gửi **thẳng từ trình duyệt** tới Claude API,
không qua máy chủ nào khác. Khóa chỉ được lưu (localStorage) nếu bạn tick "Nhớ khóa"; đừng tick trên máy dùng chung.
Backend Python có bản tương đương (`pip install anthropic`, biến môi trường `ANTHROPIC_API_KEY`) cho ai dùng bản local.

## Kiểm thử

```bash
cd backend && pytest                      # ~200 test (importer, phân tích, luật, tối ưu đội hình, API, watcher...)
cd frontend && npm run lint && npm test   # test engine TypeScript, gồm đối chiếu từng bước với bản Python
cd frontend && npm run build && node e2e/web.cjs                      # bản web: cẩm nang, nút tải
cd frontend && npm run build:desktop && node e2e/desktop-build.cjs    # công cụ phân tích trên bản build (cần Playwright + Chromium)
```

Test dùng dữ liệu mẫu tự sinh trong code, không cần và không commit dữ liệu từ game. Ngoại lệ có chủ đích: bộ chỉ số cầu thủ công khai cho trang web (`frontend/public/data/`, xem `docs/players-dataset.md`).
