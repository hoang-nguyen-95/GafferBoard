"""Adapter cho file CSV xuất từ Live Editor (xem docs/data-schema.md).

Cột gốc -> trường mô hình được khai báo trong mappings/live_editor.yaml, không hard-code ở đây
để chỉnh được khi tên cột đổi giữa các bản game.
"""
import csv
from dataclasses import dataclass, field
from datetime import date, timedelta
from pathlib import Path
from typing import Any, Iterable

import yaml
from sqlalchemy import delete, select, tuple_
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlmodel import Session, SQLModel

from app import models

GAME_EPOCH = date(1582, 10, 14)


class MappingError(Exception):
    """Thiếu cột/giá trị không đọc được so với file ánh xạ."""


@dataclass
class TableReport:
    table: str
    status: str = "ok"  # ok | skipped
    read: int = 0
    inserted: int = 0
    updated: int = 0
    deleted: int = 0
    note: str = ""


@dataclass
class ImportReport:
    tables: list[TableReport] = field(default_factory=list)

    def summary(self) -> str:
        lines = []
        for t in self.tables:
            if t.status == "skipped":
                lines.append(f"  {t.table:<10} bỏ qua ({t.note})")
            else:
                lines.append(
                    f"  {t.table:<10} đọc {t.read:>6} | mới {t.inserted:>6} | cập nhật {t.updated:>6} | xóa {t.deleted:>5}"
                    + (f"  [{t.note}]" if t.note else "")
                )
        return "\n".join(lines)


def days_to_date(n: int) -> date:
    return GAME_EPOCH + timedelta(days=n)


def _to_int(raw: str) -> int:
    return int(float(raw)) if "." in raw else int(raw)


def convert(raw: dict[str, str], spec: Any) -> Any:
    """Chuyển một trường từ dòng CSV theo spec của YAML."""
    if isinstance(spec, str):
        spec = {"col": spec}
    typ = spec.get("type", "int")
    if typ == "int_list":
        values = [_to_int(raw[c]) for c in spec["cols"] if raw[c] != ""]
        return [v for v in values if v >= 0]
    value = raw[spec["col"]]
    if typ == "str":
        return value
    if value == "":
        return None
    if typ == "int":
        return _to_int(value)
    if typ == "float":
        return float(value)
    if typ == "id":
        n = _to_int(value)
        return n if n >= 0 else None
    if typ == "bool":
        return _to_int(value) != 0
    if typ == "date_days":
        return days_to_date(_to_int(value))
    raise MappingError(f"Kiểu không hỗ trợ trong ánh xạ: {typ}")


def _source_columns(spec: Any) -> list[str]:
    if isinstance(spec, str):
        return [spec]
    return list(spec["cols"]) if "cols" in spec else [spec["col"]]


def read_csv(path: Path) -> tuple[list[str], list[dict[str, str]]]:
    with open(path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        header = reader.fieldnames or []
        return header, list(reader)


def _require_columns(file: Path, header: list[str], needed: Iterable[str]) -> None:
    missing = sorted(set(needed) - set(header))
    if missing:
        raise MappingError(f"{file.name}: thiếu cột {', '.join(missing)} (kiểm tra mappings/live_editor.yaml)")


def _upsert(session: Session, model: type[SQLModel], key: list[str], rows: list[dict]) -> tuple[int, int, set]:
    """Upsert theo khóa; trả về (mới, cập nhật, tập khóa hiện có trước khi import)."""
    table = model.__table__
    key_cols = [table.c[k] for k in key]
    existing = {tuple(r) if len(key) > 1 else r[0] for r in session.execute(select(*key_cols))}
    keys_in = [tuple(r[k] for k in key) if len(key) > 1 else r[key[0]] for r in rows]
    inserted = sum(1 for k in set(keys_in) if k not in existing)
    updated = len(set(keys_in)) - inserted
    if rows:
        update_cols = [c for c in rows[0] if c not in key]
        stmt = sqlite_insert(table)
        if update_cols:
            stmt = stmt.on_conflict_do_update(
                index_elements=key, set_={c: stmt.excluded[c] for c in update_cols}
            )
        else:
            stmt = stmt.on_conflict_do_nothing(index_elements=key)
        session.execute(stmt, rows)  # executemany: biên dịch câu lệnh một lần cho cả bảng
    return inserted, updated, existing


def _prune(session: Session, model: type[SQLModel], key: list[str], rows: list[dict], existing: set) -> int:
    keep = {tuple(r[k] for k in key) if len(key) > 1 else r[key[0]] for r in rows}
    stale = [k for k in existing if k not in keep]
    table = model.__table__
    for i in range(0, len(stale), 500):
        part = stale[i : i + 500]
        if len(key) > 1:
            session.execute(delete(table).where(tuple_(*[table.c[k] for k in key]).in_(part)))
        else:
            session.execute(delete(table).where(table.c[key[0]].in_(part)))
    return len(stale)


def _import_table(session: Session, exports: Path, name: str, spec: dict) -> TableReport:
    report = TableReport(name)
    path = exports / spec["file"]
    if not path.exists():
        report.status, report.note = "skipped", f"không có {spec['file']}"
        return report
    header, raw_rows = read_csv(path)
    needed = [c for f in spec["columns"].values() for c in _source_columns(f)]
    if "where" in spec:
        needed.append(spec["where"]["col"])
    _require_columns(path, header, needed)
    if "where" in spec:
        raw_rows = [r for r in raw_rows if r[spec["where"]["col"]] == str(spec["where"]["equals"])]
    model = getattr(models, spec["model"])
    try:
        rows = [{f: convert(r, s) for f, s in spec["columns"].items()} for r in raw_rows]
    except (ValueError, KeyError) as e:
        raise MappingError(f"{path.name}: giá trị không đọc được ({e})") from e
    report.read = len(rows)
    report.inserted, report.updated, existing = _upsert(session, model, spec["key"], rows)
    if spec.get("prune"):
        report.deleted = _prune(session, model, spec["key"], rows, existing)
    return report


def _import_lineups(session: Session, exports: Path, spec: dict) -> TableReport:
    report = TableReport("lineups")
    sheets_path = exports / spec["teamsheets_file"]
    formations_path = exports / spec["formations_file"]
    if not sheets_path.exists() or not formations_path.exists():
        report.status = "skipped"
        report.note = f"cần {spec['teamsheets_file']} và {spec['formations_file']}"
        return report

    n = spec["slots"]
    slot_cols = lambda tpl: [spec[tpl].format(i=i) for i in range(n)]  # noqa: E731
    sheet_header, sheets = read_csv(sheets_path)
    form_header, formations = read_csv(formations_path)
    team_col = spec["team_col"]
    _require_columns(
        sheets_path, sheet_header,
        [team_col, spec["captain_col"], spec["penalty_taker_col"], *slot_cols("slot_player_col")],
    )
    _require_columns(
        formations_path, form_header,
        [team_col, spec["formation_id_col"], spec["formation_name_col"],
         spec["relative_formation_id_col"], *slot_cols("slot_position_col"), *slot_cols("slot_role_col")],
    )
    # Mỗi đội có một dòng formations riêng; teamid = -1 là sơ đồ chung, bỏ qua.
    formation_by_team = {int(f[team_col]): f for f in formations if int(f[team_col]) >= 0}

    def opt(v: str) -> int | None:
        return _to_int(v) if v != "" and _to_int(v) >= 0 else None

    rows = []
    for sheet in sheets:
        team_id = int(sheet[team_col])
        f = formation_by_team.get(team_id)
        slots = []
        for i in range(n):
            slots.append({
                "slot": i,
                "position": opt(f[spec["slot_position_col"].format(i=i)]) if f else None,
                "role": opt(f[spec["slot_role_col"].format(i=i)]) if f else None,
                "player_id": opt(sheet[spec["slot_player_col"].format(i=i)]),
            })
        rows.append({
            "team_id": team_id,
            "formation_id": opt(f[spec["formation_id_col"]]) if f else None,
            "relative_formation_id": opt(f[spec["relative_formation_id_col"]]) if f else None,
            "formation_name": f[spec["formation_name_col"]] if f else None,
            "captain_id": opt(sheet[spec["captain_col"]]),
            "penalty_taker_id": opt(sheet[spec["penalty_taker_col"]]),
            "slots": slots,
        })
    report.read = len(rows)
    report.inserted, report.updated, existing = _upsert(session, models.TeamLineup, ["team_id"], rows)
    report.deleted = _prune(session, models.TeamLineup, ["team_id"], rows, existing)
    return report


def load_mapping(path: Path) -> dict:
    with open(path, encoding="utf-8") as f:
        return yaml.safe_load(f)


def import_exports(session: Session, exports: Path, mapping: dict) -> ImportReport:
    """Nhập toàn bộ file CSV trong `exports`. File thiếu bị bỏ qua; lỗi cột/giá trị ném MappingError
    (và giao dịch được hoàn tác bởi bên gọi nên DB không bị nhập dở)."""
    report = ImportReport()
    for name, spec in mapping["tables"].items():
        report.tables.append(_import_table(session, exports, name, spec))
        if name == "players" and "names" in mapping:
            from app.importers.names import import_names  # tránh import vòng

            report.tables.append(import_names(session, exports, mapping["names"]))
        if name == "squad" and "lineups" in mapping:
            report.tables.append(_import_lineups(session, exports, mapping["lineups"]))
    return report
