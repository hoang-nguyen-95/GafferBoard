"""Ghi "kết quả chuẩn" của bản Python cho kiểm thử đối chiếu với engine TypeScript.

    python tools/make_golden.py EXPORTS_DIR OUT_JSON [--max-players N]

Nhập EXPORTS_DIR vào DB tạm, tự sinh một kịch bản yêu cầu API (đọc rồi ghi) từ dữ liệu có trong DB, chạy qua ứng dụng
FastAPI thật và lưu từng phản hồi. Bản TypeScript phải trả lại đúng các phản hồi này (xem frontend/src/engine/__tests__/parity.test.ts).
"""
import argparse
import json
import os
import random
import sqlite3
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


def build_scenario(db: str, max_players: int) -> list[dict]:
    c = sqlite3.connect(db)
    rng = random.Random(11)
    q = lambda sql, *a: c.execute(sql, a).fetchall()  # noqa: E731
    teams = [r[0] for r in q("select team_id from team order by team_id")]
    leagues = [r[0] for r in q("select league_id from league order by league_id")]
    user_team = q("select user_team_id from userprofile")[0][0] if q("select count(*) from userprofile")[0][0] else None
    club_teams = [r[0] for r in q("select s.team_id from teamstanding s join league l on l.league_id=s.league_id where l.is_international=0 order by s.team_id")]
    with_squad = [r[0] for r in q("select distinct team_id from squadmember order by team_id")]
    empty = [t for t in teams if t not in with_squad]
    no_standing = [t for t in teams if t not in {r[0] for r in q("select team_id from teamstanding")}]
    national = [r[0] for r in q("select s.team_id from teamstanding s join league l on l.league_id=s.league_id where l.is_international=1")]
    players = [r[0] for r in q("select player_id from player order by player_id")]
    by_role = {}
    for pid, pos in q("select player_id, primary_position from player where primary_position is not null order by player_id"):
        by_role.setdefault(pos, []).append(pid)
    sample_players = []
    for pos in sorted(by_role):
        sample_players += rng.sample(by_role[pos], min(3, len(by_role[pos])))
    sample_players = sample_players[:max_players]
    both = [r[0] for r in q("select player_id from squadmember group by player_id having count(*) > 1 limit 4")]
    unnamed = [r[0] for r in q("select player_id from player where name is null limit 2")]
    named = q("select name from player where name is not null order by player_id limit 400")
    words = []
    for (n,) in named[:60]:
        words += n.split()[:1]
    searches = ["bruno fernandes", "fernandes bruno", "ostergaard", "ØSTERGAARD", "guðjohnsen", "gudjohnsen", "nguyen", "tran", "%", "_", "zz-không-có", " ", "a"] + rng.sample(words, 6)

    S = []
    g = lambda path: S.append({"method": "GET", "path": path})  # noqa: E731
    g("/health"); g("/meta"); g("/leagues"); g("/formations"); g("/next-match")
    g("/teams?limit=2000"); g("/teams?limit=7&offset=3"); g("/teams?q=fc"); g("/teams?q=đội"); g("/teams?q=ĐỘI"); g("/teams?q=%25")
    for lid in leagues:
        g(f"/teams?league={lid}")
    g("/teams/987654")
    for t in teams[:: max(1, len(teams) // 25)] + empty + no_standing + national[:2]:
        g(f"/teams/{t}"); g(f"/teams/{t}/overview")
    g("/teams/987654/overview")
    g("/players?limit=50"); g("/players?limit=100&offset=100"); g("/players?limit=1000&offset=1000")
    for s in searches:
        g(f"/players?q={s}&limit=20")
    g("/players?q=bruno&team=" + str(with_squad[0]))
    for t in with_squad[:: max(1, len(with_squad) // 15)]:
        g(f"/players?team={t}&limit=60")
    for t in club_teams[:2]:
        g(f"/players?team={t}&q=a&limit=10")
    for pid in sample_players + both + unnamed + players[:3]:
        g(f"/players/{pid}"); g(f"/players/{pid}/analysis")
    for pid in sample_players[:8] + both:
        g(f"/players/{pid}/analysis?scope=all"); g(f"/players/{pid}/analysis?scope=league")
    g("/players/987654321"); g("/players/987654321/analysis"); g(f"/players/{players[0]}/analysis?scope=bad")
    # phân tích đội
    analysed = club_teams[:: max(1, len(club_teams) // 14)] + national[:1] + no_standing + empty
    for t in analysed:
        g(f"/teams/{t}/analysis"); g(f"/teams/{t}/suggestions")
        g(f"/teams/{t}/form"); g(f"/teams/{t}/notes"); g(f"/teams/{t}/report.md")
    for t in analysed[:10]:
        g(f"/teams/{t}/counter-lineups"); g(f"/teams/{t}/counter-lineups?limit=1"); g(f"/teams/{t}/counter-lineups?mine={club_teams[3]}")
        g(f"/teams/{t}/suggestions?mine={club_teams[4]}")
    g("/teams/987654/analysis"); g("/teams/987654/counter-lineups")
    # so sánh
    for a, b in [(sample_players[0], sample_players[5]), (sample_players[2], sample_players[-1]), (players[0], players[1])]:
        g(f"/compare/players?a={a}&b={b}")
    g(f"/compare/players?a={players[0]}&b={players[0]}"); g(f"/compare/players?a={players[0]}&b=99999999")
    for a, b in [(club_teams[0], club_teams[1]), (club_teams[2], club_teams[-1]), (national[0], club_teams[0])]:
        g(f"/compare/teams?a={a}&b={b}")
    g(f"/compare/teams?a={club_teams[0]}&b={club_teams[0]}")

    # ---- ghi: cài đặt, kết quả, ghi chú, lịch sử gặp, đội hình nhập tay
    opp = club_teams[7]
    P = lambda path, body=None: S.append({"method": "POST", "path": path, "body": body})  # noqa: E731
    U = lambda path, body=None: S.append({"method": "PUT", "path": path, "body": body})  # noqa: E731
    D = lambda path: S.append({"method": "DELETE", "path": path})  # noqa: E731
    U("/settings/opponent", {"team_id": opp}); g("/next-match"); U("/settings/opponent", {"team_id": None}); g("/next-match")
    U("/settings/opponent", {"team_id": 987654})
    U("/settings/user-team", {"team_id": club_teams[2]}); g("/next-match"); g("/meta"); g(f"/teams/{opp}/suggestions"); g(f"/teams/{opp}/counter-lineups")
    U("/settings/user-team", {"team_id": None}); g("/next-match")
    for gf, ga, who in [(2, 0, "A"), (1, 1, "B"), (0, 3, "C"), (4, 1, "D"), (1, 0, "E"), (0, 0, "F"), (5, 5, None)]:
        P(f"/teams/{opp}/results", {"goals_for": gf, "goals_against": ga, "opponent_name": who, "played_on": None})
    P(f"/teams/{opp}/results", {"goals_for": 2, "goals_against": 1, "opponent_name": "G", "played_on": "2026-08-01", "is_home": True})
    P(f"/teams/{opp}/results", {"goals_for": -1, "goals_against": 0}); P("/teams/987654/results", {"goals_for": 1, "goals_against": 0})
    g(f"/teams/{opp}/form"); g(f"/teams/{opp}/analysis"); g(f"/teams/{opp}/report.md")
    D("/results/2"); D("/results/2"); g(f"/teams/{opp}/form")
    U(f"/teams/{opp}/note", {"text": "  Hay đá phạt góc ngắn.  "}); g(f"/teams/{opp}/notes"); U(f"/teams/{opp}/note", {"text": "Sửa"})
    g(f"/teams/{opp}/report.md"); U(f"/teams/{opp}/note", {"text": "   "}); g(f"/teams/{opp}/notes")
    for gf, ga, d in [(2, 1, "2026-08-01"), (0, 0, "2026-09-01"), (1, 3, None)]:
        P(f"/teams/{opp}/meetings", {"goals_for": gf, "goals_against": ga, "played_on": d, "is_home": True, "note": "n"})
    g(f"/teams/{opp}/notes"); D("/meetings/1"); D("/meetings/1"); g(f"/teams/{opp}/notes")
    U("/teams/987654/note", {"text": "x"})

    formations = [r for r in q("select formation_id, positions from formationdef order by formation_id")]
    f433 = next((fid for fid, pos in formations if json.loads(pos) == [0, 3, 4, 6, 7, 13, 14, 15, 23, 25, 27]), formations[0][0])
    f442 = next((fid for fid, pos in formations if json.loads(pos)[5:] == [12, 13, 15, 16, 24, 26]), formations[1][0])
    xi_of = lambda t: [r[0] for r in q("select player_id from squadmember where team_id=? and position<28 order by position, player_id limit 11", t)]  # noqa: E731
    xi = (xi_of(club_teams[9]) + [None] * 11)[:11]
    P("/manual-lineups", {"name": "Nhập tay 1", "formation_id": f433, "player_ids": xi})
    partial = [None] * 11
    partial[0], partial[9] = xi[0], xi[9]
    P("/manual-lineups", {"name": "Một phần", "formation_id": f442, "player_ids": partial})
    P("/manual-lineups", {"name": "x", "formation_id": 999999, "player_ids": xi})
    P("/manual-lineups", {"name": "x", "formation_id": f433, "player_ids": [None] * 11})
    P("/manual-lineups", {"name": "x", "formation_id": f433, "player_ids": [xi[0]] * 11})
    P("/manual-lineups", {"name": "x", "formation_id": f433, "player_ids": xi[:10]})
    P("/manual-lineups", {"name": "x", "formation_id": f433, "player_ids": [987654321] + xi[1:]})
    P("/manual-lineups", {"name": "", "formation_id": f433, "player_ids": xi})
    g("/manual-lineups")
    for lid in (1, 2):
        g(f"/manual-lineups/{lid}"); g(f"/manual-lineups/{lid}/analysis"); g(f"/manual-lineups/{lid}/suggestions")
        g(f"/manual-lineups/{lid}/counter-lineups"); g(f"/manual-lineups/{lid}/counter-lineups?mine={club_teams[1]}"); g(f"/manual-lineups/{lid}/report.md")
    U("/manual-lineups/1", {"name": "Đổi tên", "formation_id": f442, "player_ids": xi, "league_id": leagues[0]}); g("/manual-lineups/1"); g("/manual-lineups/1/analysis")
    U("/manual-lineups/77", {"name": "x", "formation_id": f433, "player_ids": xi}); g("/manual-lineups/77")
    D("/manual-lineups/2"); D("/manual-lineups/2"); g("/manual-lineups")
    return S


NONDETERMINISTIC_SUFFIXES = ("_at",)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("exports")
    ap.add_argument("out")
    ap.add_argument("--max-players", type=int, default=40)
    args = ap.parse_args()

    tmp = tempfile.mkdtemp(prefix="golden_")
    db = str(Path(tmp) / "golden.db")
    os.environ["COUNTERPICK_DB"] = db
    from app.db import get_engine
    from app.importers.run import run_import

    get_engine.cache_clear()
    run_import(Path(args.exports), f"sqlite:///{db}")
    scenario = build_scenario(db, args.max_players)

    from fastapi.testclient import TestClient
    from app.main import app

    results = []
    with TestClient(app) as client:
        for step in scenario:
            kwargs = {"json": step["body"]} if step.get("body") is not None else {}
            r = client.request(step["method"], step["path"], **kwargs)
            entry = dict(step, status=r.status_code)
            if r.headers.get("content-type", "").startswith("application/json"):
                entry["json"] = r.json()
            else:
                entry["text"] = r.text
            results.append(entry)
    Path(args.out).write_text(json.dumps({"steps": results}, ensure_ascii=False), encoding="utf-8")
    ok = sum(1 for e in results if e["status"] < 400)
    print(f"đã ghi {len(results)} bước ({ok} thành công, {len(results) - ok} lỗi có chủ đích) vào {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
