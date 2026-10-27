"""Kiểm thử script xuất tự động theo sự kiện (tools/live_editor/auto_export.lua) bằng môi trường Lua giả (thư viện `lupa`)."""
import re
from pathlib import Path

import pytest

lupa = pytest.importorskip("lupa")

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "tools" / "live_editor" / "auto_export.lua"

DAY_PASSED, POST_LOAD, MONTH_PASSED, SCREEN_LOADED, CPU_MATCH = 15, 29, 17, 68, 8

# Live Editor giả: đồng hồ do test điều khiển, bảng dữ liệu giả, sự kiện được ghi lại để test tự gọi.
PRELUDE = r"""
FAKE = 1000
os.time = function() return FAKE end
LOGS = {}
function Log(s) LOGS[#LOGS + 1] = s end
HANDLERS = {}
ADDS = 0
function AddEventHandler(name, fn)
    ADDS = ADDS + 1
    HANDLERS[name] = HANDLERS[name] or {}
    for _, f in ipairs(HANDLERS[name]) do if f == fn then return end end
    table.insert(HANDLERS[name], fn)
end
IN_CM = true
function IsInCM() return IN_CM end
function GetUserTeamID() return 11 end
function GetTransferBudget() return 77000000 end
function GetCurrentDate() return {day = 5, month = 8, year = 2026} end
TABLES = {"players", "playernames", "teams", "fixtures", "career_users", "audio_junk", "leagueteamlinks"}
function GetDBTablesNames() return TABLES end
function GetDBTableFields(n) return {{name = "id"}, {name = "name"}} end
VERSION = 1
FAIL = {}
function GetDBTableRows(n)
    if FAIL[n] then error("bảng hỏng " .. n) end
    return {{id = {value = 1}, name = {value = 'A "q", b ' .. VERSION}}}
end
function fire(id)
    for _, f in ipairs(HANDLERS["post__CareerModeEvent"] or {}) do f(nil, id, nil) end
end
"""


class Env:
    def __init__(self, tmp_path: Path):
        self.out = tmp_path / "out"
        self.out.mkdir()
        self.lua = lupa.LuaRuntime(unpack_returned_tuples=True)
        self.lua.execute(PRELUDE)
        src = SCRIPT.read_text(encoding="utf-8")
        self.src = re.sub(r'^(\s*local\s+OUT_DIR\s*=\s*)"[^"\n]*"', rf'\1"{self.out.as_posix()}"', src, count=1, flags=re.M)

    def run_script(self):
        self.lua.execute(self.src)

    def fire(self, event_id: int):
        self.lua.eval(f"fire({event_id})")

    def tick(self, seconds: int):
        self.lua.execute(f"FAKE = FAKE + {seconds}")

    def set(self, code: str):
        self.lua.execute(code)

    def files(self):
        return {p.name for p in self.out.iterdir() if p.suffix == ".csv"}

    def text(self, name: str) -> str:
        return (self.out / name).read_text(encoding="utf-8")

    def clear(self):
        for p in self.out.iterdir():
            p.unlink()

    def logs(self) -> str:
        return "\n".join(str(x) for x in self.lua.eval("LOGS").values())


@pytest.fixture
def env(tmp_path):
    return Env(tmp_path)


def test_dang_ky_dung_mot_bo_xu_ly_du_chay_lai_nhieu_lan(env):
    env.set("IN_CM = false")
    env.run_script()
    env.run_script()
    assert len(env.lua.eval("HANDLERS['post__CareerModeEvent']")) == 1


def test_khong_o_career_thi_khong_xuat_gi(env):
    env.set("IN_CM = false")
    env.run_script()
    env.fire(DAY_PASSED)
    assert env.files() == set()


def test_chay_giua_phien_xuat_day_du_va_ghi_trang_thai(env):
    env.run_script()
    # chỉ bảng nằm trong danh sách (không có audio_junk), cả bảng nặng lẫn nhẹ
    assert env.files() == {"players.csv", "playernames.csv", "teams.csv", "fixtures.csv", "career_users.csv", "leagueteamlinks.csv", "cp_state.csv"}
    state = env.text("cp_state.csv").splitlines()
    assert state[0] == "user_team_id,transfer_budget,game_date,last_event,export_kind,exported_at,script_version"
    cells = state[1].split(",")
    assert cells[:3] == ["11", "77000000", "2026-08-05"]
    assert cells[4] == "full"
    assert (env.out / "heartbeat.txt").exists()
    assert not list(env.out.glob("*.tmp"))


def test_qua_ngay_trong_khoang_gian_cach_thi_chua_xuat_lai_sau_do_chi_xuat_bang_nhe(env):
    env.run_script()
    env.clear()
    env.set("VERSION = 2")
    env.tick(5)
    env.fire(DAY_PASSED)
    assert env.files() == set()                     # quá sát lần xuất trước
    env.tick(30)
    env.fire(SCREEN_LOADED)                         # sự kiện không đánh dấu thay đổi nhưng đang chờ xuất
    assert "teams.csv" in env.files() and "fixtures.csv" in env.files()
    assert "players.csv" not in env.files() and "playernames.csv" not in env.files()   # bảng nặng không xuất lại
    assert env.text("cp_state.csv").splitlines()[1].split(",")[4] == "fast"
    assert "A \"\"q\"\", b 2" in env.text("teams.csv")


def test_su_kien_khong_lien_quan_khong_gay_xuat(env):
    env.run_script()
    env.clear()
    env.tick(600)
    env.fire(CPU_MATCH)
    assert env.files() == set()


def test_vua_nap_save_thi_doi_su_kien_ke_tiep(env):
    env.set("IN_CM = false")
    env.run_script()
    env.set("IN_CM = true")
    env.fire(POST_LOAD)
    assert env.files() == set()                     # dữ liệu có thể chưa sẵn sàng ngay lúc nạp
    env.tick(1)
    env.fire(DAY_PASSED)
    assert "players.csv" in env.files()             # lần đầu của phiên: xuất đầy đủ


def test_yeu_cau_xuat_lai_tu_ung_dung(env):
    env.run_script()
    env.clear()
    (env.out / "request_full.txt").write_text("x")
    env.tick(10)
    env.fire(SCREEN_LOADED)
    assert "players.csv" in env.files()
    assert not (env.out / "request_full.txt").exists()


def test_stop_txt_tam_dung(env):
    env.run_script()
    env.clear()
    (env.out / "stop.txt").write_text("x")
    env.tick(600)
    env.fire(DAY_PASSED)
    assert env.files() == set()
    assert env.text("heartbeat.txt").splitlines()[1] == f"paused"


def test_mot_bang_loi_khong_lam_hong_ca_dot_xuat(env):
    env.set('FAIL = {teams = true}')
    env.run_script()
    assert "teams.csv" not in env.files() and "fixtures.csv" in env.files() and "players.csv" in env.files()
    assert "LOI khi xuat teams" in env.logs()


def test_thieu_ham_ngan_sach_van_ghi_trang_thai(env):
    env.set("GetTransferBudget = nil; GetCurrentDate = nil")
    env.run_script()
    cells = env.text("cp_state.csv").splitlines()[1].split(",")
    assert cells[0] == "11" and cells[1] == "" and cells[2] == ""


def test_loi_trong_bo_xu_ly_khong_nem_ra_ngoai(env):
    env.run_script()
    env.set('GetDBTablesNames = function() error("hỏng") end')
    env.tick(600)
    env.fire(DAY_PASSED)                            # không ném lỗi ra cho game
    assert "Không lấy được danh sách bảng" in env.logs()
