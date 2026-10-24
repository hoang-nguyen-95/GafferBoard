import subprocess
import sys
from pathlib import Path


def test_engine_json_is_in_sync_with_yaml():
    """Engine TypeScript đọc JSON sinh từ YAML; YAML đổi mà quên sinh lại thì bản web lệch bản local."""
    script = Path(__file__).resolve().parents[1] / "tools" / "export_engine_data.py"
    result = subprocess.run([sys.executable, str(script), "--check"], capture_output=True, text=True)
    assert result.returncode == 0, result.stderr
