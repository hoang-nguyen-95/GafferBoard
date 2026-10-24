import Link from "next/link";
import { Pitch } from "@/components/Pitch";
import { type CounterLineups, type CounterOption, playerName } from "@/lib/api";
import { playerHref } from "@/lib/routes";

export function CounterLineupsView({ data, teamName }: { data: CounterLineups | null; teamName: string }) {
  return (
    <section className="mb-10">
      <h2 className="mb-1 text-lg font-semibold">Đội hình đáp trả đề xuất</h2>
      {data === null ? (
        <p className="text-sm text-zinc-500">
          Chưa gợi ý được đội hình: cần biết đội của bạn (chọn ở trang chủ) và đội đó khác {teamName}.
        </p>
      ) : (
        <>
          <p className="mb-3 text-xs text-zinc-500">
            {data.options.length} phương án từ {data.available_players} cầu thủ khả dụng
            {data.injured.length > 0 && `, đã loại ${data.injured.length} cầu thủ chấn thương (${data.injured.map((p) => p.name).join(", ")})`}
            . Điểm = OVR theo vị trí + phong độ + bonus từ các gợi ý khắc chế; bonus bị giới hạn nên không đảo ngược chênh lệch chất lượng lớn.
          </p>
          {data.options.length === 0 && <p className="text-sm text-zinc-500">Không dựng được phương án nào (thiếu dữ liệu sơ đồ).</p>}
          <div className="space-y-4">
            {data.options.map((o, i) => (
              <Option key={o.formation.id} option={o} open={i === 0} rank={i + 1} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function Option({ option, open, rank }: { option: CounterOption; open: boolean; rank: number }) {
  return (
    <details open={open} className="rounded border border-zinc-200 p-4 dark:border-zinc-800">
      <summary className="cursor-pointer text-sm">
        <span className="font-semibold">
          Phương án {rank}: {option.formation.name}
        </span>
        {option.is_usual && <span className="ml-2 rounded bg-zinc-200 px-1.5 py-0.5 text-xs dark:bg-zinc-800">sơ đồ hiện tại</span>}
        <span className="ml-2 text-zinc-500">điểm {option.score}</span>
        {!option.valid && <span className="ml-2 text-red-600">chưa đủ 11 người</span>}
      </summary>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{option.why_formation}</p>
      {option.warnings.map((w) => (
        <p key={w} className="text-sm text-red-600">
          {w}
        </p>
      ))}
      <div className="mt-3 grid gap-6 md:grid-cols-2">
        <Pitch slots={option.slots} />
        <div className="space-y-4 text-sm">
          {(option.added.length > 0 || option.removed.length > 0) && (
            <div>
              <h3 className="mb-1 font-medium">Khác với đội hình mạnh nhất theo OVR</h3>
              <ul className="list-disc space-y-1 pl-5">
                {option.added.map((a) => (
                  <li key={a.player_id}>
                    <b>{a.name}</b> vào ({a.position}): {a.because}
                  </li>
                ))}
                {option.removed.length > 0 && <li>Nhường chỗ: {option.removed.map((r) => r.name).join(", ")}</li>}
              </ul>
            </div>
          )}
          <div>
            <h3 className="mb-1 font-medium">Vì sao chọn từng người</h3>
            <ul className="space-y-1">
              {option.slots.map((s) => (
                <li key={s.slot}>
                  <details>
                    <summary className="cursor-pointer">
                      <span className="inline-block w-10 text-xs text-zinc-500">{s.position_name}</span>
                      {s.player ? (
                        <Link href={playerHref(s.player.player_id)} className="hover:underline">
                          {playerName(s.player)}
                        </Link>
                      ) : (
                        "(trống)"
                      )}
                      <span className="ml-2 text-xs text-zinc-500">{s.score}</span>
                    </summary>
                    <ul className="ml-10 list-disc pl-4 text-xs text-zinc-600 dark:text-zinc-400">
                      {s.reasons.map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </ul>
                  </details>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </details>
  );
}
