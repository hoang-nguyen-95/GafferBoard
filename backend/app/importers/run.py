"""Nhập dữ liệu xuất từ game vào DB:  python -m app.importers.run data/exports"""
import argparse
import sys
from pathlib import Path

from datetime import datetime, timezone

from sqlmodel import Session

from app.config import DEFAULT_MAPPING, REPO_ROOT, database_url
from app.db import get_engine, run_migrations
from app.importers.live_editor import ImportReport, MappingError, import_exports, load_mapping
from app.models import ImportRun


def resolve_exports_dir(arg: str) -> Path:
    p = Path(arg)
    if p.is_dir():
        return p
    alt = REPO_ROOT / arg  # chạy từ backend/ vẫn dùng được "data/exports"
    return alt if alt.is_dir() else p


def run_import(exports: Path, url: str, mapping_path: Path = DEFAULT_MAPPING) -> ImportReport:
    """Đưa DB lên phiên bản mới nhất, nhập `exports` trong một giao dịch và ghi lại lần nhập.
    Ném MappingError (không ghi gì vào dữ liệu) nếu file xuất sai cấu trúc."""
    run_migrations(url)
    with Session(get_engine(url)) as session:
        report = import_exports(session, exports, load_mapping(mapping_path))
        session.add(ImportRun(finished_at=datetime.now(timezone.utc), summary=report.summary()))
        session.commit()
    return report


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("exports_dir", help="Thư mục chứa các file CSV xuất từ Live Editor")
    ap.add_argument("--db", help="Đường dẫn file SQLite (mặc định data/app.db hoặc biến COUNTERPICK_DB)")
    ap.add_argument("--mapping", default=str(DEFAULT_MAPPING), help="File YAML ánh xạ cột")
    args = ap.parse_args(argv)

    exports = resolve_exports_dir(args.exports_dir)
    if not exports.is_dir():
        print(f"Không tìm thấy thư mục: {args.exports_dir}", file=sys.stderr)
        return 2
    url = f"sqlite:///{args.db}" if args.db else database_url()
    try:
        report = run_import(exports, url, Path(args.mapping))
    except MappingError as e:
        print(f"Lỗi nhập dữ liệu (không có gì được ghi): {e}", file=sys.stderr)
        return 1
    print(f"Đã nhập từ {exports} vào {url}")
    print(report.summary())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
