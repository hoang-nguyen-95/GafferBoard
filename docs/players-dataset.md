# Danh sách cầu thủ (web và ứng dụng)

Trang `/cau-thu` là bảng toàn bộ cầu thủ: lọc theo tên/đội, tuyến, giải, quốc tịch, tuổi, OVR, POT; sắp xếp theo cột; ba bộ cột
(cơ bản, + 6 chỉ số chính, + 34 chỉ số chi tiết). Bấm tên để xem trang phân tích cầu thủ (radar, điểm mạnh/yếu theo phân vị, toàn bộ chỉ số).

## Hai nguồn dữ liệu, một giao diện

| | Nguồn | Ghi chú |
|---|---|---|
| Ứng dụng Windows | Dữ liệu save của bạn (engine trong ứng dụng) | Không đóng gói `players.json` |
| Trang web | `frontend/public/data/players.json` (tải một lần ~5 MB) | Nạp vào cùng engine bằng `engine/dataset.ts` nên dùng lại đúng các route `/players`, `/players/{id}/analysis` |

Ngày tính tuổi: ngày sớm nhất trong lịch thi đấu của bản xuất (ứng dụng) hoặc `reference_date` của bộ dữ liệu (web).
Mặc định ẩn huyền thoại (Classic League) và các đội đặc biệt của game (đội 5v5, "Giải khác", nhóm huấn luyện viên tự do); có ô tích để hiện.

## Sinh lại bộ dữ liệu web

```bash
cd backend
python tools/build_players_dataset.py THU_MUC_CSV ../frontend/public/data/players.json
```

Ghi ra `players.json` (leagues, teams, standings, squad, players dạng cột/hàng) và `nations.json` (id quốc gia → tên) cùng thư mục.
Chỉ giữ đội CLB (đội có bảng xếp hạng trong giải không phải quốc tế). Test: `backend/tests/test_players_dataset.py` và
`frontend/src/engine/__tests__/dataset.test.ts` (nạp bộ dữ liệu cho kết quả phân tích giống hệt nhập thẳng CSV; chỉ khác ở đội không thuộc giải nào, bị loại có chủ đích).

## Nguồn gốc và giới hạn

- Dữ liệu là chỉ số cầu thủ trích từ bản xuất EA SPORTS FC 26 (Career Mode) của chủ dự án. Không có ảnh, logo hay nội dung khác của game.
- Đây là ngoại lệ có chủ đích của quy tắc "không commit dữ liệu game" (chủ dự án chọn sau khi được cảnh báo về rủi ro bản quyền/điều khoản của EA). Muốn gỡ: xóa `frontend/public/data/`.
- Trang web có ghi chú: sản phẩm của người hâm mộ, không liên kết với EA, chỉ số có thể khác bản game bạn đang chơi.

## Giá trị chuyển nhượng và lương

Chưa có: bản xuất hiện tại không chứa bảng hợp đồng/chuyển nhượng, và dự án không ước lượng số. Việc cần làm khi có dữ liệu thật:

1. Chạy `export_tables.lua` (đã xuất thêm các bảng hợp đồng/chuyển nhượng) và gửi header cột của `career_playercontract.csv`, `career_transferblock.csv`.
2. Thêm ánh xạ vào `frontend/src/engine/data/mapping.json` + `backend/app/importers`, thêm trường `value`/`wage` cho `Player`.
3. Thêm hai cột vào `PlayersExplorer.tsx` và `build_players_dataset.py`; bỏ ghi chú "chưa có" ở bảng và trang cầu thủ; sửa test `test_no_money_columns`.
