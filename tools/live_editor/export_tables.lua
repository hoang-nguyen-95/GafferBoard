-- Xuất bảng database của game ra CSV (Live Editor -> Features -> Lua Engine -> execute).
-- Chỉ ĐỌC database, không sửa gì. Dùng các hàm trong "LUA API" của wiki Live Editor:
--   GetDBTablesNames(), GetDBTableFields(name), GetDBTableRows(name)
-- Bước 1: chạy nguyên bản -> ra file _tables.txt (danh sách mọi bảng) và CSV của các bảng khớp TABLE_PATTERNS.
-- Bước 2: sửa TABLE_PATTERNS nếu cần thêm/bớt bảng rồi chạy lại.

-- ===== CẤU HÌNH =====
-- Thư mục phải tồn tại sẵn. Dùng dấu / hoặc \\ trong đường dẫn.
local OUT_DIR = "D:/XboxGames/fc_exports"

-- Mẫu Lua (khớp trên tên bảng viết thường). "^players$" = đúng bảng players.
-- Đây chỉ là phỏng đoán tên bảng; xem _tables.txt để chỉnh cho đúng.
local TABLE_PATTERNS = {
    "^players$", "^teams$", "^teamplayerlinks$", "^leagueteamlinks$", "^leagues$",
    "fixture", "calendar", "^career_users$", "^default_teamsheets$", "^formations$",
    -- Bổ sung sau lần xuất đầu (tên cầu thủ, quốc gia, playstyle, dữ liệu phong độ/kết quả):
    "^playernames$", "^editedplayernames$", "^dcplayernames$", "^nations$", "^playstyles$",
    "^teamformdiff$", "^playerformdiff$", "^prevcompetitionstats$",
    "^career_playerlastmatchhistory$", "^career_competitionprogress$", "^career_squadranking$",
    -- Bổ sung cho chế độ Manager (hợp đồng, lương, chuyển nhượng, tăng trưởng): ứng dụng CHƯA đọc các bảng này,
    -- xuất ra để xem cột thật rồi mới lập ánh xạ. Nếu bảng nào quá lớn/chậm, xóa dòng tương ứng.
    "^career_playercontract$", "^career_presignedcontract$", "^career_transferblock$", "^playerloans$", "^transfers$",
    "^previousteam$", "^career_scouts$", "^career_scoutmission$", "^career_playerlastgrowth$", "^career_growthcurveinfo$",
    "^career_playergrowthuserseason$", "^career_managerinfo$", "^career_manager$",
}
-- ====================

-- Nhật ký ghi cả vào cửa sổ log của Live Editor lẫn file export_log.txt trong thư mục xuất (để biết đã chạy bản script nào và bảng nào lỗi).
local SCRIPT_VERSION = "counterpick_export v3 (kèm bảng hợp đồng/chuyển nhượng)"
local log_started = false
local function log(msg)
    Log(msg)
    local f = io.open(OUT_DIR .. "/export_log.txt", log_started and "ab" or "wb")
    if f then
        log_started = true
        f:write(os.date("%Y-%m-%d %H:%M:%S "), msg, "\n")
        f:close()
    end
end

local function csv_cell(v)
    if v == nil then return "" end
    local s = tostring(v)
    if s:find('[",\r\n]') then
        s = '"' .. s:gsub('"', '""') .. '"'
    end
    return s
end

local function open_out(name)
    local f, err = io.open(OUT_DIR .. "/" .. name, "wb")
    if not f then
        Log("KHONG MO DUOC FILE " .. OUT_DIR .. "/" .. name .. ": " .. tostring(err))
    end
    return f
end

local function matches(name)
    local lname = name:lower()
    for _, p in ipairs(TABLE_PATTERNS) do
        if lname:find(p) then return true end
    end
    return false
end

local function dump_table(name)
    local fields = GetDBTableFields(name)
    local rows = GetDBTableRows(name)
    local f = open_out(name .. ".csv")
    if not f then return false end

    local cols = {}
    for i, fd in ipairs(fields) do
        cols[i] = fd["name"]
    end
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
    f:close()
    log(string.format("Da xuat %s: %d dong, %d cot", name, #rows, #cols))
    return true
end

log("Bat dau: " .. SCRIPT_VERSION .. ", " .. #TABLE_PATTERNS .. " mau bang")
local names = GetDBTablesNames()
local list = open_out("_tables.txt")
if list then
    for _, n in ipairs(names) do list:write(n, "\n") end
    list:close()
    log("Da ghi _tables.txt: " .. #names .. " bang")
end

local dumped = 0
for _, n in ipairs(names) do
    if matches(n) then
        local ok, res = pcall(dump_table, n)
        if ok and res then
            dumped = dumped + 1
        elseif not ok then
            log("LOI khi xuat " .. n .. ": " .. tostring(res))
        else
            log("KHONG XUAT DUOC " .. n .. " (khong mo duoc file)")
        end
    end
end
-- Mẫu dạng "^ten$" (đúng một bảng) mà game không có bảng nào khớp: báo để biết tên bảng khác phiên bản.
local present = {}
for _, n in ipairs(names) do present[n:lower()] = true end
for _, p in ipairs(TABLE_PATTERNS) do
    local exact = p:match("^%^(.+)%$$")
    if exact and not present[exact] then log("KHONG CO BANG " .. exact .. " trong game") end
end
log("Xong. Da xuat " .. dumped .. " bang vao " .. OUT_DIR)
