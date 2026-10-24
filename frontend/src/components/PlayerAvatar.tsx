"use client";

import { useState } from "react";
import { playerPhotoUrl } from "@/lib/links";

const LINE_COLORS: Record<string, string> = {
  GK: "bg-amber-500 text-white",
  DEF: "bg-sky-600 text-white",
  MID: "bg-emerald-600 text-white",
  ATT: "bg-rose-600 text-white",
};

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(-2).map((w) => w[0]?.toUpperCase()).join("") || "?";

/** Ảnh chân dung (nếu tải được) hoặc avatar chữ viết tắt, màu theo tuyến (GK/DEF/MID/ATT). */
export function PlayerAvatar({ playerId, name, line, size = 28 }: { playerId: number; name: string; line?: string | null; size?: number }) {
  const [failed, setFailed] = useState(false);
  const src = playerPhotoUrl(playerId);
  const box = { width: size, height: size, fontSize: size * 0.4 };
  if (src && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt="" width={size} height={size} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(true)}
        className="shrink-0 rounded-full bg-zinc-200 object-cover dark:bg-zinc-800" style={{ width: size, height: size }} />
    );
  }
  return (
    <span aria-hidden="true" style={box} className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold ${LINE_COLORS[line ?? ""] ?? "bg-zinc-400 text-white"}`}>
      {initials(name)}
    </span>
  );
}
