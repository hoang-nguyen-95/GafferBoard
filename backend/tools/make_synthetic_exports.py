"""Sinh bộ file CSV xuất giả (có seed, đúng định dạng của Live Editor) để kiểm thử đối chiếu Python <-> TypeScript.

Không chứa dữ liệu của game. Đủ đa dạng để chạy mọi nhánh: nhiều giải, đội thiếu người, chấn thương, cầu thủ trùng tên,
tên có dấu, tiền mùa giải và giữa mùa, đội tuyển quốc gia (cầu thủ thuộc cả CLB lẫn đội tuyển)...

    python tools/make_synthetic_exports.py OUT_DIR [--seed 7]
"""
import argparse
import csv
import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import DEFAULT_MAPPING  # noqa: E402
from app.importers.live_editor import load_mapping  # noqa: E402

MAPPING = load_mapping(DEFAULT_MAPPING)

# 29 sơ đồ chung (id, tên, 11 vị trí, tấn công, tiền vệ, hậu vệ): lấy đúng từ dữ liệu thật của game.
GENERIC = [
    (1, "4-1-3-2", [0, 3, 4, 6, 7, 10, 12, 14, 16, 24, 26], 2.0, 3.5, 4.5),
    (2, "4-1-4-1", [0, 3, 4, 6, 7, 10, 12, 13, 15, 16, 25], 1.0, 4.5, 4.5),
    (3, "4-2-3-1", [0, 3, 4, 6, 7, 9, 11, 17, 18, 19, 25], 1.0, 4.0, 5.0),
    (4, "4-2-3-1", [0, 3, 4, 6, 7, 9, 11, 12, 16, 18, 25], 1.0, 4.0, 5.0),
    (5, "4-2-4", [0, 3, 4, 6, 7, 13, 15, 23, 24, 26, 27], 4.0, 2.0, 4.0),
    (6, "4-3-1-2", [0, 3, 4, 6, 7, 13, 14, 15, 18, 24, 26], 2.5, 3.5, 4.0),
    (7, "4-3-2-1", [0, 3, 4, 6, 7, 13, 14, 15, 17, 19, 25], 2.5, 3.5, 4.0),
    (8, "4-3-3", [0, 3, 4, 6, 7, 13, 14, 15, 23, 25, 27], 3.0, 3.0, 4.0),
    (9, "4-3-3", [0, 3, 4, 6, 7, 10, 13, 15, 23, 25, 27], 3.0, 3.0, 4.0),
    (10, "4-3-3", [0, 3, 4, 6, 7, 9, 11, 14, 23, 25, 27], 3.0, 3.0, 4.0),
    (11, "4-3-3", [0, 3, 4, 6, 7, 13, 15, 18, 23, 25, 27], 3.0, 3.0, 4.0),
    (13, "4-2-2-2", [0, 3, 4, 6, 7, 9, 11, 17, 19, 24, 26], 2.0, 3.0, 5.0),
    (14, "4-1-2-1-2", [0, 3, 4, 6, 7, 10, 12, 16, 18, 24, 26], 2.5, 3.5, 4.0),
    (15, "4-1-2-1-2", [0, 3, 4, 6, 7, 10, 13, 15, 18, 24, 26], 2.5, 3.5, 4.0),
    (16, "4-4-2", [0, 3, 4, 6, 7, 12, 13, 15, 16, 24, 26], 2.0, 4.0, 4.0),
    (17, "4-4-2", [0, 3, 4, 6, 7, 9, 11, 12, 16, 24, 26], 2.0, 4.0, 4.0),
    (18, "4-4-1-1", [0, 3, 4, 6, 7, 12, 13, 15, 16, 18, 25], 1.5, 4.5, 4.0),
    (20, "4-5-1", [0, 3, 4, 6, 7, 12, 13, 14, 15, 16, 25], 1.0, 5.0, 4.0),
    (21, "4-5-1", [0, 3, 4, 6, 7, 12, 14, 16, 17, 19, 25], 1.0, 5.0, 4.0),
    (22, "3-1-4-2", [0, 4, 5, 6, 10, 12, 13, 15, 16, 24, 26], 2.0, 4.5, 3.5),
    (23, "3-4-1-2", [0, 4, 5, 6, 12, 13, 15, 16, 18, 24, 26], 2.5, 4.5, 3.0),
    (24, "3-4-2-1", [0, 4, 5, 6, 12, 13, 15, 16, 17, 19, 25], 2.0, 5.0, 3.0),
    (25, "3-4-3", [0, 4, 5, 6, 12, 13, 15, 16, 23, 25, 27], 3.0, 4.0, 3.0),
    (27, "3-5-2", [0, 4, 5, 6, 9, 11, 12, 16, 18, 24, 26], 2.0, 5.0, 3.0),
    (29, "5-2-1-2", [0, 3, 4, 5, 6, 7, 13, 15, 18, 24, 26], 2.0, 2.0, 6.0),
    (30, "5-2-3", [0, 3, 4, 5, 6, 7, 13, 15, 23, 25, 27], 1.0, 3.0, 6.0),
    (31, "5-3-2", [0, 3, 4, 5, 6, 7, 10, 13, 15, 24, 26], 2.0, 3.0, 5.0),
    (33, "5-4-1", [0, 3, 4, 5, 6, 7, 12, 13, 15, 16, 25], 1.0, 4.0, 5.0),
    (36, "4-2-1-3", [0, 3, 4, 6, 7, 9, 11, 18, 23, 25, 27], 3.0, 3.0, 4.0),
]

FIRST = ["Anh", "Bruno", "Carlos", "Diego", "Erik", "Filip", "Gunnar", "Hoang", "Ivan", "Jón", "Kai", "Luka", "Marta",
         "Nguyễn", "Oskar", "Pedro", "Quân", "Rafael", "Søren", "Tomás", "Uli", "Viktor", "Wojciech", "Yusuf", "Zlatan"]
LAST = ["Andersson", "Borges", "Čeh", "Dalot", "Eriksen", "Fernandes", "Guðjohnsen", "Hansen", "Ibáñez", "Jørgensen",
        "Kovačić", "Łukasik", "Martínez", "Nguyễn", "Østergaard", "Pereira", "Quintero", "Rossi", "Silva", "Trần",
        "Úlfarsson", "Vidal", "Weiß", "Yıldız", "Žabić"]

ROLE_CODES = {"GK": [0], "CB": [4, 5, 6], "FB": [3, 7], "DM": [9, 10, 11], "CM": [13, 14, 15], "WM": [12, 16],
              "AM": [17, 18, 19], "W": [23, 27], "ST": [24, 25, 26]}


def role_of(code: int) -> str:
    return next(r for r, cs in ROLE_CODES.items() if code in cs) if code not in (2, 8, 1, 20, 21, 22) else "FB"


def write(path: Path, header: list[str], rows: list[dict]) -> None:
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=header)
        w.writeheader()
        for r in rows:
            w.writerow({h: r.get(h, "0") for h in header})


def source_cols(table: str) -> list[str]:
    cols = []
    for spec in MAPPING["tables"][table]["columns"].values():
        cols += spec["cols"] if isinstance(spec, dict) and "cols" in spec else [spec["col"] if isinstance(spec, dict) else spec]
    if "where" in MAPPING["tables"][table]:
        cols.append(MAPPING["tables"][table]["where"]["col"])
    return list(dict.fromkeys(cols))


def attrs_for(rng: random.Random, role: str, quality: int) -> dict:
    """Chỉ số theo vai trò: cao ở nhóm liên quan, thấp ở nhóm khác."""
    hi = {"GK": ["gkdiving", "gkhandling", "gkkicking", "gkpositioning", "gkreflexes"],
          "CB": ["defensiveawareness", "interceptions", "standingtackle", "slidingtackle", "strength", "jumping", "headingaccuracy", "aggression"],
          "FB": ["sprintspeed", "acceleration", "stamina", "defensiveawareness", "standingtackle", "crossing"],
          "DM": ["interceptions", "standingtackle", "defensiveawareness", "strength", "stamina", "shortpassing"],
          "CM": ["shortpassing", "longpassing", "vision", "ballcontrol", "stamina", "dribbling"],
          "WM": ["crossing", "dribbling", "sprintspeed", "acceleration", "stamina", "ballcontrol"],
          "AM": ["vision", "shortpassing", "ballcontrol", "dribbling", "longshots", "positioning", "finishing"],
          "W": ["sprintspeed", "acceleration", "dribbling", "ballcontrol", "agility", "crossing", "finishing"],
          "ST": ["finishing", "shotpower", "positioning", "composure", "sprintspeed", "headingaccuracy", "volleys"]}[role]
    names = ["acceleration", "sprintspeed", "finishing", "shotpower", "longshots", "positioning", "volleys", "penalties",
             "shortpassing", "longpassing", "vision", "crossing", "curve", "freekickaccuracy", "dribbling", "ballcontrol",
             "agility", "balance", "reactions", "composure", "defensiveawareness", "interceptions", "standingtackle",
             "slidingtackle", "strength", "stamina", "aggression", "jumping", "headingaccuracy",
             "gkdiving", "gkhandling", "gkkicking", "gkpositioning", "gkreflexes"]
    out = {}
    for n in names:
        base = quality + (10 if n in hi else -22)
        if role != "GK" and n.startswith("gk"):
            base = 12
        if role == "GK" and not n.startswith("gk") and n != "jumping":
            base = 35
        out[n] = max(5, min(97, int(rng.gauss(base, 7))))
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("out")
    ap.add_argument("--seed", type=int, default=7)
    args = ap.parse_args()
    rng = random.Random(args.seed)
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    # ---- giải và đội
    leagues = [(13, "Premier Test", 14, 1, 0, 0), (53, "Liga Test", 45, 1, 0, 0), (31, "Serie Test", 27, 1, 0, 0),
               (2222, "Liga F Test", 45, 1, 0, 1), (78, "Đội tuyển Nam Test", 75, 5, 1, 0)]
    teams: list[dict] = []
    standings: list[dict] = []
    tid = 1
    league_teams: dict[int, list[int]] = {}
    for lid, _, _, _, intl, women in leagues:
        n = 8 if intl else (10 if women else 14)
        league_teams[lid] = []
        for k in range(n):
            quality = rng.randint(58, 80) if not women else rng.randint(52, 72)
            name = f"{'FC ' if k % 2 else ''}{rng.choice(LAST)} {lid}-{k + 1}"
            teams.append(dict(team_id=tid, name=name, gender=1 if women else 0, quality=quality, league=lid))
            league_teams[lid].append(tid)
            tid += 1
    empty_team = tid
    teams.append(dict(team_id=empty_team, name="Đội trống", gender=0, quality=60, league=53))
    league_teams[53].append(empty_team)
    no_standing_team = tid + 1
    teams.append(dict(team_id=no_standing_team, name="Đội không bảng", gender=0, quality=60, league=None))

    # ---- sơ đồ riêng của từng đội + cầu thủ
    players: list[dict] = []
    links: list[dict] = []
    sheets: list[dict] = []
    team_formations: list[dict] = []
    pid = 100000
    name_ids: dict[str, int] = {}
    next_name = [1]

    def nid(text: str) -> int:
        if text not in name_ids:
            name_ids[text] = next_name[0]
            next_name[0] += 1
        return name_ids[text]

    club_xi: dict[int, list[int]] = {}
    for t in teams:
        t_id = t["team_id"]
        gen = rng.choice([g for g in GENERIC if g[1] in ("4-3-3", "4-2-3-1", "4-4-2", "3-5-2", "5-3-2", "4-1-4-1", "3-4-3", "4-5-1")])
        team_formations.append(dict(teamid=t_id, formationid=1000 + t_id, relativeformationid=gen[0], formationname=gen[1],
                                    positions=gen[2], attackers=gen[3], midfielders=gen[4], defenders=gen[5]))
        if t_id == empty_team or t["league"] == 78:
            continue
        xi_ids = []
        squad_n = 24 + rng.randint(0, 6)
        for slot, code in enumerate(gen[2]):
            role = role_of(code)
            natural = rng.random() < 0.85
            primary = code if natural else rng.choice([c for c in ROLE_CODES[role]] + [code])
            overall = max(45, min(94, int(rng.gauss(t["quality"] + 4, 5))))
            pid += 1
            xi_ids.append(pid)
            players.append(make_player(rng, pid, role, primary, overall, t["gender"], nid))
            links.append(dict(teamid=t_id, playerid=pid, position=code, jerseynumber=slot + 1))
        # dự bị / ngoài danh sách
        for k in range(squad_n - 11):
            role = rng.choice(list(ROLE_CODES))
            primary = rng.choice(ROLE_CODES[role])
            overall = max(40, min(88, int(rng.gauss(t["quality"] - 7, 6))))
            pid += 1
            players.append(make_player(rng, pid, role, primary, overall, t["gender"], nid))
            links.append(dict(teamid=t_id, playerid=pid, position=28 if k < 7 else 29, jerseynumber=12 + k))
        club_xi[t_id] = xi_ids
        sheet = dict(teamid=t_id, captainid=xi_ids[5], penaltytakerid=xi_ids[-1] if rng.random() < .7 else -1)
        for i in range(11):
            sheet[f"playerid{i}"] = xi_ids[i]
        # một vài đội thiếu người trong đội hình xuất phát
        if rng.random() < 0.12:
            sheet[f"playerid{rng.randint(1, 10)}"] = -1
        sheets.append(sheet)

    # đội tuyển: lấy cầu thủ từ các CLB (một cầu thủ thuộc cả CLB lẫn đội tuyển)
    pool = [p for p in players if p["overall"] >= 70]
    for t_id in league_teams[78]:
        gen = GENERIC[7]
        xi = []
        for slot, code in enumerate(gen[2]):
            cand = [p for p in pool if p["primary"] == code or role_of(p["primary"]) == role_of(code)]
            p = rng.choice(cand or pool)
            while p["player_id"] in xi:
                p = rng.choice(pool)
            xi.append(p["player_id"])
            links.append(dict(teamid=t_id, playerid=p["player_id"], position=code, jerseynumber=slot + 1))
        sheet = dict(teamid=t_id, captainid=xi[3], penaltytakerid=-1)
        for i in range(11):
            sheet[f"playerid{i}"] = xi[i]
        sheets.append(sheet)

    # chấn thương, phong độ, thống kê trong đội
    for link in links:
        link["injury"] = rng.choice([0] * 14 + [1, 3])
        link["form"] = rng.choice([3] * 12 + [1, 2, 4, 5, 0])
        link["leagueappearances"] = rng.randint(0, 30)
        link["leaguegoals"] = rng.randint(0, 12)
        link["yellows"] = rng.randint(0, 6)
        link["reds"] = rng.choice([0] * 9 + [1])

    # cầu thủ trùng tên (để thử tìm kiếm)
    dupes = rng.sample(players, 6)
    for d in dupes:
        d["first"], d["last"] = "Bruno", "Fernandes"

    # ---- ghi file
    write(out / "leagues.csv", source_cols("leagues"), [
        dict(leagueid=l[0], leaguename=l[1], countryid=l[2], level=l[3], isinternationalleague=l[4], iswomencompetition=l[5])
        for l in leagues
    ])
    write(out / "teams.csv", source_cols("teams"), [
        dict(teamid=t["team_id"], teamname=t["name"], gender=t["gender"], overallrating=t["quality"] + 2,
             attackrating=t["quality"] + rng.randint(-4, 6), midfieldrating=t["quality"] + rng.randint(-4, 6),
             defenserating=t["quality"] + rng.randint(-4, 6), buildupplay=rng.randint(1, 3), defensivedepth=rng.randint(20, 40),
             captainid=-1, penaltytakerid=-1, popularity=rng.randint(1, 5))
        for t in teams
    ])
    prows = []
    for p in players:
        row = dict(
            playerid=p["player_id"], firstnameid=nid(p["first"]), lastnameid=nid(p["last"]),
            commonnameid=nid(p["common"]) if p["common"] else 0, playerjerseynameid=nid(p["jersey"]),
            birthdate=p["birth"], gender=p["gender"], nationality=rng.randint(1, 60), height=p["height"], weight=p["weight"],
            overallrating=p["overall"], potential=min(95, p["overall"] + rng.randint(0, 12)),
            preferredfoot=rng.choice([1, 1, 1, 2]), weakfootabilitytypecode=rng.randint(1, 5), skillmoves=rng.randint(0, 4),
            internationalrep=rng.randint(1, 5), contractvaliduntil=rng.randint(2026, 2031), trait1=rng.randint(0, 99999),
            trait2=0, icontrait1=0, icontrait2=0, **p["attrs"],
        )
        for i in range(1, 8):
            row[f"preferredposition{i}"] = p["positions"][i - 1] if i <= len(p["positions"]) else -1
        a = p["attrs"]
        gk = p["role"] == "GK"
        row.update(pacdiv=a["gkdiving"] if gk else (a["acceleration"] * 45 + a["sprintspeed"] * 55) // 100,
                   shohan=a["gkhandling"] if gk else a["finishing"], paskic=a["gkkicking"] if gk else a["shortpassing"],
                   driref=a["gkreflexes"] if gk else a["dribbling"], defspe=a["gkpositioning"] if gk else a["standingtackle"],
                   phypos=a["gkpositioning"] if gk else a["strength"])
        prows.append(row)
    write(out / "players.csv", source_cols("players"), prows)
    write(out / "teamplayerlinks.csv", source_cols("squad"), links)

    st_rows = []
    for t in teams:
        if t["league"] is None:
            continue
        playing = t["league"] == 13   # giữa mùa: chỉ giải 13 có số liệu; các giải khác đang tiền mùa giải
        n = rng.randint(8, 12)
        w, d_ = rng.randint(0, n), 0
        d_ = rng.randint(0, n - w)
        lo = n - w - d_
        st_rows.append(dict(
            teamid=t["team_id"], leagueid=t["league"], currenttableposition=rng.randint(1, 14), previousyeartableposition=rng.randint(1, 14),
            points=(3 * w + d_) if playing else 0, nummatchesplayed=n if playing else rng.choice([0, 38]),
            homewins=w // 2 if playing else 0, homedraws=d_ // 2 if playing else 0, homelosses=lo // 2 if playing else 0,
            awaywins=w - w // 2 if playing else 0, awaydraws=d_ - d_ // 2 if playing else 0, awaylosses=lo - lo // 2 if playing else 0,
            homegf=rng.randint(0, 20) if playing else 0, homega=rng.randint(0, 20) if playing else 0,
            awaygf=rng.randint(0, 20) if playing else 0, awayga=rng.randint(0, 20) if playing else 0,
            teamform=rng.choice(["0", "22122", "1", "20", "10202", "22222", "11", "2"]), lastgameresult=rng.choice([0, 1, 2]),
        ))
    write(out / "leagueteamlinks.csv", source_cols("standings"), st_rows)

    sheet_header = ["teamid", "captainid", "penaltytakerid"] + [f"playerid{i}" for i in range(11)]
    write(out / "default_teamsheets.csv", sheet_header, sheets)

    f_header = ["teamid", "formationid", "relativeformationid", "formationname", "attackers", "midfielders", "defenders"] + \
        [f"position{i}" for i in range(11)] + [f"pos{i}role" for i in range(11)]
    frows = []
    for gid, name, positions, att, mid, dfn in GENERIC:
        r = dict(teamid=-1, formationid=gid, relativeformationid=-1, formationname=name, attackers=att, midfielders=mid, defenders=dfn,
                 formationfullnameid=gid + 100)
        r.update({f"position{i}": positions[i] for i in range(11)})
        r.update({f"pos{i}role": 4162 for i in range(11)})
        frows.append(r)
    for tf in team_formations:
        r = dict(teamid=tf["teamid"], formationid=tf["formationid"], relativeformationid=tf["relativeformationid"],
                 formationname=tf["formationname"], attackers=tf["attackers"], midfielders=tf["midfielders"], defenders=tf["defenders"])
        r.update({f"position{i}": tf["positions"][i] for i in range(11)})
        r.update({f"pos{i}role": 4162 + i for i in range(11)})
        frows.append(r)
    f_header = list(dict.fromkeys(f_header + source_cols("formation_defs")))
    write(out / "formations.csv", f_header, frows)

    # ---- lịch: đội của người dùng (đội 1) có vài trận; vài giải khác có một vòng
    fx = []
    fid = 500000
    base = 162032
    def add(h, a, d, t=66600):
        nonlocal fid
        fid += 1
        fx.append(dict(fixtureid=fid, competitionid=13, hometeamid=h, awayteamid=a, fixturedate=d, fixturetime=t,
                       hometeamform=rng.choice([0, 22122, 10]), awayteamform=rng.choice([0, 2, 21]),
                       hometeamleaguepos=rng.randint(1, 14), awayteamleaguepos=rng.randint(1, 14),
                       hometeammatchesplayed=rng.randint(0, 38), awayteammatchesplayed=rng.randint(0, 38), stadiumid=rng.randint(1, 400)))
    lt = league_teams[13]
    add(lt[0], lt[3], base + 7, 70200); add(lt[5], lt[0], base + 14); add(lt[0], lt[7], base + 7, 58500)  # trận cùng ngày, khác giờ
    add(lt[1], lt[2], base + 7)
    for a, b in zip(league_teams[53][:6:2], league_teams[53][1:6:2]):
        add(a, b, base + 3)
    write(out / "fixtures.csv", source_cols("fixtures"), fx)

    write(out / "career_users.csv", source_cols("user"), [
        dict(userid=0, clubteamid=lt[0], leagueid=13, firstname="Michael", surname="Tester")])

    # ---- tên
    nm = sorted(name_ids.items(), key=lambda kv: kv[1])
    write(out / "playernames.csv", ["nameid", "commentaryid", "name"],
          [dict(nameid=0, commentaryid=900000, name="")] + [dict(nameid=i, commentaryid=900000, name=n) for n, i in nm if i < 44000])
    write(out / "dcplayernames.csv", ["nameid", "name"], [dict(nameid=44001, name="Legend Test")])
    write(out / "editedplayernames.csv", ["firstname", "playerjerseyname", "surname", "commonname", "playerid"], [
        dict(firstname="Cristiano", playerjerseyname="RONALDO", surname="Ronaldo", commonname="", playerid=players[3]["player_id"]),
        dict(firstname="Linh", playerjerseyname="L. TRAN", surname="Trần", commonname="Linh Trần", playerid=players[8]["player_id"]),
        dict(firstname="Ai", playerjerseyname="AI", surname="Đó", commonname="", playerid=999999999),
    ])
    print(f"đã sinh {len(teams)} đội, {len(players)} cầu thủ, {len(links)} liên kết vào {out}")


def make_player(rng, pid, role, primary, overall, gender, nid):
    first, last = rng.choice(FIRST), rng.choice(LAST)
    common = f"{first} {last}" if rng.random() < 0.15 else ""
    positions = [primary] + [c for c in rng.sample(range(0, 28), rng.randint(0, 3)) if c != primary]
    return dict(player_id=pid, role=role, primary=primary, positions=positions, overall=overall, gender=gender,
                first=first, last=last, common=common, jersey=f"{first[0]}.{last}",
                birth=rng.randint(140000, 156500), height=rng.randint(165, 198), weight=rng.randint(60, 95),
                attrs=attrs_for(rng, role, overall - 8))


if __name__ == "__main__":
    main()
