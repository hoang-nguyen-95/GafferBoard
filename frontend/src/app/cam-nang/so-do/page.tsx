import { Article } from "@/components/handbook/Article";
import counters from "@/engine/data/counters.json";

export const metadata = { title: "Sơ đồ khắc chế · CounterPick FC" };

const TABLE = (counters as { counters: Record<string, { formation: string; reason: string }[]> }).counters;

export default function FormationsPage() {
  return (
    <Article
      title="Sơ đồ khắc chế"
      intro="Gặp đối thủ đá sơ đồ nào thì nên đá sơ đồ nào? Bảng dưới là kinh nghiệm chung về cách các sơ đồ đối đầu nhau ở trung lộ và hai biên. Công cụ cũng xét các sơ đồ này khi đề xuất đội hình đáp trả, cùng với sơ đồ bạn đang dùng."
    >
      {Object.entries(TABLE).map(([opponent, list]) => (
        <section key={opponent}>
          <h2 className="text-xl font-semibold">Đối thủ đá {opponent}</h2>
          <ul className="mt-2 space-y-2">
            {list.map((c) => (
              <li key={c.formation} className="rounded border border-zinc-200 p-3 text-sm dark:border-zinc-800">
                <b>{c.formation}</b>
                <span className="block text-zinc-600 dark:text-zinc-400">{c.reason}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <p className="text-sm text-zinc-500">
        Sơ đồ chỉ là một phần: đội hình có đủ người hợp sơ đồ đó hay không còn quan trọng hơn. Đừng đổi sơ đồ chỉ vì bảng này nếu bạn không có cầu thủ phù hợp.
      </p>
    </Article>
  );
}
