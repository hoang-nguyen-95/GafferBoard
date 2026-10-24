# Engine TypeScript và đối chiếu với bản Python

Bản web tĩnh không có backend, nên toàn bộ phần tính toán của `backend/app` (nhập CSV, phân tích cầu thủ/đội, luật gợi ý,
chọn đội hình, nhập tay, ghi chú, so sánh, báo cáo Markdown) được viết lại bằng TypeScript trong `frontend/src/engine/`.
Backend Python vẫn là **bản tham chiếu**: nó đã được kiểm chứng kỹ, và engine TypeScript được kiểm tra là cho cùng kết quả.

## Cách đối chiếu

1. `backend/tools/make_synthetic_exports.py` sinh bộ CSV giả có seed (29 sơ đồ, 5 giải gồm giải quốc tế và nữ, đội rỗng,
   cầu thủ chấn thương, tên trùng, dấu tiếng Việt/Bắc Âu, bảng xếp hạng tiền mùa giải và giữa mùa...).
2. `backend/tools/make_golden.py` chạy bản Python (FastAPI `TestClient`) qua một kịch bản dài: mọi endpoint đọc, tìm kiếm,
   phân tích, gợi ý, đội hình đáp trả, so sánh, báo cáo `.md`, rồi các thao tác ghi (cài đặt, kết quả, ghi chú, lịch sử
   gặp, đội hình nhập tay, cả các trường hợp báo lỗi), và lưu từng phản hồi vào file JSON.
3. `frontend/src/engine/__tests__/parity.test.ts` nhập cùng bộ CSV vào engine TypeScript, phát lại từng bước qua
   `handleRequest` và so sánh: mã trạng thái, tập khóa JSON, giá trị (số so với sai số 1e-9, chuỗi so khớp tuyệt đối), nội dung
   báo cáo. Các khóa `*_at` (thời điểm) và dòng "Xuất ngày" được bỏ qua.

```bash
cd frontend && npm test                                   # dữ liệu giả, sinh tự động (cần python3 + gói của backend)
PARITY_STRICT=1 npm test                                  # route chưa cài đặt cũng tính là lỗi
PARITY_EXPORTS=/đường/dẫn/csv PARITY_GOLDEN=/tmp/g.json npm test   # dùng dữ liệu thật của bạn (không commit)
```

Khi sửa luật/phân tích ở backend, chạy lại bộ này để biết engine TypeScript đã lệch ở đâu. `frontend/src/engine/data/*.json`
được sinh từ YAML của backend bằng `python backend/tools/export_engine_data.py` (test `test_engine_data_sync.py` báo lỗi nếu
quên chạy lại).

## Những chỗ phải bắt chước Python từng chi tiết

- `round()` làm tròn theo giá trị nhị phân chính xác và về số chẵn khi đúng một nửa (`pyRound`); `str(float)` luôn có `.0` (`pyFloat`).
- `sum()` của Python ≥ 3.12 cộng bù Neumaier (`pySum`); thứ tự cộng giữ nguyên.
- `LIKE` của SQLite chỉ không phân biệt hoa thường với ASCII; sắp tên theo thứ tự mã ký tự (không theo locale).
- Sắp xếp ổn định, `min`/`max` lấy phần tử đầu tiên khi bằng nhau, thứ tự chèn của dict quyết định kết quả khi hòa điểm.
- Thuật toán Hungarian được port từng dòng để chọn cùng một nghiệm khi có nhiều nghiệm tối ưu.
- Nhập dữ liệu hai pha: kiểm tra toàn bộ file trước, rồi mới ghi, nên lỗi cột/giá trị không để lại dữ liệu nhập dở.

## Chưa kiểm thử được

Diễn giải bằng LLM (gọi `api.anthropic.com` từ trình duyệt bằng khóa của người dùng) cần khóa thật nên chưa chạy thử
được trong môi trường phát triển; phần dựng báo cáo gửi đi thì dùng đúng đường dẫn `report.md` đã được đối chiếu.
