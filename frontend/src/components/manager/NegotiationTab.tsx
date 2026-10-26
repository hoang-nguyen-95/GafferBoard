"use client";

import { useState } from "react";
import { PlayerAutocomplete } from "@/components/PlayerAutocomplete";
import type { Ladder, OfferRow, OfferStatsRow, PackageEvaluation, PackagesResponse, PriceAnalysis } from "@/lib/api";
import { useApi } from "@/lib/engine";
import { parseMoney } from "@/lib/money";
import { btnCls, Field, inputCls, MoneyInput, money, send } from "./common";

const RESULT_LABEL = { accepted: "Chấp nhận", rejected: "Từ chối", counter: "Ra giá lại" } as const;
const KIND_LABEL = { fee: "Phí chuyển nhượng", wage: "Lương" } as const;
const VERDICT = {
  likely: { text: "Dễ được chấp nhận", cls: "text-emerald-700 dark:text-emerald-400" },
  possible: { text: "Có thể được chấp nhận", cls: "text-amber-600" },
  unlikely: { text: "Khó được chấp nhận", cls: "text-rose-600" },
  below_open: { text: "Thấp hơn cả mức mở giá: gần như chắc bị từ chối", cls: "text-rose-700" },
} as const;

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

type Builder = { fee: string; addons: string; signOn: string; sellOn: string; swap: number[] };
const EMPTY_BUILDER: Builder = { fee: "", addons: "", signOn: "", sellOn: "", swap: [] };

function PackageBreakdown({ ev }: { ev: PackageEvaluation }) {
  const v = VERDICT[ev.verdict];
  return (
    <div className="space-y-2 rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-800">
      <p><span className={`font-semibold ${v.cls}`}>{v.text}</span> · giá trị gói theo bên bán <b className="tabular-nums">{money(ev.perceived.total)}</b> = {Math.round(ev.perceived.ratio_to_target * 100)}% mức mục tiêu ({money(ev.ladder.target)})</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-xs font-medium text-zinc-500">Bên bán tính</p>
          <ul className="text-xs">
            <li>Tiền mặt: {money(ev.perceived.cash)}</li>
            {ev.perceived.swaps.map((s) => <li key={s.player_id}>Trao đổi {s.name}: {money(s.credit)} <span className="text-zinc-500">(giá trị {money(s.value)} × {Math.round(ev.weights.swap_credit * 100)}%)</span></li>)}
            {ev.perceived.addons > 0 && <li>Tiền thưởng: {money(ev.perceived.addons)} <span className="text-zinc-500">({Math.round(ev.weights.addon * 100)}% mệnh giá)</span></li>}
            {ev.perceived.sell_on > 0 && <li>Chia lại khi bán: {money(ev.perceived.sell_on)} <span className="text-zinc-500">(giá bán lại kỳ vọng ~{money(ev.resale_estimate)})</span></li>}
          </ul>
        </div>
        <div>
          <p className="text-xs font-medium text-zinc-500">Bạn tốn thực tế (kỳ vọng)</p>
          <ul className="text-xs">
            <li>Tiền mặt: {money(ev.cost.cash)}</li>
            {ev.cost.swap_value_given > 0 && <li>Giá trị cầu thủ đưa đi: {money(ev.cost.swap_value_given)} · giải phóng lương {money(ev.cost.wage_freed)}</li>}
            {ev.cost.addons_expected > 0 && <li>Thưởng kỳ vọng: {money(ev.cost.addons_expected)}</li>}
            {ev.cost.sell_on_expected > 0 && <li>Chia lại kỳ vọng: {money(ev.cost.sell_on_expected)}</li>}
            {ev.cost.sign_on > 0 && <li>Tiền ký: {money(ev.cost.sign_on)}</li>}
            <li className="font-medium">Tổng: {money(ev.cost.total)}</li>
          </ul>
        </div>
      </div>
      {ev.notes.length > 0 && <ul className="list-disc space-y-0.5 pl-5 text-xs text-zinc-600 dark:text-zinc-400">{ev.notes.map((n) => <li key={n}>{n}</li>)}</ul>}
    </div>
  );
}

export function NegotiationTab({ playerId, onPlayer }: { playerId: number | null; onPlayer: (id: number) => void }) {
  const [askFee, setAskFee] = useState("");
  const [askWage, setAskWage] = useState("");
  const [obsValue, setObsValue] = useState("");
  const [obsWage, setObsWage] = useState("");
  const [kind, setKind] = useState<"fee" | "wage">("fee");
  const [amount, setAmount] = useState("");
  const [counter, setCounter] = useState("");
  const [askCounter, setAskCounter] = useState(false);
  const [b, setB] = useState<Builder>(EMPTY_BUILDER);
  const [error, setError] = useState<string | null>(null);

  const params = new URLSearchParams();
  if (playerId !== null) params.set("player_id", String(playerId));
  const fee = parseMoney(askFee), wage = parseMoney(askWage);
  if (fee) params.set("asking_fee", String(fee));
  if (wage) params.set("asking_wage", String(wage));
  const res = useApi<PriceAnalysis>(playerId !== null ? `/manager/pricing?${params}` : null);
  const a = res?.data ?? null;

  const pkgParams = new URLSearchParams();
  if (playerId !== null) pkgParams.set("player_id", String(playerId));
  const pkgCash = parseMoney(b.fee), pkgAddons = parseMoney(b.addons), pkgSignOn = parseMoney(b.signOn), pkgSellOn = Number(b.sellOn.replace(",", ".")) || 0;
  const hasPackage = b.fee.trim() !== "" || b.swap.length > 0 || pkgAddons || pkgSellOn;
  if (hasPackage) {
    pkgParams.set("fee", String(pkgCash ?? 0));
    if (b.swap.length) pkgParams.set("swap", b.swap.join(","));
    if (pkgAddons) pkgParams.set("addons", String(pkgAddons));
    if (pkgSignOn) pkgParams.set("sign_on", String(pkgSignOn));
    if (pkgSellOn > 0 && pkgSellOn <= 50) pkgParams.set("sell_on", String(pkgSellOn));
  }
  const pkg = useApi<PackagesResponse>(playerId !== null ? `/manager/packages?${pkgParams}` : null)?.data ?? null;

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

  // Ghi nhanh một đề nghị đơn giản: số để trống thì dùng luôn số gợi ý bước tiếp theo.
  const suggested = a ? (kind === "fee" ? a.fee.next.amount : a.wage_offer.next.amount) : null;
  const typedAmount = parseMoney(amount);
  const logAmount = typedAmount ?? suggested;
  function logSimple(result: OfferRow["result"]) {
    if (!a || !logAmount) return;
    const c = parseMoney(counter);
    if (result === "counter" && !c) { setAskCounter(true); return; }
    void submit("/manager/offers", { player_id: a.player.player_id, kind, amount: logAmount, result, counter: result === "counter" ? c : null }, () => { setAmount(""); setCounter(""); setAskCounter(false); });
  }
  function logPackage(ev: PackageEvaluation, result: OfferRow["result"]) {
    void submit("/manager/offers", {
      player_id: ev.target.player_id, kind: "fee", amount: ev.perceived.total, result, counter: null,
      package: { cash: ev.cost.cash, swap_ids: ev.perceived.swaps.map((s) => s.player_id), addons: pkgAddons ?? 0, sell_on_percent: pkgSellOn, sign_on: ev.cost.sign_on },
    }, () => undefined);
  }
  const toggleSwap = (id: number) => setB((x) => ({ ...x, swap: x.swap.includes(id) ? x.swap.filter((s) => s !== id) : x.swap.length >= 3 ? x.swap : [...x.swap, id] }));

  return (
    <div className="space-y-6">
      <p className="text-sm text-zinc-500">
        Khi game không cho biết giá hay lương, công cụ ước tính mức hợp lý để bạn khỏi đưa số bừa, rồi học từ các đề nghị bạn ghi lại. Tiền nhập kiểu <code>35m</code>, <code>1,2 tỷ</code>, <code>500k</code> đều được.
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-72">
          <Field label="Cầu thủ"><PlayerAutocomplete onSelect={(p) => { onPlayer(p.player_id); setB(EMPTY_BUILDER); }} placeholder="Gõ tên cầu thủ…" /></Field>
        </div>
        <MoneyInput label="Giá bên bán đòi (nếu có)" value={askFee} onChange={setAskFee} />
        <MoneyInput label="Lương cầu thủ đòi (nếu có)" value={askWage} onChange={setAskWage} />
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

          <section className="space-y-3" aria-label="Gói đề nghị">
            <h3 className="font-semibold">Gói đề nghị: trao đổi cầu thủ, tiền thưởng, % chia lại khi bán</h3>
            <p className="text-xs text-zinc-500">
              Thay vì chỉ trả tiền mặt, bạn có thể đưa thêm cầu thủ, thưởng theo chỉ tiêu hoặc chia một phần khi bán lại. Công cụ quy mọi thành phần về giá trị bên bán thấy (so với mức mục tiêu) và chi phí thực của bạn.
              Cách bên bán tính từng thành phần là hệ số kinh nghiệm, chưa kiểm chứng với game.
            </p>
            {pkg && pkg.options.length > 0 && (
              <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
                <table className="w-full min-w-max text-sm">
                  <thead className="bg-zinc-50 text-left text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
                    <tr><th className="px-3 py-2">Gói gợi ý tự động</th><th className="px-3 py-2 text-right">Tiền mặt</th><th className="px-3 py-2 text-right">Bạn tốn thực tế</th><th className="px-3 py-2" /></tr>
                  </thead>
                  <tbody>
                    {pkg.options.map((o) => (
                      <tr key={o.label} className="border-t border-zinc-100 align-top dark:border-zinc-800/70">
                        <td className="px-3 py-2"><span className="font-medium">{o.label}</span><div className="text-xs text-zinc-500">{o.why}</div></td>
                        <td className="px-3 py-2 text-right tabular-nums">{money(o.input.cash)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{money(o.evaluation.cost.total)}</td>
                        <td className="px-3 py-2">
                          <button type="button" className={btnCls} onClick={() => setB({ fee: String(o.input.cash), addons: o.input.addons ? String(o.input.addons) : "", signOn: o.input.signOn ? String(o.input.signOn) : "", sellOn: o.input.sellOnPercent ? String(o.input.sellOnPercent) : "", swap: o.input.swapIds })}>Dùng gói này</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex flex-wrap items-end gap-3">
              <MoneyInput label="Tiền mặt" value={b.fee} onChange={(v) => setB((x) => ({ ...x, fee: v }))} />
              <MoneyInput label="Tiền thưởng (mệnh giá)" value={b.addons} onChange={(v) => setB((x) => ({ ...x, addons: v }))} width="w-36" />
              <Field label="% chia lại khi bán" hint="0 – 50">
                <input type="number" min={0} max={50} value={b.sellOn} onChange={(e) => setB((x) => ({ ...x, sellOn: e.target.value }))} className={`w-24 ${inputCls}`} />
                <span className="mt-0.5 text-[11px]">&nbsp;</span>
              </Field>
              <MoneyInput label="Tiền ký cho cầu thủ" value={b.signOn} onChange={(v) => setB((x) => ({ ...x, signOn: v }))} width="w-36" />
              {hasPackage && <button type="button" className={btnCls} onClick={() => setB(EMPTY_BUILDER)}>Xóa gói</button>}
            </div>

            {pkg && pkg.squad.length > 0 && (
              <details className="rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-800" open={b.swap.length > 0}>
                <summary className="cursor-pointer font-medium">Cầu thủ đưa vào trao đổi (chọn tối đa 3){b.swap.length > 0 ? `: đã chọn ${b.swap.length}` : ""}</summary>
                <p className="mt-1 text-xs text-zinc-500">Xếp người không đá chính lên trước. Giá trị là ước tính (hoặc số bạn đã nhập).</p>
                <ul className="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-2">
                  {pkg.squad.slice(0, 24).map((c) => (
                    <li key={c.player_id}>
                      <label className="flex cursor-pointer items-center gap-2">
                        <input type="checkbox" checked={b.swap.includes(c.player_id)} onChange={() => toggleSwap(c.player_id)} disabled={!b.swap.includes(c.player_id) && b.swap.length >= 3} />
                        <span className="flex-1 truncate">{c.name} <span className="text-xs text-zinc-500">{c.overall} · {c.age ?? "?"}t{c.in_xi ? " · đá chính" : ""}</span></span>
                        <span className="text-xs tabular-nums text-zinc-500">{money(c.value)}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </details>
            )}

            {pkg?.evaluation && (
              <div className="space-y-2">
                <PackageBreakdown ev={pkg.evaluation} />
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-xs text-zinc-500">Bạn đã gửi gói này và kết quả là:</span>
                  <button type="button" className={btnCls} onClick={() => logPackage(pkg.evaluation!, "rejected")}>Bị từ chối</button>
                  <button type="button" className={btnCls} onClick={() => logPackage(pkg.evaluation!, "accepted")}>Được chấp nhận</button>
                </div>
              </div>
            )}
          </section>

          <section className="space-y-3" aria-label="Ghi lại đề nghị">
            <h3 className="font-semibold">Ghi lại đề nghị bạn đã gửi</h3>
            <p className="text-xs text-zinc-500">Để trống số tiền thì dùng luôn số gợi ý bên trên; chỉ cần bấm kết quả. Sau 3 lần được chấp nhận, bậc giá chuyển sang học từ các lần đó.</p>
            <div className="flex flex-wrap items-end gap-3">
              <Field label="Loại">
                <select value={kind} onChange={(e) => setKind(e.target.value as "fee" | "wage")} className={inputCls}>
                  <option value="fee">Phí chuyển nhượng</option><option value="wage">Lương</option>
                </select>
              </Field>
              <MoneyInput label="Số bạn đưa" value={amount} onChange={setAmount} width="w-36" placeholder={suggested ? money(suggested) : "vd 35m"} />
              {askCounter && <MoneyInput label="Giá bên kia ra lại" value={counter} onChange={setCounter} width="w-36" />}
              <button type="button" className={btnCls} disabled={!logAmount} onClick={() => logSimple("rejected")}>Bị từ chối</button>
              <button type="button" className={btnCls} disabled={!logAmount} onClick={() => logSimple("accepted")}>Được chấp nhận</button>
              <button type="button" className={btnCls} disabled={!logAmount} onClick={() => logSimple("counter")}>{askCounter ? "Ghi giá ra lại" : "Bên kia ra giá lại"}</button>
            </div>
            {a.offers.length > 0 && (
              <ul className="space-y-1 text-sm">
                {a.offers.map((o) => (
                  <li key={o.id} className="flex flex-wrap items-center gap-x-3">
                    <span>{KIND_LABEL[o.kind]} <b className="tabular-nums">{money(o.amount)}</b>{o.package ? " (gói)" : ""} → {RESULT_LABEL[o.result]}{o.counter !== null ? ` (${money(o.counter)})` : ""}</span>
                    {o.package && <span className="text-xs text-zinc-500">tiền mặt {money(o.package.cash)}{o.package.swap_ids.length ? ` + ${o.package.swap_ids.length} cầu thủ` : ""}{o.package.addons ? ` + thưởng ${money(o.package.addons)}` : ""}{o.package.sell_on_percent ? ` + ${o.package.sell_on_percent}% bán lại` : ""}</span>}
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
              Nhập &ldquo;Giá trị&rdquo; hoặc lương bạn thấy ở màn cầu thủ trong game (cho cầu thủ này hoặc bất kỳ cầu thủ nào bạn mở được). 3 số trở lên là đủ để thu hẹp dải sai số; lương trong đội bạn đã được tính tự động từ save nên không cần nhập.
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <MoneyInput label={`Giá trị trong game của ${a.player.name}`} value={obsValue} onChange={setObsValue} />
              <MoneyInput label="Lương trong game" value={obsWage} onChange={setObsWage} width="w-32" />
              <button type="button" className={btnCls} disabled={!(parseMoney(obsValue) || parseMoney(obsWage))}
                onClick={() => submit("/manager/observations", { player_id: a.player.player_id, value: parseMoney(obsValue), wage: parseMoney(obsWage) }, () => { setObsValue(""); setObsWage(""); })}>
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
