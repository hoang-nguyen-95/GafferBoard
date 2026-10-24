# Vướng mắc và giới hạn đã biết

Những điểm chưa giải quyết được hoặc chưa kiểm chứng, ghi lại để xử lý sau. Mỗi mục nêu rõ cần gì để chốt.

## Cần người dùng cung cấp thêm dữ liệu thật

1. **Cách đọc chuỗi phong độ của game chưa xác nhận** (`leagueteamlinks.teamform`, chữ số 0/1/2). Giả thuyết hiện tại:
   0 = thua, 1 = hòa, 2 = thắng, nằm ở `GAME_FORM_DIGITS` trong `backend/app/services/form.py`. Lần xuất hiện có không cho
   phép kiểm chứng vì save đang ở tiền mùa giải (mọi đội 0 thắng/hòa/thua). Cách chốt: sau vài vòng đấu chính thức, xuất lại
   `leagueteamlinks` rồi so chuỗi với số thắng/hòa/thua thật của một đội. Trong lúc chưa chốt, giao diện luôn ghi "ước tính,
   chưa xác nhận" và ưu tiên kết quả người dùng nhập tay.
2. **Lịch thi đấu của đội bạn chưa có** trong `fixtures` (tiền mùa giải; chỉ có MLS, La Liga 2, Liga F). Chưa biết khi mùa giải
   bắt đầu bảng này có chứa trận của bạn không, và có chỉ chứa một khoảng ngày tới không. Cách chốt: xuất lại khi mùa giải bắt đầu.
   Trong lúc đó chọn đối thủ thủ công trên trang chủ.
3. **`career_calendar` luôn trả ngày mặc định 2008-01-01**, nên tuổi cầu thủ tính theo ngày sớm nhất trong `fixtures` (ước tính,
   có thể lệch 1 tuổi). Cách chốt: xem sau khi mùa giải bắt đầu có đổi không.
4. **`injury` toàn 0** nên chưa biết mã chấn thương. Hệ thống hiện chỉ coi `injury != 0` là "đang chấn thương".
5. **Không có tỷ số từng trận** trong dữ liệu xuất: hiệu số 5 trận gần nhất chỉ có khi người dùng nhập tay kết quả.

## Giới hạn của dữ liệu/công cụ

6. **Playstyles/traits** (`trait1`, `trait2`, `icontrait*`) là bitfield chưa giải mã; `playstyles.csv` chỉ có ID. Luật chưa dùng playstyle.
7. **Lỗi mã hóa chuỗi bản địa hóa**: tên giải, quốc gia (tiếng Việt) và một số tên đội có ký tự sai (`BrĤndby`, `BŇ`).
   Tên cầu thủ không bị. `nations.csv` chưa được import vì lý do này.
8. **Live Editor không có nút xuất**; dùng script Lua `tools/live_editor/export_tables.lua` dựa trên API Lua cũ mà wiki cảnh
   báo "may soon stop working". Đã chạy được trên Live Editor v26.3.6.

## Giới hạn của thuật toán (cố ý, có thể tinh chỉnh)

9. **Bảng khắc chế sơ đồ và các gợi ý chiến thuật là kinh nghiệm chung**, không phải số liệu từ game. Bảng ở
   `backend/app/data/formation_counters.yaml`, luật ở `backend/app/services/rules.py`. Gợi ý chiến thuật viết bằng lời chung,
   không gắn tên tùy chọn cụ thể trong menu game (tên menu đổi theo bản FC).
10. **Đội hình tối ưu chỉ dựa trên OVR theo vị trí, phong độ (1–5) và bonus của luật** (bị chặn ±6 điểm). Chưa tính thể lực
    tức thời, hợp đồng, hóa học đội hình, hay chỉ dẫn từng cầu thủ.
11. **Đội hình nhập tay không có dự bị, phong độ hay chấn thương**, nên các chỉ số độ sâu đội hình không tính.
12. **So sánh phân vị theo giải cần ít nhất 5 đội** có đội hình; ít hơn thì chỉ so với đội của bạn.

## Chưa kiểm chứng với dịch vụ thật

13. **Diễn giải bằng LLM chưa được chạy với Claude API thật** (cả bản Python lẫn bản gọi từ trình duyệt, `frontend/src/lib/llm.ts`, chỉ mới kiểm tra việc dựng báo cáo và xử lý lỗi) (không có khóa trong môi trường phát triển); đã kiểm thử bằng client
    giả và bằng SDK thật ở nhánh "chưa có khóa". Mặc định tắt. Chưa bật tham số `fallbacks` của API cho trường hợp bị từ chối vì
    nội dung phân tích bóng đá không thuộc nhóm nhạy cảm; nếu bị từ chối app hiển thị thông báo thay vì lỗi.
14. **Mới thử trên một save** (Man Utd, Premier League, FC26 Live Editor v26.3.6).
15. **Dữ liệu và ghi chú chỉ nằm trên máy** (IndexedDB trong thư mục dữ liệu của ứng dụng). Xóa thư mục dữ liệu hoặc đổi máy là mất ghi chú; có nút sao lưu/khôi phục dữ liệu cá nhân (.json) ở trang Nhập dữ liệu. Chưa đồng bộ giữa các máy.
16. **Bản web tĩnh: địa chỉ trang dùng `?id=`** (vd `/team?id=123`) thay vì `/teams/123` vì site tĩnh không biết trước id nào tồn tại.
    Link cũ dạng `/teams/123` không còn hiệu lực.
17. **Nhập dữ liệu lớn chạy trên luồng chính của trình duyệt**: bộ dữ liệu thật (~22 nghìn cầu thủ) mất vài giây và trang đứng hình trong lúc đó; chưa chuyển sang Web Worker.
18. **Ứng dụng desktop chưa chạy thử trên Windows thật**: logic theo dõi thư mục, nhập tự động, cài script và lưu dữ liệu đã được kiểm thử bằng Electron
    trên Linux; file `.exe` do GitHub Actions build, chưa có ai mở thử. Chưa có chữ ký số nên Windows sẽ cảnh báo "Unknown publisher".
19. **Chưa biết Live Editor bản của người dùng có tự chạy script được không** (khi mở save hoặc theo sự kiện). Nếu không, vẫn phải bấm Execute trong Live Editor
    mỗi phiên chơi; app không điều khiển Live Editor. Cần danh sách thư mục/file của Live Editor để xác định.
22. **Script xuất lặp chưa được thử trên Live Editor thật** (`tools/live_editor/export_loop.lua`, `probe_loop.lua`): chỉ kiểm tra bằng môi trường Lua giả. Chưa biết `Sleep` có tính bằng mili giây,
    vòng lặp có làm đơ game không, xuất bảng `players` mất bao lâu. Chạy `probe_loop.lua` trước và gửi `probe_result.txt` (xem `docs/live-editor-loop.md`).
21. **Chế độ Manager dựa trên hệ số kinh nghiệm và số bạn tự nhập** (xem `docs/manager.md`): dữ liệu xuất chưa có giá trị cầu thủ, lương, ngân sách; ba bậc giá đàm phán, trọng số điểm
    đáng mua, ngưỡng tuổi chưa kiểm chứng với game. ID giải huyền thoại (2255) và cầu thủ tự do (382) chỉ kiểm tra trên một save. Cần xuất thêm các bảng hợp đồng/chuyển nhượng (script đã bổ sung) để thay giả định bằng số thật.
20. **Cẩm nang là kinh nghiệm chung và cách công cụ phân tích**, không phải số liệu chính thức của EA; mô tả "chỉ số làm gì" viết tay và chưa được ai có chuyên môn
    game kiểm tra. Trang web không có cơ sở dữ liệu cầu thủ thật (không đưa dữ liệu game vào repo).
