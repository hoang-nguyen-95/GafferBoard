"""Theo dõi thư mục xuất của game: có file CSV mới/đổi thì tự nhập lại dữ liệu.

    python watcher.py [data/exports] [--db PATH] [--settle 3]

Live Editor ghi từng bảng một trong vài giây, nên chỉ nhập sau khi thư mục đã yên lặng `--settle` giây.
Import là idempotent nên chạy lại nhiều lần an toàn; một lần xuất dở dang (file cụt) chỉ làm lần nhập đó
thất bại và được thử lại ở lần thay đổi kế tiếp.
"""
import argparse
import sys
import threading
import time
from pathlib import Path
from typing import Callable, Optional

from watchdog.events import FileSystemEvent, FileSystemEventHandler
from watchdog.observers import Observer

from app.config import DEFAULT_EXPORTS_DIR, database_url
from app.importers.live_editor import MappingError
from app.importers.run import resolve_exports_dir, run_import


class ExportWatcher:
    """Gom các thay đổi file CSV, gọi `import_fn` một lần sau khi yên lặng `settle` giây."""

    def __init__(
        self,
        exports_dir: Path,
        import_fn: Callable[[], object],
        settle: float = 3.0,
        clock: Callable[[], float] = time.monotonic,
        log: Callable[[str], None] = print,
    ):
        self.exports_dir = exports_dir
        self.import_fn = import_fn
        self.settle = settle
        self.clock = clock
        self.log = log
        self._last_event: Optional[float] = None
        self._lock = threading.Lock()

    def notify(self, path: str) -> None:
        if str(path).lower().endswith(".csv"):
            with self._lock:
                self._last_event = self.clock()

    def run_pending(self) -> bool:
        """Nhập nếu có thay đổi và thư mục đã yên lặng đủ lâu. Trả về True nếu đã thử nhập."""
        with self._lock:
            if self._last_event is None or self.clock() - self._last_event < self.settle:
                return False
            self._last_event = None
        try:
            self.import_fn()
            self.log(f"[{time.strftime('%H:%M:%S')}] Đã nhập lại dữ liệu từ {self.exports_dir}")
        except MappingError as e:
            self.log(f"[{time.strftime('%H:%M:%S')}] Lần xuất chưa hợp lệ, sẽ thử lại khi file đổi: {e}")
        except Exception as e:  # noqa: BLE001  (watcher không được chết vì một lần lỗi)
            self.log(f"[{time.strftime('%H:%M:%S')}] Lỗi khi nhập: {e!r}")
        return True


class _Handler(FileSystemEventHandler):
    """Chỉ phản ứng với thay đổi nội dung. KHÔNG dùng on_any_event: việc import đọc các file CSV, và đọc
    cũng sinh sự kiện opened/closed_no_write, khiến watcher tự kích hoạt vòng lặp nhập vô hạn."""

    def __init__(self, watcher: ExportWatcher):
        self.watcher = watcher

    def _touch(self, event: FileSystemEvent, attr: str = "src_path") -> None:
        if not event.is_directory:
            self.watcher.notify(str(getattr(event, attr)))

    def on_created(self, event: FileSystemEvent) -> None:
        self._touch(event)

    def on_modified(self, event: FileSystemEvent) -> None:
        self._touch(event)

    def on_closed(self, event: FileSystemEvent) -> None:  # đóng file sau khi ghi (không phải sau khi chỉ đọc)
        self._touch(event)

    def on_moved(self, event: FileSystemEvent) -> None:
        self._touch(event, "dest_path")


def watch(watcher: ExportWatcher, stop: threading.Event, poll: float = 0.5) -> None:
    observer = Observer()
    observer.schedule(_Handler(watcher), str(watcher.exports_dir), recursive=False)
    observer.start()
    try:
        while not stop.is_set():
            watcher.run_pending()
            stop.wait(poll)
    finally:
        observer.stop()
        observer.join()


def main(argv: Optional[list[str]] = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("exports_dir", nargs="?", default=str(DEFAULT_EXPORTS_DIR))
    ap.add_argument("--db", help="File SQLite (mặc định data/app.db hoặc COUNTERPICK_DB)")
    ap.add_argument("--settle", type=float, default=3.0, help="Số giây yên lặng trước khi nhập")
    ap.add_argument("--no-initial", action="store_true", help="Không nhập ngay khi khởi động")
    args = ap.parse_args(argv)

    exports = resolve_exports_dir(args.exports_dir)
    exports.mkdir(parents=True, exist_ok=True)
    url = f"sqlite:///{args.db}" if args.db else database_url()
    watcher = ExportWatcher(exports, lambda: run_import(exports, url), settle=args.settle)
    print(f"Đang theo dõi {exports} (Ctrl+C để dừng)")
    if not args.no_initial and any(exports.glob("*.csv")):
        watcher.notify("start.csv")
        watcher._last_event = watcher.clock() - args.settle  # nhập ngay
    stop = threading.Event()
    try:
        watch(watcher, stop)
    except KeyboardInterrupt:
        stop.set()
    return 0


if __name__ == "__main__":
    sys.exit(main())
