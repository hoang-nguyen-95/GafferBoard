import { Article } from "@/components/handbook/Article";
import { ROLE_ATTRS } from "@/engine/analysis";
import { LINE_LABELS_VI, LINE_OF_ROLE, ROLE_LABELS_VI, ROLE_POSITIONS, POSITION_NAMES, type Role } from "@/engine/positions";
import { ROLE_BUYING_NOTES, labelOf } from "@/handbook/content";

export const metadata = { title: "Mua theo vị trí · CounterPick FC" };

const ROLES = Object.keys(ROLE_POSITIONS) as Role[];

export default function BuyByRolePage() {
  return (
    <Article
      title="Mua theo vị trí"
      intro="Mỗi vị trí cần một bộ chỉ số khác nhau. Dưới đây là chỉ số công cụ xét cho từng vai trò và những điều nên nhìn hoặc nên tránh khi mua."
    >
      {ROLES.map((r) => (
        <section key={r} id={r.toLowerCase()}>
          <h2 className="text-xl font-semibold">{ROLE_LABELS_VI[r]}</h2>
          <p className="text-xs text-zinc-500">
            {LINE_LABELS_VI[LINE_OF_ROLE[r]]} · vị trí: {ROLE_POSITIONS[r].map((c) => POSITION_NAMES[c]).join(", ")}
          </p>
          <p className="mt-2 text-sm"><b>Chỉ số công cụ xét:</b> {(ROLE_ATTRS[r] as string[]).map((a) => (a === "height" ? "Chiều cao" : labelOf(a))).join(", ")}.</p>
          <p className="mt-2 text-sm"><b>Nên nhìn:</b> {ROLE_BUYING_NOTES[r].look}</p>
          <p className="mt-2 text-sm"><b>Nên tránh:</b> {ROLE_BUYING_NOTES[r].avoid}</p>
        </section>
      ))}
    </Article>
  );
}
