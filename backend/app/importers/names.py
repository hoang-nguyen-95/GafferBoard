"""Ghép tên hiển thị cho cầu thủ từ các bảng tên của game.

players.csv chỉ chứa ID tên (firstnameid, lastnameid, commonnameid, playerjerseynameid). Chuỗi tên nằm ở
playernames.csv (nameid,name), dcplayernames.csv (cùng dạng, id >= 44000) và editedplayernames.csv
(theo playerid, do người dùng sửa trong Live Editor, được ưu tiên). Xem docs/data-schema.md §4.8.
"""
import unicodedata
from pathlib import Path

from sqlalchemy import bindparam, select, update
from sqlmodel import Session

from app.importers.live_editor import MappingError, TableReport, read_csv, _require_columns
from app.models import Player

# Ký tự không tách được bằng NFKD
_EXTRA_FOLD = str.maketrans({
    "ð": "d", "Ð": "d", "þ": "th", "Þ": "th", "ø": "o", "Ø": "o", "æ": "ae", "Æ": "ae",
    "œ": "oe", "Œ": "oe", "ß": "ss", "đ": "d", "Đ": "d", "ł": "l", "Ł": "l", "ı": "i",
})


def fold_text(text: str) -> str:
    """Chữ thường, bỏ dấu, gộp khoảng trắng: dùng cho tìm kiếm/autocomplete."""
    decomposed = unicodedata.normalize("NFKD", text.translate(_EXTRA_FOLD))
    stripped = "".join(ch for ch in decomposed if not unicodedata.combining(ch))
    return " ".join(stripped.casefold().split())


def display_name(first: str, last: str, common: str) -> str:
    """Tên thông dụng nếu có (vd "Bruno Fernandes"), nếu không thì tên + họ."""
    return common.strip() or " ".join(p for p in (first.strip(), last.strip()) if p)


def search_key(*parts: str) -> str:
    """Các từ khác nhau (đã bỏ dấu) của mọi phần tên, giữ thứ tự xuất hiện."""
    return " ".join(dict.fromkeys(fold_text(" ".join(parts)).split()))


def _read_name_map(exports: Path, files: list[str], id_col: str, name_col: str) -> dict[int, str]:
    mapping: dict[int, str] = {}
    for fname in files:
        path = exports / fname
        if not path.exists():
            continue
        header, rows = read_csv(path)
        _require_columns(path, header, [id_col, name_col])
        for r in rows:
            mapping[int(r[id_col])] = r[name_col].strip()
    return mapping


def import_names(session: Session, exports: Path, spec: dict) -> TableReport:
    report = TableReport("names")
    files = [spec["names_file"], *spec.get("extra_names_files", [])]
    if not (exports / spec["names_file"]).exists():
        report.status, report.note = "skipped", f"không có {spec['names_file']}"
        return report
    names = _read_name_map(exports, files, spec["id_col"], spec["name_col"])

    edited: dict[int, dict[str, str]] = {}
    edited_path = exports / spec["edited_file"]
    if edited_path.exists():
        cols = spec["edited_cols"]
        header, rows = read_csv(edited_path)
        _require_columns(edited_path, header, cols.values())
        edited = {int(r[cols["player_id"]]): {k: r[c].strip() for k, c in cols.items()} for r in rows}

    def lookup(nid: int | None) -> str:
        return names.get(nid, "") if nid is not None else ""

    changes = []
    cur = Player.__table__.c
    rows = session.execute(select(
        cur.player_id, cur.first_name_id, cur.last_name_id, cur.common_name_id, cur.jersey_name_id,
        cur.name, cur.jersey_name, cur.name_search,
    )).all()
    for pid, f_id, l_id, c_id, j_id, old_name, old_jersey, old_key in rows:
        e = edited.get(pid)
        if e:
            first, last, common, jersey = e["first"], e["last"], e["common"], e["jersey"]
        else:
            first, last, common, jersey = lookup(f_id), lookup(l_id), lookup(c_id), lookup(j_id)
        name = display_name(first, last, common) or None
        jersey = jersey or None
        key = search_key(name or "", first, last, common, jersey or "") or None
        if (name, jersey, key) != (old_name, old_jersey, old_key):
            changes.append({"b_id": pid, "b_name": name, "b_jersey": jersey, "b_key": key})
    report.read = len(rows)
    report.updated = len(changes)
    if changes:
        stmt = (
            update(Player.__table__)
            .where(cur.player_id == bindparam("b_id"))
            .values(name=bindparam("b_name"), jersey_name=bindparam("b_jersey"), name_search=bindparam("b_key"))
        )
        session.execute(stmt, changes)
    return report
