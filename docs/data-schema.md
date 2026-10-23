# Data schema — dữ liệu xuất từ game (Giai đoạn 0)

> **Trạng thái: CHỜ DỮ LIỆU THẬT.** Chưa có file xuất mẫu nên chưa ghi cột nào ở đây.
> Quy ước của dự án: không tự bịa cột/bảng. Mỗi mục dưới đây chỉ được điền từ file xuất thực tế.

## 1. Môi trường xuất

| Mục | Giá trị |
|---|---|
| Công cụ mod (tên + phiên bản) | Live Editor (người dùng xác nhận); v26.3.6 (từ ảnh chụp); xem bảng gốc qua Features → Game Database |
| Phiên bản game FC26 (bản vá / title update) | _chưa biết_ |
| Định dạng xuất (CSV / JSON / SQLite / khác) | _chưa biết_ |
| Mã hóa / dấu phân cách / dòng tiêu đề | _chưa biết_ |
| Thư mục xuất | _chưa biết_ |

## 2. Danh sách file xuất

| File | Số dòng | Nội dung | Ánh xạ sang mô hình (PLAN §4) |
|---|---|---|---|
| _chưa có_ | | | |

## 3. Cột thực tế → mô hình dữ liệu

Điền mỗi file một bảng: `cột gốc | kiểu | ví dụ | trường đích | ghi chú (đơn vị, mã hóa vị trí/ID...)`.

### 3.1 Players → `Player`
_chưa có_

### 3.2 Teams → `Team`
_chưa có_

### 3.3 Fixtures / lịch thi đấu → `Fixture`
_chưa có_

### 3.4 Kết quả trận (phục vụ "phong độ") → `Fixture.score`
_chưa có_

### 3.5 Lineup / Starting XI → `TeamLineup`
_chưa có_

### 3.6 Khác (chấn thương, playstyles/traits, user team...)
_chưa có_

## 4. Checklist nghiệm thu Giai đoạn 0

| Câu hỏi | Có / Không / Chưa rõ | Phương án nếu thiếu |
|---|---|---|
| Có bảng lịch thi đấu (fixtures)? | Chưa rõ | Chọn đối thủ thủ công (GĐ4) |
| Có kết quả các trận đã đá? | Chưa rõ | Nhập tay kết quả để tính phong độ (GĐ3) |
| Có lineup / starting XI mỗi đội? | Chưa rõ | Tự suy ra từ overall + vị trí |
| Có xác định được đội của người dùng? | Chưa rõ | Người dùng chọn lần đầu (GĐ4) |
| Có chấn thương / thể lực / phong độ cầu thủ? | Chưa rõ | Bỏ qua hoặc nhập tay |
| Có playstyles/traits? | Chưa rõ | Bỏ qua trong luật |
| ID cầu thủ/đội ổn định giữa các lần xuất (để import idempotent)? | Chưa rõ | Khóa tự nhiên (tên + ngày sinh + đội) |

## 5. Đề xuất chốt lại mô hình dữ liệu
_Viết sau khi có số liệu thật, trước khi sang Giai đoạn 1._
