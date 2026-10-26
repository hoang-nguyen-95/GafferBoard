"use client";

import Link from "next/link";
import type { RenewalPlan, RenewalRow } from "@/lib/api";
import { useApi } from "@/lib/engine";
import { playerHref } from "@/lib/routes";
import { money } from "./common";

const URGENCY: Record<RenewalRow["urgency"], { label: string; cls: string }> = {
  urgent: { label: "Gấp (dưới 6 tháng)", cls: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300" },
  soon: { label: "Sớm (dưới 12 tháng)", cls: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" },
  later: { label: "Sau (dưới 24 tháng)", cls: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300" },
  none: { label: "Chưa cần", cls: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400" },
};
const ACTION: Record<RenewalRow["action"], { label: string; cls: string }> = {
  renew: { label: "Gia hạn", cls: "text-emerald-700 dark:text-emerald-400" },
  renew_short: { label: "Gia hạn ngắn", cls: "text-emerald-700 dark:text-emerald-400" },
  sell: { label: "Bán / cho đi", cls: "text-rose-700 dark:text-rose-400" },
  hold: { label: "Theo dõi", cls: "text-zinc-600 dark:text-zinc-400" },
  none: { label: "–", cls: "text-zinc-400" },
};
const SQUAD_ROLE: Record<RenewalRow["squad_role"], string> = { starter: "Đá chính", prospect: "Tiềm năng trẻ", rotation: "Dự bị hữu ích", surplus: "Ít đóng góp" };

export function RenewalsTab() {
  const res = useApi<RenewalPlan>("/manager/renewals");
  if (!res?.data) return <p className="text-zinc-500">{res ? "Không đọc được dữ liệu." : "Đang tải…"}</p>;
  const d = res.data;
  if (!d.available) {
    return (
      <p className="rounded border border-amber-500/50 bg-amber-500/10 p-4 text-sm">
        Chưa có hợp đồng trong dữ liệu. Chạy script xuất bản mới trong Live Editor để có <code>career_playercontract.csv</code>, rồi quay lại tab này (game chỉ lưu hợp đồng cho đội của bạn).
      </p>
    );
  }
  const t = d.totals!;
  const acted = d.rows.filter((r) => r.action !== "none");
  const waiting = d.rows.filter((r) => r.action === "none");
  return (
    <div className="space-y-6">
      <p className="text-xs text-zinc-500">
        Hợp đồng lấy từ save (tính tới ngày {d.reference_date}). Game không cho biết mức lương cầu thủ sẽ đòi khi gia hạn, nên &ldquo;mức tham chiếu&rdquo; là lương trung vị của đồng đội cùng tầm OVR trong đội bạn;
        số năm và trần đề nghị là kinh nghiệm chung, chưa kiểm chứng với game. Dùng làm điểm bắt đầu khi mở màn hình đàm phán gia hạn.
      </p>
      <dl className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
        {[
          ["Cần gia hạn", t.to_renew], ["Nên bán/cho đi", t.to_sell], ["Quỹ lương hiện tại", money(t.wage_total)],
          ["Tăng thêm nếu gia hạn ở mức mục tiêu", `+${money(t.extra_wage_target)}`], ["Tăng thêm nếu lên tới trần", `+${money(t.extra_wage_max)}`],
          ["Quỹ lương còn trống (bạn nhập)", money(t.budget_wage)],
        ].map(([label, value]) => (
          <div key={label as string}>
            <dt className="text-xs text-zinc-500">{label}</dt>
            <dd className="text-lg font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      {d.warnings.length > 0 && (
        <ul className="space-y-1 rounded border border-amber-500/50 bg-amber-500/10 p-3 text-sm">
          {d.warnings.map((w) => <li key={w}>{w}</li>)}
        </ul>
      )}

      <section>
        <h2 className="mb-2 font-semibold">Cần quyết định ({acted.length})</h2>
        {acted.length === 0 ? <p className="text-sm text-zinc-500">Chưa có hợp đồng nào cần xử lý trong 24 tháng tới.</p> : (
          <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
            <table className="w-full min-w-max text-sm">
              <thead className="bg-zinc-50 text-left text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
                <tr>
                  <th className="px-3 py-2">Cầu thủ</th><th className="px-3 py-2">Hết hạn</th><th className="px-3 py-2">Gợi ý</th>
                  <th className="px-3 py-2 text-right">Lương hiện tại</th><th className="px-3 py-2 text-right">Mở / Mục tiêu / Trần</th><th className="px-3 py-2">Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {acted.map((r) => (
                  <tr key={r.player_id} className="border-t border-zinc-100 align-top dark:border-zinc-800/70">
                    <td className="px-3 py-2">
                      <Link href={playerHref(r.player_id)} className="font-medium hover:underline">{r.name}</Link>
                      <div className="text-xs text-zinc-500">{SQUAD_ROLE[r.squad_role]} · OVR {r.overall}{r.potential !== null && r.potential > r.overall ? ` → ${r.potential}` : ""} · {r.age ?? "?"} tuổi</div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {r.end_date}
                      <div><span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${URGENCY[r.urgency].cls}`}>{URGENCY[r.urgency].label}</span></div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={`font-semibold ${ACTION[r.action].cls}`}>{ACTION[r.action].label}</span>
                      {r.suggested_years !== null && <div className="text-xs text-zinc-500">{r.suggested_years} năm</div>}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{money(r.wage)}</td>
                    <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">
                      {r.wage_ladder ? `${money(r.wage_ladder.open)} / ${money(r.wage_ladder.target)} / ${money(r.wage_ladder.walk)}` : "–"}
                      {r.reference_wage !== null && <div className="text-xs text-zinc-500">tham chiếu {money(r.reference_wage)} ({r.reference_peers} đồng đội)</div>}
                    </td>
                    <td className="px-3 py-2 text-xs"><p>{r.reason}</p><p className="mt-0.5 text-zinc-500">{r.wage_note}</p></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-2 text-xs text-zinc-500">
          Mở = giữ nguyên lương hiện tại; Mục tiêu = lương tham chiếu (không thấp hơn hiện tại); Trần = mức tối đa nên chấp nhận (tham chiếu nhân 1,25 cho trụ cột, 1,15 cho cầu thủ trẻ tiềm năng, 1,05 cho dự bị).
          Quá trần thì cân nhắc để cầu thủ ra đi.
        </p>
      </section>

      {waiting.length > 0 && (
        <section>
          <h2 className="mb-2 font-semibold">Hợp đồng còn dài ({waiting.length})</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {waiting.map((r) => `${r.name} (${r.end_date})`).join(" · ")}
          </p>
        </section>
      )}
    </div>
  );
}
