import { Article, rowCls, thCls } from "@/components/handbook/Article";
import { GROWTH_MAX_AGE, OLD_AGE, PRIME_END_AGE } from "@/engine/manager";

export const metadata = { title: "Tuổi và tiềm năng · CounterPick FC" };

export default function AgeGuidePage() {
  return (
    <Article
      title="Tuổi và tiềm năng"
      intro="OVR cho biết cầu thủ giỏi đến đâu bây giờ; POT là trần dự kiến; tuổi cho biết còn bao lâu để đạt trần đó và dùng được bao lâu sau đó. Mua cầu thủ là cân ba con số này với mục tiêu của bạn."
    >
      <section>
        <h2 className="text-xl font-semibold">Các nhóm tuổi và cách nhìn</h2>
        <table className="mt-3 w-full text-left text-sm">
          <thead><tr><th className={thCls}>Tuổi</th><th className={thCls}>Nên coi là</th><th className={thCls}>Lưu ý khi mua</th></tr></thead>
          <tbody>
            {[
              [`Tới ${GROWTH_MAX_AGE}`, "Đầu tư và tương lai", "Nhìn khoảng cách POT − OVR và vị trí cầu thủ có chắc suất đá chính không. Công cụ chỉ cộng điểm tiềm năng cho nhóm tuổi này."],
              [`${GROWTH_MAX_AGE + 1}–26`, "Đang lên", "Thường đã gần trần, mua để dùng ngay và vẫn bán lại được giá."],
              [`27–${PRIME_END_AGE}`, "Đỉnh cao", "Dùng tốt nhất ngay, ít rủi ro. Giá thường cao vì chất lượng đã sẵn sàng."],
              [`${OLD_AGE} trở lên`, "Ngắn hạn", "Giá trị sử dụng giảm dần và khó bán lại. Chỉ nên mua khi cần chất lượng ngay và chấp nhận hợp đồng ngắn."],
            ].map(([a, b, c]) => (
              <tr key={a} className={`${rowCls} align-top`}>
                <td className="w-28 py-2 pr-3 font-medium">{a}</td><td className="w-44 py-2 pr-3">{b}</td><td className="py-2 text-zinc-600 dark:text-zinc-400">{c}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-zinc-500">
          Ngưỡng tuổi này là mặc định của công cụ (kinh nghiệm chung). Mỗi vị trí lão hóa khác nhau: thủ môn và trung vệ giữ phong độ lâu hơn cầu thủ dựa vào tốc độ.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Đọc POT cho đúng</h2>
        <ul className="mt-2 list-disc space-y-2 pl-5 text-sm">
          <li><b>POT là trần dự kiến, không phải lời hứa.</b> Cầu thủ có thể không chạm trần nếu ít được ra sân; cũng có thể vượt kỳ vọng khi được đá chính nhiều.</li>
          <li><b>Khoảng cách POT − OVR lớn mà tuổi còn trẻ</b> nghĩa là mất thời gian: hãy tính xem bạn sẵn sàng chờ mấy mùa và trong lúc chờ họ có đá được không.</li>
          <li><b>Cầu thủ đã chạm trần</b> (POT gần bằng OVR) đáng giá ở hiện tại, đừng trả thêm tiền cho “tiềm năng” không còn.</li>
          <li><b>Đừng nhìn POT của cầu thủ lớn tuổi:</b> sau tuổi đỉnh cao, chỉ số có xu hướng giảm chứ không tăng.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Chỉ số nào giảm trước khi lớn tuổi</h2>
        <p className="mt-2 text-sm">
          Nhóm chỉ số thể chất, đặc biệt <b>tốc độ chạy nước rút, tăng tốc và thể lực</b>, thường là thứ giảm sớm nhất. Chuyền bóng, tầm nhìn, bình tĩnh và chọn vị trí thường giữ được lâu hơn.
          Vì vậy cầu thủ lớn tuổi hợp vai trò dựa vào kỹ thuật (tiền vệ kiến thiết, thủ môn, trung vệ đọc tình huống) hơn vai trò dựa vào tốc độ (tiền đạo cánh, hậu vệ biên).
          Đây là xu hướng chung, hãy xem chỉ số cụ thể của từng người.
        </p>
      </section>
    </Article>
  );
}
