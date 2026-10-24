# CounterPick FC

Web app chạy **local** giúp phân tích đối thủ và gợi ý đấu pháp cho FC26 Career Mode (PC, offline).
Chỉ đọc file CSV bạn tự xuất từ game; không đụng vào bộ nhớ game, save hay chế độ online.
Kế hoạch các giai đoạn: [PLAN.md](PLAN.md). Cấu trúc dữ liệu xuất: [docs/data-schema.md](docs/data-schema.md).

## Trạng thái

- Giai đoạn 0 (khảo sát dữ liệu): xong, xem `docs/data-schema.md`.
- Giai đoạn 1 (khung dự án + import): backend FastAPI + SQLite + Alembic, importer idempotent, API `GET /teams`, `GET /players?team=&q=` (tìm theo tên, không phân biệt dấu); frontend Next.js mới có trang kiểm tra kết nối.
- Giai đoạn 2-4: xem đội/cầu thủ (radar, điểm mạnh/yếu), phân tích đối thủ, tự nhận đối thủ kế tiếp + watcher.
- Tên cầu thủ được ghép từ `playernames`/`dcplayernames`/`editedplayernames` nếu có trong thư mục xuất.

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

## Chạy frontend

```bash
cd frontend
npm install
cp .env.example .env.local     # API_URL mặc định http://localhost:8000
npm run dev                     # http://localhost:3000
```
