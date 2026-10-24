"""Sinh file dữ liệu cầu thủ công khai cho trang web từ thư mục CSV xuất bằng Live Editor.

    python tools/build_players_dataset.py EXPORTS_DIR OUT_JSON

Nhập EXPORTS_DIR vào DB tạm (cùng bộ nhập của ứng dụng) rồi ghi các bảng cần cho trang "Danh sách cầu thủ" dưới dạng mảng gọn:
{"version", "generated_at", "reference_date", "tables": {tên: {"columns": [...], "rows": [[...], ...]}}}.
Chỉ lấy dữ liệu đội/giải của CLB (không lấy đội tuyển), bỏ các cột không dùng (ID tên, bitfield chưa giải mã).
Đây là dữ liệu trích từ game: xem docs/players-dataset.md về nguồn gốc và lưu ý bản quyền.
"""
import argparse
import csv
import json
import os
import sqlite3
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

VERSION = 1
PLAYER_COLUMNS = [
    "player_id", "name", "jersey_name", "name_search", "birth_date", "gender", "nationality_id", "height", "weight",
    "overall", "potential", "primary_position", "positions", "preferred_foot", "weak_foot", "skill_moves",
    "international_rep", "contract_until", "pac_div", "sho_han", "pas_kic", "dri_ref", "def_spe", "phy_pos",
    "acceleration", "sprint_speed", "finishing", "shot_power", "long_shots", "positioning", "volleys", "penalties",
    "short_passing", "long_passing", "vision", "crossing", "curve", "free_kick_accuracy", "dribbling", "ball_control",
    "agility", "balance", "reactions", "composure", "defensive_awareness", "interceptions", "standing_tackle",
    "sliding_tackle", "strength", "stamina", "aggression", "jumping", "heading_accuracy", "gk_diving", "gk_handling",
    "gk_kicking", "gk_positioning", "gk_reflexes",
]


def table(rows: list[tuple], columns: list[str]) -> dict:
    return {"columns": columns, "rows": [list(r) for r in rows]}


# Một số chuỗi tiếng Việt trong bản xuất bị đọc sai mã ký tự (vd "BŇ" thay cho "Bỉ"). Sửa bằng bảng cố định theo nation_id;
# id nào không có trong bảng thì giữ nguyên tên trong file.
NATION_FIXES = {
    7: "Bỉ", 13: "Đan Mạch", 16: "Quần đảo Faroe", 17: "Phần Lan", 19: "Bắc Macedonia", 21: "Đức", 22: "Hy Lạp",
    25: "Cộng hòa Ireland", 35: "Bắc Ireland", 38: "Bồ Đào Nha", 46: "Thụy Điển", 47: "Thụy Sĩ", 48: "Thổ Nhĩ Kỳ",
    69: "Quần đảo Virgin thuộc Anh", 71: "Quần đảo Cayman", 75: "Đội tuyển Quốc gia Nam", 94: "Quần đảo Turks và Caicos",
    95: "Hoa Kỳ", 96: "Quần đảo Virgin thuộc Mỹ", 108: "Bờ Biển Ngà", 111: "Ai Cập", 129: "Ma Rốc", 155: "Trung Quốc",
    158: "Hồng Kông", 159: "Ấn Độ", 163: "Nhật Bản", 166: "Triều Tiên", 167: "Hàn Quốc", 175: "Mông Cổ", 192: "Việt Nam",
    194: "Samoa thuộc Mỹ", 201: "Quần đảo Solomon", 207: "Cộng hòa Dominica", 209: "Cầu thủ tạo sẵn", 210: "Cầu thủ tự do",
    211: "Phần còn lại của thế giới", 213: "Đài Bắc Trung Hoa", 222: "Quốc tế nữ",
}

# Tên đội bóng chữ Latinh bị thay ký tự (vd "BrĤndby" thay cho "Brøndby"); bỏ qua tên có dấu hiệu của chuỗi tiếng Việt lỗi mã.
TEAM_CHAR_FIXES = str.maketrans({"Ĥ": "ø", "Ħ": "å", "ĝ": "ç"})
VIETNAMESE_MOJIBAKE = set("ğĽċļıĐİĊ")


# Tên đội/giải tiếng Việt (và hai đội Latinh có ký tự ñ) bị lỗi mã, sửa theo đúng tên gốc.
NAME_FIXES = {
    "Peğarol": "Peñarol", "DUX Logroğo": "DUX Logroño", "CØu thİ tĽ do": "Cầu thủ tự do", "Luôn sñn sàng": "Luôn sẵn sàng",
    "Badalona Nļ": "Badalona Nữ", "Đği 5v5 1": "Đội 5v5 1", "Các huÖn luyčn viên tĽ do": "Các huấn luyện viên tự do",
    "Đği hình tiêu biċu Serie A": "Đội hình tiêu biểu Serie A", "Đği hình tiêu biċu Ligue 1": "Đội hình tiêu biểu Ligue 1",
    "Đği hình tiêu biċu LALIGA": "Đội hình tiêu biểu LALIGA", "Đği hình chính Juventus": "Đội hình chính Juventus",
    "Đği hình Real Madrid": "Đội hình Real Madrid", "GiÆi VĐQG Scotland": "Giải VĐQG Scotland",
    "Men's ROW (PhØn còn lÇi cİa thĉ giħi - Nam)": "Men's ROW (Phần còn lại của thế giới - Nam)",
    "Danh hiču Futsal": "Danh hiệu Futsal", "Các đği nļ khác trên thĉ giħi (ROW)": "Các đội nữ khác trên thế giới (ROW)",
    "*LeagueName_Abbr15_2240": "Giải khác",
}


def fix_team_name(name: str) -> str:
    if name in NAME_FIXES:
        return NAME_FIXES[name]
    return name if VIETNAMESE_MOJIBAKE & set(name) else name.translate(TEAM_CHAR_FIXES)


def read_nations(exports: Path) -> dict:
    """nations.csv (tên quốc gia tiếng Anh, sạch) -> {nation_id: tên}; không có file thì rỗng."""
    path = exports / "nations.csv"
    rows = {}
    if path.exists():
        with open(path, newline="", encoding="utf-8-sig") as f:
            for r in csv.DictReader(f):
                try:
                    nid = int(r["nationid"])
                    rows[nid] = NATION_FIXES.get(nid, r["nationname"])
                except (KeyError, ValueError):
                    continue
    return dict(sorted(rows.items()))


def build(exports: Path, db: str) -> dict:
    c = sqlite3.connect(db)
    q = lambda sql: c.execute(sql).fetchall()  # noqa: E731

    leagues = q("select league_id, name, level, is_international, is_women from league order by league_id")
    international = {r[0] for r in leagues if r[3]}
    # Chỉ các đội CLB (có bảng xếp hạng trong giải không phải quốc tế), giống club_of_player của backend.
    standings_all = q("select team_id, league_id from teamstanding order by team_id")
    club_teams = {t for t, lg in standings_all if lg not in international}
    squad = [r for r in q("select team_id, player_id, jersey_number from squadmember order by team_id, player_id") if r[0] in club_teams]
    team_ids = {r[0] for r in squad}
    teams = [(r[0], fix_team_name(r[1]), r[2]) for r in q("select team_id, name, gender from team order by team_id") if r[0] in team_ids]
    standings = [r for r in standings_all if r[0] in team_ids]
    used_leagues = {r[1] for r in standings}

    cols = ", ".join(PLAYER_COLUMNS)
    players = []
    for r in q(f"select {cols} from player order by player_id"):
        row = list(r)
        row[PLAYER_COLUMNS.index("positions")] = json.loads(row[PLAYER_COLUMNS.index("positions")] or "[]")
        players.append(row)

    ref = q("select min(fixture_date) from fixture where fixture_date is not null")[0][0]
    return {
        "version": VERSION,
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "reference_date": ref,
        "tables": {
            "leagues": table([(r[0], fix_team_name(r[1]), *r[2:]) for r in leagues if r[0] in used_leagues], ["league_id", "name", "level", "is_international", "is_women"]),
            "teams": table(teams, ["team_id", "name", "gender"]),
            "standings": table(standings, ["team_id", "league_id"]),
            "squad": table(squad, ["team_id", "player_id", "jersey_number"]),
            "players": {"columns": PLAYER_COLUMNS, "rows": players},
        },
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("exports")
    ap.add_argument("out")
    args = ap.parse_args()
    tmp = tempfile.mkdtemp(prefix="dataset_")
    db = str(Path(tmp) / "dataset.db")
    os.environ["COUNTERPICK_DB"] = db
    from app.db import get_engine
    from app.importers.run import run_import

    get_engine.cache_clear()
    run_import(Path(args.exports), f"sqlite:///{db}")
    data = build(Path(args.exports), db)
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    nations = read_nations(Path(args.exports))
    (out.parent / "nations.json").write_text(json.dumps(nations, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    t = data["tables"]
    print(f"đã ghi {out} ({out.stat().st_size / 1e6:.1f} MB): {len(t['players']['rows'])} cầu thủ, {len(t['teams']['rows'])} đội, "
          f"{len(t['leagues']['rows'])} giải, {len(t['squad']['rows'])} thành viên đội, {len(nations)} quốc gia")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
