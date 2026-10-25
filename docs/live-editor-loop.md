# Script xuất lặp trong Live Editor (thử nghiệm)

Mục tiêu: bấm Execute **một lần mỗi phiên chơi**, script ở lại trong Live Editor và tự xuất lại dữ liệu định kỳ, ứng dụng tự cập nhật.
Cách này **chưa được thử trên Live Editor thật**: mình chỉ kiểm tra được logic bằng môi trường giả (`backend/tests/test_lua_scripts.py`, cần `lua`).
Vì vậy có bước thử an toàn trước.

## Bước 1: chạy script thử (10 giây)

1. Trong ứng dụng Windows, mục chọn thư mục xuất và thư mục Live Editor, bấm **Cài các script xuất vào Live Editor**. Ba script được chép vào
   thư mục script của Live Editor, đã điền sẵn thư mục xuất: `counterpick_export.lua` (xuất một lần), `counterpick_probe_loop.lua` (thử), `counterpick_export_loop.lua` (xuất lặp).
2. Vào Career Mode, mở Live Editor → Features → Lua Engine → chọn **counterpick_probe_loop.lua** → Execute.
3. Trong 10 giây script chạy, xem game có còn phản hồi không (di chuột, chuyển màn hình). Nếu game đứng hình, **đừng** dùng script xuất lặp.
4. Mở file `probe_result.txt` trong thư mục xuất và gửi nội dung (kèm cho biết game có bị đơ không). File cho biết: có hàm `Sleep` không, `Sleep` tính bằng đơn vị gì,
   thời gian đọc các bảng, và có ghi/đổi tên file được không.

## Bước 2: chạy script xuất lặp (nếu bước 1 ổn)

- Execute **counterpick_export_loop.lua** một lần. Script xuất ngay toàn bộ, sau đó:
  - mỗi 2 phút xuất lại các bảng nhỏ hay đổi (lịch thi đấu, bảng xếp hạng, danh sách chuyển nhượng, phong độ);
  - mỗi 30 phút xuất lại toàn bộ;
  - khi ứng dụng bấm **Yêu cầu xuất lại ngay** (tạo file `request_full.txt`), xuất toàn bộ ngay;
  - ghi `heartbeat.txt` mỗi vài giây: ứng dụng dựa vào đó báo "Script xuất lặp đang chạy".
- Để dừng: tạo file `stop.txt` trong thư mục xuất.
- Thông số (`FAST_EVERY`, `FULL_EVERY`, `POLL_MS`) ở đầu script, sửa được.

## Cách script bảo vệ bạn

- Không có hàm `Sleep` thì chỉ xuất một lần rồi dừng, **không chạy vòng lặp bận** (sẽ treo game).
- File ghi vào tên tạm `.tmp` rồi đổi tên, nên ứng dụng không đọc phải file ghi dở.
- Một bảng lỗi chỉ bị ghi log, không làm dừng vòng lặp.
- Script chỉ đọc bảng dữ liệu, không sửa game hay save.

## Chưa biết

- Vòng lặp có làm giật hoặc đơ game ở bản Live Editor của bạn không (đó là lý do có bước thử).
- Xuất toàn bộ (đặc biệt bảng `players`) mất bao lâu và có giật game lúc đó không; kết quả `probe_result.txt` cho một ước lượng thô.
- Nếu Live Editor tự chạy được script khi mở save thì không cần Execute thủ công: cần danh sách thư mục/file của Live Editor để biết.

## Lấy cấu trúc các bảng hợp đồng/chuyển nhượng (để thêm giá trị và lương)

Script xuất đã có thêm các bảng `career_playercontract`, `career_presignedcontract`, `career_transferblock`, `playerloans`, `transfers`, `career_scouts`... Ứng dụng chưa đọc chúng vì chưa biết tên cột.
Cách lấy nhanh, không phải tự mở file:

1. Trong Live Editor chạy lại **counterpick_export.lua** (xuất một lần) để có các bảng mới trong thư mục xuất.
2. Mở ứng dụng → trang **Nhập dữ liệu** → mục **Các bảng chưa dùng** → **Xem cấu trúc các bảng chưa dùng**.
3. Bấm **Sao chép báo cáo** và gửi lại. Báo cáo gồm tên cột, số dòng và 3 dòng mẫu của từng bảng chưa dùng; không chứa gì ngoài dữ liệu trong các bảng đó.

Từ báo cáo đó mới ánh xạ được lương, thời hạn hợp đồng, giá yêu cầu trên danh sách chuyển nhượng... (dự án không đoán tên cột).

