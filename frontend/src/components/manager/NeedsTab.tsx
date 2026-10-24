"use client";

import Link from "next/link";
import type { ManagerOverview } from "@/lib/api";
import { playerHref } from "@/lib/routes";
import { contractText } from "./common";

export function NeedsTab({ data, onFind }: { data: ManagerOverview; onFind: (role: string) => void }) {
  return (
    <div className="space-y-8">
      <dl className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
        {[
          ["Đội của bạn", data.user_team.name],
          ["OVR TB đội hình chính", data.xi_average],
          ["Tuổi TB đội hình chính", data.xi_age_average ?? "–"],
          ["Tuổi TB cả đội", data.squad_age_average ?? "–"],
          ["Quy mô đội", data.squad_size],
          ["Cầu thủ từ 31 tuổi", data.old_players],
          ["Mùa kết thúc năm", data.season_end_year],
        ].map(([label, value]) => (
          <div key={label as string}>
            <dt className="text-xs text-zinc-500">{label}</dt>
            <dd className="text-lg font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>

      <section>
        <h2 className="mb-1 font-semibold">Vị trí nên củng cố (xếp theo mức cần)</h2>
        <p className="mb-3 text-xs text-zinc-500">
          Điểm ưu tiên cộng từ: người đá chính yếu hơn mặt bằng đội, thiếu hoặc yếu dự bị, cầu thủ từ 31 tuổi, hợp đồng hết cuối mùa. Cách tính ở{" "}
          <Link href="/cam-nang/mua-cau-thu" className="underline">cẩm nang</Link>.
        </p>
        <ul className="space-y-3">
          {data.needs.map((n) => (
            <li key={n.role} className="rounded border border-zinc-200 p-3 dark:border-zinc-800">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-medium">
                  {n.role_label} <span className="text-xs font-normal text-zinc-500">({n.slots} vị trí đá chính)</span>
                </h3>
                <span className={`text-sm font-semibold tabular-nums ${n.priority > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                  {n.priority > 0 ? `Ưu tiên ${n.priority}` : "Ổn"}
                </span>
              </div>
              <p className="mt-1 text-xs text-zinc-500">
                Đá chính:{" "}
                {n.starters.map((p, i) => (
                  <span key={p.player_id}>
                    {i > 0 && ", "}
                    <Link href={playerHref(p.player_id)} className="underline">{p.name}</Link> ({p.overall}, {p.age ?? "?"}t)
                  </span>
                ))}
                {n.backups.length > 0 && (
                  <>
                    {" "}· Dự bị: {n.backups.map((p) => `${p.name} (${p.overall})`).join(", ")}
                  </>
                )}
              </p>
              {n.issues.length > 0 && (
                <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm">
                  {n.issues.map((t) => <li key={t}>{t}</li>)}
                </ul>
              )}
              <button type="button" onClick={() => onFind(n.role)} className="mt-2 text-sm text-emerald-700 underline dark:text-emerald-400">
                Tìm cầu thủ cho vị trí này →
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 font-semibold">Hợp đồng sắp hết trong đội bạn</h2>
        {data.expiring.length === 0 ? (
          <p className="text-sm text-zinc-500">Không có cầu thủ nào hết hợp đồng cuối mùa này.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-zinc-500">
              <tr><th className="py-1">Cầu thủ</th><th>OVR</th><th>Tuổi</th><th>Hợp đồng</th><th>Đá chính</th></tr>
            </thead>
            <tbody>
              {data.expiring.map((p) => (
                <tr key={p.player_id} className="border-t border-zinc-200 dark:border-zinc-800">
                  <td className="py-1"><Link href={playerHref(p.player_id)} className="hover:underline">{p.name}</Link></td>
                  <td className="tabular-nums">{p.overall}</td>
                  <td>{p.age ?? "–"}</td>
                  <td>{contractText(p.seasons_left, p.contract_until)}</td>
                  <td>{p.in_xi ? "●" : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="mt-2 text-xs text-zinc-500">
          Giả định: <code>contract_until</code> là năm dương lịch hợp đồng kết thúc; năm kết thúc mùa chỉnh được ở tab Ngân sách nếu app đoán sai.
        </p>
      </section>
    </div>
  );
}
