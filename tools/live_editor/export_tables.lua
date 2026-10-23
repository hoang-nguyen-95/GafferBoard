-- Xuất bảng database của game ra CSV (Live Editor -> Features -> Lua Engine -> execute).
-- Chỉ ĐỌC database, không sửa gì. Dùng các hàm trong "LUA API" của wiki Live Editor:
--   GetDBTablesNames(), GetDBTableFields(name), GetDBTableRows(name)
-- Bước 1: chạy nguyên bản -> ra file _tables.txt (danh sách mọi bảng) và CSV của các bảng khớp TABLE_PATTERNS.
-- Bước 2: sửa TABLE_PATTERNS nếu cần thêm/bớt bảng rồi chạy lại.

-- ===== CẤU HÌNH =====
-- Thư mục phải tồn tại sẵn. Dùng dấu / hoặc \\ trong đường dẫn.
local OUT_DIR = "C:/fc_exports"

-- Mẫu Lua (khớp trên tên bảng viết thường). "^players$" = đúng bảng players.
-- Đây chỉ là phỏng đoán tên bảng; xem _tables.txt để chỉnh cho đúng.
local TABLE_PATTERNS = {
    "^players$", "^teams$", "^teamplayerlinks$", "^leagueteamlinks$", "^leagues$",
    "fixture", "calendar", "^career_users$", "^default_teamsheets$", "^formations$",
}
-- ====================

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
    Log(string.format("Da xuat %s: %d dong, %d cot", name, #rows, #cols))
    return true
end

local names = GetDBTablesNames()
local list = open_out("_tables.txt")
if list then
    for _, n in ipairs(names) do list:write(n, "\n") end
    list:close()
    Log("Da ghi _tables.txt: " .. #names .. " bang")
end

local dumped = 0
for _, n in ipairs(names) do
    if matches(n) then
        local ok, res = pcall(dump_table, n)
        if ok and res then
            dumped = dumped + 1
        elseif not ok then
            Log("LOI khi xuat " .. n .. ": " .. tostring(res))
        end
    end
end
Log("Xong. Da xuat " .. dumped .. " bang vao " .. OUT_DIR)
