def test_team_analysis_endpoint_shape(client):
    data = client.get("/teams/11/analysis").json()
    assert data["name"] == "Manchester Utd" and data["lineup"]["formation_name"] == "4-2-3-1"
    keys = {m["key"] for m in data["metrics"]}
    assert {"def_pace", "mid_defense", "flank_left_defense", "bench_quality", "depth_drop"} <= keys
    assert data["benchmark"] is None                       # chỉ 2 đội trong giải mẫu: chưa đủ để so sánh
    assert all(m["percentile"] is None for m in data["metrics"])
    assert data["form"]["source"] == "game" and data["form"]["verified"] is False   # teamform 22122
    assert set(data["dangerous"]) == {"attackers", "playmakers"}
    assert client.get("/teams/999/analysis").status_code == 404


def test_manual_results_drive_form_and_can_be_removed(client):
    for gf, ga, opp in [(2, 0, "A"), (1, 1, "B"), (0, 1, "C")]:
        r = client.post("/teams/22/results", json={"goals_for": gf, "goals_against": ga, "opponent_name": opp})
        assert r.status_code == 201
    form = client.get("/teams/22/form").json()["form"]
    assert form["source"] == "manual" and form["matches"] == 3 and form["points"] == 4
    assert form["sequence"] == "LDW" and form["goal_difference"] == 1
    analysis = client.get("/teams/22/analysis").json()
    assert analysis["form"]["source"] == "manual"
    rid = form["results"][0]["id"]
    after = client.delete(f"/results/{rid}").json()["form"]
    assert after["matches"] == 2
    assert client.delete(f"/results/{rid}").status_code == 404


def test_result_validation(client):
    assert client.post("/teams/22/results", json={"goals_for": -1, "goals_against": 0}).status_code == 422
    assert client.post("/teams/22/results", json={"goals_for": 99, "goals_against": 0}).status_code == 422
    assert client.post("/teams/999/results", json={"goals_for": 1, "goals_against": 0}).status_code == 404
    assert client.get("/teams/999/form").status_code == 404
