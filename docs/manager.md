# Chế độ Manager (ứng dụng Windows)

Dành cho người chơi muốn đóng vai quản lý: biết nên củng cố vị trí nào, nên mua ai, chi bao nhiêu và đàm phán thế nào. Có ở ứng dụng Windows (mục **Manager**),
không có trên trang web. Mọi tính toán nằm trong `frontend/src/engine/manager.ts`, route ở `routes/manager.ts`, giao diện ở `frontend/src/app/manager/`.

## Bốn tab

1. **Nhu cầu đội hình**: mỗi vai trò trong đội hình chính được chấm điểm ưu tiên (người đá chính yếu hơn mặt bằng đội, thiếu/yếu dự bị, cầu thủ từ 31 tuổi, hợp đồng hết cuối mùa).
2. **Mục tiêu chuyển nhượng**: cầu thủ cùng vai trò bạn chưa có, xếp theo "điểm đáng mua" = nâng cấp × 3 + tiềm năng còn lại (≤ 23 tuổi) × 1,5 + số mùa đỉnh cao + 4 nếu hợp đồng sắp hết.
   Lọc theo tuổi, OVR, số mùa hợp đồng. Mặc định loại cầu thủ huyền thoại (Classic League), quá 40 tuổi, khác giới; gắn nhãn cầu thủ tự do.
3. **Ngân sách và shortlist**: bạn nhập ngân sách chuyển nhượng còn lại và quỹ lương còn trống (đọc trong game); thêm cầu thủ mục tiêu kèm giá, lương, trạng thái; thêm cầu thủ dự kiến bán.
   Ứng dụng cộng tổng chi, thu, số dư, cảnh báo vượt ngân sách/quỹ lương, điểm trên mỗi triệu, và gợi ý chia ngân sách theo mức cần của 4 vị trí.
4. **Đàm phán**: nhập "Giá trị" hiển thị trong game (và giá bên bán đòi nếu có) → ba bậc giá (mở giá, mục tiêu, tối đa) điều chỉnh theo hợp đồng/tuổi/tiềm năng, nhận xét giá đòi và lời khuyên.

Dữ liệu (ngân sách, shortlist, bán) nằm trong dữ liệu cá nhân của ứng dụng, được sao lưu cùng ghi chú và kết quả.

## Giới hạn quan trọng

- **Dữ liệu xuất hiện tại không có giá trị cầu thủ, lương, ngân sách hay hợp đồng chi tiết.** Có `contract_until`, `potential`, tuổi, OVR, chỉ số, vị trí, thuộc đội nào; các số tiền là bạn tự nhập.
- Mọi hệ số (trọng số điểm, ngưỡng tuổi, ba bậc giá và điều chỉnh) là **kinh nghiệm chung, chưa kiểm chứng với game**; xuất ra thành hằng số trong `manager.ts` (và hiện ở cẩm nang) để chỉnh khi có số liệu thật.
- `contract_until` được hiểu là năm dương lịch hợp đồng kết thúc; năm kết thúc mùa tự suy từ ngày tham chiếu (ngày sớm nhất trong lịch thi đấu) và chỉnh được ở tab Ngân sách.
- ID giải huyền thoại (2255) và giải cầu thủ tự do (382) lấy từ một save đã kiểm tra; save khác có thể khác.
- Chưa có bản Python tương ứng nên phần này không nằm trong bộ đối chiếu (`docs/engine-parity.md`); nó được kiểm bằng test riêng (`engine/__tests__/manager.test.ts`) và e2e.

## Bước tiếp theo cần dữ liệu thật

Script xuất đã được bổ sung các bảng `career_playercontract`, `career_presignedcontract`, `career_transferblock`, `playerloans`, `transfers`, `previousteam`, `career_scouts`,
`career_scoutmission`, `career_playerlastgrowth`, `career_growthcurveinfo`, `career_playergrowthuserseason`, `career_managerinfo`, `career_manager`. Ứng dụng chưa đọc chúng (ứng dụng
desktop bỏ qua file không nằm trong danh sách dùng). Sau khi bạn xuất lại và gửi tiêu đề cột (hoặc vài dòng đầu, đã bỏ thông tin riêng tư), có thể lập ánh xạ để dùng
lương thật, thời hạn hợp đồng, danh sách chuyển nhượng, và đường cong tăng trưởng thay cho các giả định ở trên.
