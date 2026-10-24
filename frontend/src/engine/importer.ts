// Nhập file CSV xuất từ Live Editor vào Store. Tái hiện backend/app/importers/{live_editor,names}.py:
// cột gốc -> trường lấy từ mapping.json (sinh từ YAML), upsert idempotent, xóa liên kết/lịch không còn trong file mới,
// và toàn bộ file được kiểm tra TRƯỚC khi ghi nên một file lỗi không làm dữ liệu bị nhập dở.
import mappingJson from "./data/mapping.json";
import type { Store } from "./store";
import { squadKey } from "./store";
import type {
  Fixture, FormationDef, League, Player, SquadMember, Team, TeamLineup, TeamStanding, UserProfile, LineupSlotData,
} from "./types";
import { newPlayer } from "./types";
import { daysToDate, displayName, parseCsv, searchKey } from "./util";

export class MappingError extends Error {}

export interface TableReport {
  table: string; status: "ok" | "skipped"; read: number; inserted: number; updated: number; deleted: number; note: string;
}

/** Tên file (viết thường) -> nội dung văn bản UTF-8. */
export type FileMap = Map<string, string>;

type ColSpec = string | { col?: string; cols?: string[]; type?: string };
interface TableSpec {
  file: string; model: string; key: string[]; prune?: boolean; where?: { col: string; equals: string };
  columns: Record<string, ColSpec>;
}
interface NamesSpec {
  names_file: string; extra_names_files?: string[]; id_col: string; name_col: string; edited_file: string;
  edited_cols: Record<string, string>;
}
interface LineupSpec {
  teamsheets_file: string; formations_file: string; team_col: string; formation_id_col: string;
  formation_name_col: string; relative_formation_id_col: string; captain_col: string; penalty_taker_col: string;
  slot_player_col: string; slot_position_col: string; slot_role_col: string; slots: number;
}
export interface Mapping { tables: Record<string, TableSpec>; names?: NamesSpec; lineups?: LineupSpec }
export const MAPPING = mappingJson as unknown as Mapping;

type Row = Record<string, unknown>;
interface Csv { header: string[]; index: Map<string, number>; rows: string[][] }

function readCsv(files: FileMap, name: string): Csv | null {
  const text = files.get(name.toLowerCase());
  if (text === undefined) return null;
  const { header, rows } = parseCsv(text);
  return { header, index: new Map(header.map((h, i) => [h, i])), rows };
}

function requireColumns(file: string, csv: Csv, needed: Iterable<string>): void {
  const missing = [...new Set(needed)].filter((c) => !csv.index.has(c)).sort();
  if (missing.length) throw new MappingError(`${file}: thiếu cột ${missing.join(", ")} (kiểm tra mappings/live_editor.yaml)`);
}

const sourceColumns = (spec: ColSpec): string[] => (typeof spec === "string" ? [spec] : spec.cols ?? [spec.col!]);

function toInt(raw: string): number {
  const v = raw.includes(".") ? Math.trunc(Number(raw)) : Number(raw);
  if (raw.trim() === "" || !Number.isFinite(v) || (!raw.includes(".") && !/^\s*[+-]?\d+\s*$/.test(raw))) {
    throw new MappingError(`không đọc được số nguyên: '${raw}'`);
  }
  return v;
}

function convert(cell: (col: string) => string, spec: ColSpec): unknown {
  const s = typeof spec === "string" ? { col: spec } : spec;
  const type = s.type ?? "int";
  if (type === "int_list") {
    const values = s.cols!.map(cell).filter((v) => v !== "").map(toInt);
    return values.filter((v) => v >= 0);
  }
  const value = cell(s.col!);
  if (type === "str") return value;
  if (value === "") return null;
  switch (type) {
    case "int": return toInt(value);
    case "float": {
      const f = Number(value);
      if (!Number.isFinite(f)) throw new MappingError(`không đọc được số thực: '${value}'`);
      return f;
    }
    case "id": { const n = toInt(value); return n >= 0 ? n : null; }
    case "bool": return toInt(value) !== 0;
    case "date_days": return daysToDate(toInt(value));
    default: throw new MappingError(`Kiểu không hỗ trợ trong ánh xạ: ${type}`);
  }
}

const asRows = (m: Map<number | string, unknown>) => m as unknown as Map<string | number, Row>;

/** Kho + cách tạo dòng mới (đủ mọi khóa, mặc định null) cho từng model. */
function tableOf(store: Store, model: string): { map: Map<string | number, Row>; blank: (row: Row) => Row; keyOf: (row: Row) => string | number } {
  const d = store.data;
  const nulls = (keys: string[]) => Object.fromEntries(keys.map((k) => [k, null]));
  switch (model) {
    case "League": return { map: asRows(d.leagues), keyOf: (r) => r.league_id as number,
      blank: (r) => ({ ...nulls(["country_id", "level"]), is_international: false, is_women: false, ...r }) as Row };
    case "Team": return { map: asRows(d.teams), keyOf: (r) => r.team_id as number,
      blank: (r) => ({ ...nulls(["gender", "overall", "attack", "midfield", "defense", "build_up_play", "defensive_depth", "captain_id", "penalty_taker_id", "popularity"]), ...r }) as Row };
    case "Player": return { map: asRows(d.players), keyOf: (r) => r.player_id as number,
      blank: (r) => ({ ...newPlayer(r.player_id as number), ...r }) as unknown as Row };
    case "FormationDef": return { map: asRows(d.formations), keyOf: (r) => r.formation_id as number,
      blank: (r) => ({ ...nulls(["full_name_id", "attackers", "midfielders", "defenders"]), positions: [], ...r }) as Row };
    case "SquadMember": return { map: asRows(d.squad), keyOf: (r) => squadKey(r.team_id as number, r.player_id as number),
      blank: (r) => ({ ...nulls(["position", "jersey_number", "injury", "form", "league_appearances", "league_goals", "yellows", "reds"]), ...r }) as Row };
    case "TeamStanding": return { map: asRows(d.standings), keyOf: (r) => r.team_id as number,
      blank: (r) => ({ ...nulls(["league_id", "position", "previous_position", "points", "played", "home_wins", "home_draws", "home_losses", "home_gf", "home_ga", "away_wins", "away_draws", "away_losses", "away_gf", "away_ga", "form_raw", "last_result"]), ...r }) as Row };
    case "Fixture": return { map: asRows(d.fixtures), keyOf: (r) => r.fixture_id as number,
      blank: (r) => ({ ...nulls(["competition_id", "fixture_date", "fixture_time", "home_form_raw", "away_form_raw", "home_league_pos", "away_league_pos", "home_played", "away_played", "stadium_id"]), ...r }) as Row };
    case "UserProfile": return { map: asRows(d.users), keyOf: (r) => r.user_id as number,
      blank: (r) => ({ ...nulls(["user_team_id", "league_id", "first_name", "surname"]), ...r }) as Row };
    case "TeamLineup": return { map: asRows(d.lineups), keyOf: (r) => r.team_id as number,
      blank: (r) => ({ ...r }) as Row };
    default: throw new MappingError(`Model không hỗ trợ: ${model}`);
  }
}

/** Upsert theo khóa (chỉ ghi đè các trường có trong `rows`), tùy chọn xóa dòng không còn trong file. */
function apply(store: Store, model: string, rows: Row[], prune: boolean): { inserted: number; updated: number; deleted: number } {
  const { map, blank, keyOf } = tableOf(store, model);
  const existing = new Set(map.keys());
  const keysIn = new Set<string | number>();
  for (const row of rows) {
    const key = keyOf(row);
    keysIn.add(key);
    const current = map.get(key);
    if (current) Object.assign(current, row);
    else map.set(key, blank(row));
  }
  let inserted = 0;
  for (const k of keysIn) if (!existing.has(k)) inserted++;
  let deleted = 0;
  if (prune) {
    for (const k of existing) if (!keysIn.has(k)) { map.delete(k); deleted++; }
  }
  return { inserted, updated: keysIn.size - inserted, deleted };
}

// ---------------------------------------------------------------- chuẩn bị (kiểm tra, chưa ghi)

interface Prepared { name: string; spec: TableSpec; rows: Row[] | null; note: string }

function prepareTable(files: FileMap, name: string, spec: TableSpec): Prepared {
  const csv = readCsv(files, spec.file);
  if (!csv) return { name, spec, rows: null, note: `không có ${spec.file}` };
  const needed = Object.values(spec.columns).flatMap(sourceColumns);
  if (spec.where) needed.push(spec.where.col);
  requireColumns(spec.file, csv, needed);
  let raw = csv.rows;
  if (spec.where) {
    const w = csv.index.get(spec.where.col)!;
    raw = raw.filter((r) => r[w] === String(spec.where!.equals));
  }
  const entries = Object.entries(spec.columns);
  try {
    const rows = raw.map((r) => {
      const cell = (col: string) => r[csv.index.get(col)!] ?? "";
      const out: Row = {};
      for (const [field, colSpec] of entries) out[field] = convert(cell, colSpec);
      return out;
    });
    return { name, spec, rows, note: "" };
  } catch (e) {
    if (e instanceof MappingError) throw new MappingError(`${spec.file}: giá trị không đọc được (${e.message})`);
    throw e;
  }
}

interface NamesPrepared { names: Map<number, string>; edited: Map<number, Record<string, string>> }

function prepareNames(files: FileMap, spec: NamesSpec): NamesPrepared | null {
  if (!files.has(spec.names_file.toLowerCase())) return null;
  const names = new Map<number, string>();
  for (const fname of [spec.names_file, ...(spec.extra_names_files ?? [])]) {
    const csv = readCsv(files, fname);
    if (!csv) continue;
    requireColumns(fname, csv, [spec.id_col, spec.name_col]);
    const [i, n] = [csv.index.get(spec.id_col)!, csv.index.get(spec.name_col)!];
    for (const r of csv.rows) names.set(toInt(r[i]), (r[n] ?? "").trim());
  }
  const edited = new Map<number, Record<string, string>>();
  const csv = readCsv(files, spec.edited_file);
  if (csv) {
    requireColumns(spec.edited_file, csv, Object.values(spec.edited_cols));
    for (const r of csv.rows) {
      const rec: Record<string, string> = {};
      for (const [k, c] of Object.entries(spec.edited_cols)) rec[k] = (r[csv.index.get(c)!] ?? "").trim();
      edited.set(toInt(rec.player_id), rec);
    }
  }
  return { names, edited };
}

function applyNames(store: Store, prep: NamesPrepared): { read: number; updated: number } {
  const lookup = (id: number | null) => (id === null ? "" : prep.names.get(id) ?? "");
  let updated = 0;
  for (const p of store.data.players.values()) {
    const e = prep.edited.get(p.player_id);
    const [first, last, common, jersey0] = e
      ? [e.first, e.last, e.common, e.jersey]
      : [lookup(p.first_name_id), lookup(p.last_name_id), lookup(p.common_name_id), lookup(p.jersey_name_id)];
    const name = displayName(first, last, common) || null;
    const jersey = jersey0 || null;
    const key = searchKey(name ?? "", first, last, common, jersey ?? "") || null;
    if (name !== p.name || jersey !== p.jersey_name || key !== p.name_search) {
      p.name = name; p.jersey_name = jersey; p.name_search = key;
      updated++;
    }
  }
  return { read: store.data.players.size, updated };
}

interface LineupsPrepared { rows: Row[] }

function prepareLineups(files: FileMap, spec: LineupSpec): LineupsPrepared | null {
  const sheets = readCsv(files, spec.teamsheets_file);
  const forms = readCsv(files, spec.formations_file);
  if (!sheets || !forms) return null;
  const n = spec.slots;
  const cols = (tpl: string) => Array.from({ length: n }, (_, i) => tpl.replace("{i}", String(i)));
  requireColumns(spec.teamsheets_file, sheets, [spec.team_col, spec.captain_col, spec.penalty_taker_col, ...cols(spec.slot_player_col)]);
  requireColumns(spec.formations_file, forms, [
    spec.team_col, spec.formation_id_col, spec.formation_name_col, spec.relative_formation_id_col,
    ...cols(spec.slot_position_col), ...cols(spec.slot_role_col),
  ]);
  const opt = (v: string): number | null => (v !== "" && toInt(v) >= 0 ? toInt(v) : null);
  const formByTeam = new Map<number, string[]>();
  const tcol = forms.index.get(spec.team_col)!;
  for (const f of forms.rows) if (toInt(f[tcol]) >= 0) formByTeam.set(toInt(f[tcol]), f);
  const fcell = (f: string[], col: string) => f[forms.index.get(col)!] ?? "";
  const scell = (s: string[], col: string) => s[sheets.index.get(col)!] ?? "";
  const rows: Row[] = sheets.rows.map((sheet) => {
    const teamId = toInt(scell(sheet, spec.team_col));
    const f = formByTeam.get(teamId);
    const slots: LineupSlotData[] = [];
    for (let i = 0; i < n; i++) {
      slots.push({
        slot: i,
        position: f ? opt(fcell(f, spec.slot_position_col.replace("{i}", String(i)))) : null,
        role: f ? opt(fcell(f, spec.slot_role_col.replace("{i}", String(i)))) : null,
        player_id: opt(scell(sheet, spec.slot_player_col.replace("{i}", String(i)))),
      });
    }
    return {
      team_id: teamId,
      formation_id: f ? opt(fcell(f, spec.formation_id_col)) : null,
      relative_formation_id: f ? opt(fcell(f, spec.relative_formation_id_col)) : null,
      formation_name: f ? fcell(f, spec.formation_name_col) : null,
      captain_id: opt(scell(sheet, spec.captain_col)),
      penalty_taker_id: opt(scell(sheet, spec.penalty_taker_col)),
      slots,
    };
  });
  return { rows };
}

// ---------------------------------------------------------------- điểm vào

const skipped = (table: string, note: string): TableReport => ({ table, status: "skipped", read: 0, inserted: 0, updated: 0, deleted: 0, note });

/**
 * Nhập mọi file trong `files`. File thiếu bị bỏ qua. File sai cấu trúc/giá trị ném MappingError và KHÔNG ghi gì.
 */
export function importExports(store: Store, files: FileMap, mapping: Mapping = MAPPING): TableReport[] {
  // Giai đoạn 1: đọc và kiểm tra tất cả theo đúng thứ tự của bản Python (lỗi đầu tiên giống nhau)
  type Step =
    | { kind: "table"; prep: Prepared }
    | { kind: "names"; prep: NamesPrepared | null; note: string }
    | { kind: "lineups"; prep: LineupsPrepared | null; note: string };
  const steps: Step[] = [];
  for (const [name, spec] of Object.entries(mapping.tables)) {
    steps.push({ kind: "table", prep: prepareTable(files, name, spec) });
    if (name === "players" && mapping.names) {
      steps.push({ kind: "names", prep: prepareNames(files, mapping.names), note: `không có ${mapping.names.names_file}` });
    }
    if (name === "squad" && mapping.lineups) {
      const l = mapping.lineups;
      steps.push({ kind: "lineups", prep: prepareLineups(files, l), note: `cần ${l.teamsheets_file} và ${l.formations_file}` });
    }
  }

  // Giai đoạn 2: ghi (không còn lỗi dữ liệu nào có thể xảy ra)
  const reports: TableReport[] = [];
  for (const step of steps) {
    if (step.kind === "table") {
      const { name, spec, rows, note } = step.prep;
      if (rows === null) { reports.push(skipped(name, note)); continue; }
      const r = apply(store, spec.model, rows, Boolean(spec.prune));
      reports.push({ table: name, status: "ok", read: rows.length, ...r, note: "" });
    } else if (step.kind === "names") {
      if (!step.prep) { reports.push(skipped("names", step.note)); continue; }
      const r = applyNames(store, step.prep);
      reports.push({ table: "names", status: "ok", read: r.read, inserted: 0, updated: r.updated, deleted: 0, note: "" });
    } else {
      if (!step.prep) { reports.push(skipped("lineups", step.note)); continue; }
      const r = apply(store, "TeamLineup", step.prep.rows, true);
      reports.push({ table: "lineups", status: "ok", read: step.prep.rows.length, ...r, note: "" });
    }
  }
  store.reindex();
  return reports;
}

export function summarize(reports: TableReport[]): string {
  return reports
    .map((t) => (t.status === "skipped"
      ? `  ${t.table.padEnd(10)} bỏ qua (${t.note})`
      : `  ${t.table.padEnd(10)} đọc ${String(t.read).padStart(6)} | mới ${String(t.inserted).padStart(6)} | cập nhật ${String(t.updated).padStart(6)} | xóa ${String(t.deleted).padStart(5)}`))
    .join("\n");
}

export type { League, Team, Player, SquadMember, TeamStanding, TeamLineup, Fixture, UserProfile, FormationDef };

/** Nhập rồi ghi lại một lần nhập (như ImportRun của backend) để bộ nhớ đệm benchmark biết dữ liệu đã đổi. */
export function runImport(store: Store, files: FileMap, mapping: Mapping = MAPPING): TableReport[] {
  const reports = importExports(store, files, mapping);
  const id = store.user.nextId.importRun++;
  store.user.importRuns.push({ id, finished_at: new Date().toISOString(), summary: summarize(reports) });
  store.touch();
  return reports;
}

/** Các file CSV mà bản nhập có dùng, để trang nhập báo file nào có/thiếu. `optional`: thiếu thì chỉ mất một phần tính năng. */
export function expectedFiles(mapping: Mapping = MAPPING): { file: string; what: string; optional: boolean }[] {
  const out: { file: string; what: string; optional: boolean }[] = [];
  const add = (file: string, what: string, optional = false) => {
    if (!out.some((o) => o.file === file)) out.push({ file, what, optional });
  };
  const WHAT: Record<string, string> = {
    leagues: "giải đấu", teams: "đội bóng", players: "cầu thủ và chỉ số", formation_defs: "sơ đồ chiến thuật",
    squad: "cầu thủ thuộc đội nào", standings: "bảng xếp hạng và phong độ", fixtures: "lịch thi đấu", user: "đội bạn đang dẫn dắt",
  };
  for (const [name, spec] of Object.entries(mapping.tables)) add(spec.file, WHAT[name] ?? name, name === "fixtures" || name === "user");
  if (mapping.names) {
    add(mapping.names.names_file, "tên cầu thủ", false);
    for (const f of mapping.names.extra_names_files ?? []) add(f, "tên cầu thủ bổ sung", true);
    add(mapping.names.edited_file, "tên cầu thủ do bạn sửa", true);
  }
  if (mapping.lineups) add(mapping.lineups.teamsheets_file, "đội hình ra sân của các đội", true);
  return out;
}
