import { Brain, Timer, TrendingDown, TrendingUp } from "lucide-react";
import { AgeTimeline } from "@/components/brand/Graphics";
import { Callout, IconTile, SectionTitle, TONES, type Tone } from "@/components/brand/ui";
import { Article } from "@/components/handbook/Article";
import { GROWTH_MAX_AGE, OLD_AGE, PRIME_END_AGE } from "@/engine/manager";

export const metadata = { title: "Tuổi và tiềm năng · CounterPick FC" };

const BANDS: { age: string; title: string; text: string; tone: Tone }[] = [
  { age: `Tới ${GROWTH_MAX_AGE}`, title: "Đầu tư và tương lai", text: "Nhìn khoảng cách POT − OVR và vị trí cầu thủ có chắc suất đá chính không. Công cụ chỉ cộng điểm tiềm năng cho nhóm tuổi này.", tone: "sky" },
  { age: `${GROWTH_MAX_AGE + 1}–26`, title: "Đang lên", text: "Thường đã gần trần, mua để dùng ngay và vẫn bán lại được giá.", tone: "emerald" },
  { age: `27–${PRIME_END_AGE}`, title: "Đỉnh cao", text: "Dùng tốt nhất ngay, ít rủi ro. Giá thường cao vì chất lượng đã sẵn sàng.", tone: "emerald" },
  { age: `${OLD_AGE}+`, title: "Ngắn hạn", text: "Giá trị sử dụng giảm dần và khó bán lại. Chỉ mua khi cần chất lượng ngay và chấp nhận hợp đồng ngắn.", tone: "amber" },
];

export default function AgeGuidePage() {
  return (
    <Article
      title="Tuổi và tiềm năng"
      icon={Timer}
      intro="OVR cho biết cầu thủ giỏi đến đâu bây giờ; POT là trần dự kiến; tuổi cho biết còn bao lâu để đạt trần đó và dùng được bao lâu sau đó. Mua cầu thủ là cân ba con số này với mục tiêu của bạn."
    >
      <section>
        <SectionTitle icon={Timer} tone="amber">Các nhóm tuổi và cách nhìn</SectionTitle>
        <div className="mt-5"><AgeTimeline /></div>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {BANDS.map((b) => (
            <li key={b.age} className={`rounded-2xl border bg-white p-4 shadow-sm dark:bg-zinc-900/60 ${TONES[b.tone].border}`}>
              <p className="flex items-baseline gap-2">
                <span className={`rounded-lg px-2 py-0.5 text-sm font-bold ${TONES[b.tone].tile}`}>{b.age}</span>
                <span className="font-semibold">{b.title}</span>
              </p>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{b.text}</p>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-zinc-500">
          Ngưỡng tuổi này là mặc định của công cụ (kinh nghiệm chung). Mỗi vị trí lão hóa khác nhau: thủ môn và trung vệ giữ phong độ lâu hơn cầu thủ dựa vào tốc độ.
        </p>
      </section>

      <section>
        <SectionTitle icon={TrendingUp} tone="sky">Đọc POT cho đúng</SectionTitle>
        <ul className="mt-4 grid gap-3">
          {[
            ["POT là trần dự kiến, không phải lời hứa.", "Cầu thủ có thể không chạm trần nếu ít được ra sân; cũng có thể vượt kỳ vọng khi được đá chính nhiều."],
            ["Khoảng cách POT − OVR lớn mà tuổi còn trẻ nghĩa là mất thời gian.", "Hãy tính bạn sẵn sàng chờ mấy mùa và trong lúc chờ họ có đá được không."],
            ["Cầu thủ đã chạm trần (POT gần bằng OVR) đáng giá ở hiện tại.", "Đừng trả thêm tiền cho “tiềm năng” không còn."],
            ["Đừng nhìn POT của cầu thủ lớn tuổi.", "Sau tuổi đỉnh cao, chỉ số có xu hướng giảm chứ không tăng."],
          ].map(([a, b]) => (
            <li key={a} className="flex gap-3 rounded-xl border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900/60">
              <IconTile icon={Brain} tone="sky" size="sm" />
              <p><b>{a}</b> <span className="text-zinc-600 dark:text-zinc-400">{b}</span></p>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <SectionTitle icon={TrendingDown} tone="rose">Chỉ số nào giảm trước khi lớn tuổi</SectionTitle>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4 dark:border-rose-900 dark:bg-rose-950/30">
            <p className="font-semibold text-rose-700 dark:text-rose-300">Thường giảm sớm</p>
            <p className="mt-1 text-sm">Tốc độ chạy nước rút, tăng tốc, thể lực. Vai trò dựa vào tốc độ (tiền đạo cánh, hậu vệ biên) chịu ảnh hưởng nhiều nhất.</p>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
            <p className="font-semibold text-emerald-700 dark:text-emerald-300">Thường giữ lâu</p>
            <p className="mt-1 text-sm">Chuyền bóng, tầm nhìn, bình tĩnh, chọn vị trí. Hợp với tiền vệ kiến thiết, thủ môn, trung vệ đọc tình huống.</p>
          </div>
        </div>
        <div className="mt-4"><Callout icon={Brain} tone="amber">Đây là xu hướng chung, hãy xem chỉ số cụ thể của từng người.</Callout></div>
      </section>
    </Article>
  );
}
