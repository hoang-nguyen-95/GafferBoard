"use client";

import { useState } from "react";
import { PlayerAutocomplete } from "@/components/PlayerAutocomplete";
import type { Ladder, OfferRow, OfferStatsRow, PriceAnalysis } from "@/lib/api";
import { useApi } from "@/lib/engine";
import { btnCls, Field, inputCls, money, primaryCls, send } from "./common";

const RESULT_LABEL = { accepted: "Chấp nhận", rejected: "Từ chối", counter: "Ra giá lại" } as const;
const KIND_LABEL = { fee: "Phí chuyển nhượng", wage: "Lương" } as const;

function LadderTable({ ladder }: { ladder: Ladder }) {
  return (
    <table className="w-full text-left text-sm">
      <tbody>
        {([["Mở giá", ladder.open], ["Mục tiêu chốt", ladder.target], ["Tối đa nên trả", ladder.walk]] as const).map(([label, amount]) => (
          <tr key={label} className="border-t border-zinc-200 dark:border-zinc-800">
            <td className="py-1.5 font-medium">{label}</td><td className="text-right font-semibold tabular-nums">{money(amount)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Stats({ s }: { s: OfferStatsRow }) {
  const total = s.accepted + s.rejected + s.counters;
  if (total === 0) return null;
  const pct = (x: number | null) => (x === null ? "–" : `${Math.round(x * 100)}%`);
  return (
    <p className="text-xs text-zinc-500">
      {KIND_LABEL[s.kind]}: {total} đề nghị đã ghi ({s.accepted} chấp nhận, {s.rejected} từ chối, {s.counters} ra giá lại).
      Thấp nhất được chấp nhận: {pct(s.lowestAcceptedRatio)} so với ước tính · cao nhất bị từ chối: {pct(s.highestRejectedRatio)}.
    </p>
  );
}

export function NegotiationTab({ playerId, onPlayer }: { playerId: number | null; onPlayer: (id: number) => void }) {
  const [askFee, setAskFee] = useState("");
  const [askWage, setAskWage] = useState("");
  const [obsValue, setObsValue] = useState("");
  const [obsWage, setObsWage] = useState("");
  const [kind, setKind] = useState<"fee" | "wage">("fee");
  const [amount, setAmount] = useState("");
  const [result, setResult] = useState<OfferRow["result"]>("rejected");
  const [counter, setCounter] = useState("");
  const [error, setError] = useState<string | null>(null);

  const params = new URLSearchParams();
  if (playerId !== null) params.set("player_id", String(playerId));
  if (Number(askFee) > 0) params.set("asking_fee", askFee);
  if (Number(askWage) > 0) params.set("asking_wage", askWage);
  const res = useApi<PriceAnalysis>(playerId !== null ? `/manager/pricing?${params}` : null);
  const a = res?.data ?? null;

  async function submit(path: string, body: unknown, after: () => void) {
    const r = await send("POST", path, body);
    if (!r.ok) {
      const detail = (r.json as { detail?: { msg?: string }[] | string } | null)?.detail;
      setError(typeof detail === "string" ? detail : detail?.[0]?.msg ?? "Không lưu được: kiểm tra số đã nhập.");
      return;
    }
    setError(null);
    after();
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-zinc-500">
        Khi game không cho biết giá hay lương, công cụ ước tính mức hợp lý để bạn khỏi đưa số bừa, rồi học từ chính các đề nghị bạn ghi lại. Chọn cầu thủ muốn mua; nếu thấy giá hay lương bên kia đòi thì nhập vào để so.
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-72">
          <Field label="Cầu thủ"><PlayerAutocomplete onSelect={(p) => onPlayer(p.player_id)} placeholder="Gõ tên cầu thủ…" /></Field>
        </div>
        <Field label="Giá bên bán đòi (nếu có)"><input type="number" min={1} value={askFee} onChange={(e) => setAskFee(e.target.value)} className={`w-40 ${inputCls}`} /></Field>
        <Field label="Lương cầu thủ đòi (nếu có)"><input type="number" min={1} value={askWage} onChange={(e) => setAskWage(e.target.value)} className={`w-40 ${inputCls}`} /></Field>
      </div>

      {playerId === null && <p className="text-sm text-zinc-500">Chọn một cầu thủ để xem mức giá và lương hợp lý.</p>}
      {res && !a && <p className="text-red-600">Không tính được: kiểm tra lại cầu thủ và số đã nhập.</p>}
      {a && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold">
            {a.player.name} <span className="text-sm font-normal text-zinc-500">({a.player.overall}/{a.player.potential ?? "?"} · {a.player.age ?? "?"} tuổi)</span>
          </h2>

          {a.verdicts.length > 0 && (
            <ul className="space-y-1 rounded border border-emerald-600/40 bg-emerald-500/5 p-3 text-sm">{a.verdicts.map((v) => <li key={v}>{v}</li>)}</ul>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            <section className="space-y-2 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800" aria-label="Phí chuyển nhượng">
              <h3 className="font-semibold">Phí chuyển nhượng hợp lý</h3>
              <p className="text-2xl font-bold tabular-nums">{money(a.value.estimate)}</p>
              <p className="text-xs text-zinc-500">
                {a.value.source === "game" ? "Số bạn đã nhập từ game cho cầu thủ này." : `Ước tính, dải thường gặp ${money(a.value.low)} – ${money(a.value.high)} (±${a.value.spread_percent}%).`}
                {a.value.source !== "game" && (a.value.calibrated ? ` Đã hiệu chỉnh bằng ${a.value.calibration_points} số từ game.` : " Chưa hiệu chỉnh: độ lệch lớn, hãy nhập vài giá trị bạn thấy trong game (khung bên dưới).")}
              </p>
              <LadderTable ladder={a.fee.ladder} />
              <p className="text-xs text-zinc-500">{a.fee.source === "history" ? "Bậc giá học từ các đề nghị được chấp nhận của bạn." : "Bậc giá mặc định (chưa đủ 3 lần được chấp nhận để học từ nhật ký)."}</p>
              <p className="rounded bg-zinc-50 p-2 text-sm dark:bg-zinc-900">{a.fee.next.text}</p>
            </section>

            <section className="space-y-2 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800" aria-label="Lương">
              <h3 className="font-semibold">Lương hợp lý khi vào đội bạn</h3>
              <p className="text-2xl font-bold tabular-nums">{money(a.wage.estimate)}</p>
              <p className="text-xs text-zinc-500">
                {a.wage.source === "game" ? "Số bạn đã nhập từ game cho cầu thủ này." : `Dải thường gặp ${money(a.wage.low)} – ${money(a.wage.high)} (±${a.wage.spread_percent}%).`}{" "}
                {a.wage.source === "club_fit" && `Tính từ thang lương của ${a.wage.points} hợp đồng trong đội bạn (độ khớp R² = ${a.wage.r2}).`}
                {a.wage.source === "default" && "Chưa đủ hợp đồng trong save để khớp thang lương đội bạn: đang dùng thang mặc định từ một save mẫu (ít đáng tin)."}
              </p>
              <LadderTable ladder={a.wage_offer.ladder} />
              <p className="rounded bg-zinc-50 p-2 text-sm dark:bg-zinc-900">{a.wage_offer.next.text}</p>
            </section>
          </div>

          <section className="space-y-3" aria-label="Ghi lại đề nghị">
            <h3 className="font-semibold">Ghi lại đề nghị bạn đã gửi</h3>
            <p className="text-xs text-zinc-500">Ghi số bạn đã đưa và kết quả. Sau 3 lần được chấp nhận, bậc giá chuyển sang học từ các lần đó; mỗi lần bị từ chối làm gợi ý bước tiếp theo sát hơn.</p>
            <div className="flex flex-wrap items-end gap-3">
              <Field label="Loại">
                <select value={kind} onChange={(e) => setKind(e.target.value as "fee" | "wage")} className={inputCls}>
                  <option value="fee">Phí chuyển nhượng</option><option value="wage">Lương</option>
                </select>
              </Field>
              <Field label="Số bạn đưa"><input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} className={`w-36 ${inputCls}`} /></Field>
              <Field label="Kết quả">
                <select value={result} onChange={(e) => setResult(e.target.value as OfferRow["result"])} className={inputCls}>
                  <option value="rejected">Bị từ chối</option><option value="accepted">Được chấp nhận</option><option value="counter">Bên kia ra giá lại</option>
                </select>
              </Field>
              {result === "counter" && <Field label="Giá bên kia ra lại"><input type="number" min={1} value={counter} onChange={(e) => setCounter(e.target.value)} className={`w-36 ${inputCls}`} /></Field>}
              <button type="button" className={primaryCls} disabled={!(Number(amount) > 0)}
                onClick={() => submit("/manager/offers", { player_id: a.player.player_id, kind, amount: Number(amount), result, counter: result === "counter" ? Number(counter) : null }, () => { setAmount(""); setCounter(""); })}>
                Ghi lại
              </button>
            </div>
            {a.offers.length > 0 && (
              <ul className="space-y-1 text-sm">
                {a.offers.map((o) => (
                  <li key={o.id} className="flex flex-wrap items-center gap-x-3">
                    <span>{KIND_LABEL[o.kind]} <b className="tabular-nums">{money(o.amount)}</b> → {RESULT_LABEL[o.result]}{o.counter !== null ? ` (${money(o.counter)})` : ""}</span>
                    {o.estimate ? <span className="text-xs text-zinc-500">= {Math.round((o.amount / o.estimate) * 100)}% ước tính lúc đó</span> : null}
                    <button type="button" className="text-xs text-zinc-500 underline" onClick={() => void send("DELETE", `/manager/offers/${o.id}`)}>Xóa</button>
                  </li>
                ))}
              </ul>
            )}
            <Stats s={a.stats.fee} />
            <Stats s={a.stats.wage} />
          </section>

          <section className="space-y-3" aria-label="Hiệu chỉnh bằng số trong game">
            <h3 className="font-semibold">Hiệu chỉnh bằng số bạn thấy trong game</h3>
            <p className="text-xs text-zinc-500">
              Nhập &ldquo;Giá trị&rdquo; hoặc lương bạn thấy ở màn cầu thủ trong game (cho cầu thủ này hoặc bất kỳ cầu thủ nào bạn mở được). Càng nhiều số, ước tính cho mọi cầu thủ càng sát: 3 số trở lên là có thể thu hẹp dải sai số.
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <Field label={`Giá trị trong game của ${a.player.name}`}><input type="number" min={1} value={obsValue} onChange={(e) => setObsValue(e.target.value)} className={`w-40 ${inputCls}`} /></Field>
              <Field label="Lương trong game"><input type="number" min={1} value={obsWage} onChange={(e) => setObsWage(e.target.value)} className={`w-32 ${inputCls}`} /></Field>
              <button type="button" className={btnCls} disabled={!(Number(obsValue) > 0 || Number(obsWage) > 0)}
                onClick={() => submit("/manager/observations", { player_id: a.player.player_id, value: Number(obsValue) > 0 ? Number(obsValue) : null, wage: Number(obsWage) > 0 ? Number(obsWage) : null }, () => { setObsValue(""); setObsWage(""); })}>
                Lưu số này
              </button>
            </div>
            {a.observations.length > 0 && (
              <ul className="space-y-1 text-sm">
                {a.observations.map((o) => (
                  <li key={o.id} className="flex flex-wrap items-center gap-x-3">
                    <span>{o.value !== null ? `Giá trị ${money(o.value)}` : ""}{o.value !== null && o.wage !== null ? " · " : ""}{o.wage !== null ? `Lương ${money(o.wage)}` : ""}</span>
                    <button type="button" className="text-xs text-zinc-500 underline" onClick={() => void send("DELETE", `/manager/observations/${o.id}`)}>Xóa</button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {error && <p className="text-sm text-red-600" role="alert">{error}</p>}

          <div>
            <h3 className="mb-1 font-medium">Yếu tố ảnh hưởng tới giá</h3>
            {a.fee.factors.length === 0 ? <p className="text-sm text-zinc-500">Không có yếu tố nổi bật: dùng bậc giá gốc.</p> : (
              <ul className="space-y-1 text-sm">
                {a.fee.factors.map((f) => (
                  <li key={f.text}><span className={f.effect === "buyer" ? "text-emerald-600" : "text-amber-600"}>{f.effect === "buyer" ? "Có lợi cho bạn" : "Có lợi cho bên bán"}</span> ({f.adjust > 0 ? "+" : ""}{Math.round(f.adjust * 100)}%): {f.text}</li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h3 className="mb-1 font-medium">Lời khuyên</h3>
            <ul className="list-disc space-y-1 pl-5 text-sm">{a.tips.map((t) => <li key={t}>{t}</li>)}</ul>
          </div>
          <p className="text-xs text-zinc-500">{a.disclaimer}</p>
        </div>
      )}
    </div>
  );
}
