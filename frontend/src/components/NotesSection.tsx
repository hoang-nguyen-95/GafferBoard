"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { NotesData } from "@/lib/api";

export function NotesSection({ teamId, teamName, data }: { teamId: number; teamName: string; data: NotesData }) {
  const router = useRouter();
  const [text, setText] = useState(data.note?.text ?? "");
  const [status, setStatus] = useState<string | null>(null);
  const [gf, setGf] = useState("");
  const [ga, setGa] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function call(url: string, init: RequestInit): Promise<boolean> {
    setBusy(true);
    try {
      const res = await fetch(url, init);
      if (!res.ok) throw new Error(res.status === 422 ? "Dữ liệu không hợp lệ." : `Lỗi ${res.status}`);
      router.refresh();
      return true;
    } catch (e) {
      setStatus((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function saveNote() {
    setStatus(null);
    if (await call(`/api/teams/${teamId}/note`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) })) {
      setStatus("Đã lưu.");
    }
  }

  async function addMeeting(e: React.FormEvent) {
    e.preventDefault();
    const ok = await call(`/api/teams/${teamId}/meetings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goals_for: Number(gf), goals_against: Number(ga), note: note.trim() || null, played_on: new Date().toISOString().slice(0, 10) }),
    });
    if (ok) {
      setGf("");
      setGa("");
      setNote("");
    }
  }

  const s = data.summary;
  const input = "rounded border border-zinc-300 bg-transparent px-2 py-1 text-sm text-current dark:border-zinc-700";
  return (
    <section className="mt-10 grid gap-8 md:grid-cols-2">
      <div>
        <h2 className="mb-2 font-semibold">Ghi chú cá nhân về {teamName}</h2>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} maxLength={5000} placeholder="vd: hay đá phạt góc ngắn, tiền đạo số 9 hay lùi sâu…" className={`w-full ${input}`} />
        <div className="mt-2 flex items-center gap-3 text-sm">
          <button onClick={saveNote} disabled={busy} className="rounded bg-emerald-600 px-3 py-1.5 text-white hover:bg-emerald-700 disabled:opacity-50">
            Lưu ghi chú
          </button>
          {status && <span className="text-zinc-500">{status}</span>}
        </div>
      </div>

      <div>
        <h2 className="mb-2 font-semibold">Lịch sử các trận gặp</h2>
        {s.played > 0 ? (
          <p className="mb-2 text-sm">
            {s.played} trận: {s.wins} thắng, {s.draws} hòa, {s.losses} thua (bàn thắng {s.goals_for}, bàn thua {s.goals_against}).
          </p>
        ) : (
          <p className="mb-2 text-sm text-zinc-500">Chưa ghi nhận trận nào.</p>
        )}
        <ul className="mb-3 space-y-1 text-sm">
          {data.meetings.map((m) => (
            <li key={m.id} className="flex items-center gap-3">
              <span className="w-12 font-semibold tabular-nums">
                {m.goals_for}–{m.goals_against}
              </span>
              <span className="text-zinc-500">
                {m.played_on ?? "không rõ ngày"}
                {m.note ? ` · ${m.note}` : ""}
              </span>
              <button disabled={busy} onClick={() => call(`/api/meetings/${m.id}`, { method: "DELETE" })} className="ml-auto text-xs text-red-600 hover:underline">
                Xóa
              </button>
            </li>
          ))}
        </ul>
        <form onSubmit={addMeeting} className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col text-xs text-zinc-500">
            Bàn thắng của bạn
            <input type="number" min={0} max={30} required value={gf} onChange={(e) => setGf(e.target.value)} className={`w-20 ${input}`} />
          </label>
          <label className="flex flex-col text-xs text-zinc-500">
            Bàn thua
            <input type="number" min={0} max={30} required value={ga} onChange={(e) => setGa(e.target.value)} className={`w-20 ${input}`} />
          </label>
          <label className="flex flex-col text-xs text-zinc-500">
            Ghi chú
            <input value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} className={`w-40 ${input}`} />
          </label>
          <button disabled={busy} className="rounded border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-900">
            Thêm trận
          </button>
        </form>
      </div>
    </section>
  );
}
