"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { FormationOption, PlayerSummary } from "@/lib/api";
import { PITCH_COORDS, POSITION_NAMES, remapPlayers } from "@/lib/positions";
import { PlayerAutocomplete } from "./PlayerAutocomplete";
import { manualHref } from "@/lib/routes";

type Props = {
  formations: FormationOption[];
  initial?: { id: number; name: string; formationId: number; players: (PlayerSummary | null)[] };
};

export function ManualBuilder({ formations, initial }: Props) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [formationId, setFormationId] = useState(initial?.formationId ?? formations.find((f) => f.name === "4-3-3")?.id ?? formations[0]?.id);
  const formation = useMemo(() => formations.find((f) => f.id === formationId), [formations, formationId]);
  const [players, setPlayers] = useState<(PlayerSummary | null)[]>(initial?.players ?? Array(11).fill(null));
  const [active, setActive] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!formation) return <p className="text-amber-600">Chưa có dữ liệu sơ đồ. Hãy nhập dữ liệu xuất từ game (cần file formations).</p>;
  const codes = formation.position_codes;

  function changeFormation(id: number) {
    const next = formations.find((f) => f.id === id);
    if (!next || !formation) return;
    const kept = remapPlayers(formation.position_codes, players, next.position_codes);
    const dropped = players.filter((p) => p && !kept.includes(p)).length;
    setPlayers(kept);
    setFormationId(id);
    setActive(0);
    setError(dropped > 0 ? `${dropped} cầu thủ không còn vị trí phù hợp ở sơ đồ mới nên đã bị bỏ khỏi đội hình.` : null);
  }

  function pick(player: PlayerSummary) {
    const next = players.slice();
    const existing = next.findIndex((p) => p?.player_id === player.player_id);
    if (existing >= 0 && existing !== active) next[existing] = null; // một cầu thủ chỉ đứng một vị trí
    next[active] = player;
    setPlayers(next);
    setError(null);
    const empty = next.findIndex((p, i) => p === null && i !== active);
    setActive(empty >= 0 ? empty : active);
  }

  async function save() {
    if (!players.some(Boolean)) return setError("Chọn ít nhất một cầu thủ.");
    if (!name.trim()) return setError("Đặt tên cho đội hình (vd tên đội đối thủ).");
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(initial ? `/api/manual-lineups/${initial.id}` : "/api/manual-lineups", {
        method: initial ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), formation_id: formation!.id, player_ids: players.map((p) => p?.player_id ?? null) }),
      });
      if (!res.ok) {
        const detail = (await res.json().catch(() => null))?.detail;
        throw new Error(typeof detail === "string" ? detail : `Không lưu được (${res.status}).`);
      }
      const saved = await res.json();
      router.push(manualHref(saved.id));
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  const filled = players.filter(Boolean).length;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-4 text-sm">
        <label className="flex flex-col text-xs text-zinc-500">
          Tên đội hình
          <input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder="vd Real Madrid"
            className="w-56 rounded border border-zinc-300 bg-transparent px-3 py-1.5 text-sm text-current dark:border-zinc-700" />
        </label>
        <label className="flex flex-col text-xs text-zinc-500">
          Sơ đồ
          <select value={formation.id} onChange={(e) => changeFormation(Number(e.target.value))}
            className="rounded border border-zinc-300 bg-transparent px-2 py-1.5 text-sm text-current dark:border-zinc-700">
            {formations.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} ({f.positions.slice(1).join(" ")})
              </option>
            ))}
          </select>
        </label>
        <p className="text-xs text-zinc-500">{filled}/11 vị trí đã có cầu thủ</p>
      </div>

      <div className="grid gap-6 md:grid-cols-[minmax(0,28rem)_1fr]">
        <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg border border-emerald-900/40 bg-emerald-700">
          <div className="absolute inset-x-0 top-1/2 border-t border-white/40" />
          <div className="absolute inset-x-[22%] top-0 h-[14%] border-x border-b border-white/40" />
          <div className="absolute inset-x-[22%] bottom-0 h-[14%] border-x border-t border-white/40" />
          {codes.map((code, i) => {
            const [x, y] = PITCH_COORDS[code] ?? [50, 50];
            const p = players[i];
            return (
              <button
                key={i}
                type="button"
                onClick={() => setActive(i)}
                className="absolute flex w-20 -translate-x-1/2 -translate-y-1/2 flex-col items-center text-center"
                style={{ left: `${x}%`, top: `${y}%` }}
                aria-label={`Vị trí ${POSITION_NAMES[code] ?? code}${p ? `: ${p.name}` : ", trống"}`}
              >
                <span className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-semibold ${
                  i === active ? "border-amber-300 ring-2 ring-amber-300" : "border-white"
                } ${p ? "bg-white text-black" : "bg-white/20 text-white"}`}>
                  {p ? p.overall : "+"}
                </span>
                {p && <span className="mt-0.5 max-w-full truncate rounded bg-black/55 px-1 text-[11px] text-white">{p.jersey_name ?? p.name}</span>}
                <span className="text-[10px] text-white/80">{POSITION_NAMES[code] ?? code}</span>
              </button>
            );
          })}
        </div>

        <div className="space-y-3 text-sm">
          <p>
            Đang chọn vị trí <b>{POSITION_NAMES[codes[active]] ?? "?"}</b>
            {players[active] ? <> — hiện là <b>{players[active]!.name}</b></> : " — chưa có cầu thủ"}. Gõ tên để tìm:
          </p>
          <PlayerAutocomplete key={`${formation.id}-${active}`} autoFocus onSelect={pick} placeholder="Gõ tên cầu thủ (ít nhất 2 ký tự)…" />
          <button type="button" disabled={!players[active]} onClick={() => setPlayers(players.map((p, i) => (i === active ? null : p)))}
            className="rounded border border-zinc-300 px-3 py-1 text-xs hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-900">
            Xóa cầu thủ ở vị trí này
          </button>
          <ul className="space-y-0.5 text-xs text-zinc-600 dark:text-zinc-400">
            {codes.map((code, i) => (
              <li key={i} className={i === active ? "font-semibold text-current" : ""}>
                <button type="button" onClick={() => setActive(i)} className="text-left">
                  <span className="inline-block w-10">{POSITION_NAMES[code] ?? code}</span>
                  {players[i] ? `${players[i]!.name} (${players[i]!.overall})` : "—"}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="button" onClick={save} disabled={busy}
        className="rounded bg-emerald-600 px-5 py-2 text-sm text-white hover:bg-emerald-700 disabled:opacity-50">
        {initial ? "Lưu thay đổi và phân tích" : "Lưu và phân tích"}
      </button>
    </div>
  );
}
