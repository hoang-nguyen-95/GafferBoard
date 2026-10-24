"use client";

// Bảng danh sách cầu thủ: lọc, sắp xếp, đổi bộ cột. Đọc thẳng từ engine (dữ liệu save của bạn trong ứng dụng, hoặc bộ dữ liệu công khai trên web).
import Link from "next/link";
import { ArrowDown, ArrowUp, Info, Search } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import { ATTRIBUTE_LABELS, clubOfPlayer } from "@/engine/analysis";
import { LEGEND_LEAGUE_IDS } from "@/engine/manager";
import { referenceDate } from "@/engine/serialize";
import { PLAYER_ATTRS, type Player } from "@/engine/types";
import { ageOn, foldText } from "@/engine/util";
import { getDatasetMeta, store, useDataVersion, useNations } from "@/lib/engine";
import { lineOfPosition, LINE_LABELS, POSITION_NAMES } from "@/lib/positions";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { playerHref } from "@/lib/routes";
import { IS_DESKTOP_BUILD } from "@/lib/target";

type Row = {
  id: number;
  player: Player;
  name: string;
  search: string;
  club: string;
  league: string;
  legend: boolean;
  nation: string;
  pos: string;
  line: string;
  age: number | null;
};

type Col = { key: string; label: string; title?: string; align?: "left" | "right"; get: (r: Row) => string | number | null; text?: boolean };
const num = (get: (p: Player) => number | null | undefined) => (r: Row) => get(r.player) ?? null;

const BASIC: Col[] = [
  { key: "club", label: "Đội", get: (r) => r.club, text: true },
  { key: "league", label: "Giải", get: (r) => r.league, text: true },
  { key: "nation", label: "Quốc tịch", get: (r) => r.nation, text: true },
  { key: "pos", label: "Vị trí", get: (r) => r.pos, text: true },
  { key: "age", label: "Tuổi", get: (r) => r.age },
  { key: "overall", label: "OVR", title: "Chỉ số tổng", get: num((p) => p.overall) },
  { key: "potential", label: "POT", title: "Tiềm năng", get: num((p) => p.potential) },
  { key: "foot", label: "Chân", title: "Chân thuận", get: (r) => (r.player.preferred_foot === 1 ? "Phải" : r.player.preferred_foot === 2 ? "Trái" : null), text: true },
  { key: "weak_foot", label: "Chân yếu", title: "Sao chân yếu", get: num((p) => p.weak_foot) },
  { key: "skill_moves", label: "Kỹ thuật", title: "Sao kỹ thuật", get: num((p) => (p.skill_moves != null ? p.skill_moves + 1 : null)) },
  { key: "height", label: "Cao", title: "Chiều cao (cm)", get: num((p) => p.height) },
  { key: "weight", label: "Nặng", title: "Cân nặng (kg)", get: num((p) => p.weight) },
  { key: "international_rep", label: "Danh tiếng", title: "Danh tiếng quốc tế (1-5 sao)", get: num((p) => p.international_rep) },
  { key: "contract_until", label: "HĐ đến", title: "Năm hết hợp đồng", get: num((p) => p.contract_until) },
];
const FACE: Col[] = [
  ["pac_div", "PAC", "Tốc độ (TM: bay người)"], ["sho_han", "SHO", "Sút (TM: bắt bóng)"], ["pas_kic", "PAS", "Chuyền (TM: phát bóng)"],
  ["dri_ref", "DRI", "Rê bóng (TM: phản xạ)"], ["def_spe", "DEF", "Phòng ngự (TM: tốc độ)"], ["phy_pos", "PHY", "Thể chất (TM: chọn vị trí)"],
].map(([key, label, title]) => ({ key, label, title, get: num((p) => p[key as keyof Player] as number | null) }));
const DETAIL: Col[] = PLAYER_ATTRS.map((key) => ({ key, label: ATTRIBUTE_LABELS[key] ?? key, get: num((p) => p[key]) }));

const SETS = [
  { id: "basic", label: "Cơ bản", cols: BASIC },
  { id: "face", label: "+ 6 chỉ số chính", cols: [...BASIC.slice(0, 7), ...FACE] },
  { id: "detail", label: "+ 34 chỉ số chi tiết", cols: [...BASIC.slice(0, 7), ...FACE, ...DETAIL] },
] as const;

const PAGE = 50;
// Huyền thoại (Classic League) và các đội đặc biệt của game (đội 5v5, "Giải khác", nhóm huấn luyện viên tự do) không phải cầu thủ thi đấu thật.
const SPECIAL_LEAGUE_IDS = new Set([...LEGEND_LEAGUE_IDS, 2240]);
const SPECIAL_TEAMS = new Set(["Các huấn luyện viên tự do"]);
const ovrClass = (v: number | null) =>
  v === null ? "" : v >= 85 ? "bg-emerald-600 text-white" : v >= 75 ? "bg-emerald-500/20 text-emerald-800 dark:text-emerald-300" : v >= 65 ? "bg-amber-400/20 text-amber-800 dark:text-amber-300" : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";

function cell(c: Col, r: Row) {
  const v = c.get(r);
  if (v === null || v === "") return "–";
  if (c.key === "weak_foot" || c.key === "skill_moves" || c.key === "international_rep") return `${v}★`;
  return v;
}

export function PlayersExplorer() {
  const version = useDataVersion();
  const nations = useNations();
  const meta = getDatasetMeta();
  const [q, setQ] = useState("");
  const [line, setLine] = useState("");
  const [league, setLeague] = useState("");
  const [nation, setNation] = useState("");
  const [club, setClub] = useState("");
  const [minOvr, setMinOvr] = useState("");
  const [minPot, setMinPot] = useState("");
  const [minAge, setMinAge] = useState("");
  const [maxAge, setMaxAge] = useState("");
  const [legends, setLegends] = useState(false);
  const [setId, setSetId] = useState<(typeof SETS)[number]["id"]>("basic");
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 }>({ key: "overall", dir: -1 });
  const [pageState, setPageState] = useState({ page: 0, sig: "" });
  const dq = useDeferredValue(q);

  const rows = useMemo<Row[]>(() => {
    const ref = referenceDate(store);
    const out: Row[] = [];
    for (const p of store.data.players.values()) {
      const club = clubOfPlayer(store, p.player_id);
      const code = p.primary_position;
      out.push({
        id: p.player_id,
        player: p,
        name: p.name ?? `#${p.player_id}`,
        search: p.name_search ?? foldText(p.name ?? ""),
        club: club?.team.name ?? "",
        league: club?.leagueName ?? "",
        legend: (club?.leagueId != null && SPECIAL_LEAGUE_IDS.has(club.leagueId)) || SPECIAL_TEAMS.has(club?.team.name ?? ""),
        nation: p.nationality_id !== null ? nations.get(p.nationality_id) ?? `#${p.nationality_id}` : "",
        pos: code !== null ? POSITION_NAMES[code] ?? "?" : "",
        line: code !== null ? lineOfPosition(code) ?? "" : "",
        age: ageOn(p.birth_date, ref),
      });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, nations]);

  const leagues = useMemo(() => [...new Set(rows.map((r) => r.league).filter(Boolean))].sort(), [rows]);
  const nationList = useMemo(() => [...new Set(rows.map((r) => r.nation).filter(Boolean))].sort((a, b) => a.localeCompare(b, "vi")), [rows]);
  // Câu lạc bộ gợi ý theo giải đang chọn (chưa chọn giải thì gồm mọi đội, không tính đội huyền thoại/đặc biệt trừ khi bật).
  const clubList = useMemo(
    () => [...new Set(rows.filter((r) => (legends || !r.legend) && (!league || r.league === league)).map((r) => r.club).filter(Boolean))].sort((a, b) => a.localeCompare(b, "vi")),
    [rows, league, legends],
  );

  const cols = SETS.find((s) => s.id === setId)!.cols as readonly Col[];
  const filtered = useMemo(() => {
    const words = foldText(dq).split(" ").filter(Boolean);
    const n = (s: string) => (s.trim() === "" ? null : Number(s));
    const nationFold = foldText(nation), clubFold = foldText(club);
    const [o, pt, a1, a2] = [n(minOvr), n(minPot), n(minAge), n(maxAge)];
    const list = rows.filter((r) => {
      if (words.length && !words.every((w) => r.search.includes(w) || foldText(r.club).includes(w))) return false;
      if (!legends && r.legend) return false;
      if (line && r.line !== line) return false;
      if (league && r.league !== league) return false;
      if (nationFold && !foldText(r.nation).includes(nationFold)) return false;
      if (clubFold && !foldText(r.club).includes(clubFold)) return false;
      if (o !== null && r.player.overall < o) return false;
      if (pt !== null && (r.player.potential ?? 0) < pt) return false;
      if (a1 !== null && (r.age ?? -1) < a1) return false;
      if (a2 !== null && (r.age ?? 999) > a2) return false;
      return true;
    });
    const col = [...BASIC, ...FACE, ...DETAIL, { key: "name", label: "", get: (r: Row) => r.name, text: true } as Col].find((c) => c.key === sort.key);
    if (!col) return list;
    return list.sort((x, y) => {
      const a = col.get(x), b = col.get(y);
      if (a === null || a === "") return b === null || b === "" ? 0 : 1;
      if (b === null || b === "") return -1;
      const d = typeof a === "number" && typeof b === "number" ? a - b : String(a).localeCompare(String(b), "vi");
      return d * sort.dir || x.id - y.id;
    });
  }, [rows, dq, line, league, nation, minOvr, minPot, minAge, maxAge, legends, sort, club]);

  // Đổi bộ lọc/sắp xếp thì quay về trang đầu (không cần effect: so chữ ký bộ lọc đã lưu cùng số trang).
  const sig = JSON.stringify([dq, line, league, nation, club, minOvr, minPot, minAge, maxAge, legends, sort, setId]);
  const page = pageState.sig === sig ? pageState.page : 0;
  const setPage = (n: number) => setPageState({ page: n, sig });
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const shown = filtered.slice(page * PAGE, page * PAGE + PAGE);
  const toggle = (key: string, text?: boolean) => setSort((s) => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: text ? 1 : -1 }));
  const input = "rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900";

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-48 flex-1 text-xs text-zinc-500">
          Tìm cầu thủ hoặc đội
          <span className="relative mt-1 block">
            <Search size={14} className="pointer-events-none absolute left-2.5 top-2.5 text-zinc-400" aria-hidden="true" />
            <input className={`${input} w-full pl-8`} placeholder="Ví dụ: Haaland, Real Madrid" value={q} onChange={(e) => setQ(e.target.value)} />
          </span>
        </label>
        <label className="text-xs text-zinc-500">Tuyến
          <select className={`${input} mt-1 block`} value={line} onChange={(e) => setLine(e.target.value)}>
            <option value="">Tất cả</option>
            {Object.entries(LINE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <label className="text-xs text-zinc-500">Giải
          <select className={`${input} mt-1 block max-w-44`} value={league} onChange={(e) => { setLeague(e.target.value); setClub(""); }}>
            <option value="">Tất cả</option>
            {leagues.map((l) => <option key={l}>{l}</option>)}
          </select>
        </label>
        <label className="text-xs text-zinc-500">Câu lạc bộ{league ? ` (${league})` : ""}
          <input className={`${input} mt-1 block w-48`} list="club-options" placeholder="Gõ để tìm đội" value={club} onChange={(e) => setClub(e.target.value)} />
          <datalist id="club-options">{clubList.map((l) => <option key={l} value={l} />)}</datalist>
        </label>
        <label className="text-xs text-zinc-500">Quốc gia
          <input className={`${input} mt-1 block w-40`} list="nation-options" placeholder="Gõ để tìm nước" value={nation} onChange={(e) => setNation(e.target.value)} />
          <datalist id="nation-options">{nationList.map((l) => <option key={l} value={l} />)}</datalist>
        </label>
        {([["OVR ≥", minOvr, setMinOvr], ["POT ≥", minPot, setMinPot], ["Tuổi từ", minAge, setMinAge], ["đến", maxAge, setMaxAge]] as const).map(([label, value, set]) => (
          <label key={label} className="text-xs text-zinc-500">{label}
            <input className={`${input} mt-1 block w-20`} inputMode="numeric" value={value} onChange={(e) => set(e.target.value.replace(/\D/g, ""))} />
          </label>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-xs text-zinc-500">Cột hiển thị:</span>
        {SETS.map((s) => (
          <button key={s.id} type="button" onClick={() => setSetId(s.id)} aria-pressed={setId === s.id}
            className={`rounded-full border px-3 py-1 ${setId === s.id ? "border-emerald-600 bg-emerald-600 text-white" : "border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"}`}>
            {s.label}
          </button>
        ))}
        <label className="ml-2 inline-flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
          <input type="checkbox" checked={legends} onChange={(e) => setLegends(e.target.checked)} />
          Gồm huyền thoại và đội đặc biệt
        </label>
        <span data-testid="count" className="ml-auto text-xs text-zinc-500 tabular-nums">{filtered.length.toLocaleString("vi-VN")} cầu thủ</span>
      </div>

      <div className="mt-3 overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
        <table className="w-full min-w-max text-sm">
          <thead className="bg-zinc-50 text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
            <tr>
              {[{ key: "name", label: "Cầu thủ", text: true } as Col, ...cols].map((c) => (
                <th key={c.key} title={c.title} scope="col" className={`whitespace-nowrap px-3 py-2 ${c.text ? "text-left" : "text-right"} ${c.key === "name" ? "sticky left-0 bg-zinc-50 dark:bg-zinc-900" : ""}`}
                  aria-sort={sort.key === c.key ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
                  <button type="button" onClick={() => toggle(c.key, c.text)} className="inline-flex items-center gap-1 font-semibold hover:text-current">
                    {c.label}
                    {sort.key === c.key && (sort.dir === 1 ? <ArrowUp size={12} aria-hidden="true" /> : <ArrowDown size={12} aria-hidden="true" />)}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id} className="border-t border-zinc-100 hover:bg-zinc-50 dark:border-zinc-800/70 dark:hover:bg-zinc-900/60">
                <td className="sticky left-0 whitespace-nowrap bg-white px-3 py-1.5 font-medium dark:bg-zinc-950">
                  <Link href={playerHref(r.id)} className="inline-flex items-center gap-2 hover:underline">
                    <PlayerAvatar playerId={r.id} name={r.name} line={r.line} />
                    {r.name}
                  </Link>
                </td>
                {cols.map((c) => (
                  <td key={c.key} className={`whitespace-nowrap px-3 py-1.5 ${c.text ? "text-left" : "text-right tabular-nums"}`}>
                    {c.key === "overall" ? <span className={`inline-block min-w-8 rounded px-1.5 py-0.5 text-center font-semibold ${ovrClass(r.player.overall)}`}>{r.player.overall}</span> : cell(c, r)}
                  </td>
                ))}
              </tr>
            ))}
            {shown.length === 0 && (
              <tr><td colSpan={cols.length + 1} className="px-3 py-8 text-center text-zinc-500">Không có cầu thủ nào khớp bộ lọc.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-between text-sm">
        <button type="button" disabled={page === 0} onClick={() => setPage(page - 1)} className="rounded border border-zinc-300 px-3 py-1.5 disabled:opacity-40 dark:border-zinc-700">Trước</button>
        <span className="text-zinc-500 tabular-nums">Trang {page + 1} / {pages}</span>
        <button type="button" disabled={page >= pages - 1} onClick={() => setPage(page + 1)} className="rounded border border-zinc-300 px-3 py-1.5 disabled:opacity-40 dark:border-zinc-700">Sau</button>
      </div>

      <div className="mt-6 flex gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
        <Info size={18} className="mt-0.5 shrink-0 text-amber-600" aria-hidden="true" />
        <div className="space-y-1">
          <p><strong>Giá trị chuyển nhượng và lương chưa có trong bảng.</strong> Các bảng hợp đồng/chuyển nhượng của game chưa được xuất, và chúng tôi không đoán số. Khi có dữ liệu thật, hai cột này sẽ được thêm.</p>
          {IS_DESKTOP_BUILD ? (
            <p className="text-zinc-600 dark:text-zinc-400">Dữ liệu lấy từ bản save bạn đã nhập, tuổi tính theo ngày trong lịch thi đấu của save.</p>
          ) : (
            <p className="text-zinc-600 dark:text-zinc-400">
              Dữ liệu chỉ số trích từ một bản xuất EA SPORTS FC 26 (Career Mode)
              {meta?.referenceDate ? `, tuổi tính tại ngày ${meta.referenceDate}` : ""}. Đây là sản phẩm của người hâm mộ, không liên kết với EA hay các giải đấu; chỉ số có thể khác bản game bạn đang chơi.
              Muốn phân tích đúng save của mình? <Link href="/tai-ung-dung" className="underline">Tải ứng dụng</Link>.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
