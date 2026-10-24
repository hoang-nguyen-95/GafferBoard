import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export type Tone = "emerald" | "sky" | "amber" | "rose" | "violet" | "zinc";

// Viết đủ tên lớp để Tailwind nhận ra (không ghép chuỗi động).
export const TONES: Record<Tone, { tile: string; bar: string; border: string; text: string; soft: string }> = {
  emerald: { tile: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300", bar: "bg-emerald-500", border: "border-emerald-200 dark:border-emerald-900", text: "text-emerald-700 dark:text-emerald-300", soft: "bg-emerald-50 dark:bg-emerald-950/40" },
  sky: { tile: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300", bar: "bg-sky-500", border: "border-sky-200 dark:border-sky-900", text: "text-sky-700 dark:text-sky-300", soft: "bg-sky-50 dark:bg-sky-950/40" },
  amber: { tile: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300", bar: "bg-amber-500", border: "border-amber-200 dark:border-amber-900", text: "text-amber-700 dark:text-amber-300", soft: "bg-amber-50 dark:bg-amber-950/40" },
  rose: { tile: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300", bar: "bg-rose-500", border: "border-rose-200 dark:border-rose-900", text: "text-rose-700 dark:text-rose-300", soft: "bg-rose-50 dark:bg-rose-950/40" },
  violet: { tile: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300", bar: "bg-violet-500", border: "border-violet-200 dark:border-violet-900", text: "text-violet-700 dark:text-violet-300", soft: "bg-violet-50 dark:bg-violet-950/40" },
  zinc: { tile: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300", bar: "bg-zinc-500", border: "border-zinc-200 dark:border-zinc-800", text: "text-zinc-700 dark:text-zinc-300", soft: "bg-zinc-50 dark:bg-zinc-900" },
};

/** Ô vuông bo góc chứa một icon, màu theo tông. */
export function IconTile({ icon: Icon, tone = "emerald", size = "md" }: { icon: LucideIcon; tone?: Tone; size?: "sm" | "md" | "lg" }) {
  const box = size === "sm" ? "h-8 w-8 rounded-lg" : size === "lg" ? "h-14 w-14 rounded-2xl" : "h-11 w-11 rounded-xl";
  const ico = size === "sm" ? 16 : size === "lg" ? 28 : 22;
  return (
    <span className={`inline-flex flex-none items-center justify-center ${box} ${TONES[tone].tile}`} aria-hidden="true">
      <Icon size={ico} strokeWidth={2} />
    </span>
  );
}

/** Khối nhấn: lưu ý, cảnh báo, mẹo. */
export function Callout({ icon: Icon, tone = "amber", title, children }: { icon: LucideIcon; tone?: Tone; title?: string; children: ReactNode }) {
  const t = TONES[tone];
  return (
    <div className={`flex gap-3 rounded-xl border p-4 text-sm ${t.border} ${t.soft}`}>
      <Icon size={20} className={`mt-0.5 flex-none ${t.text}`} aria-hidden="true" />
      <div>
        {title && <p className={`mb-0.5 font-semibold ${t.text}`}>{title}</p>}
        <div className="text-zinc-700 dark:text-zinc-300">{children}</div>
      </div>
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60 ${className}`}>{children}</div>;
}

/** Tiêu đề mục có icon. */
export function SectionTitle({ icon, tone = "emerald", children, id }: { icon: LucideIcon; tone?: Tone; children: ReactNode; id?: string }) {
  return (
    <h2 id={id} className="flex items-center gap-3 text-xl font-semibold tracking-tight">
      <IconTile icon={icon} tone={tone} size="sm" />
      {children}
    </h2>
  );
}
