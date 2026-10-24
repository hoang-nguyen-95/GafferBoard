
def test_note_lifecycle(client):
    assert client.get("/teams/22/notes").json()["note"] is None
    data = client.put("/teams/22/note", json={"text": "  Hay nhận bóng ở biên phải.  "}).json()
    assert data["note"]["text"] == "Hay nhận bóng ở biên phải."          # cắt khoảng trắng
    first = data["note"]["updated_at"]
    again = client.put("/teams/22/note", json={"text": "Sửa ghi chú"}).json()
    assert again["note"]["text"] == "Sửa ghi chú" and again["note"]["updated_at"] >= first
    assert client.get("/teams/22/notes").json()["note"]["text"] == "Sửa ghi chú"
    assert client.get("/teams/11/notes").json()["note"] is None            # ghi chú theo từng đội
    assert client.put("/teams/22/note", json={"text": "   "}).json()["note"] is None   # rỗng = xóa
    assert client.put("/teams/22/note", json={"text": "x" * 5001}).status_code == 422


def test_meetings_history_and_summary(client):
    for gf, ga, played, home in [(2, 1, "2026-08-01", True), (0, 0, "2026-09-01", False), (1, 3, "2026-10-01", True)]:
        r = client.post("/teams/22/meetings", json={"goals_for": gf, "goals_against": ga, "played_on": played, "is_home": home})
        assert r.status_code == 201
    data = client.get("/teams/22/notes").json()
    assert [m["played_on"] for m in data["meetings"]] == ["2026-10-01", "2026-09-01", "2026-08-01"]   # mới nhất trước
    assert data["summary"] == {"played": 3, "wins": 1, "draws": 1, "losses": 1, "goals_for": 3, "goals_against": 4}
    first = data["meetings"][0]["id"]
    after = client.delete(f"/meetings/{first}").json()
    assert after["summary"]["played"] == 2 and after["summary"]["losses"] == 0
    assert client.delete(f"/meetings/{first}").status_code == 404
    assert client.get("/teams/11/notes").json()["summary"]["played"] == 0


def test_notes_validation(client):
    assert client.get("/teams/999/notes").status_code == 404
    assert client.put("/teams/999/note", json={"text": "a"}).status_code == 404
    assert client.post("/teams/999/meetings", json={"goals_for": 1, "goals_against": 0}).status_code == 404
    assert client.post("/teams/22/meetings", json={"goals_for": -1, "goals_against": 0}).status_code == 422
    assert client.post("/teams/22/meetings", json={"goals_for": 1, "goals_against": 31}).status_code == 422
