from datetime import date

from app.services.report import render_report, slug
from tests.helpers import add_formations, add_team


def test_slug_is_ascii_and_safe():
    assert slug("Manchester Utd") == "manchester-utd"
    assert slug("Đội Thử/Nghiệm: 1") == "doi-thu-nghiem-1"
    assert slug("!!!") == "bao-cao"


def test_team_report_endpoint_contains_every_section(client):
    client.put("/teams/22/note", json={"text": "Hay đá phạt góc ngắn."})
    client.post("/teams/22/meetings", json={"goals_for": 2, "goals_against": 1, "played_on": "2026-08-01", "note": "Thắng sát nút"})
    r = client.get("/teams/22/report.md")
    assert r.status_code == 200 and r.headers["content-type"].startswith("text/markdown")
    assert 'filename="phan-tich-test-city.md"' in r.headers["content-disposition"]
    text = r.text
    for heading in ("# Phân tích đối thủ: Test City", "## Đội hình ra sân", "## Chỉ số đội", "## Điểm yếu rõ nhất",
                    "## Cầu thủ nguy hiểm", "## Gợi ý đấu pháp", "## Ghi chú cá nhân và lịch sử gặp"):
        assert heading in text, heading
    assert "Hay đá phạt góc ngắn." in text and "1 thắng" in text and "Thắng sát nút" in text
    assert "Sơ đồ: 4-3-3" in text
    assert "## Phong độ" not in text                                    # đội 22 không có chuỗi phong độ
    assert "## Phong độ" in client.get("/teams/11/report.md").text      # đội 11 có (teamform 22122)
    assert "chưa được xác nhận" in client.get("/teams/11/report.md").text
    assert client.get("/teams/999/report.md").status_code == 404


def test_report_includes_counter_lineups_when_squad_is_complete(session):
    from fastapi.testclient import TestClient
    from app.db import get_session
    from app.main import app
    from app.models import AppSetting
    for tid in range(1, 9):
        add_team(session, tid, speed=75)
    add_team(session, 9, speed=45)
    add_formations(session)
    session.add(AppSetting(key="user_team_id", value="1"))
    session.commit()
    app.dependency_overrides[get_session] = lambda: session
    try:
        text = TestClient(app).get("/teams/9/report.md").text
    finally:
        app.dependency_overrides.clear()
    assert "## Đội hình đáp trả đề xuất" in text and "### Phương án 1:" in text
    assert "Hàng thủ đối thủ chậm" in text and "Lý do (chỉ số):" in text and "Gợi ý chiến thuật:" in text
    assert text.endswith("\n") and "None" not in text


def test_render_report_is_pure_and_handles_minimal_input():
    analysis = {
        "name": "A", "lineup": {"formation_name": None, "slots": []}, "benchmark": None, "metrics": [],
        "weak_points": [], "dangerous": {}, "injuries": [], "form": None,
    }
    text = render_report(analysis, generated_on=date(2026, 8, 1))
    assert text.startswith("# Phân tích đối thủ: A") and "Xuất ngày: 2026-08-01" in text
    assert "Không có điểm yếu nổi bật" in text and "Chưa đủ đội cùng giải" in text
    assert "## Gợi ý đấu pháp" not in text           # không có advice thì không in mục này


def test_manual_report(client):
    created = client.post("/manual-lineups", json={"name": "Nhập tay X", "formation_id": 8,
                                                    "player_ids": [101, 102, 103] + [None] * 8})
    assert created.status_code == 201
    r = client.get(f"/manual-lineups/{created.json()['id']}/report.md")
    assert r.status_code == 200 and "# Phân tích đối thủ: Nhập tay X" in r.text
    assert 'filename="phan-tich-nhap-tay-x.md"' in r.headers["content-disposition"]
