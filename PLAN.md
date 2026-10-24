# CounterPick FC — Kế hoạch dự án (FC26 Career Mode, PC, offline)

> File này dành cho Claude Code. Hãy đọc toàn bộ, làm theo từng giai đoạn, và dừng lại hỏi khi gặp mục "CẦN HỎI NGƯỜI DÙNG".

## 1. Mục tiêu

Một web app **chạy local (localhost)** giúp người chơi FC26 Career Mode phân tích đối thủ và đưa ra đấu pháp:

- Tự nhận đối thủ kế tiếp từ dữ liệu save/lịch thi đấu.
- Phân tích từng cầu thủ (điểm mạnh/yếu) và cả đội hình đối thủ (chỗ hở, sơ đồ, phong độ).
- Gợi ý sơ đồ, đội hình 11 người và đấu pháp khắc chế từ squad của người dùng.
- Cho phép nhập tay: chọn sơ đồ (vd 4-3-3) + gõ tên cầu thủ để phân tích bất kỳ đội nào.

## 2. Phạm vi và ràng buộc (QUAN TRỌNG)

- **Chỉ Career Mode offline trên PC.** Dữ liệu lấy từ file xuất ra bằng công cụ mod cộng đồng (Live Editor, FIFA Editor Tool hoặc bản tương đương hỗ trợ FC26).
- **Không** hook/đọc bộ nhớ game đang chạy, **không** chặn gói tin, **không** đụng vào Ultimate Team/Rivals/Champions hay bất kỳ chế độ online nào.
- App chỉ đọc file CSV/JSON/SQLite mà người dùng xuất ra. Không sửa file save của game.
- Chạy hoàn toàn local, không cần server/cloud, không gửi dữ liệu ra ngoài (trừ khi người dùng bật tính năng LLM ở giai đoạn sau).
- Không dùng "FIFA" hay "EA" trong tên/branding của app.

## 3. Công nghệ

- **Backend:** Python 3.11+ + FastAPI + SQLModel/SQLAlchemy + SQLite. (Lý do: xử lý CSV/pandas thuận tiện, script đồng bộ cùng ngôn ngữ.)
- **Frontend:** Next.js (App Router) + TypeScript + Tailwind + shadcn/ui. Gọi API của FastAPI.
- **Đồng bộ file:** thư viện `watchdog` theo dõi thư mục xuất.
- **Monorepo:**

```
counterpick-fc/
  backend/
    app/
      main.py
      db.py
      models.py          # Player, Team, Fixture, Squad, Match
      importers/         # parse CSV/JSON từ từng công cụ mod
      services/
        analysis.py      # phân tích cầu thủ/đội
        rules.py         # bộ luật đấu pháp
        lineup.py        # tối ưu 11 người
        formations.py    # định nghĩa sơ đồ + vị trí
      routers/
    watcher.py           # theo dõi thư mục xuất
    tests/
  frontend/
  data/
    exports/             # nơi người dùng thả file xuất từ game
    app.db
  PLAN.md
  README.md
```

## 4. Mô hình dữ liệu (khởi điểm, điều chỉnh theo file xuất thực tế)

- **Team:** id, name, league, formation_default, overall, ...
- **Player:** id, team_id, name, age, positions (list), overall, potential, các chỉ số chi tiết (pace, acceleration, sprint_speed, shooting, finishing, passing, vision, dribbling, defending, interceptions, standing_tackle, sliding_tackle, physical, strength, stamina, aggression, jumping, heading_accuracy, height, weight, weak_foot, skill_moves, gk_*...), playstyles/traits nếu có, injury, form.
- **Fixture:** id, date/matchday, home_team_id, away_team_id, competition, played (bool), score.
- **TeamLineup:** team_id, formation, slots (position → player_id) — lấy từ dữ liệu "starting XI" nếu có, nếu không thì tự suy ra từ overall + vị trí.
- **UserProfile:** user_team_id (đội của người dùng).
- **ManualLineup:** lưu đội hình nhập tay (formation + 11 người).

## 5. Các giai đoạn

### Giai đoạn 0 — Khảo sát dữ liệu (làm TRƯỚC khi code)
**CẦN HỎI NGƯỜI DÙNG:** đang dùng công cụ mod nào cho FC26, phiên bản game/tool, và nhờ họ xuất thử 1 lần. Xin:
- Thư mục xuất và vài file mẫu (players, teams, fixtures, lineups nếu có).
- Liệu có bảng lịch thi đấu và kết quả trận trong dữ liệu xuất không (quyết định tính năng "tự nhận đối thủ" và "phong độ").

Kết quả: viết `docs/data-schema.md` mô tả các cột thực tế, ánh xạ sang mô hình dữ liệu ở mục 4.
Nghiệm thu: biết chính xác file nào chứa gì; nếu thiếu bảng nào thì ghi rõ và đề xuất phương án thay thế (vd nhập kết quả trận tay).

### Giai đoạn 1 — Khung dự án + import dữ liệu
- Khởi tạo backend/frontend, SQLite, migration.
- Importer đọc CSV/JSON vào DB, idempotent (import lại không nhân đôi, cập nhật khi đổi).
- Tests cho importer bằng file mẫu nhỏ.
Nghiệm thu: một lệnh `python -m app.importers.run data/exports` đưa dữ liệu vào DB; API `GET /teams`, `GET /players?team=` trả đúng.

### Giai đoạn 2 — Xem đội và cầu thủ
- Trang danh sách đội, trang đội (squad, sơ đồ, thông số trung bình theo tuyến).
- Trang cầu thủ: chỉ số, radar chart, **điểm mạnh/yếu tự động** (so với trung bình vị trí/giải).
- Tìm kiếm cầu thủ có autocomplete (dùng lại ở nhập tay).
Nghiệm thu: mở được bất kỳ đội/cầu thủ và thấy phân tích.

### Giai đoạn 3 — Phân tích đội hình đối thủ
- Với một đội: tính tốc độ TB hàng thủ, chiều cao TB, thể lực, chỉ số phòng ngự tiền vệ, độ hở hai biên, độ sâu đội hình, cầu thủ nguy hiểm nhất (top attackers/playmakers), điểm yếu rõ nhất.
- Sơ đồ + đội hình hay ra sân (từ lineup hoặc suy ra).
- **Phong độ:** tính từ kết quả các trận đã đá trong save (5 trận gần nhất: điểm, hiệu số). Nếu thiếu dữ liệu thì cho phép nhập tay.
Nghiệm thu: trang "Phân tích đối thủ" hiển thị đủ các mục trên cho 1 đội.

### Giai đoạn 4 — Tự nhận đối thủ kế tiếp
- `watcher.py` theo dõi `data/exports/`; có file mới → import lại → cập nhật.
- Thiết lập `user_team_id` lần đầu (người dùng chọn đội mình).
- Từ bảng Fixture, xác định trận chưa đá gần nhất của đội người dùng → đối thủ → trang chủ hiển thị "Trận kế tiếp: A vs B" và mở thẳng phân tích.
- Nút chọn đối thủ thủ công khi không có lịch.
Nghiệm thu: thả file xuất mới vào thư mục, tải lại trang → đối thủ kế tiếp tự cập nhật.

### Giai đoạn 5 — Engine gợi ý đấu pháp (rule-based)
Viết `rules.py` dạng danh sách luật có thể mở rộng, mỗi luật gồm: điều kiện, mức độ ưu tiên, văn bản gợi ý (tiếng Việt), và gợi ý Custom Tactics / Player Instructions. Ví dụ:
- Hàng thủ chậm (sprint speed TB thấp so với tiền đạo của mình) → đá bóng dài sau lưng, tiền đạo chạy chỗ.
- Tiền vệ phòng ngự yếu (interceptions/tackle thấp) → chơi qua trung lộ, tiền vệ công dạt vào kẽ giữa.
- Hai biên hở / bị chiếm cao → tấn công cánh, cắt vào.
- Đối thủ cao, đánh đầu tốt → hạn chế tạt bóng bổng, phòng thủ phạt góc kỹ.
- Đối thủ có tiền đạo tốc độ cao → lùi sâu đường chắn, hậu vệ giữ đội hình thấp.
- Thủ môn yếu bóng bổng/phản xạ → sút xa, bóng bổng.
Gợi ý sơ đồ khắc chế (bảng khắc chế sơ đồ đơn giản, cấu hình được).
Nghiệm thu: mỗi luật có unit test; trang hiển thị danh sách gợi ý có thứ tự ưu tiên kèm lý do (chỉ số nào gây ra).

### Giai đoạn 6 — Đội hình tối ưu của người dùng
- Nhập squad của người dùng (lấy từ DB theo `user_team_id`).
- Thuật toán chọn 11 người cho từng sơ đồ: tối đa hóa điểm = overall theo vị trí + trọng số theo luật khắc chế đối thủ (vd cần tốc độ khi đối thủ chậm), có tính vị trí phụ, thể lực/chấn thương nếu có.
- Xuất 2–3 phương án (sơ đồ khác nhau) kèm giải thích.
Nghiệm thu: với một đối thủ cho trước, ra đội hình hợp lệ (đủ vị trí, không trùng người) và giải thích được lựa chọn.

### Giai đoạn 7 — Nhập tay đội hình đối thủ
- Chọn sơ đồ (4-3-3, 4-2-3-1, 4-4-2, 3-5-2, ...) → sân bóng tương tác → gõ tên từng vị trí (autocomplete từ DB toàn bộ cầu thủ).
- Chạy cùng pipeline phân tích ở Giai đoạn 3 và 5, rồi gợi ý đội hình đáp trả như Giai đoạn 6.
Nghiệm thu: nhập 4-3-3 + 11 tên → ra phân tích và đội hình đáp trả.

### Giai đoạn 8 — Hoàn thiện (tùy chọn)
- Lưu lịch sử trận gặp từng đội, ghi chú cá nhân.
- Diễn giải bằng LLM (tùy chọn, có công tắc, cần API key do người dùng tự cung cấp).
- So sánh 2 cầu thủ/2 đội, dark mode, xuất báo cáo.
- README hướng dẫn cài đặt, cách xuất dữ liệu từ game, cách chạy.

### Giai đoạn 9 — Bản web tĩnh cho mọi người dùng (đã làm)
- Viết lại phần tính toán bằng TypeScript (`frontend/src/engine/`) chạy trong trình duyệt; giao diện gọi qua "máy chủ ảo" trả cùng JSON như API FastAPI.
- Trang `/import` kéo thả CSV; dữ liệu game và dữ liệu cá nhân lưu riêng trong IndexedDB; sao lưu/khôi phục dữ liệu cá nhân ra JSON.
- Diễn giải LLM gọi thẳng từ trình duyệt bằng khóa của người dùng. Build `output: "export"` → Netlify / Cloudflare Pages.
- Nghiệm thu: engine TypeScript khớp bản Python từng bước trên dữ liệu giả và dữ liệu thật; e2e trên bản build tĩnh. Xem `docs/engine-parity.md`, `docs/deploy.md`.

## 6. Rủi ro và cách xử lý

| Rủi ro | Xử lý |
|---|---|
| Công cụ mod không hỗ trợ bản game hiện tại hoặc hỏng sau cập nhật | Importer tách theo adapter; thêm adapter mới cho mỗi tool; luôn có đường nhập tay |
| Dữ liệu xuất thiếu lịch/kết quả/lineup | Suy ra lineup từ overall+vị trí; cho nhập tay kết quả; ghi rõ trong UI |
| Tên cột khác nhau theo phiên bản | Lớp ánh xạ cột cấu hình bằng file YAML, không hard-code |
| Chỉ số game đổi giữa các bản cập nhật | Không hard-code ngưỡng; tính theo phân vị so với giải/vị trí |

## 7. Quy ước làm việc cho Claude Code

- Làm theo thứ tự giai đoạn, mỗi giai đoạn xong thì chạy test và tóm tắt 2–3 câu trước khi sang giai đoạn tiếp.
- Mọi logic phân tích/luật phải có test với dữ liệu mẫu nhỏ.
- Giao diện và văn bản gợi ý bằng **tiếng Việt**; mã nguồn và tên biến bằng tiếng Anh.
- Thiếu thông tin về dữ liệu thực tế → hỏi người dùng, không tự bịa cột/bảng.
- Commit nhỏ, thông điệp rõ ràng. Không commit file save hay dữ liệu xuất của game.

## 8. Bắt đầu từ đâu

1. Thực hiện **Giai đoạn 0**: hỏi người dùng công cụ mod đang dùng và xin file xuất mẫu.
2. Sau khi có `docs/data-schema.md`, đề xuất chốt lại mô hình dữ liệu rồi mới qua Giai đoạn 1.
