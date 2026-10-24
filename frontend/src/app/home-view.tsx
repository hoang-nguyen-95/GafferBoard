"use client";

import Link from "next/link";
import { DesktopPanel } from "@/components/DesktopPanel";
import { TeamSetting } from "@/components/TeamSetting";
import { type FixtureBrief, type Meta, type NextMatch } from "@/lib/api";
import { useApi } from "@/lib/engine";
import { analysisHref, teamHref } from "@/lib/routes";

function formatDate(date: string | null, seconds: number | null): string {
  if (!date) return "chưa rõ ngày";
  const d = new Date(`${date}T00:00:00`);
  const text = d.toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" });
  if (seconds == null) return text;
  const hh = String(Math.floor(seconds / 3600)).padStart(2, "0");
  const mm = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
  return `${text} ${hh}:${mm}`;
}

export default function HomeView() {
  const metaRes = useApi<Meta>("/meta");
  const nextRes = useApi<NextMatch>("/next-match");
  if (!metaRes || !nextRes) return <p className="p-4 text-zinc-500">Đang tải…</p>;
  const meta = metaRes.data, next = nextRes.data;
  if (!meta || !next || meta.teams === 0) {
    return (
      <div className="space-y-4 rounded border border-zinc-200 p-6 dark:border-zinc-800">
        <h2 className="text-lg font-semibold">Bắt đầu: nhập dữ liệu từ game</h2>
        <p className="text-sm text-zinc-500">
          Chưa có dữ liệu. Xuất các bảng từ Live Editor ra file CSV rồi kéo thả vào trang nhập. Mọi thứ chạy ngay trong trình duyệt của
          bạn, không có file nào được tải lên máy chủ.
        </p>
        <DesktopPanel />
        <Link href="/import" className="inline-block rounded bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700">
          Nhập dữ liệu
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {next.user_team == null ? (
        <section className="rounded border border-zinc-200 p-5 dark:border-zinc-800">
          <h2 className="mb-1 font-semibold">Chọn đội của bạn</h2>
          <p className="mb-3 text-sm text-zinc-500">
            Dữ liệu xuất không cho biết đội bạn đang dẫn dắt. Chọn một lần, app sẽ nhớ.
          </p>
          <TeamSetting endpoint="/api/settings/user-team" label="Chọn đội của tôi" />
        </section>
      ) : (
        <NextMatchCard next={next} />
      )}

      <nav className="flex flex-wrap gap-3 text-sm">
        <Link href="/teams" className="rounded bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700">
          Xem các đội
        </Link>
        <Link href="/manual" className="rounded border border-zinc-300 px-4 py-2 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900">
          Nhập tay đội hình đối thủ
        </Link>
        {next.user_team && (
          <Link href={teamHref(next.user_team.team_id)} className="rounded border border-zinc-300 px-4 py-2 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900">
            Đội của tôi: {next.user_team.name}
          </Link>
        )}
      </nav>

      <p className="text-xs text-zinc-500">
        {meta.teams} đội, {meta.players} cầu thủ.{" "}
        {meta.last_import_at
          ? `Dữ liệu nhập lần cuối: ${new Date(meta.last_import_at).toLocaleString("vi-VN")}.`
          : "Chưa ghi nhận lần nhập nào."}{" "}
        Có file xuất mới thì <Link href="/import" className="underline">nhập lại tại đây</Link>; ghi chú và kết quả của bạn được giữ nguyên.
      </p>
    </div>
  );
}

function NextMatchCard({ next }: { next: NextMatch }) {
  const user = next.user_team!;
  const f = next.fixture;
  return (
    <section className="rounded border border-zinc-200 p-5 dark:border-zinc-800">
      <h2 className="mb-1 text-sm font-medium text-zinc-500">Trận kế tiếp</h2>
      {next.opponent ? (
        <>
          <p className="text-2xl font-semibold">
            {f ? `${f.home?.name} vs ${f.away?.name}` : `${user.name} vs ${next.opponent.name}`}
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            {f
              ? `${formatDate(f.date, f.time_seconds)} · ${f.is_home ? "sân nhà" : "sân khách"}`
              : "Đối thủ do bạn chọn tay (không theo lịch thi đấu)"}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Link href={analysisHref(next.opponent.team_id)} className="rounded bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700">
              Phân tích {next.opponent.name} →
            </Link>
            <TeamSetting
              endpoint="/api/settings/opponent"
              label="Chọn đối thủ khác"
              clearLabel={next.source === "manual" ? "Theo lịch thi đấu" : undefined}
            />
          </div>
        </>
      ) : (
        <>
          <p className="text-lg font-semibold">Chưa xác định được đối thủ</p>
          <p className="mt-1 mb-4 text-sm text-zinc-500">
            Lịch thi đấu của {user.name} chưa có trong dữ liệu xuất (thường do đang tiền mùa giải). Chọn đối thủ thủ
            công, hoặc xuất lại dữ liệu khi mùa giải bắt đầu.
          </p>
          <TeamSetting endpoint="/api/settings/opponent" label="Chọn đối thủ" />
        </>
      )}
      {next.upcoming.length > 1 && <Upcoming fixtures={next.upcoming.slice(1)} />}
      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
        <span>
          Đội của bạn: {user.name} ({next.user_team_source === "manual" ? "bạn chọn" : "theo dữ liệu game"}).
        </span>
        <TeamSetting endpoint="/api/settings/user-team" label="Đổi đội" clearLabel={next.user_team_source === "manual" ? "Theo game" : undefined} />
      </div>
    </section>
  );
}

function Upcoming({ fixtures }: { fixtures: FixtureBrief[] }) {
  return (
    <div className="mt-5 text-sm">
      <h3 className="mb-1 text-xs font-medium text-zinc-500">Các trận tiếp theo</h3>
      <ul className="space-y-0.5">
        {fixtures.map((f) => (
          <li key={f.fixture_id}>
            <span className="text-zinc-500">{formatDate(f.date, f.time_seconds)}</span> · {f.home?.name} vs {f.away?.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
