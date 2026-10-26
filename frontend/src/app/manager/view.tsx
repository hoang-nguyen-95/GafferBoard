"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { BudgetTab } from "@/components/manager/BudgetTab";
import { NeedsTab } from "@/components/manager/NeedsTab";
import { RenewalsTab } from "@/components/manager/RenewalsTab";
import { NegotiationTab } from "@/components/manager/NegotiationTab";
import { TargetsTab } from "@/components/manager/TargetsTab";
import type { ManagerOverview } from "@/lib/api";
import { useApi } from "@/lib/engine";

const TABS = [
  ["needs", "Nhu cầu đội hình"], ["targets", "Mục tiêu chuyển nhượng"], ["budget", "Ngân sách & shortlist"], ["negotiate", "Đàm phán"], ["renewals", "Gia hạn hợp đồng"],
] as const;

export default function ManagerView() {
  const router = useRouter();
  const sp = useSearchParams();
  const tab = (TABS.find(([k]) => k === sp.get("tab"))?.[0] ?? "needs") as (typeof TABS)[number][0];
  const role = sp.get("role") ?? "ST";
  const pid = sp.get("pid") ? Number(sp.get("pid")) : null;
  const overview = useApi<ManagerOverview>("/manager/overview");

  const go = (next: Record<string, string | null>) => {
    const q = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v === null) q.delete(k);
      else q.set(k, v);
    }
    router.replace(`/manager?${q}`);
  };

  if (!overview) return <p className="text-zinc-500">Đang tải…</p>;
  if (!overview.data) {
    return (
      <p className="rounded border border-amber-500/50 bg-amber-500/10 p-4">
        Chế độ Manager cần biết đội của bạn. {overview.status === 409 ? <>Hãy <Link href="/" className="underline">chọn đội của bạn ở trang chủ</Link>.</> : "Không đọc được dữ liệu đội."}
      </p>
    );
  }
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Chế độ Manager</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Phân tích nhu cầu đội hình, chọn mục tiêu chuyển nhượng, lập kế hoạch ngân sách và đàm phán giá. Đọc{" "}
          <Link href="/cam-nang/mua-cau-thu" className="underline">cẩm nang mua cầu thủ</Link> để hiểu cách tính và giới hạn.
        </p>
      </div>
      <nav className="flex flex-wrap gap-2 border-b border-zinc-200 dark:border-zinc-800" role="tablist">
        {TABS.map(([k, label]) => (
          <button
            key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => go({ tab: k })}
            className={`-mb-px border-b-2 px-3 py-2 text-sm ${tab === k ? "border-emerald-600 font-semibold" : "border-transparent text-zinc-500 hover:text-current"}`}
          >
            {label}
          </button>
        ))}
      </nav>
      {tab === "needs" && <NeedsTab data={overview.data} onFind={(r) => go({ tab: "targets", role: r })} />}
      {tab === "targets" && <TargetsTab role={role} onRole={(r) => go({ role: r })} onNegotiate={(id) => go({ tab: "negotiate", pid: String(id) })} />}
      {tab === "budget" && <BudgetTab onNegotiate={(id) => go({ tab: "negotiate", pid: String(id) })} />}
      {tab === "renewals" && <RenewalsTab />}
      {tab === "negotiate" && <NegotiationTab playerId={pid} onPlayer={(id) => go({ pid: String(id) })} />}
    </div>
  );
}
