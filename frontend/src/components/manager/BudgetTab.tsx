"use client";

import Link from "next/link";
import { useState } from "react";
import type { WagesSummary, BudgetSummary, Meta, PlayerSummary, SaleRow, ShortlistRow, TeamOverview } from "@/lib/api";
import { useApi } from "@/lib/engine";
import { playerHref } from "@/lib/routes";
import { Field, btnCls, inputCls, money, primaryCls, send } from "./common";

const STATUS_LABEL = { target: "Mục tiêu", negotiating: "Đang đàm phán", agreed: "Đã thống nhất" } as const;
const num = (v: string): number | null => (v.trim() === "" ? null : Number(v));

function ShortRow({ row, onNegotiate }: { row: ShortlistRow; onNegotiate: (id: number) => void }) {
  const [fee, setFee] = useState(row.fee?.toString() ?? "");
  const [wage, setWage] = useState(row.wage?.toString() ?? "");
  const [status, setStatus] = useState(row.status);
  const [note, setNote] = useState(row.note);
  const p = row.player;
  return (
    <tr className="border-t border-zinc-200 align-top dark:border-zinc-800">
      <td className="py-1.5">
        <Link href={playerHref(p.player_id)} className="font-medium hover:underline">{p.name}</Link>
        <span className="block text-xs text-zinc-500">{p.overall}/{p.potential ?? "?"} · {p.age ?? "?"}t · {row.club?.name ?? "–"}</span>
      </td>
      <td><input type="number" min={0} value={fee} onChange={(e) => setFee(e.target.value)} className={`w-28 ${inputCls}`} aria-label={`Giá ${p.name}`} /></td>
      <td><input type="number" min={0} value={wage} onChange={(e) => setWage(e.target.value)} className={`w-24 ${inputCls}`} aria-label={`Lương ${p.name}`} /></td>
      <td>
        <select value={status} onChange={(e) => setStatus(e.target.value as ShortlistRow["status"])} className={inputCls}>
          {Object.entries(STATUS_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </td>
      <td><input value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} className={`w-40 ${inputCls}`} aria-label={`Ghi chú ${p.name}`} /></td>
      <td className="text-right tabular-nums text-xs">{row.score}{row.points_per_million !== null && <span className="block text-zinc-500">{row.points_per_million} điểm/triệu</span>}</td>
      <td className="space-x-1 whitespace-nowrap text-right">
        <button type="button" className={primaryCls} onClick={() => send("PUT", `/manager/shortlist/${p.player_id}`, { fee: num(fee), wage: num(wage), status, note })}>Lưu</button>
        <button type="button" className={btnCls} onClick={() => onNegotiate(p.player_id)}>Đàm phán</button>
        <button type="button" className={btnCls} onClick={() => send("DELETE", `/manager/shortlist/${p.player_id}`)}>Xóa</button>
      </td>
    </tr>
  );
}

function SaleRowView({ row }: { row: SaleRow }) {
  const [fee, setFee] = useState(row.expected_fee?.toString() ?? "");
  const [wage, setWage] = useState(row.wage?.toString() ?? "");
  return (
    <tr className="border-t border-zinc-200 dark:border-zinc-800">
      <td className="py-1.5">{row.player.name} <span className="text-xs text-zinc-500">({row.player.overall}, {row.player.age ?? "?"}t)</span></td>
      <td><input type="number" min={0} value={fee} onChange={(e) => setFee(e.target.value)} className={`w-28 ${inputCls}`} aria-label={`Giá bán ${row.player.name}`} /></td>
      <td><input type="number" min={0} value={wage} onChange={(e) => setWage(e.target.value)} className={`w-24 ${inputCls}`} aria-label={`Lương giải phóng ${row.player.name}`} /></td>
      <td className="space-x-1 text-right">
        <button type="button" className={primaryCls} onClick={() => send("PUT", `/manager/sales/${row.player_id}`, { expected_fee: num(fee), wage: num(wage) })}>Lưu</button>
        <button type="button" className={btnCls} onClick={() => send("DELETE", `/manager/sales/${row.player_id}`)}>Xóa</button>
      </td>
    </tr>
  );
}

export function BudgetTab({ onNegotiate }: { onNegotiate: (id: number) => void }) {
  const res = useApi<BudgetSummary>("/manager/shortlist");
  const meta = useApi<Meta>("/meta")?.data ?? null;
  const wages = useApi<WagesSummary>("/manager/wages")?.data ?? null;
  const overview = useApi<TeamOverview>(meta?.user_team ? `/teams/${meta.user_team.team_id}/overview` : null)?.data ?? null;
  const [transfer, setTransfer] = useState<string | null>(null);
  const [wage, setWage] = useState<string | null>(null);
  const [year, setYear] = useState<string | null>(null);
  const [saleId, setSaleId] = useState("");
  const [saved, setSaved] = useState(false);
  if (!res?.data) return <p className="text-zinc-500">Đang tải…</p>;
  const d = res.data;
  const squad: PlayerSummary[] = overview ? Object.values(overview.squad).flat() : [];
  const sellable = squad.filter((p) => !d.sales.some((s) => s.player_id === p.player_id)).sort((a, b) => b.overall - a.overall);

  async function saveBudget() {
    const r = await send("PUT", "/manager/budget", {
      transfer: num(transfer ?? d.budget.transfer?.toString() ?? ""), wage: num(wage ?? d.budget.wage?.toString() ?? ""),
      season_end_year: num(year ?? ""),
    });
    setSaved(r.ok);
    setTimeout(() => setSaved(false), 2000);
  }

  const t = d.totals;
  return (
    <div className="space-y-8">
      {wages?.available && (
        <section className="space-y-3" aria-label="Quỹ lương theo hợp đồng trong save">
          <h2 className="font-semibold">Quỹ lương hiện tại (đọc từ save)</h2>
          <p className="text-sm">
            <b className="tabular-nums">{wages.total.toLocaleString("vi-VN")}</b> cho <b>{wages.players}</b> cầu thủ có hợp đồng
            <span className="text-zinc-500"> (số <code>wage</code> trong save; game hiển thị theo tuần). Đây là số đã chi, không phải số còn trống: ngân sách và trần lương vẫn phải nhập ở dưới.</span>
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="mb-1 text-sm font-medium">Lương cao nhất</h3>
              <ul className="space-y-0.5 text-sm">
                {wages.top.map((r) => (
                  <li key={r.player_id} className="flex justify-between gap-3">
                    <span>{r.name}{r.on_loan_from !== null && <span className="text-xs text-zinc-500"> (mượn)</span>}</span>
                    <span className="tabular-nums">{r.wage.toLocaleString("vi-VN")}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="mb-1 text-sm font-medium">Hợp đồng sắp hết (trong 12 tháng)</h3>
              {wages.expiring.length === 0 ? <p className="text-sm text-zinc-500">Không có hợp đồng nào sắp hết.</p> : (
                <ul className="space-y-0.5 text-sm">
                  {wages.expiring.map((r) => (
                    <li key={r.player_id} className="flex justify-between gap-3">
                      <span>{r.name}</span>
                      <span className="tabular-nums text-zinc-600 dark:text-zinc-400">{r.end_date} · {r.months_left !== null && r.months_left < 0 ? "đã hết hạn" : `còn ${r.months_left} tháng`}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="font-semibold">Số liệu từ màn Tài chính của game</h2>
        <p className="text-xs text-zinc-500">
          Ngân sách chuyển nhượng được script tự động trong Live Editor đọc thẳng từ game mỗi khi có thay đổi, không cần nhập. Trần lương không có trong dữ liệu nên vẫn nhập tay
          (giữ cùng một đơn vị cho mọi ô, ví dụ 25000000 cho 25 triệu). Muốn dùng số khác với game, nhập vào ô ngân sách; xóa ô đó để quay về số tự đọc.
        </p>
        {d.game && (
          <p className="text-xs text-emerald-700 dark:text-emerald-400">
            Đã nhận từ game{d.game.date ? ` (ngày trong game ${d.game.date})` : ""}{d.game.exported_at ? `, cập nhật ${d.game.exported_at}` : ""}.
          </p>
        )}
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Ngân sách chuyển nhượng còn lại" hint={d.effective_budget.transfer_source === "game" ? "Tự đọc từ game" : d.effective_budget.transfer_source === "manual" ? "Bạn nhập tay" : undefined}>
            <input type="number" min={0} value={transfer ?? d.budget.transfer ?? d.effective_budget.transfer ?? ""} onChange={(e) => setTransfer(e.target.value)} className={`w-40 ${inputCls}`} />
          </Field>
          <Field label="Quỹ lương còn trống"><input type="number" min={0} value={wage ?? d.budget.wage ?? ""} onChange={(e) => setWage(e.target.value)} className={`w-32 ${inputCls}`} /></Field>
          <Field label="Năm kết thúc mùa" hint={`Đang dùng ${d.season_end_year}; để trống = tự đoán`}>
            <input type="number" min={2000} max={2100} value={year ?? ""} placeholder={String(d.season_end_year)} onChange={(e) => setYear(e.target.value)} className={`w-28 ${inputCls}`} />
          </Field>
          <button type="button" className={primaryCls} onClick={saveBudget}>Lưu</button>
          {saved && <span className="text-sm text-emerald-600">Đã lưu</span>}
        </div>
      </section>

      <section>
        <h2 className="mb-2 font-semibold">Shortlist mua</h2>
        {d.items.length === 0 ? (
          <p className="text-sm text-zinc-500">Chưa có ai. Thêm từ tab Mục tiêu hoặc nút &ldquo;Thêm vào shortlist&rdquo; ở trang cầu thủ.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-zinc-500"><tr><th className="py-1">Cầu thủ</th><th>Giá</th><th>Lương</th><th>Trạng thái</th><th>Ghi chú</th><th className="text-right">Điểm</th><th /></tr></thead>
              <tbody>{d.items.map((r) => <ShortRow key={`${r.player_id}:${r.fee}:${r.wage}:${r.status}:${r.note}`} row={r} onNegotiate={onNegotiate} />)}</tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2 font-semibold">Dự kiến bán</h2>
        {d.sales.length > 0 && (
          <table className="mb-3 w-full text-left text-sm">
            <thead className="text-xs text-zinc-500"><tr><th className="py-1">Cầu thủ</th><th>Giá bán dự kiến</th><th>Lương giải phóng</th><th /></tr></thead>
            <tbody>{d.sales.map((s) => <SaleRowView key={`${s.player_id}:${s.expected_fee}:${s.wage}`} row={s} />)}</tbody>
          </table>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <select value={saleId} onChange={(e) => setSaleId(e.target.value)} className={inputCls} aria-label="Chọn cầu thủ để bán">
            <option value="">Chọn cầu thủ trong đội để bán…</option>
            {sellable.map((p) => <option key={p.player_id} value={p.player_id}>{p.name ?? `#${p.player_id}`} ({p.overall})</option>)}
          </select>
          <button type="button" className={btnCls} disabled={!saleId} onClick={async () => { await send("PUT", `/manager/sales/${saleId}`, {}); setSaleId(""); }}>Thêm</button>
        </div>
      </section>

      <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="mb-2 font-semibold">Tổng kết kế hoạch</h2>
        <dl className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
          {[
            ["Tổng chi dự kiến", money(t.planned_spend)], ["Trong đó đã thống nhất", money(t.committed_spend)],
            ["Thu từ bán", money(t.sales_income)], ["Ngân sách còn lại sau kế hoạch", money(t.transfer_after)],
            ["Lương thêm / giải phóng", `+${money(t.wage_added)} / −${money(t.wage_saved)}`], ["Quỹ lương còn trống sau kế hoạch", money(t.wage_after)],
          ].map(([l, v]) => (
            <div key={l} className="flex justify-between gap-4 border-b border-zinc-100 py-1 dark:border-zinc-900"><dt className="text-zinc-500">{l}</dt><dd className="font-semibold tabular-nums">{v}</dd></div>
          ))}
        </dl>
        {d.warnings.length > 0 && <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-amber-600">{d.warnings.map((w) => <li key={w}>{w}</li>)}</ul>}
      </section>

      {d.allocation.length > 0 && (
        <section>
          <h2 className="mb-1 font-semibold">Gợi ý chia ngân sách theo mức cần</h2>
          <p className="mb-2 text-xs text-zinc-500">Chia ngân sách còn lại cộng thu từ bán theo điểm ưu tiên của 4 vị trí cần nhất (tab Nhu cầu). Chỉ là điểm khởi đầu để cân nhắc.</p>
          <table className="w-full text-left text-sm">
            <tbody>
              {d.allocation.map((a) => (
                <tr key={a.role} className="border-t border-zinc-200 dark:border-zinc-800">
                  <td className="py-1">{a.role_label}</td><td className="text-zinc-500">{Math.round(a.share * 100)}%</td><td className="text-right font-semibold tabular-nums">{money(a.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
