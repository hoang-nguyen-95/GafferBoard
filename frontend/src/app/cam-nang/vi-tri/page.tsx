import { Article, rowCls, thCls } from "@/components/handbook/Article";
import {
  PENALTY_ALT_POSITION, PENALTY_GK_MISMATCH, PENALTY_OTHER_LINE, PENALTY_SAME_FAMILY, PENALTY_SAME_LINE, PENALTY_SAME_ROLE,
} from "@/engine/lineup";
import { ROLE_ATTRS } from "@/engine/analysis";
import { LINE_LABELS_VI, LINE_OF_ROLE, POSITION_NAMES, ROLE_LABELS_VI, ROLE_POSITIONS, type Role } from "@/engine/positions";
import { labelOf } from "@/handbook/content";

export const metadata = { title: "Vị trí và vai trò · CounterPick FC" };

const ROLES = Object.keys(ROLE_POSITIONS) as Role[];

export default function PositionsPage() {
  return (
    <Article
      title="Vị trí và vai trò"
      intro="Game có 28 mã vị trí. Công cụ gom chúng thành 9 vai trò để đánh giá cầu thủ: cầu thủ được so với các cầu thủ cùng vai trò và nhìn vào những chỉ số then chốt của vai trò đó."
    >
      <section>
        <h2 className="text-xl font-semibold">9 vai trò và chỉ số then chốt</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                <th className={thCls}>Vai trò</th>
                <th className={thCls}>Vị trí trong game</th>
                <th className={thCls}>Chỉ số công cụ xét</th>
              </tr>
            </thead>
            <tbody>
              {ROLES.map((r) => (
                <tr key={r} className={`${rowCls} align-top`}>
                  <td className="py-2 pr-3 font-medium">
                    {ROLE_LABELS_VI[r]}
                    <span className="block text-xs font-normal text-zinc-500">{LINE_LABELS_VI[LINE_OF_ROLE[r]]}</span>
                  </td>
                  <td className="py-2 pr-3 text-xs">{ROLE_POSITIONS[r].map((c) => POSITION_NAMES[c]).join(", ")}</td>
                  <td className="py-2 text-xs text-zinc-600 dark:text-zinc-400">
                    {(ROLE_ATTRS[r] as string[]).map((a) => (a === "height" ? "Chiều cao" : labelOf(a))).join(", ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Đá lệch vị trí thì mất bao nhiêu</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Khi chọn đội hình đáp trả, công cụ trừ điểm OVR của cầu thủ tùy mức lệch so với sở trường (đây là mô hình của công cụ, không phải
          con số của game). Cầu thủ càng lệch thì các điểm cộng theo chỉ số càng bị giảm.
        </p>
        <table className="mt-3 w-full text-left text-sm">
          <thead>
            <tr>
              <th className={thCls}>Tình huống</th>
              <th className={thCls}>Trừ OVR</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["Đúng vị trí sở trường", 0],
              ["Đá cùng họ vị trí (vd CB ↔ LCB/RCB, CM ↔ LCM)", PENALTY_SAME_FAMILY],
              ["Đá vị trí phụ ghi trên thẻ", PENALTY_ALT_POSITION],
              ["Cùng vai trò nhưng khác vị trí (vd RB ↔ LB)", PENALTY_SAME_ROLE],
              ["Cùng tuyến, khác vai trò (vd CM ↔ AM)", PENALTY_SAME_LINE],
              ["Khác tuyến (vd tiền vệ xuống làm trung vệ)", PENALTY_OTHER_LINE],
              ["Thủ môn đá ngoài sân hoặc ngược lại", PENALTY_GK_MISMATCH],
            ].map(([label, pts]) => (
              <tr key={label as string} className={rowCls}>
                <td className="py-2 pr-3">{label}</td>
                <td className="py-2 font-semibold tabular-nums">{pts ? `−${pts}` : "0"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </Article>
  );
}
