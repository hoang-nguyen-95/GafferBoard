-- CounterPick FC: xuất dữ liệu TỰ ĐỘNG theo sự kiện Career Mode (không vòng lặp, không cần Sleep, không treo game).
-- Chỉ ĐỌC dữ liệu, không sửa game hay save.
--
-- Cách hoạt động: script đăng ký một hàm vào sự kiện `post__CareerModeEvent` của Live Editor. Mỗi khi game xử lý một sự kiện
-- (qua ngày, đá xong trận, chuyển nhượng hoàn tất, nhận đề nghị...) hàm này đánh dấu "dữ liệu đã đổi" và xuất lại các bảng cần thiết,
-- giãn cách tối thiểu vài chục giây để không giật game. Ngoài các bảng database còn xuất `cp_state.csv`: ngân sách chuyển nhượng
-- (GetTransferBudget), ngày trong game (GetCurrentDate) và đội của người chơi (GetUserTeamID) - những thứ không có trong bảng nào.
--
-- Cách dùng: ứng dụng CounterPick FC tự chép script này vào thư mục lua/autorun (chạy mỗi khi mở game) và lua/scripts của Live Editor.
-- Nếu Live Editor của bạn không tự chạy autorun thì mở Lua Engine, chọn counterpick_auto.lua rồi Execute MỘT LẦN mỗi phiên chơi.
-- Chạy lại script nhiều lần không sao: chỉ có một bộ xử lý được đăng ký.
--   - Tạo file request_full.txt trong thư mục xuất (ứng dụng làm khi bạn bấm "Yêu cầu xuất lại") để xuất toàn bộ ở sự kiện kế tiếp.
--   - Tạo file stop.txt trong thư mục xuất để tạm dừng; xóa file đó để chạy tiếp.

local OUT_DIR = "D:/XboxGames/fc_exports"

local SCRIPT_VERSION = "counterpick_auto v1"
local FAST_MIN_GAP = 20      -- giây tối thiểu giữa hai lần xuất nhanh
local HEAVY_MIN_GAP = 300    -- giây tối thiểu giữa hai lần xuất bảng nặng (players, tên...)
local CONTROL_POLL_GAP = 5   -- giây tối thiểu giữa hai lần kiểm tra file điều khiển / ghi nhịp tim

-- Bảng nặng (players ~8 giây): chỉ xuất khi vào save, đầu/giữa/cuối mùa, đóng cửa chuyển nhượng hoặc khi ứng dụng yêu cầu.
local HEAVY_PATTERNS = {
    "^players$", "^playernames$", "^dcplayernames$", "^nations$", "^playstyles$", "^prevcompetitionstats$",
    "^previousteam$", "^career_playerlastgrowth$", "^career_playergrowthuserseason$", "^career_growthcurveinfo$",
}

-- Bảng nhẹ, hay đổi khi chơi: xuất sau mỗi đợt thay đổi (giống danh sách của export_tables.lua trừ bảng nặng).
local FAST_PATTERNS = {
    "^teams$", "^teamplayerlinks$", "^leagueteamlinks$", "^leagues$", "fixture", "calendar", "^career_users$",
    "^default_teamsheets$", "^formations$", "^editedplayernames$", "^teamformdiff$", "^playerformdiff$",
    "^career_playerlastmatchhistory$", "^career_competitionprogress$", "^career_squadranking$",
    "^career_playercontract$", "^career_presignedcontract$", "^career_transferblock$", "^playerloans$", "^transfers$",
    "^career_scouts$", "^career_scoutmission$", "^career_managerinfo$", "^career_manager$",
}

-- Sự kiện Career Mode (ENUM_CM_EVENT_MSG_*). Dùng hằng của Live Editor nếu có, không thì số đã đối chiếu với enums.lua (v26.3.6).
pcall(require, "imports/career_mode/enums")
local function ev(name, fallback) return rawget(_G, "ENUM_CM_EVENT_MSG_" .. name) or fallback end

local HEAVY_EVENTS, FAST_EVENTS, CHECK_EVENTS = {}, {}, {}
for _, e in ipairs({
    ev("POST_LOAD_PREPARE", 29), ev("PRE_SEASON_STARTED", 12), ev("MID_SEASON_REACHED", 18),
    ev("END_OF_SEASON_REACHED", 19), ev("SEASON_RESET", 23), ev("TRANSFER_WINDOW_CLOSED", 102),
}) do HEAVY_EVENTS[e] = true end
for _, e in ipairs({
    ev("DAY_PASSED", 15), ev("WEEK_PASSED", 16), ev("MONTH_PASSED", 17), ev("USER_MATCH_COMPLETED", 7),
    ev("PLAYER_CONTRACT_ACCEPTED", 63), ev("PLAYER_CONTRACT_NEGOTIATION", 64), ev("TRANSFER_MOVE_COMPLETE", 86),
    ev("USER_PRESIGNED_CONTRACT_CREATED", 87), ev("TRANSFER_BID_REJECTED", 94), ev("TRANSFER_BID_RETRACTED", 95),
    ev("TRANSFER_BID_COUNTER_OFFER", 96), ev("TRANSFER_BID_COUNTER_OFFER_REJECTED_BY_CPU", 97),
    ev("PLAYER_ADDED_TO_TEAM", 110), ev("PLAYER_REMOVED_FROM_TEAM", 111), ev("USER_TRANSFERLISTED", 137),
    ev("USER_LOANLISTED", 138), ev("USER_TRANSFER_OFFER_RECEIVED", 143), ev("USER_LOAN_OFFER_RECEIVED", 144),
    ev("USER_CONTRACT_RENEWAL", 145), ev("PLAYER_MADE_AVAILABLE_FOR_TRANSFER", 80),
    ev("BACK_FROM_INJURY", 66), ev("LONGTERM_INJURY", 122),
}) do FAST_EVENTS[e] = true end
for _, e in ipairs({ ev("SCREEN_HAS_DONE_LOADING", 68), ev("ENTERING_TEAM_MANAGEMENT", 82) }) do CHECK_EVENTS[e] = true end
local POST_LOAD = ev("POST_LOAD_PREPARE", 29)

-- ===== trạng thái dùng chung (giữ qua các lần chạy lại script) =====
COUNTERPICK_AUTO = COUNTERPICK_AUTO or { last_fast = nil, last_heavy = nil, last_check = nil, pending_fast = false,
    pending_heavy = false, busy = false, exported_once = false, ticks = 0, errors = 0 }
local S = COUNTERPICK_AUTO

local function log(msg)
    if Log then pcall(Log, "[CounterPick auto] " .. tostring(msg)) end
end

local function now()
    if os and os.time then
        local ok, t = pcall(os.time)
        if ok and t then return t end
    end
    if os and os.clock then return os.clock() end
    S.ticks = S.ticks + 1
    return S.ticks
end

local function exists(name)
    local f = io.open(OUT_DIR .. "/" .. name, "r")
    if f then f:close() return true end
    return false
end

local function remove(name)
    if os and os.remove then pcall(os.remove, OUT_DIR .. "/" .. name) end
end

local function csv_cell(v)
    if v == nil then return "" end
    local s = tostring(v)
    if s:find('[",\r\n]') then
        s = '"' .. s:gsub('"', '""') .. '"'
    end
    return s
end

local function matches(name, patterns)
    local lname = name:lower()
    for _, p in ipairs(patterns) do
        if lname:find(p) then return true end
    end
    return false
end

-- Ghi vào file tạm rồi đổi tên: ứng dụng chỉ nhìn file .csv nên không bao giờ đọc phải file ghi dở.
local function write_atomic(name, writer)
    local final = OUT_DIR .. "/" .. name
    local tmp = final .. ".tmp"
    local f, err = io.open(tmp, "wb")
    if not f then
        log("KHONG MO DUOC " .. tmp .. ": " .. tostring(err))
        return false
    end
    writer(f)
    f:close()
    if os and os.rename then
        if os.remove then pcall(os.remove, final) end -- Windows không cho đổi tên đè lên file đã có
        local ok = pcall(os.rename, tmp, final)
        if ok then return true end
    end
    -- không đổi tên được: ghi thẳng (ứng dụng chờ file yên lặng nên vẫn đọc được)
    local src, dst = io.open(tmp, "rb"), io.open(final, "wb")
    if src and dst then dst:write(src:read("*a")) end
    if src then src:close() end
    if dst then dst:close() end
    return true
end

local function dump_table(name)
    local fields = GetDBTableFields(name)
    local rows = GetDBTableRows(name)
    local cols = {}
    for i, fd in ipairs(fields) do cols[i] = fd["name"] end
    return write_atomic(name .. ".csv", function(f)
        local header = {}
        for i, c in ipairs(cols) do header[i] = csv_cell(c) end
        f:write(table.concat(header, ","), "\n")
        for _, row in ipairs(rows) do
            local line = {}
            for i, c in ipairs(cols) do
                local cell = row[c]
                line[i] = csv_cell(cell and cell["value"])
            end
            f:write(table.concat(line, ","), "\n")
        end
    end)
end

local function export_tables(patterns)
    local ok_names, names = pcall(GetDBTablesNames)
    if not ok_names then
        log("Không lấy được danh sách bảng: " .. tostring(names))
        return 0
    end
    local dumped = 0
    for _, n in ipairs(names) do
        if matches(n, patterns) then
            local ok, res = pcall(dump_table, n)
            if ok and res then
                dumped = dumped + 1
            elseif not ok then
                S.errors = S.errors + 1
                log("LOI khi xuat " .. n .. ": " .. tostring(res)) -- một bảng lỗi không làm dừng cả đợt
            end
        end
    end
    return dumped
end

-- Những thứ không nằm trong bảng nào: ngân sách chuyển nhượng, ngày trong game, đội của người chơi.
local function write_state(event_id, kind)
    local function try(fn, ...)
        if type(fn) ~= "function" then return nil end
        local ok, v = pcall(fn, ...)
        if ok then return v end
        return nil
    end
    local team = try(GetUserTeamID)
    local budget = try(GetTransferBudget)
    local d = try(GetCurrentDate)
    local date = ""
    if type(d) == "table" and d.year and d.month and d.day then
        date = string.format("%04d-%02d-%02d", d.year, d.month, d.day)
    end
    local stamp = ""
    if os and os.date then
        local ok, t = pcall(os.date, "%Y-%m-%d %H:%M:%S")
        if ok and t then stamp = t end
    end
    write_atomic("cp_state.csv", function(f)
        f:write("user_team_id,transfer_budget,game_date,last_event,export_kind,exported_at,script_version\n")
        f:write(table.concat({
            csv_cell(team), csv_cell(budget), csv_cell(date), csv_cell(event_id), csv_cell(kind), csv_cell(stamp), csv_cell(SCRIPT_VERSION),
        }, ","), "\n")
    end)
end

local function heartbeat(state)
    local f = io.open(OUT_DIR .. "/heartbeat.txt", "w")
    if f then
        f:write(string.format("%s\n%s\n", tostring(now()), state))
        f:close()
    end
end

local function in_career()
    if type(IsInCM) ~= "function" then return true end
    local ok, v = pcall(IsInCM)
    return ok and v and true or false
end

local function run_export(event_id, heavy)
    S.busy = true
    local started = now()
    -- xuất đầy đủ = bảng nhẹ + bảng nặng; xuất nhanh = chỉ bảng nhẹ
    local n = export_tables(FAST_PATTERNS)
    if heavy then n = n + export_tables(HEAVY_PATTERNS) end
    write_state(event_id, heavy and "full" or "fast")
    S.busy = false
    local t = now()
    S.last_fast = t
    if heavy then S.last_heavy = t; S.exported_once = true end
    heartbeat((heavy and "full:" or "fast:") .. tostring(event_id))
    log(string.format("%s: %d bảng, %s giây (sự kiện %s)", heavy and "Xuất đầy đủ" or "Xuất nhanh", n, tostring(now() - started), tostring(event_id)))
end

local function on_event(_, event_id, _)
    if S.busy then return end
    if not in_career() then return end
    local t = now()

    -- file điều khiển (không kiểm tra ở mọi sự kiện để khỏi tốn)
    local want_full = false
    if S.last_check == nil or t - S.last_check >= CONTROL_POLL_GAP or CHECK_EVENTS[event_id] then
        S.last_check = t
        if exists("stop.txt") then
            heartbeat("paused")
            return
        end
        if exists("request_full.txt") then
            remove("request_full.txt")
            want_full = true
        end
        heartbeat("idle:" .. tostring(event_id))
    end

    if HEAVY_EVENTS[event_id] then S.pending_heavy = true; S.pending_fast = true end
    if FAST_EVENTS[event_id] then S.pending_fast = true end
    if want_full then S.pending_heavy = true; S.pending_fast = true end
    if not S.exported_once and (S.pending_fast or S.pending_heavy) then S.pending_heavy = true end
    if not S.exported_once and not exists("players.csv") then S.pending_heavy = true; S.pending_fast = true end

    -- Ngay lúc nạp save dữ liệu có thể chưa sẵn sàng: để sự kiện kế tiếp mới xuất.
    if event_id == POST_LOAD then return end

    if S.pending_heavy and (want_full or S.last_heavy == nil or t - S.last_heavy >= HEAVY_MIN_GAP) then
        S.pending_heavy, S.pending_fast = false, false
        run_export(event_id, true)
    elseif S.pending_fast and (S.last_fast == nil or t - S.last_fast >= FAST_MIN_GAP) then
        S.pending_fast = false
        run_export(event_id, false)
    end
end

-- Lỗi trong hàm xử lý không bao giờ được làm hỏng sự kiện của game.
local function safe_handler(events_manager, event_id, event)
    local ok, err = pcall(on_event, events_manager, event_id, event)
    if not ok then
        S.busy = false
        S.errors = S.errors + 1
        log("LOI trong bo xu ly su kien " .. tostring(event_id) .. ": " .. tostring(err))
    end
end

-- Chỉ MỘT bộ xử lý được đăng ký dù script chạy lại nhiều lần: hàm cố định gọi tới bản mới nhất.
S.impl = safe_handler
S.handler = S.handler or function(events_manager, event_id, event) return S.impl(events_manager, event_id, event) end

local function register()
    if type(AddEventHandler) ~= "function" then
        log("Không có AddEventHandler: không đăng ký được. Hãy dùng counterpick_export.lua (xuất một lần).")
        return false
    end
    local ok, err = pcall(AddEventHandler, "post__CareerModeEvent", S.handler)
    if not ok then log("Không đăng ký được sự kiện: " .. tostring(err)) end
    return ok
end

local registered = register()
-- Nếu script được nạp quá sớm khi mở game, đăng ký lại khi Live Editor báo đã khởi động xong (cùng một hàm nên không bị trùng).
pcall(AddEventHandler, "post__LEInitDoneEvent", function() register() end)

if registered then
    log(SCRIPT_VERSION .. ": đã đăng ký, xuất vào " .. OUT_DIR)
    -- Đang ở trong Career Mode rồi (chạy tay giữa phiên) thì xuất ngay lần đầu.
    if in_career() and not S.busy then
        local ok, err = pcall(run_export, 0, true)
        if not ok then S.busy = false; log("LOI xuat lan dau: " .. tostring(err)) end
    end
end
