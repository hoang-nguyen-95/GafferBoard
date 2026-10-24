# Ứng dụng desktop (Windows)

Cùng giao diện và cùng engine với bản web (`frontend/`), đóng trong cửa sổ riêng bằng Electron và thêm khả năng **tự đọc
thư mục xuất từ Live Editor**: có file CSV mới là tự nhập và phân tích, không kéo thả, không mở trình duyệt.

## Dùng

1. Bấm **Tải ứng dụng Windows** trên trang web (trỏ tới `/releases/latest` của repo), hoặc tải `CounterPickFC-Setup-x.y.z.exe` (cài đặt) hoặc `CounterPickFC-Portable-x.y.z.exe` (chạy thẳng) từ trang Actions/Releases của repo.
   Windows có thể cảnh báo "Unknown publisher" vì app chưa có chữ ký số: bấm *More info → Run anyway*.
2. Lần đầu mở: ở trang chủ bấm **Chọn thư mục xuất** (thư mục `fc_exports` nơi script Live Editor ghi CSV). App nhớ lựa chọn.
3. (Tùy chọn) **Chọn thư mục Live Editor** rồi **Cài script xuất vào Live Editor**: app chép `counterpick_export.lua` vào thư mục script, đã điền sẵn
   thư mục xuất. Trong Live Editor: Features → Lua Engine → chọn script → Execute.
4. Từ đó, mỗi lần script xuất lại, app tự cập nhật sau vài giây yên lặng.

Dữ liệu và ghi chú nằm trong thư mục dữ liệu người dùng của app (`%APPDATA%/counterpick-fc-desktop`), không gửi đi đâu.

## Cách hoạt động

- `desktop/main.js` phục vụ bản web tĩnh qua giao thức `app://counterpick/` (origin cố định nên IndexedDB giữ dữ liệu giữa các lần mở).
- `desktop/src/watcher.js` quét thư mục định kỳ; file chỉ được đọc khi **chữ ký (kích thước + thời điểm sửa) đổi và đã yên lặng** vài giây
  (script Lua có thể đang ghi dở). File không đổi không bị nhập lại; file hỏng báo lỗi một lần rồi chờ file đổi, không thử lặp.
- Giao diện nhận file qua cầu nối `window.desktop` (`desktop/preload.js`), nhập bằng cùng `importFiles` của bản web, rồi báo lại
  kết quả để tiến trình chính ghi nhớ file nào đã nhập.
- Bản web thường không có `window.desktop` nên các phần này tự ẩn.

## Phát hành

Nút tải trên web trỏ tới Release mới nhất. Release được tạo khi đẩy tag `v*` (`git tag v0.1.0 && git push origin v0.1.0`) hoặc chạy tay workflow
`desktop` (Actions → desktop → Run workflow; nút chạy tay chỉ hiện khi file workflow đã nằm trên nhánh mặc định). Đẩy lên nhánh phát triển chỉ build và để file ở Artifacts.

## Giới hạn

- **Bước xuất dữ liệu trong game vẫn do script chạy trong Live Editor.** App không điều khiển Live Editor/game (không giả lập
  chuột, phím, không đọc bộ nhớ). Bạn bấm Execute script trong Live Editor; có tự chạy khi mở save hay không còn phụ thuộc Live Editor.
- Chưa có chữ ký số, chưa có biểu tượng riêng, chưa tự cập nhật phiên bản.
- Build `.exe` chạy trên GitHub Actions (`.github/workflows/desktop.yml`); mới kiểm thử logic và giao diện bằng Electron trên Linux
  (`desktop/test/e2e-electron.cjs`), chưa chạy thử bản `.exe` trên Windows thật.

## Phát triển

```bash
cd frontend && npm ci && npm run build          # bản web tĩnh (frontend/out)
cd ../desktop && npm ci
npm test                                         # test các module (watcher, cài script, cấu hình, giao thức)
npm start                                        # mở app (Linux/Windows có màn hình)
npm run e2e                                      # Electron thật dưới màn hình ảo (cần Playwright + xvfb)
npm run dist                                     # đóng gói Windows (nên chạy trên Windows / GitHub Actions)
```
