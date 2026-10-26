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

## Quỹ lương và hợp đồng đọc từ save

Tab **Ngân sách** hiện **Quỹ lương hiện tại**: tổng `wage` của các cầu thủ đội bạn trong `career_playercontract.csv`, 8 mức lương cao nhất và các hợp đồng còn dưới 12 tháng (ngày hết hạn = ngày bắt đầu + `duration_months`,
khớp cột `contractvaliduntil` của bảng cầu thủ). Đây là số **đã chi**, không phải số còn trống: ngân sách chuyển nhượng và trần lương không có trong dữ liệu xuất nên vẫn nhập tay.
Bảng cầu thủ thêm cột Lương, HĐ hết hạn, Mượn từ (khi save có dữ liệu); trang cầu thủ hiện lương, ngày hết hạn và đội gốc nếu đang mượn. Game chỉ lưu hợp đồng cho đội của bạn và đội dự bị.
Mã: `frontend/src/engine/contracts.ts`, route `GET /manager/wages` và `GET /players/{id}/contract` (chỉ TypeScript, không có bản Python nên không nằm trong bộ đối chiếu).

## Gợi ý gia hạn hợp đồng (tab Gia hạn hợp đồng)

Dựa trên hợp đồng thật trong save (lương, ngày hết hạn) cho từng cầu thủ đội bạn. Mỗi cầu thủ được xếp vai trò (đá chính / tiềm năng trẻ / dự bị hữu ích / ít đóng góp), mức khẩn cấp theo số tháng còn lại
(gấp ≤ 6, sớm ≤ 12, sau ≤ 24) và một gợi ý:

| Gợi ý | Khi nào |
|---|---|
| Gia hạn | Đá chính, trẻ tiềm năng hoặc dự bị hữu ích còn dưới 31 tuổi, hợp đồng còn tối đa 24 tháng. Số năm: ≤ 23 tuổi 5 năm, 24–28 tuổi 4 năm, 29–30 tuổi 2 năm |
| Gia hạn ngắn | Đá chính từ 31 tuổi (1 năm) |
| Bán / cho đi | Ít đóng góp hoặc dự bị từ 31 tuổi mà hợp đồng còn dưới 12 tháng |
| Theo dõi / Chưa cần | Ít đóng góp nhưng hợp đồng còn 12–24 tháng; hợp đồng còn trên 24 tháng |

**Bậc lương:** game không xuất mức lương cầu thủ sẽ đòi, nên "lương tham chiếu" là lương trung vị của đồng đội cùng tầm OVR (±2, nới ra ±4 nếu dưới 3 người) trong chính đội bạn.
Mở = giữ nguyên lương hiện tại; Mục tiêu = tham chiếu (không thấp hơn hiện tại); Trần = tham chiếu × 1,25 (trụ cột), 1,15 (trẻ tiềm năng), 1,05 (dự bị), không thấp hơn lương hiện tại.
Các hệ số, số năm và ngưỡng ở `frontend/src/engine/renewals.ts` (`RENEWAL`) là **kinh nghiệm chung, chưa kiểm chứng với game**. Tab cũng cộng mức tăng quỹ lương nếu gia hạn tất cả
và so với "quỹ lương còn trống" bạn nhập ở tab Ngân sách. Cầu thủ không có đồng đội cùng tầm (thường là ngôi sao) không có lương tham chiếu.
Route `GET /manager/renewals`, test `engine/__tests__/renewals.test.ts`.

