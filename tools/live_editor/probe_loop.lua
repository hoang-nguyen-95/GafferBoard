-- CounterPick FC: script THỬ vòng lặp trong Live Editor (an toàn, không sửa gì trong game).
-- Mục đích: biết Live Editor của bạn có cho chạy vòng lặp có chờ (Sleep) mà KHÔNG làm đơ game hay không.
-- Cách dùng: Live Editor -> Features -> Lua Engine -> chọn script này -> Execute. Chạy khoảng 10 giây.
--   Trong 10 giây đó hãy xem game còn phản hồi không (di chuyển chuột, chuyển màn hình...).
--   Xong script ghi kết quả vào file probe_result.txt trong thư mục xuất: hãy gửi nội dung file đó (và cho biết game có bị đơ không).
-- Script chỉ ĐỌC bảng dữ liệu và ghi file kết quả; nếu không có Sleep thì không chạy vòng lặp (không treo game).

local OUT_DIR = "D:/XboxGames/fc_exports"

local ROUNDS = 10          -- số lần lặp thử
local SLEEP_MS = 1000      -- mỗi lần chờ 1 giây (nếu Sleep tính bằng mili giây)

local lines = {}
local function say(s)
    lines[#lines + 1] = s
    if Log then Log("[CounterPick thử] " .. s) end
end

local function type_of(name)
    return type(_G[name])
end

say("Thời điểm bắt đầu: " .. (os.date and os.date("%Y-%m-%d %H:%M:%S") or "không có os.date"))
for _, n in ipairs({ "Sleep", "Log", "GetDBTablesNames", "GetDBTableFields", "GetDBTableRows", "LE", "require" }) do
    say(string.format("Có %s: %s", n, type_of(n)))
end
for _, n in ipairs({ "time", "clock", "date", "rename", "remove", "getenv" }) do
    say(string.format("Có os.%s: %s", n, type(os and os[n])))
end
say("Có io.open: " .. type(io and io.open))

local function now()
    if os.time then return os.time() end
    return os.clock()
end

-- 1) đo thời gian đọc một bảng nhỏ và một bảng lớn (giống việc script xuất sẽ làm)
local function measure(name)
    if not GetDBTableRows then return end
    local t0 = os.clock()
    local ok, rows = pcall(GetDBTableRows, name)
    local dt = os.clock() - t0
    if ok and type(rows) == "table" then
        say(string.format("Đọc bảng %s: %d dòng trong %.2f giây (CPU)", name, #rows, dt))
    else
        say("Không đọc được bảng " .. name .. ": " .. tostring(rows))
    end
end
measure("fixtures")
measure("career_users")
measure("players")

-- 2) vòng lặp có chờ, chỉ chạy khi có Sleep
local function write_result(extra)
    local f, err = io.open(OUT_DIR .. "/probe_result.txt", "w")
    if not f then
        if Log then Log("KHONG GHI DUOC probe_result.txt: " .. tostring(err)) end
        return
    end
    f:write(table.concat(lines, "\n"), "\n", extra or "", "\n")
    f:close()
end

if type(Sleep) ~= "function" then
    say("KẾT LUẬN: không có hàm Sleep, KHÔNG chạy vòng lặp (tránh treo game). Cách bấm Execute thủ công vẫn dùng được.")
    write_result()
    return
end

local started, clock0 = now(), os.clock()
for i = 1, ROUNDS do
    local f = io.open(OUT_DIR .. "/probe_heartbeat.txt", "w")
    if f then f:write(string.format("vòng %d/%d, thời điểm %s\n", i, ROUNDS, tostring(now()))); f:close() end
    -- nếu bạn tạo file probe_stop.txt trong thư mục xuất, vòng lặp dừng sớm
    local stop = io.open(OUT_DIR .. "/probe_stop.txt", "r")
    if stop then
        stop:close()
        say("Dừng sớm vì thấy probe_stop.txt")
        break
    end
    Sleep(SLEEP_MS)
end
local elapsed_wall, elapsed_cpu = now() - started, os.clock() - clock0
say(string.format("Vòng lặp %d lần, mỗi lần Sleep(%d): tốn %.1f giây đồng hồ thật (%.1f giây CPU)", ROUNDS, SLEEP_MS, elapsed_wall, elapsed_cpu))
if elapsed_wall >= ROUNDS * 0.9 then
    say("Sleep tính bằng MILI GIÂY (đúng như dự đoán): chờ thật sự, không ăn CPU.")
elseif elapsed_wall < 1 then
    say("Sleep chạy gần như tức thì: có thể Sleep tính bằng đơn vị khác hoặc bị bỏ qua. KHÔNG dùng vòng lặp với Sleep này.")
else
    say("Thời gian chờ khác dự đoán: cần xem lại đơn vị của Sleep.")
end
say("KẾT LUẬN: vòng lặp chạy xong. Hãy cho biết game CÓ BỊ ĐƠ trong lúc script chạy không.")
write_result()
