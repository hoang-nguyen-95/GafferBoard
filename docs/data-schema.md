# Data schema — dữ liệu xuất từ game (Giai đoạn 0)

Nguồn: bảng database gốc của game, xuất bằng `tools/live_editor/export_tables.lua` (Live Editor v26.3.6, Career Mode, PC).
Số liệu dưới đây đo trên lần xuất đầu tiên. Ký hiệu: **[OK]** đã kiểm chứng bằng dữ liệu, **[GIẢ THUYẾT]** suy ra nhưng chưa kiểm chứng, **[THIẾU]** chưa có dữ liệu.

## 1. Môi trường xuất

| Mục | Giá trị |
|---|---|
| Công cụ mod | Live Editor v26.3.6 (Features → Game Database để xem bảng; không có nút Export) |
| Cách xuất | Script Lua `tools/live_editor/export_tables.lua` (Features → Lua Engine → execute), mỗi bảng một file CSV |
| Định dạng | CSV, dấu phẩy, dòng đầu là tên cột (tên cột chữ thường), mọi giá trị là số hoặc chuỗi |
| Bản vá FC26 | _chưa ghi_ (cần người dùng bổ sung) |
| Tổng số bảng trong DB | 279 (xem `_tables.txt`) |

## 2. Quy ước chung của dữ liệu

- **Khóa số.** `playerid`, `teamid`, `leagueid` là ID số ổn định → import idempotent bằng khóa này **[OK]**. Trong DB này ID đội/giải khớp bảng `LE_CM_SUPPORTED_LEAGUES_AND_TEAMS.csv` của Live Editor.
- **Ngày.** Mọi cột ngày (`birthdate`, `fixturedate`) là số ngày kể từ **1582-10-14**. Kiểm chứng: `birthdate` của 3 cầu thủ ra đúng ngày sinh thật (1994-09-08, 1999-05-27, 2002-07-07) **[OK]**. Công thức: `date(1582,10,14) + timedelta(days=n)`.
- **Mã vị trí** là mã chuẩn của game: 0 GK, 1 SW, 2 RWB, 3 RB, 4 RCB, 5 CB, 6 LCB, 7 LB, 8 LWB, 9 RDM, 10 CDM, 11 LDM, 12 RM, 13 RCM, 14 CM, 15 LCM, 16 LM, 17 RAM, 18 CAM, 19 LAM, 20 RF, 21 CF, 22 LF, 23 RW, 24 RS, 25 ST, 26 LS, 27 LW; trong `teamplayerlinks.position`: 28 = dự bị, 29 = ngoài danh sách thi đấu. Các giá trị khác 0..27 xuất hiện đúng như vậy trong dữ liệu **[OK]**; bảng tên mã là kiến thức về game, chưa tự kiểm chứng từng mã.
- **Chuỗi có dấu có thể bị lỗi mã hóa.** Một số tên có ký tự lạ (vd `BrĤndby IF` thay vì Brøndby, `Fenerbahĝe`, `GiÆi VĐQG Scotland`): 75/851 tên đội và 7/52 tên giải chứa ký tự không phải ASCII. Một số chữ có dấu thông dụng vẫn đúng (`Atlético`, `Beşiktaş`, `Standard Liège`). Cần xử lý khi tìm kiếm (so khớp bỏ dấu); chưa xác định nguyên nhân gốc **[GIẢ THUYẾT: bảng mã riêng của game kết hợp ngôn ngữ tiếng Việt]**.
- **Giá trị `-1`** nghĩa là "không có" (vd `preferredposition2 = -1` ở 35% cầu thủ) **[OK]**.

## 3. Danh sách file đã xuất

| File | Số dòng | Nội dung | Mô hình (PLAN §4) | Trạng thái |
|---|---|---|---|---|
| `players.csv` | 22 151 | Toàn bộ cầu thủ (145 cột, gồm chỉ số chi tiết) | `Player` | **Thiếu tên** (xem §5) |
| `teams.csv` | 851 | Đội (110 cột: tên, rating đội, phong cách) | `Team` | OK |
| `teamplayerlinks.csv` | 24 662 | Cầu thủ ↔ đội, vị trí trong đội hình, chấn thương, phong độ, bàn thắng | `Player.team_id`, `TeamLineup` | OK |
| `leagueteamlinks.csv` | 851 | Đội ↔ giải + bảng xếp hạng (điểm, thắng/hòa/thua, phong độ) | `Team.league`, phong độ | OK |
| `leagues.csv` | 52 | Danh sách giải | `Team.league` | OK |
| `default_teamsheets.csv` | 850 | Đội hình xuất phát 11 người + người đá phạt | `TeamLineup` | OK |
| `formations.csv` | 880 | Sơ đồ (vị trí từng slot, vai trò); mỗi đội một dòng theo `teamid` | `TeamLineup.formation` | OK |
| `fixtures.csv` | 40 | Các trận sắp diễn ra | `Fixture` | **Không đủ** (xem §4) |
| `career_users.csv` | 1 | Hồ sơ người chơi (HLV) và đội của họ | `UserProfile` | OK |
| `career_calendar.csv` | 1 | Lịch Career | ngày hiện tại | **Không dùng được** (xem §4) |

## 4. Ánh xạ cột → mô hình dữ liệu

### 4.1 `players.csv` → `Player`

Khóa: `playerid`. Các cột thực tế dùng cho mô hình:

| Trường mô hình | Cột gốc | Ghi chú |
|---|---|---|
| id | `playerid` | |
| name | `firstnameid`, `lastnameid`, `commonnameid`, `playerjerseynameid` | Chỉ là **ID tên**; chuỗi tên nằm ở bảng `playernames` (chưa xuất) |
| age | `birthdate` | Số ngày từ 1582-10-14 |
| positions | `preferredposition1`..`preferredposition7` | Mã vị trí, `-1` = trống |
| overall / potential | `overallrating`, `potential` | Khoảng overall 1..95 |
| pace | `acceleration`, `sprintspeed`; tổng hợp `pacdiv` | `pacdiv` = PAC với cầu thủ ngoài sân, = DIV với GK. Kiểm chứng: `0.45*accel + 0.55*sprint` khớp `pacdiv` ở 2 cầu thủ ngoài sân **[OK]** |
| shooting | `finishing`, `shotpower`, `longshots`, `positioning`, `volleys`, `penalties`; tổng hợp `shohan` | `shohan` = SHO (GK: HAN) |
| passing | `shortpassing`, `longpassing`, `vision`, `crossing`, `curve`, `freekickaccuracy`; tổng hợp `paskic` | `paskic` = PAS (GK: KIC) |
| dribbling | `dribbling`, `ballcontrol`, `agility`, `balance`, `reactions`, `composure`; tổng hợp `driref` | `driref` = DRI (GK: REF) |
| defending | `defensiveawareness`, `interceptions`, `standingtackle`, `slidingtackle`; tổng hợp `defspe` | `defspe` = DEF (GK: SPE) |
| physical | `strength`, `stamina`, `aggression`, `jumping`, `headingaccuracy`; tổng hợp `phypos` | `phypos` = PHY (GK: POS) |
| gk_* | `gkdiving`, `gkhandling`, `gkkicking`, `gkpositioning`, `gkreflexes` | |
| height / weight | `height` (cm), `weight` (kg) | |
| weak_foot | `weakfootabilitytypecode` | Khoảng 1..5 |
| skill_moves | `skillmoves` | Khoảng 0..4 (GK = 0). Có vẻ lệch 1 so với số sao hiển thị **[GIẢ THUYẾT]** |
| preferred_foot | `preferredfoot` | 1 = chân phải trong mẫu kiểm tra (chưa kiểm chứng mã 2) |
| playstyles / traits | `trait1`, `trait2`, `icontrait1`, `icontrait2` | Là **bitfield** (vd `12591116`); chưa giải mã. Bảng định nghĩa nằm ở `playstyles` (chưa xuất) **[THIẾU]** |
| gender | `gender` | 0 = nam (20 113), 1 = nữ (2 038) |
| nationality | `nationality` | ID quốc gia; tên ở bảng `nations` (chưa xuất) |
| contract | `contractvaliduntil` | Năm |

Phần còn lại (~90 cột) là cột giao diện/mô hình 3D (tóc, hình xăm, giày, tay áo...), **bỏ qua**.

### 4.2 `teams.csv` → `Team`

Khóa: `teamid` (không trùng). Cột dùng: `teamname`, `overallrating`, `attackrating`, `midfieldrating`, `defenserating`, `buildupplay`, `defensivedepth`, `captainid`, `penaltytakerid`, `form`, `popularity`, `gender`.
Không có cột giải trong `teams`; giải lấy từ `leagueteamlinks`. Có 6/851 đội không có cầu thủ trong `teamplayerlinks` (đội trống) **[OK]**.

### 4.3 `leagueteamlinks.csv` + `leagues.csv` → `Team.league`, bảng xếp hạng, phong độ

Khóa: `teamid` (1 dòng/đội). Cột dùng:

| Ý nghĩa | Cột |
|---|---|
| Giải | `leagueid` → `leagues.leagueid` / `leagues.leaguename` |
| Xếp hạng, điểm | `currenttableposition`, `points`, `nummatchesplayed` |
| Thắng/hòa/thua và bàn thắng bại sân nhà/khách | `homewins`, `homedraws`, `homelosses`, `homegf`, `homega`, `awaywins`, `awaydraws`, `awaylosses`, `awaygf`, `awayga` |
| Phong độ 5 trận | `teamform` (chuỗi tối đa 5 chữ số 0/1/2) |
| Kết quả trận gần nhất | `lastgameresult` (0/1/2) |

Phong độ: `teamform` chỉ chứa chữ số 0,1,2 và trùng 100% với `fixtures.hometeamform` ở 40/40 dòng **[OK]**. Cách đọc 0/1/2 (khả năng cao 0 = thua, 1 = hòa, 2 = thắng, chữ số đầu bên trái có thể bị mất khi là 0) **[GIẢ THUYẾT, cần đối chiếu với một đội có kết quả đã biết]**. Chuỗi này chỉ cho điểm theo trận, **không có tỷ số từng trận**; hiệu số bàn thắng chỉ có tổng cả mùa từ các cột `*gf`/`*ga`.

### 4.4 `teamplayerlinks.csv` → `Player.team_id`, đội hình hiện tại

Khóa: (`teamid`, `playerid`) (cột `artificialkey` là khóa nội bộ). Cột dùng: `teamid`, `playerid`, `position`, `jerseynumber`, `injury`, `form` (phong độ cá nhân, giá trị 0..5, mặc định 3), `leagueappearances`, `leaguegoals`, `yellows`, `reds`.
- `position` < 28 là cầu thủ đang đá chính, đúng vị trí trên sân; 28 = dự bị; 29 = ngoài danh sách. Nhóm đá chính có đủ 11 người ở 838/840 đội **[OK]**.
- `injury` toàn bộ = 0 ở lần xuất này (save mới) nên chưa biết mã chấn thương **[THIẾU]**.

### 4.5 `default_teamsheets.csv` + `formations.csv` → `TeamLineup`

- `default_teamsheets`: khóa `teamid`; `playerid0`..`playerid10` là 11 cầu thủ xuất phát theo thứ tự slot, các cột `playerid11`..`playerid51` là dự bị/phần còn lại; thêm `captainid`, `penaltytakerid`, người đá phạt góc/phạt trực tiếp.
- `formations`: khóa `formationid`; **mỗi đội có một dòng** liên kết bằng `teamid` (880 dòng = 851 dòng đội, đủ cả 851 đội, + 29 sơ đồ chung `teamid=-1`). Cột dùng: `formationname` (vd "4-2-3-1"), `position0`..`position10` (mã vị trí từng slot), `pos0role`..`pos10role` (vai trò), `offset*x/y` (tọa độ), `attackers`, `midfielders`, `defenders`.
- Nhóm 11 người xuất phát của `default_teamsheets` trùng với nhóm `position < 28` của `teamplayerlinks` ở 838/850 đội **[OK]**; nên có hai nguồn lineup nhất quán, ưu tiên `default_teamsheets` + `formations`.

### 4.6 `fixtures.csv` → `Fixture`

Cột: `fixtureid` (khóa), `hometeamid`, `awayteamid`, `competitionid` (trùng `leagueid`), `fixturedate`, `fixturetime` (giây trong ngày, vd 66600 = 18:30), `hometeamform`/`awayteamform`, `hometeamleaguepos`/`awayteamleaguepos`, `hometeammatchesplayed`/`awayteammatchesplayed`, `stadiumid`.
**Không có cột tỷ số, không có cột "đã đá"** → bảng chỉ chứa trận sắp diễn ra, không có lịch sử kết quả **[OK]**.

### 4.7 `career_users.csv` → `UserProfile`

Một dòng: `clubteamid` = đội của người dùng (11 = Manchester Utd, HLV Michael Carrick), `leagueid` = 13 (Premier League), `firstname`, `surname`. Dùng làm `user_team_id` tự động, không cần người dùng chọn **[OK]**.

## 5. Phát hiện quan trọng và khoảng trống

| # | Vấn đề | Mức độ | Phương án |
|---|---|---|---|
| 1 | **Chưa có tên cầu thủ.** `players` chỉ có ID tên (`firstnameid`, `lastnameid`, `commonnameid`) | Chặn GĐ2 (tìm kiếm/autocomplete), GĐ7 | Xuất thêm bảng `playernames` (cùng `editedplayernames`, `dcplayernames` nếu có) rồi nối theo ID |
| 2 | **`fixtures` chỉ có 40 trận, không có trận nào của đội 11 và không có Premier League.** Chỉ có MLS (39), La Liga 2 (54), Liga F (2222) | Chặn GĐ4 "tự nhận đối thủ" nếu không xuất lại | Xuất lại sau khi game đã chạy tới ngày thi đấu của đội bạn; nếu `fixtures` vẫn không chứa trận của bạn thì dùng chọn đối thủ thủ công |
| 3 | **`career_calendar` không dùng được:** `currdate = 20080101` là giá trị mặc định, trong khi `fixtures` có ngày từ 2026-05-27 đến 2026-07-22 (xem công thức ở §2) | Không biết ngày hiện tại của game | Lấy ngày hiện tại từ `min(fixturedate)` của `fixtures`, hoặc người dùng nhập; cần xác nhận lại ở lần xuất thứ hai |
| 4 | **Không có kết quả từng trận.** Chỉ có chuỗi phong độ 5 trận (0/1/2) và thống kê tổng mùa | GĐ3 chỉ làm được "điểm 5 trận gần nhất" | Hiệu số 5 trận gần nhất: nhập tay, hoặc xuất bảng `career_playerlastmatchhistory`, `prevcompetitionstats`, `teamformdiff` và kiểm tra xem có tỷ số không |
| 5 | **Save đang ở trạng thái đầu**: bảng điểm của các CLB bằng 0 (chỉ giải đội tuyển 78 và nữ quốc tế 2136 có trận); `injury` đều 0 | Chưa thể kiểm chứng phong độ/chấn thương | Xuất lại sau khi chơi vài trận |
| 6 | Mã hóa chuỗi có dấu không nhất quán (§2) | Ảnh hưởng tìm kiếm tên | So khớp bỏ dấu; kiểm tra lại với bảng `playernames` |
| 7 | `trait1/trait2/icontrait*` là bitfield chưa giải mã | Chưa dùng được playstyle trong luật | Xuất `playstyles`, đối chiếu với vài cầu thủ biết trước playstyle |
| 8 | `nationality` chỉ là ID | Thấp | Xuất `nations` khi cần hiển thị |

## 6. Checklist nghiệm thu Giai đoạn 0

| Câu hỏi | Kết quả | Phương án nếu thiếu |
|---|---|---|
| Có bảng cầu thủ + chỉ số chi tiết? | **Có** (`players`) | |
| Có tên cầu thủ? | **Chưa** (chỉ ID tên) | Xuất `playernames` |
| Có bảng đội, giải, quan hệ đội–giải? | **Có** | |
| Có cầu thủ thuộc đội nào? | **Có** (`teamplayerlinks`) | |
| Có lineup / sơ đồ mỗi đội? | **Có** (`default_teamsheets` + `formations`) | Không cần suy luận |
| Có lịch thi đấu? | **Một phần**: 40 trận, không có trận của đội người dùng | Xuất lại khi game tới ngày thi đấu; chọn đối thủ thủ công |
| Có kết quả các trận đã đá? | **Không có tỷ số từng trận**; có chuỗi phong độ 5 trận và thống kê mùa | Chuỗi 0/1/2 cho điểm; hiệu số nhập tay |
| Xác định được đội người dùng? | **Có** (`career_users.clubteamid`) | |
| Có chấn thương / phong độ cầu thủ? | `injury` (chưa có dữ liệu mẫu), `form` có | Xuất lại sau vài trận để thấy mã chấn thương |
| Có playstyles? | Bitfield, chưa giải mã | Xuất `playstyles` |
| ID ổn định để import idempotent? | **Có** (`playerid`, `teamid`, `leagueid`) | |

## 7. Đề xuất chốt lại mô hình dữ liệu (cho Giai đoạn 1)

- **Player**: khóa `playerid`; thêm `first_name_id/last_name_id/common_name_id` và cột `name` điền từ `playernames`; lưu thêm trường `name_search` đã bỏ dấu cho autocomplete.
- **Team**: khóa `teamid`; `league_id` lấy từ `leagueteamlinks`; kèm `overall/attack/midfield/defense`.
- **TeamStanding** (mới, bảng riêng từ `leagueteamlinks`): vị trí, điểm, thắng/hòa/thua nhà–khách, bàn thắng bại, `form_string`. Thay cho khái niệm tự tính phong độ từ `Fixture.score` trong PLAN, vì dữ liệu không có tỷ số từng trận.
- **TeamLineup**: nguồn `default_teamsheets` + `formations` (không cần suy ra từ overall); giữ cơ chế suy luận làm phương án dự phòng cho đội thiếu dữ liệu và cho nhập tay.
- **Fixture**: giữ như PLAN nhưng bỏ `score`/`played`; thêm `competition_id`, `fixture_time`. Kết quả (nếu cần) lưu ở bảng **MatchResult** nhập tay.
- **UserProfile**: `user_team_id` lấy từ `career_users.clubteamid` khi có, người dùng chỉ chọn thủ công khi không có.
- **Cấu hình ánh xạ cột bằng file YAML** (PLAN §6): giữ nguyên ý tưởng, vì tên cột dạng chữ thường cố định nhưng có thể đổi giữa các bản FC.
- Các bảng cần xuất bổ sung trước/trong Giai đoạn 1: `playernames`, `editedplayernames`, `dcplayernames`, `nations`, `playstyles`, và (sau khi chơi vài trận) bản xuất mới của `fixtures`, `leagueteamlinks`, `teamplayerlinks`, `career_calendar`.
