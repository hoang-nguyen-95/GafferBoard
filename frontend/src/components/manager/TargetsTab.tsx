"use client";

import Link from "next/link";
import { useState } from "react";
import { type ManagerTarget, type ManagerTargets } from "@/lib/api";
import { useApi } from "@/lib/engine";
import { playerHref } from "@/lib/routes";
import { Field, btnCls, contractText, inputCls, send } from "./common";

const ROLES: [string, string][] = [
  ["GK", "Thủ môn"], ["CB", "Trung vệ"], ["FB", "Hậu vệ biên"], ["DM", "Tiền vệ phòng ngự"], ["CM", "Tiền vệ trung tâm"],
  ["WM", "Tiền vệ cánh"], ["AM", "Tiền vệ tấn công"], ["W", "Tiền đạo cánh"], ["ST", "Tiền đạo cắm"],
];

export function TargetsTab({ role, onRole, onNegotiate }: { role: string; onRole: (r: string) => void; onNegotiate: (id: number) => void }) {
  const [maxAge, setMaxAge] = useState("");
  const [minOvr, setMinOvr] = useState("");
  const [maxSeasons, setMaxSeasons] = useState("");
  const [added, setAdded] = useState<Set<number>>(new Set());
  const params = new URLSearchParams({ role, limit: "40" });
  if (maxAge) params.set("max_age", maxAge);
  if (minOvr) params.set("min_overall", minOvr);
  if (maxSeasons) params.set("max_seasons", maxSeasons);
  const res = useApi<ManagerTargets>(`/manager/targets?${params}`);

  async function addToShortlist(t: ManagerTarget) {
    const r = await send("PUT", `/manager/shortlist/${t.player_id}`, { status: "target" });
    if (r.ok) setAdded((s) => new Set(s).add(t.player_id));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Vị trí cần mua">
          <select value={role} onChange={(e) => onRole(e.target.value)} className={inputCls}>
            {ROLES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </Field>
        <Field label="Tuổi tối đa"><input type="number" min={14} max={60} value={maxAge} onChange={(e) => setMaxAge(e.target.value)} className={`w-24 ${inputCls}`} /></Field>
        <Field label="OVR tối thiểu" hint="Trống = hơn người đá chính yếu nhất">
          <input type="number" min={1} max={99} value={minOvr} onChange={(e) => setMinOvr(e.target.value)} className={`w-24 ${inputCls}`} />
        </Field>
        <Field label="Số mùa hợp đồng tối đa" hint="1 = hết cuối mùa này">
          <input type="number" min={0} max={10} value={maxSeasons} onChange={(e) => setMaxSeasons(e.target.value)} className={`w-24 ${inputCls}`} />
        </Field>
      </div>

      {!res ? <p className="text-zinc-500">Đang tìm…</p> : !res.data ? (
        <p className="text-red-600">Không tìm được: kiểm tra bộ lọc hoặc chọn đội của bạn ở trang chủ.</p>
      ) : (
        <>
          <p className="text-sm text-zinc-500">
            {res.data.total_matches} cầu thủ {res.data.role_label.toLowerCase()} đáng cân nhắc (OVR từ {res.data.min_overall}; người đá chính yếu nhất của bạn
            là {res.data.baseline_overall}). Hiển thị {res.data.items.length} người điểm cao nhất.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-zinc-500">
                <tr><th className="py-1">Cầu thủ</th><th>OVR</th><th>POT</th><th>Tuổi</th><th>Hợp đồng</th><th>CLB</th><th className="text-right">Điểm</th><th /></tr>
              </thead>
              <tbody>
                {res.data.items.map((t) => (
                  <tr key={t.player_id} className="border-t border-zinc-200 align-top dark:border-zinc-800">
                    <td className="py-1.5">
                      <Link href={playerHref(t.player_id)} className="font-medium hover:underline">{t.name}</Link>
                      {t.flags.length > 0 && <span className="block text-xs text-amber-600">{t.flags.join(" · ")}</span>}
                      <details className="text-xs text-zinc-500">
                        <summary className="cursor-pointer">Vì sao điểm này</summary>
                        <ul className="mt-1 space-y-0.5">
                          {t.breakdown.map((b) => <li key={b.key}>{b.label}: {b.value} → {b.points} điểm</li>)}
                        </ul>
                      </details>
                    </td>
                    <td className="tabular-nums">{t.overall} <span className="text-xs text-emerald-600">{t.upgrade > 0 ? `+${t.upgrade}` : t.upgrade}</span></td>
                    <td className="tabular-nums">{t.potential ?? "–"}</td>
                    <td>{t.age ?? "–"}</td>
                    <td>{contractText(t.seasons_left, t.contract_until)}</td>
                    <td className="text-xs text-zinc-500">{t.club?.name ?? "–"}</td>
                    <td className="text-right font-semibold tabular-nums">{t.score}</td>
                    <td className="space-x-1 whitespace-nowrap text-right">
                      <button type="button" disabled={added.has(t.player_id)} onClick={() => addToShortlist(t)} className={btnCls}>{added.has(t.player_id) ? "Đã thêm" : "+ Shortlist"}</button>
                      <button type="button" onClick={() => onNegotiate(t.player_id)} className={btnCls}>Đàm phán</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-zinc-500">
            Điểm = nâng cấp × 3 + tiềm năng còn lại (đến 23 tuổi) × 1,5 + số mùa còn trong độ tuổi đỉnh cao + 4 nếu hợp đồng sắp hết. Đây là hệ số kinh nghiệm,
            không phải giá trị thật của game; giá phải xem trong màn chuyển nhượng.
          </p>
        </>
      )}
    </div>
  );
}
