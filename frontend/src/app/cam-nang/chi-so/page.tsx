import { Article, rowCls } from "@/components/handbook/Article";
import { ROLE_ATTRS } from "@/engine/analysis";
import { ROLE_LABELS_VI, type Role } from "@/engine/positions";
import { ATTRIBUTE_NOTES, HEIGHT_NOTE, STAT_GROUPS, labelOf } from "@/handbook/content";

export const metadata = { title: "Chỉ số cầu thủ · CounterPick FC" };

const rolesFor = (attr: string): string[] =>
  (Object.keys(ROLE_ATTRS) as Role[]).filter((r) => (ROLE_ATTRS[r] as string[]).includes(attr)).map((r) => ROLE_LABELS_VI[r]);

export default function AttributesPage() {
  return (
    <Article
      title="Chỉ số cầu thủ"
      intro="Mỗi cầu thủ có hàng chục chỉ số chi tiết, gộp thành 6 nhóm trên thẻ (hoặc bộ chỉ số riêng với thủ môn). Cột cuối cho biết công cụ xem chỉ số đó là quan trọng với những vai trò nào khi so một cầu thủ với các cầu thủ cùng vị trí."
    >
      {STAT_GROUPS.map((g) => (
        <section key={g.key} id={g.key.toLowerCase()}>
          <h2 className="text-xl font-semibold">{g.title}</h2>
          <p className="mt-1 text-sm text-zinc-500">{g.blurb}</p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <tbody>
                {g.attrs.map((a) => (
                  <tr key={a} className={`${rowCls} align-top`}>
                    <td className="w-44 py-2 pr-3 font-medium">{labelOf(a)}</td>
                    <td className="py-2 pr-3">{ATTRIBUTE_NOTES[a]}</td>
                    <td className="w-56 py-2 text-xs text-zinc-500">{rolesFor(a).join(", ") || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
      <section>
        <h2 className="text-xl font-semibold">Chiều cao</h2>
        <p className="mt-1 text-sm">{HEIGHT_NOTE}</p>
      </section>
    </Article>
  );
}
