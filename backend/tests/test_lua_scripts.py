"""Kiểm thử các script Lua của Live Editor bằng trình thông dịch `lua` với môi trường giả (nếu máy có `lua`)."""
import re
import shutil
import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
LE = ROOT / "tools" / "live_editor"
pytestmark = pytest.mark.skipif(shutil.which("lua") is None, reason="không có trình thông dịch lua")

# Môi trường giả: đồng hồ giả, Sleep chỉ tua đồng hồ, bảng dữ liệu giả; `hooks` do từng test thêm vào.
PRELUDE = r"""
FAKE = 1000
real_time, real_clock = os.time, os.clock
os.time = function() return FAKE end
os.clock = function() return FAKE end
SLEEPS = 0
LOGS = {}
function Log(s) LOGS[#LOGS + 1] = s end
function GetDBTablesNames() return {"players", "teams", "fixtures", "career_users", "audio_junk", "leagueteamlinks"} end
function GetDBTableFields(n) return {{name = "id"}, {name = "name"}} end
VERSION = 1
function GetDBTableRows(n)
    if FAIL and FAIL[n] then error("bảng hỏng " .. n) end
    return {{id = {value = 1}, name = {value = 'A "q", b ' .. VERSION}}, {id = {value = 2}, name = {value = "ok"}}}
end
function exists(path) local f = io.open(path, "r"); if f then f:close(); return true end return false end
function read(path) local f = io.open(path, "r"); local s = f:read("*a"); f:close(); return s end
function touch(path) local f = io.open(path, "w"); f:write("x"); f:close() end
"""


def render(script: str, out: Path) -> str:
    src = (LE / script).read_text(encoding="utf-8")
    return re.sub(r'^(\s*local\s+OUT_DIR\s*=\s*)"[^"\n]*"', rf'\1"{out.as_posix()}"', src, count=1, flags=re.M)


def run(tmp_path: Path, script: str, body: str, sleep_def: str, check: str) -> subprocess.CompletedProcess:
    out = tmp_path / "out"
    out.mkdir(exist_ok=True)
    (tmp_path / "script.lua").write_text(render(script, out), encoding="utf-8")
    harness = f'OUT = "{out.as_posix()}"\n{PRELUDE}\n{sleep_def}\n{body}\ndofile("{(tmp_path / "script.lua").as_posix()}")\n{check}\n'
    (tmp_path / "harness.lua").write_text(harness, encoding="utf-8")
    return subprocess.run(["lua", str(tmp_path / "harness.lua")], capture_output=True, text=True, timeout=60)


def test_vong_lap_xuat_day_du_roi_nhanh_va_dung_theo_stop(tmp_path):
    # Sleep tua đồng hồ; sau 40 lần thì tạo stop.txt. FAST_EVERY=120s, POLL=2s => có nhiều lần xuất nhanh trong 40 vòng.
    sleep = r"""
function Sleep(ms)
    FAKE = FAKE + ms / 1000
    if ms >= 1000 then
        SLEEPS = SLEEPS + 1
        if SLEEPS == 20 then VERSION = 2 end            -- dữ liệu đổi giữa chừng
        if SLEEPS == 70 then touch(OUT .. "/request_full.txt") end
        if SLEEPS == 90 then touch(OUT .. "/stop.txt") end
    end
end
"""
    check = r"""
assert(exists(OUT .. "/players.csv"), "thiếu players.csv (xuất đầy đủ lần đầu)")
assert(exists(OUT .. "/fixtures.csv"))
assert(not exists(OUT .. "/audio_junk.csv"), "bảng không khớp mẫu không được xuất")
assert(not exists(OUT .. "/players.csv.tmp"), "file .tmp phải được đổi tên")
assert(read(OUT .. "/fixtures.csv"):find("b 2"), "bảng nhanh phải được xuất lại với dữ liệu mới")
assert(read(OUT .. "/players.csv"):find("b 2"), "yêu cầu xuất đầy đủ phải ghi lại players")
assert(not exists(OUT .. "/request_full.txt"), "file yêu cầu phải bị xóa sau khi xử lý")
assert(not exists(OUT .. "/stop.txt"), "stop.txt phải bị xóa sau khi dừng")
assert(read(OUT .. "/heartbeat.txt"):find("stopped"), "heartbeat phải ghi stopped khi dừng")
print("OK")
"""
    # POLL_MS mặc định 2000 => Sleep(2000) mỗi vòng; Sleep(1) giữa các bảng không tính vào SLEEPS
    r = run(tmp_path, "export_loop.lua", "", sleep.replace("ms >= 1000", "ms >= 2000"), check)
    assert r.returncode == 0, r.stderr + r.stdout
    assert "OK" in r.stdout


def test_xuat_nhanh_chi_ghi_lai_bang_nho_con_bang_lon_cho_den_ky_day_du(tmp_path):
    # 80 vòng x 2 giây = 160 giây: qua FAST_EVERY (120) nhưng chưa tới FULL_EVERY (1800)
    sleep = r"""
function Sleep(ms)
    FAKE = FAKE + ms / 1000
    if ms >= 2000 then
        SLEEPS = SLEEPS + 1
        if SLEEPS == 20 then VERSION = 2 end
        if SLEEPS == 80 then touch(OUT .. "/stop.txt") end
    end
end
"""
    check = r"""
assert(read(OUT .. "/fixtures.csv"):find("b 2"), "bảng nhanh phải được cập nhật sau FAST_EVERY")
assert(read(OUT .. "/players.csv"):find("b 1"), "bảng lớn chưa tới kỳ đầy đủ thì không được ghi lại")
print("OK")
"""
    r = run(tmp_path, "export_loop.lua", "", sleep, check)
    assert r.returncode == 0, r.stderr + r.stdout


def test_mot_bang_loi_khong_lam_dung_vong_lap(tmp_path):
    sleep = r"""
function Sleep(ms)
    FAKE = FAKE + ms / 1000
    if ms >= 2000 then SLEEPS = SLEEPS + 1; if SLEEPS == 3 then touch(OUT .. "/stop.txt") end end
end
"""
    check = r"""
assert(exists(OUT .. "/fixtures.csv"), "bảng khác vẫn phải được xuất")
assert(not exists(OUT .. "/players.csv"), "bảng lỗi không có file")
local found = false
for _, l in ipairs(LOGS) do if l:find("LOI khi xuat players") then found = true end end
assert(found, "phải ghi log lỗi")
print("OK")
"""
    r = run(tmp_path, "export_loop.lua", 'FAIL = {players = true}', sleep, check)
    assert r.returncode == 0, r.stderr + r.stdout


def test_khong_co_sleep_thi_xuat_mot_lan_va_khong_lap(tmp_path):
    check = r"""
assert(exists(OUT .. "/players.csv"))
assert(not exists(OUT .. "/heartbeat.txt"), "không có Sleep thì không chạy vòng lặp")
print("OK")
"""
    r = run(tmp_path, "export_loop.lua", "Sleep = nil", "", check)
    assert r.returncode == 0, r.stderr + r.stdout


def test_probe_xac_nhan_sleep_tinh_bang_mili_giay(tmp_path):
    sleep = "function Sleep(ms) FAKE = FAKE + ms / 1000 end"
    check = r"""
local res = read(OUT .. "/probe_result.txt")
assert(res:find("MILI GIÂY"), res)
assert(res:find("Đọc bảng fixtures"), res)
assert(read(OUT .. "/probe_heartbeat.txt"):find("vòng 10/10"))
print("OK")
"""
    r = run(tmp_path, "probe_loop.lua", "", sleep, check)
    assert r.returncode == 0, r.stderr + r.stdout


def test_probe_khong_co_sleep_khong_lap(tmp_path):
    check = r"""
local res = read(OUT .. "/probe_result.txt")
assert(res:find("không có hàm Sleep"), res)
assert(not exists(OUT .. "/probe_heartbeat.txt"))
print("OK")
"""
    r = run(tmp_path, "probe_loop.lua", "Sleep = nil", "", check)
    assert r.returncode == 0, r.stderr + r.stdout


def test_probe_sleep_gia_bi_bo_qua_bi_phat_hien(tmp_path):
    check = r"""
local res = read(OUT .. "/probe_result.txt")
assert(res:find("KHÔNG dùng vòng lặp"), res)
print("OK")
"""
    r = run(tmp_path, "probe_loop.lua", "", "function Sleep(ms) end", check)
    assert r.returncode == 0, r.stderr + r.stdout


def test_xuat_mot_lan_ghi_nhat_ky_va_bao_bang_loi_hoac_thieu(tmp_path):
    # Bảng career_playercontract bị lỗi khi đọc; game không có career_transferblock; players xuất bình thường.
    body = r"""
function GetDBTablesNames() return {"players", "fixtures", "career_playercontract", "audio_junk"} end
FAIL = {career_playercontract = true}
"""
    check = r"""
assert(exists(OUT .. "/players.csv") and exists(OUT .. "/fixtures.csv"))
assert(not exists(OUT .. "/career_playercontract.csv"), "bảng lỗi không để lại file")
assert(not exists(OUT .. "/audio_junk.csv"))
local log = read(OUT .. "/export_log.txt")
assert(log:find("counterpick_export v3", 1, true), "nhật ký phải ghi phiên bản script")
assert(log:find("Da xuat players", 1, true))
assert(log:find("LOI khi xuat career_playercontract", 1, true), "phải ghi bảng lỗi")
assert(log:find("KHONG CO BANG career_transferblock", 1, true), "phải báo bảng không có trong game")
assert(not log:find("KHONG CO BANG players", 1, true))
assert(log:find("Xong. Da xuat 2 bang", 1, true))
print("OK")
"""
    r = run(tmp_path, "export_tables.lua", body, "", check)
    assert r.returncode == 0, r.stderr + r.stdout
    assert "OK" in r.stdout
