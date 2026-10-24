# CounterPick FC

Web app chạy **local** giúp phân tích đối thủ và gợi ý đấu pháp cho FC26 Career Mode (PC, offline).
Chỉ đọc file CSV bạn tự xuất từ game; không đụng vào bộ nhớ game, save hay chế độ online.
Kế hoạch các giai đoạn: [PLAN.md](PLAN.md). Cấu trúc dữ liệu xuất: [docs/data-schema.md](docs/data-schema.md).

## Tính năng

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
2. Tạo thư mục xuất (vd `D:/XboxGames/fc_exports`), sửa `OUT_DIR` ở đầu `tools/live_editor/export_tables.lua`.
3. Live Editor → Features → Lua Engine → dán nội dung script → execute.
4. Chép các file `.csv` vừa ra vào `data/exports/` (thư mục này bị `.gitignore`, không bị commit). Cần có `players`, `teams`, `teamplayerlinks`, `leagueteamlinks`, `leagues`, `default_teamsheets`, `formations`, `fixtures`, `career_users`, và `playernames` (+ `dcplayernames`, `editedplayernames`) để có tên cầu thủ; file nào thiếu thì importer bỏ qua.

## Chạy backend

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

## Tự cập nhật khi có file xuất mới

```bash
cd backend
python watcher.py data/exports      # theo dõi thư mục; thả/sửa file CSV thì tự nhập lại sau khi thư mục yên lặng 3 giây
```

Trang chủ hiển thị "Trận kế tiếp" của đội bạn (đội lấy từ `career_users`, đổi được bằng nút "Đổi đội") dựa trên bảng
`fixtures`; tải lại trang sau khi dữ liệu mới được nhập. Nếu lịch của đội bạn chưa có (vd tiền mùa giải) thì chọn đối
thủ thủ công ngay trên trang chủ.

## Diễn giải bằng LLM (tùy chọn)

Mặc định **tắt** và không có gì rời khỏi máy bạn. Khi bật (công tắc trong mục "Diễn giải bằng LLM" của trang phân tích), nội dung
báo cáo phân tích (gồm ghi chú cá nhân nếu có) được gửi tới Claude API của Anthropic bằng khóa của chính bạn:

```bash
pip install anthropic                     # đã có trong requirements.txt
export ANTHROPIC_API_KEY=...              # hoặc đăng nhập bằng `ant auth login`; app không lưu khóa
export COUNTERPICK_LLM_MODEL=claude-opus-5-5   # tùy chọn, mặc định claude-opus-5-5
```

## Kiểm thử

```bash
cd backend && pytest                      # ~200 test (importer, phân tích, luật, tối ưu đội hình, API, watcher...)
cd frontend && npm run lint && npm run build
```

Test dùng dữ liệu mẫu tự sinh trong code, không cần và không commit dữ liệu từ game.

## Chạy frontend

```bash
cd frontend
npm install
cp .env.example .env.local     # API_URL mặc định http://localhost:8000
npm run dev                     # http://localhost:3000
```
