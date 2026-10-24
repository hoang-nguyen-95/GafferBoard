import Link from "next/link";
import { Suspense } from "react";
import { TeamSetting } from "@/components/TeamSetting";
import { type FixtureBrief, type Meta, type NextMatch, apiGet } from "@/lib/api";

function formatDate(date: string | null, seconds: number | null): string {
  if (!date) return "chưa rõ ngày";
  const d = new Date(`${date}T00:00:00`);
  const text = d.toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" });
  if (seconds == null) return text;
  const hh = String(Math.floor(seconds / 3600)).padStart(2, "0");
  const mm = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
  return `${text} ${hh}:${mm}`;
}

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">CounterPick FC</h1>
      <p className="mt-2 mb-8 text-zinc-500">
        Phân tích đối thủ và gợi ý đấu pháp cho Career Mode, chạy hoàn toàn trên máy bạn.
      </p>
      <Suspense fallback={<p className="p-4 text-zinc-500">Đang tải…</p>}>
        <HomeContent />
      </Suspense>
    </main>
  );
}

async function HomeContent() {
  let meta: Meta, next: NextMatch;
  try {
    [meta, next] = await Promise.all([apiGet<Meta>("/meta"), apiGet<NextMatch>("/next-match")]);
  } catch {
    return (
      <p className="rounded border border-amber-500/50 bg-amber-500/10 p-4">
        Chưa kết nối được backend. Hãy chạy API: <code className="font-mono">uvicorn app.main:app --port 8000</code>{" "}
        trong thư mục <code>backend/</code>, rồi tải lại trang.
      </p>
    );
  }
  if (meta.teams === 0) {
    return (
      <p className="rounded border border-amber-500/50 bg-amber-500/10 p-4">
        Backend chạy nhưng chưa có dữ liệu. Thả các file CSV xuất từ game vào <code>data/exports/</code> và chạy{" "}
        <code className="font-mono">python watcher.py</code> (hoặc{" "}
        <code className="font-mono">python -m app.importers.run data/exports</code>), rồi tải lại trang.
      </p>
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
          <Link href={`/teams/${next.user_team.team_id}`} className="rounded border border-zinc-300 px-4 py-2 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900">
            Đội của tôi: {next.user_team.name}
          </Link>
        )}
      </nav>

      <p className="text-xs text-zinc-500">
        {meta.teams} đội, {meta.players} cầu thủ.{" "}
        {meta.last_import_at
          ? `Dữ liệu nhập lần cuối: ${new Date(meta.last_import_at).toLocaleString("vi-VN")}.`
          : "Chưa ghi nhận lần nhập nào."}{" "}
        Có file xuất mới thì thả vào <code>data/exports/</code> (khi <code>watcher.py</code> đang chạy, dữ liệu tự cập nhật) rồi tải lại trang.
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
            <Link href={`/teams/${next.opponent.team_id}/analysis`} className="rounded bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700">
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
