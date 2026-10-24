import threading
import time

from sqlmodel import Session, select

from app.db import get_engine
from app.importers.live_editor import MappingError
from app.importers.run import run_import
from app.models import ImportRun, Player
from tests.sample_data import write_sample_export
from watcher import ExportWatcher, watch


class FakeClock:
    def __init__(self):
        self.now = 100.0

    def __call__(self):
        return self.now


def make(settle=3.0, fn=None):
    clock, calls, logs = FakeClock(), [], []
    watcher = ExportWatcher(None, fn or (lambda: calls.append(1)), settle=settle, clock=clock, log=logs.append)
    return watcher, clock, calls, logs


def test_waits_for_quiet_period_and_imports_once():
    w, clock, calls, _ = make()
    assert w.run_pending() is False                    # chưa có thay đổi
    w.notify("a/players.csv")
    clock.now += 2
    assert w.run_pending() is False and calls == []    # vẫn đang ghi
    w.notify("a/teams.csv")                            # file khác đổi -> đếm lại từ đầu
    clock.now += 2
    assert w.run_pending() is False
    clock.now += 1.5
    assert w.run_pending() is True and calls == [1]
    assert w.run_pending() is False and calls == [1]   # không nhập lặp khi không có thay đổi mới


def test_ignores_non_csv_files():
    w, clock, calls, _ = make()
    w.notify("exports/_tables.txt")
    w.notify("exports/notes.docx")
    clock.now += 10
    assert w.run_pending() is False and calls == []
    w.notify("exports/PLAYERS.CSV")
    clock.now += 10
    assert w.run_pending() is True


def test_invalid_export_is_logged_and_retried_on_next_change():
    attempts = []

    def flaky():
        attempts.append(1)
        if len(attempts) == 1:
            raise MappingError("players.csv: thiếu cột")

    w, clock, _, logs = make(fn=flaky)
    w.notify("players.csv")
    clock.now += 5
    assert w.run_pending() is True and "chưa hợp lệ" in logs[-1]
    clock.now += 5
    assert w.run_pending() is False                    # không tự thử lại khi chưa có file mới
    w.notify("players.csv")
    clock.now += 5
    assert w.run_pending() is True and len(attempts) == 2 and "Đã nhập lại" in logs[-1]


def test_unexpected_error_does_not_kill_the_watcher():
    w, clock, _, logs = make(fn=lambda: 1 / 0)
    w.notify("x.csv")
    clock.now += 5
    assert w.run_pending() is True and "Lỗi khi nhập" in logs[-1]


def test_real_filesystem_events_trigger_an_import(tmp_path):
    exports = tmp_path / "exports"
    exports.mkdir()
    url = f"sqlite:///{tmp_path / 'watch.db'}"
    watcher = ExportWatcher(exports, lambda: run_import(exports, url), settle=0.4, log=lambda m: None)
    stop = threading.Event()
    thread = threading.Thread(target=watch, args=(watcher, stop, 0.1), daemon=True)
    thread.start()
    try:
        time.sleep(0.5)                                # đợi observer sẵn sàng
        write_sample_export(exports)                   # như khi người dùng thả file xuất mới vào thư mục
        deadline = time.time() + 15
        count = 0
        while time.time() < deadline and not count:
            time.sleep(0.2)
            try:
                with Session(get_engine(url)) as s:
                    count = len(s.exec(select(Player)).all())
            except Exception:  # bảng chưa được tạo
                count = 0
        assert count == 5

        def runs() -> int:
            with Session(get_engine(url)) as s:
                return len(s.exec(select(ImportRun)).all())

        # Việc import tự đọc file CSV; điều đó KHÔNG được kích hoạt thêm lần nhập nào (từng gây vòng lặp vô hạn).
        time.sleep(2.0)
        settled = runs()
        assert 1 <= settled <= 3
        time.sleep(2.0)
        assert runs() == settled

        # Thả file mới/sửa file -> nhập lại đúng một lần nữa
        (exports / "career_users.csv").write_text((exports / "career_users.csv").read_text())
        deadline = time.time() + 10
        while time.time() < deadline and runs() == settled:
            time.sleep(0.2)
        assert runs() == settled + 1
        time.sleep(1.5)
        assert runs() == settled + 1
    finally:
        stop.set()
        thread.join(timeout=5)
