import { Article } from "@/components/handbook/Article";
import { RULES } from "@/engine/rules";
import { RULE_TRIGGERS, labelOf } from "@/handbook/content";

export const metadata = { title: "Gợi ý đấu pháp · CounterPick FC" };

export default function TacticsPage() {
  return (
    <Article
      title="Gợi ý đấu pháp"
      intro="Công cụ xét 11 tình huống của đối thủ. Mỗi tình huống chỉ được nêu khi số liệu thật sự cho thấy nó, kèm lý do bằng chỉ số. Dưới đây là toàn bộ: khi nào nó kích hoạt và nên làm gì. Thứ tự là mức ưu tiên cơ bản, mức ưu tiên thực tế còn tùy tình huống rõ rệt đến đâu."
    >
      {RULES.map((rule, i) => (
        <section key={rule.id} id={rule.id}>
          <h2 className="text-xl font-semibold">
            {i + 1}. {rule.title}
          </h2>
          <p className="mt-2 text-sm">
            <b>Khi nào:</b> {RULE_TRIGGERS[rule.id]}
          </p>
          <p className="mt-2">{rule.advice}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {rule.tactics.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          {rule.emphasis && Object.keys(rule.emphasis).length > 0 && (
            <p className="mt-2 text-xs text-zinc-500">
              Khi chọn đội hình đáp trả, công cụ ưu tiên thêm:{" "}
              {Object.entries(rule.emphasis)
                .map(([line, attrs]) => `${{ ATT: "hàng công", MID: "tiền vệ", DEF: "hàng thủ" }[line] ?? line}: ${Object.keys(attrs).map(labelOf).join(", ")}`)
                .join(" · ")}
              .
            </p>
          )}
        </section>
      ))}
      <section>
        <h2 className="text-xl font-semibold">Lưu ý khi áp dụng</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          <li>Đây là gợi ý chung bằng lời, không gắn với tên tùy chọn cụ thể trong menu chiến thuật vì tên menu thay đổi theo bản game.</li>
          <li>Đối chiếu với trận đấu thật: một đội có số liệu hàng thủ chậm vẫn có thể phòng ngự tốt nhờ lùi sâu.</li>
          <li>Phân vị so với các đội cùng giải. Khi chưa có đủ đội để so, công cụ chỉ so trực tiếp với đội của bạn.</li>
        </ul>
      </section>
    </Article>
  );
}
