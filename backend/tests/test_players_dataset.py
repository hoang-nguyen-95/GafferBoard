"""Bộ dữ liệu cầu thủ công khai (tools/build_players_dataset.py): cấu trúc, lọc đội CLB và sửa tên lỗi mã."""
import json
import subprocess
import sys
from pathlib import Path

import pytest

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND / "tools"))
import build_players_dataset as bpd  # noqa: E402


def test_fix_names():
    assert bpd.fix_team_name("BrĤndby IF") == "Brøndby IF"
    assert bpd.fix_team_name("Fenerbahĝe") == "Fenerbahçe"
    assert bpd.fix_team_name("Peğarol") == "Peñarol"
    assert bpd.fix_team_name("Đği hình Real Madrid") == "Đội hình Real Madrid"
    assert bpd.fix_team_name("FC Barcelona") == "FC Barcelona"


def test_nations_use_fixes(tmp_path):
    (tmp_path / "nations.csv").write_text("confederation,nationid,isocountrycode,groupid,nationname\n2,7,BE,1,BŇ\n2,18,FR,1,Pháp\n2,1,AL,1,Albania\n", encoding="utf-8")
    assert bpd.read_nations(tmp_path) == {1: "Albania", 7: "Bỉ", 18: "Pháp"}


@pytest.fixture(scope="module")
def dataset(tmp_path_factory):
    tmp = tmp_path_factory.mktemp("ds")
    exports, out = tmp / "exports", tmp / "out" / "players.json"
    subprocess.run([sys.executable, str(BACKEND / "tools/make_synthetic_exports.py"), str(exports)], check=True, cwd=BACKEND, capture_output=True)
    subprocess.run([sys.executable, str(BACKEND / "tools/build_players_dataset.py"), str(exports), str(out)], check=True, cwd=BACKEND, capture_output=True)
    return json.loads(out.read_text(encoding="utf-8")), out


def test_dataset_shape(dataset):
    data, out = dataset
    t = data["tables"]
    assert data["version"] == 1 and data["reference_date"]
    assert t["players"]["columns"] == bpd.PLAYER_COLUMNS
    assert len(t["players"]["rows"]) > 100
    assert all(len(r) == len(bpd.PLAYER_COLUMNS) for r in t["players"]["rows"])
    # Chỉ có đội CLB: mọi đội trong squad đều có bảng xếp hạng.
    team_ids = {r[0] for r in t["teams"]["rows"]}
    assert {r[0] for r in t["squad"]["rows"]} <= team_ids
    assert {r[0] for r in t["standings"]["rows"]} == team_ids
    assert (out.parent / "nations.json").exists()


def test_no_money_columns(dataset):
    """Chưa có dữ liệu thật về giá trị/lương nên bộ dữ liệu không được chứa cột nào như vậy (không đoán số)."""
    cols = " ".join(dataset[0]["tables"]["players"]["columns"]).lower()
    assert "value" not in cols and "wage" not in cols
