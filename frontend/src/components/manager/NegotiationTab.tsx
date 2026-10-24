"use client";

import { useState } from "react";
import { PlayerAutocomplete } from "@/components/PlayerAutocomplete";
import type { NegotiationPlan } from "@/lib/api";
import { useApi } from "@/lib/engine";
import { Field, inputCls, money } from "./common";

export function NegotiationTab({ playerId, onPlayer }: { playerId: number | null; onPlayer: (id: number) => void }) {
  const [value, setValue] = useState("");
  const [asking, setAsking] = useState("");
  const params = new URLSearchParams();
  if (playerId !== null) params.set("player_id", String(playerId));
  if (Number(value) > 0) params.set("value", value);
  if (Number(asking) > 0) params.set("asking", asking);
  const ready = playerId !== null && Number(value) > 0;
  const res = useApi<NegotiationPlan>(ready ? `/manager/negotiation?${params}` : null);
  const plan = res?.data ?? null;

  return (
    <div className="space-y-5">
      <p className="text-sm text-zinc-500">
        Chọn cầu thủ muốn mua, nhập &ldquo;Giá trị&rdquo; bạn thấy trong game và (nếu có) giá bên bán đòi. Công cụ đưa ra bậc giá nên mở, nên chốt và nên dừng, cùng lý do.
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-72">
          <Field label="Cầu thủ"><PlayerAutocomplete onSelect={(p) => onPlayer(p.player_id)} placeholder="Gõ tên cầu thủ…" /></Field>
        </div>
        <Field label="Giá trị hiển thị trong game"><input type="number" min={1} value={value} onChange={(e) => setValue(e.target.value)} className={`w-40 ${inputCls}`} /></Field>
        <Field label="Giá bên bán đòi (tùy chọn)"><input type="number" min={1} value={asking} onChange={(e) => setAsking(e.target.value)} className={`w-40 ${inputCls}`} /></Field>
      </div>

      {playerId !== null && !ready && <p className="text-sm text-zinc-500">Nhập giá trị cầu thủ để xem gợi ý.</p>}
      {res && !plan && <p className="text-red-600">Không tính được: kiểm tra lại cầu thủ và số đã nhập.</p>}
      {plan && (
        <div className="space-y-5">
          <h2 className="text-lg font-semibold">{plan.player.name} <span className="text-sm font-normal text-zinc-500">({plan.player.overall}/{plan.player.potential ?? "?"})</span></h2>
          <table className="w-full max-w-xl text-left text-sm">
            <thead className="text-xs text-zinc-500"><tr><th className="py-1">Bước</th><th>% giá trị</th><th className="text-right">Số tiền</th></tr></thead>
            <tbody>
              {plan.ladder.map((l) => (
                <tr key={l.step} className="border-t border-zinc-200 dark:border-zinc-800">
                  <td className="py-1.5 font-medium">{l.step}</td><td>{Math.round(l.percent_of_value * 100)}%</td><td className="text-right font-semibold tabular-nums">{money(l.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {plan.verdict && <p className="rounded border border-emerald-600/40 bg-emerald-500/5 p-3 text-sm">{plan.verdict}</p>}
          <div>
            <h3 className="mb-1 font-medium">Yếu tố ảnh hưởng tới giá</h3>
            {plan.factors.length === 0 ? <p className="text-sm text-zinc-500">Không có yếu tố nổi bật: dùng bậc giá gốc.</p> : (
              <ul className="space-y-1 text-sm">
                {plan.factors.map((f) => (
                  <li key={f.text}><span className={f.effect === "buyer" ? "text-emerald-600" : "text-amber-600"}>{f.effect === "buyer" ? "Có lợi cho bạn" : "Có lợi cho bên bán"}</span> ({f.adjust > 0 ? "+" : ""}{Math.round(f.adjust * 100)}%): {f.text}</li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h3 className="mb-1 font-medium">Lời khuyên</h3>
            <ul className="list-disc space-y-1 pl-5 text-sm">{plan.tips.map((t) => <li key={t}>{t}</li>)}</ul>
          </div>
          <p className="text-xs text-zinc-500">{plan.disclaimer}</p>
        </div>
      )}
    </div>
  );
}
