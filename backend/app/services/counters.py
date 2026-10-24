"""Bảng khắc chế sơ đồ đọc từ app/data/formation_counters.yaml (chỉnh sửa được, xem file)."""
from functools import lru_cache
from pathlib import Path
from typing import Optional

import yaml

DEFAULT_COUNTERS = Path(__file__).resolve().parents[1] / "data" / "formation_counters.yaml"


@lru_cache
def load_counters(path: Optional[str] = None) -> dict[str, list[dict]]:
    with open(path or DEFAULT_COUNTERS, encoding="utf-8") as f:
        return (yaml.safe_load(f) or {}).get("counters", {})


def counters_for(formation_name: Optional[str], path: Optional[str] = None) -> list[dict]:
    if not formation_name:
        return []
    return [dict(c) for c in load_counters(path).get(formation_name.strip(), [])]
