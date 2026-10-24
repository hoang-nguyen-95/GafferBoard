// Phong độ nhập tay, ghi chú và lịch sử gặp (khớp backend/app/routers/{results,notes}.py). Dữ liệu cá nhân, không bị import xóa.
import { bodyObject, Created, fieldBool, fieldDate, fieldInt, fieldStr, notFound, pathInt, type Ctx } from "../http";
import { outcome, teamForm } from "../form";
import type { Store } from "../store";
import type { Meeting } from "../types";
import { nowIso, pySum } from "../util";

const MAX_NOTE = 5000;

/** Ngày mới nhất trước, ngày trống cuối cùng, rồi id lớn trước (như ORDER BY ... DESC NULLS LAST, id DESC). */
export function byRecency<T extends { played_on: string | null; id: number }>(a: T, b: T): number {
  if (a.played_on !== b.played_on) {
    if (a.played_on === null) return 1;
    if (b.played_on === null) return -1;
    return a.played_on < b.played_on ? 1 : -1;
  }
  return b.id - a.id;
}

/** id mới như SQLite rowid: lớn nhất hiện có + 1 (dùng lại id khi dòng cuối bị xóa). */
export const nextId = (rows: { id: number }[]): number => rows.reduce((m, r) => Math.max(m, r.id), 0) + 1;

function requireTeam(store: Store, teamId: number): void {
  if (!store.data.teams.has(teamId)) throw notFound("Không tìm thấy đội");
}

export function teamNotes(store: Store, teamId: number) {
  const note = store.user.notes.get(teamId);
  const meetings = store.user.meetings.filter((m) => m.opponent_team_id === teamId).sort(byRecency);
  const letters = meetings.map((m) => outcome(m.goals_for, m.goals_against));
  return {
    note: note ? { text: note.text, updated_at: note.updated_at } : null,
    meetings: meetings.map((m) => ({ id: m.id, goals_for: m.goals_for, goals_against: m.goals_against, played_on: m.played_on, is_home: m.is_home, note: m.note })),
    summary: {
      played: meetings.length, wins: letters.filter((l) => l === "W").length, draws: letters.filter((l) => l === "D").length,
      losses: letters.filter((l) => l === "L").length, goals_for: pySum(meetings.map((m) => m.goals_for)), goals_against: pySum(meetings.map((m) => m.goals_against)),
    },
  };
}

export function getNotes(ctx: Ctx) {
  const teamId = pathInt(ctx, "team_id");
  requireTeam(ctx.store, teamId);
  return teamNotes(ctx.store, teamId);
}

export function putNote(ctx: Ctx) {
  const { store } = ctx;
  const teamId = pathInt(ctx, "team_id");
  const text = fieldStr(bodyObject(ctx), "text", { max: MAX_NOTE })!;
  requireTeam(store, teamId);
  const trimmed = text.trim();
  if (!trimmed) store.user.notes.delete(teamId);
  else store.user.notes.set(teamId, { team_id: teamId, text: trimmed, updated_at: nowIso() });
  store.touch();
  return teamNotes(store, teamId);
}

export function addMeeting(ctx: Ctx) {
  const { store } = ctx;
  const teamId = pathInt(ctx, "team_id");
  const body = bodyObject(ctx);
  const m: Meeting = {
    id: 0, opponent_team_id: teamId,
    goals_for: fieldInt(body, "goals_for", { min: 0, max: 30 }), goals_against: fieldInt(body, "goals_against", { min: 0, max: 30 }),
    played_on: fieldDate(body, "played_on"), is_home: fieldBool(body, "is_home"), note: fieldStr(body, "note", { max: 500, optional: true }),
    created_at: nowIso(),
  };
  requireTeam(store, teamId);
  m.id = nextId(store.user.meetings);
  store.user.meetings.push(m);
  store.touch();
  return new Created(teamNotes(store, teamId));
}

export function deleteMeeting(ctx: Ctx) {
  const { store } = ctx;
  const id = pathInt(ctx, "meeting_id");
  const idx = store.user.meetings.findIndex((m) => m.id === id);
  if (idx < 0) throw notFound("Không tìm thấy trận");
  const teamId = store.user.meetings[idx].opponent_team_id;
  store.user.meetings.splice(idx, 1);
  store.touch();
  return teamNotes(store, teamId);
}

export function getForm(ctx: Ctx) {
  const teamId = pathInt(ctx, "team_id");
  requireTeam(ctx.store, teamId);
  return { form: teamForm(ctx.store, teamId) };
}

export function addResult(ctx: Ctx) {
  const { store } = ctx;
  const teamId = pathInt(ctx, "team_id");
  const body = bodyObject(ctx);
  const gf = fieldInt(body, "goals_for", { min: 0, max: 30 }), ga = fieldInt(body, "goals_against", { min: 0, max: 30 });
  const opponentName = fieldStr(body, "opponent_name", { max: 80, optional: true });
  const playedOn = fieldDate(body, "played_on"), isHome = fieldBool(body, "is_home");
  requireTeam(store, teamId);
  const id = nextId(store.user.results);
  store.user.results.push({ id, team_id: teamId, opponent_name: opponentName, goals_for: gf, goals_against: ga, played_on: playedOn, is_home: isHome, created_at: nowIso() });
  store.touch();
  return new Created({ id, form: teamForm(store, teamId) });
}

export function deleteResult(ctx: Ctx) {
  const { store } = ctx;
  const id = pathInt(ctx, "result_id");
  const idx = store.user.results.findIndex((r) => r.id === id);
  if (idx < 0) throw notFound("Không tìm thấy kết quả");
  const teamId = store.user.results[idx].team_id;
  store.user.results.splice(idx, 1);
  store.touch();
  return { form: teamForm(store, teamId) };
}

