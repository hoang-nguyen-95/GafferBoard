import os
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
REPO_ROOT = BACKEND_DIR.parent
DEFAULT_EXPORTS_DIR = REPO_ROOT / "data" / "exports"
DEFAULT_MAPPING = Path(__file__).resolve().parent / "importers" / "mappings" / "live_editor.yaml"


def database_url() -> str:
    path = os.environ.get("COUNTERPICK_DB", str(REPO_ROOT / "data" / "app.db"))
    return f"sqlite:///{path}"
