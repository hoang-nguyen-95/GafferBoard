"""Sinh dữ liệu cấu hình cho engine TypeScript (bản web) từ các file YAML của backend.

    python tools/export_engine_data.py          # ghi file
    python tools/export_engine_data.py --check  # chỉ kiểm tra file đã đồng bộ chưa (dùng trong test)

YAML là nguồn sự thật duy nhất; không sửa tay các file JSON được sinh ra.
"""
import json
import sys
from pathlib import Path

import yaml

BACKEND = Path(__file__).resolve().parents[1]
OUT = BACKEND.parent / "frontend" / "src" / "engine" / "data"
SOURCES = {
    "mapping.json": BACKEND / "app" / "importers" / "mappings" / "live_editor.yaml",
    "counters.json": BACKEND / "app" / "data" / "formation_counters.yaml",
}


def render(src: Path) -> str:
    with open(src, encoding="utf-8") as f:
        data = yaml.safe_load(f)
    return json.dumps(data, ensure_ascii=False, indent=2, sort_keys=False) + "\n"


def main(argv: list[str]) -> int:
    check = "--check" in argv
    stale = []
    for name, src in SOURCES.items():
        text = render(src)
        target = OUT / name
        if check:
            if not target.exists() or target.read_text(encoding="utf-8") != text:
                stale.append(name)
        else:
            OUT.mkdir(parents=True, exist_ok=True)
            target.write_text(text, encoding="utf-8")
            print(f"đã ghi {target}")
    if stale:
        print("Chưa đồng bộ với YAML: " + ", ".join(stale) + " (chạy python tools/export_engine_data.py)", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
