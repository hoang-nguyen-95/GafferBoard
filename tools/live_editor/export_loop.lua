-- CounterPick FC: xuất bảng dữ liệu LẶP LẠI trong Live Editor (THỬ NGHIỆM).
-- Chạy script "probe_loop.lua" trước để chắc vòng lặp không làm đơ game. Script này chỉ ĐỌC dữ liệu, không sửa game.
--
-- Cách dùng: Live Editor -> Features -> Lua Engine -> chọn script -> Execute MỘT LẦN mỗi phiên chơi; script ở lại và tự xuất.
--   - Mỗi FAST_EVERY giây xuất các bảng nhỏ, hay đổi (lịch thi đấu, bảng xếp hạng, ...).
--   - Mỗi FULL_EVERY giây (hoặc khi ứng dụng tạo file request_full.txt trong thư mục xuất) xuất toàn bộ.
--   - Tạo file stop.txt trong thư mục xuất để dừng script. Script ghi heartbeat.txt mỗi vòng để ứng dụng biết còn chạy.
-- File được ghi vào tên tạm .tmp rồi đổi tên, nên ứng dụng không bao giờ đọc phải file ghi dở.

local OUT_DIR = "D:/XboxGames/fc_exports"

local FAST_EVERY = 120     -- giây
local FULL_EVERY = 1800    -- giây
local POLL_MS = 2000       -- chu kỳ kiểm tra (mili giây)

-- Bảng xuất ở chế độ nhanh (nhỏ, hay đổi)
local FAST_PATTERNS = { "^fixtures$", "^leagueteamlinks$", "^career_users$", "^career_transferblock$", "^teamformdiff$", "^playerformdiff$" }

-- Bảng xuất ở chế độ đầy đủ (giống export_tables.lua)
local TABLE_PATTERNS = {
    "^players$", "^teams$", "^teamplayerlinks$", "^leagueteamlinks$", "^leagues$",
    "fixture", "calendar", "^career_users$", "^default_teamsheets$", "^formations$",
    "^playernames$", "^editedplayernames$", "^dcplayernames$", "^nations$", "^playstyles$",
    "^teamformdiff$", "^playerformdiff$", "^prevcompetitionstats$",
    "^career_playerlastmatchhistory$", "^career_competitionprogress$", "^career_squadranking$",
    "^career_playercontract$", "^career_presignedcontract$", "^career_transferblock$", "^playerloans$", "^transfers$",
    "^previousteam$", "^career_scouts$", "^career_scoutmission$", "^career_playerlastgrowth$", "^career_growthcurveinfo$",
    "^career_playergrowthuserseason$", "^career_managerinfo$", "^career_manager$",
}

local function log(msg)
    if Log then Log("[CounterPick xuất lặp] " .. tostring(msg)) end
end

local function now()
    if os.time then return os.time() end
    return os.clock()
end

local function exists(name)
    local f = io.open(OUT_DIR .. "/" .. name, "r")
    if f then f:close() return true end
    return false
end

local function remove(name)
    if os.remove then pcall(os.remove, OUT_DIR .. "/" .. name) end
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

-- Ghi vào file tạm rồi đổi tên: ứng dụng chỉ nhìn file .csv nên không đọc phải file ghi dở.
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
    if os.rename then
        if os.remove then pcall(os.remove, final) end -- Windows không cho đổi tên đè lên file đã có
        local ok, rerr = pcall(os.rename, tmp, final)
        if ok then return true end
        log("Không đổi tên được " .. tmp .. ": " .. tostring(rerr))
    end
    -- không đổi tên được: ghi thẳng (ứng dụng có chờ yên lặng nên vẫn đọc được)
    local src = io.open(tmp, "rb")
    local dst = io.open(final, "wb")
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
    local ok = write_atomic(name .. ".csv", function(f)
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
    return ok, #rows
end

local function export(patterns, label)
    local started = now()
    local ok_names, names = pcall(GetDBTablesNames)
    if not ok_names then
        log("Không lấy được danh sách bảng: " .. tostring(names))
        return
    end
    local dumped = 0
    for _, n in ipairs(names) do
        if matches(n, patterns) then
            local ok, res = pcall(dump_table, n)
            if ok and res then
                dumped = dumped + 1
            elseif not ok then
                log("LOI khi xuat " .. n .. ": " .. tostring(res)) -- một bảng lỗi không làm dừng cả vòng lặp
            end
            if Sleep then Sleep(1) end -- nhường luồng giữa các bảng
        end
    end
    log(string.format("%s: xuất %d bảng trong %s giây", label, dumped, tostring(now() - started)))
end

local function heartbeat(state)
    local f = io.open(OUT_DIR .. "/heartbeat.txt", "w")
    if f then
        f:write(string.format("%s\n%s\n", tostring(now()), state))
        f:close()
    end
end

-- Không có Sleep thì KHÔNG lặp (tránh treo game): chỉ xuất một lần như export_tables.lua.
if type(Sleep) ~= "function" then
    log("Không có hàm Sleep: xuất một lần rồi dừng.")
    export(TABLE_PATTERNS, "Xuất đầy đủ")
    return
end

log("Bắt đầu. Tạo file stop.txt trong " .. OUT_DIR .. " để dừng.")
remove("stop.txt")
local last_fast, last_full = -1e18, -1e18
while true do
    if exists("stop.txt") then
        remove("stop.txt")
        heartbeat("stopped")
        log("Đã dừng theo yêu cầu (stop.txt).")
        break
    end
    local t = now()
    if exists("request_full.txt") then
        remove("request_full.txt")
        heartbeat("exporting-full")
        export(TABLE_PATTERNS, "Xuất đầy đủ (theo yêu cầu)")
        last_full, last_fast = now(), now()
    elseif t - last_full >= FULL_EVERY then
        heartbeat("exporting-full")
        export(TABLE_PATTERNS, "Xuất đầy đủ")
        last_full, last_fast = now(), now()
    elseif t - last_fast >= FAST_EVERY then
        heartbeat("exporting-fast")
        export(FAST_PATTERNS, "Xuất nhanh")
        last_fast = now()
    end
    heartbeat("idle")
    Sleep(POLL_MS)
end
