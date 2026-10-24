// Nội dung cẩm nang. Phần lớn lấy thẳng từ logic của công cụ (src/engine) để cẩm nang và công cụ không bao giờ nói khác nhau;
// chỉ phần mô tả bằng lời (chỉ số làm gì, khi nào luật kích hoạt) viết tay ở đây.
import { ATTRIBUTE_LABELS } from "@/engine/analysis";
import type { Role } from "@/engine/positions";

export type StatGroup = { key: string; title: string; blurb: string; attrs: string[] };

/** Nhóm chỉ số theo cách thẻ cầu thủ chia (PAC/SHO/PAS/DRI/DEF/PHY) và thủ môn. */
export const STAT_GROUPS: StatGroup[] = [
  { key: "PAC", title: "Tốc độ (PAC)", blurb: "Quyết định ai thắng cuộc đua chạy, rất quan trọng với tiền đạo, chạy cánh và trung vệ phải đuổi theo.", attrs: ["acceleration", "sprint_speed"] },
  { key: "SHO", title: "Dứt điểm (SHO)", blurb: "Khả năng ghi bàn từ nhiều khoảng cách và nhiều tình huống.", attrs: ["finishing", "shot_power", "long_shots", "volleys", "penalties", "positioning"] },
  { key: "PAS", title: "Chuyền bóng (PAS)", blurb: "Chất lượng đường chuyền và kiến tạo, từ chuyền ngắn đến tạt, đá phạt.", attrs: ["vision", "short_passing", "long_passing", "crossing", "curve", "free_kick_accuracy"] },
  { key: "DRI", title: "Rê bóng (DRI)", blurb: "Giữ và điều khiển bóng khi bị áp sát, xoay trở và bình tĩnh dưới áp lực.", attrs: ["dribbling", "ball_control", "agility", "balance", "reactions", "composure"] },
  { key: "DEF", title: "Phòng ngự (DEF)", blurb: "Đọc tình huống, cướp và cắt bóng; đánh đầu tính vào đây vì là kỹ năng của người phòng ngự.", attrs: ["defensive_awareness", "interceptions", "standing_tackle", "sliding_tackle", "heading_accuracy"] },
  { key: "PHY", title: "Thể chất (PHY)", blurb: "Sức bền, sức mạnh và không chiến: ảnh hưởng tới đấu tay đôi và việc giữ phong độ suốt trận.", attrs: ["stamina", "strength", "jumping", "aggression"] },
  { key: "GK", title: "Thủ môn", blurb: "Bộ chỉ số riêng của thủ môn, thay cho 6 nhóm ở trên.", attrs: ["gk_diving", "gk_handling", "gk_kicking", "gk_positioning", "gk_reflexes"] },
];

export const ATTRIBUTE_NOTES: Record<string, string> = {
  acceleration: "Độ nhanh trong những bước đầu và khi đổi hướng. Quan trọng khi chạy ngắn, lao vào khoảng trống, bám người.",
  sprint_speed: "Tốc độ tối đa khi chạy thẳng. Quyết định cuộc đua đường dài, bóng chọc khe sau lưng hàng thủ.",
  finishing: "Độ chính xác khi kết thúc trong vòng cấm. Chỉ số quan trọng nhất của tiền đạo cắm.",
  shot_power: "Lực sút. Cần cho các cú sút xa và sút từ vị trí khó.",
  long_shots: "Độ chính xác khi sút ngoài vòng cấm. Hữu ích với tiền vệ và khi đối thủ có thủ môn yếu phản xạ.",
  volleys: "Chạm bóng khi bóng đang bay hoặc nảy (vô lê, tung người). Hay dùng sau tạt bóng.",
  penalties: "Độ chính xác khi đá penalty.",
  positioning: "Chọn vị trí khi tấn công: tìm khoảng trống để nhận bóng và dứt điểm.",
  vision: "Nhìn ra và thực hiện đường chuyền xuyên tuyến. Chỉ số cốt lõi của tiền vệ kiến thiết.",
  short_passing: "Độ chính xác chuyền ngắn. Nền tảng của lối chơi kiểm soát bóng.",
  long_passing: "Độ chính xác chuyền dài. Cần cho trung vệ phát động, tiền vệ chuyển hướng tấn công.",
  crossing: "Chất lượng tạt bóng từ biên. Cần cho hậu vệ biên, tiền vệ cánh.",
  curve: "Độ xoáy của bóng, ảnh hưởng tới cú sút, tạt và đá phạt có đường cong.",
  free_kick_accuracy: "Độ chính xác khi đá phạt trực tiếp.",
  dribbling: "Rê bóng ở tốc độ, qua người khi 1 đấu 1.",
  ball_control: "Khống chế bóng khi nhận, giữ bóng trong chân khi bị áp sát.",
  agility: "Nhanh nhẹn, xoay trở nhanh. Quan trọng với cầu thủ nhỏ con, chạy cánh và rê bóng.",
  balance: "Thăng bằng: giữ vững khi bị va chạm hoặc đổi hướng gấp.",
  reactions: "Phản ứng với tình huống bất ngờ, ảnh hưởng tới thời điểm xử lý.",
  composure: "Bình tĩnh dưới áp lực: giữ độ chính xác khi bị áp sát, nhất là lúc dứt điểm và chuyền.",
  defensive_awareness: "Ý thức phòng ngự: chọn vị trí, kèm người, giữ đội hình khi phòng thủ.",
  interceptions: "Cắt bóng: đọc và chặn đường chuyền của đối phương.",
  standing_tackle: "Tắc bóng đứng: lấy bóng mà không cần xoạc.",
  sliding_tackle: "Xoạc bóng: lấy bóng khi lao xuống, rủi ro phạm lỗi cao hơn.",
  heading_accuracy: "Độ chính xác khi đánh đầu, cả khi dứt điểm lẫn phá bóng.",
  stamina: "Thể lực: giữ được tốc độ và cường độ suốt trận, ít hụt hơi ở hiệp hai.",
  strength: "Sức mạnh: thắng va chạm, che chắn bóng và tì đè.",
  jumping: "Bật nhảy: quyết định thắng bóng bổng, tạt bóng, phạt góc.",
  aggression: "Quyết liệt: mức độ tranh chấp, lao vào cướp bóng (cao quá dễ dính thẻ).",
  gk_diving: "Bay người cản các cú sút sang hai bên.",
  gk_handling: "Bắt bóng chắc tay, ít để bóng bật ra.",
  gk_kicking: "Phát bóng và ném bóng: chất lượng, độ xa khi thủ môn phát động tấn công.",
  gk_positioning: "Chọn vị trí đứng, ra vào khung thành đúng lúc.",
  gk_reflexes: "Phản xạ với các cú sút gần, bất ngờ.",
};

export const HEIGHT_NOTE = "Chiều cao (cm) không phải chỉ số đánh giá nhưng ảnh hưởng tới bóng bổng: công cụ dùng nó khi xét hàng thủ cao hay thấp.";

export const labelOf = (key: string): string => ATTRIBUTE_LABELS[key] ?? key;

/** Khi nào mỗi luật gợi ý được kích hoạt (khớp điều kiện trong engine/rules.ts). */
export const RULE_TRIGGERS: Record<string, string> = {
  slow_defence: "Tốc độ chạy trung bình của hàng thủ đối thủ thuộc nhóm thấp trong giải (phân vị ≤ 25), hoặc hàng công của bạn nhanh hơn từ 4 điểm trở lên.",
  weak_flank: "Một biên của đối thủ có điểm phòng ngự thấp trong giải (phân vị ≤ 25), hoặc hai biên của họ chênh nhau từ 8 điểm phòng ngự trở lên.",
  weak_midfield: "Điểm phòng ngự tiền vệ (cắt bóng, tắc bóng, ý thức phòng ngự) của đối thủ thấp trong giải (phân vị ≤ 25).",
  fast_striker: "Hàng công đối thủ nhanh thuộc nhóm cao trong giải (phân vị ≥ 75), hoặc tiền đạo nhanh nhất của họ nhanh hơn hàng thủ của bạn từ 6 điểm trở lên.",
  weak_goalkeeper: "Phản xạ hoặc bóng bổng của thủ môn đối thủ thấp trong giải (phân vị ≤ 25).",
  aerial_threat: "Hàng thủ đối thủ vừa cao vừa không chiến tốt (cả hai phân vị ≥ 75); nếu chưa có phân vị thì đội hình họ cao hơn bạn từ 4 cm trở lên.",
  weak_aerial_defence: "Hàng thủ đối thủ vừa thấp vừa không chiến yếu (cả hai phân vị ≤ 25).",
  tired_team: "Thể lực trung bình của đội hình xuất phát đối thủ thấp trong giải (phân vị ≤ 25).",
  injured_starters: "Có cầu thủ đá chính của đối thủ đang chấn thương.",
  thin_bench: "Chất lượng các cầu thủ dự bị tốt nhất của đối thủ thấp trong giải (phân vị ≤ 25).",
  key_players: "Luôn xét khi có cầu thủ tấn công hoặc kiến tạo nổi bật trong đội hình đối thủ.",
};

/** Cách tính các chỉ số đội (khớp computeMetrics trong engine/opponent.ts). */
export const METRIC_NOTES: Record<string, string> = {
  def_pace: "Trung bình tốc độ chạy của các hậu vệ ra sân (đá 3 trung vệ thì không tính hậu vệ biên chạy cánh).",
  def_accel: "Trung bình tăng tốc của các hậu vệ ra sân.",
  def_slowest: "Tốc độ của hậu vệ chậm nhất: điểm để chọc khe vào.",
  def_height: "Chiều cao trung bình của hàng thủ.",
  def_aerial: "Trung bình của bật nhảy, đánh đầu và sức mạnh của hàng thủ.",
  gk_reflexes: "Trung bình phản xạ và bay người của thủ môn.",
  gk_aerial: "Trung bình bật nhảy, bắt bóng và chọn vị trí của thủ môn.",
  mid_defense: "Trung bình cắt bóng, tắc bóng, ý thức phòng ngự của các tiền vệ phòng ngự (không có thì tiền vệ trung tâm).",
  flank_left_defense: "Điểm phòng ngự của hậu vệ biên trái: ý thức phòng ngự, tắc bóng, cắt bóng, tốc độ.",
  flank_right_defense: "Điểm phòng ngự của hậu vệ biên phải, tính như biên trái.",
  team_height: "Chiều cao trung bình cả 11 người ra sân.",
  team_stamina: "Thể lực trung bình cả 11 người ra sân.",
  att_pace: "Trung bình tốc độ chạy của hàng công.",
  att_finishing: "Trung bình dứt điểm của hàng công.",
  xi_overall: "OVR trung bình đội hình xuất phát.",
  bench_quality: "OVR trung bình của tối đa 7 cầu thủ dự bị tốt nhất (không tính người chấn thương).",
  depth_drop: "Chênh lệch giữa OVR đội hình chính và dự bị: càng lớn thì thay người càng làm đội yếu đi.",
};


/** Khi mua cầu thủ ở từng vai trò: nên nhìn gì, nên tránh gì. Kinh nghiệm chung, không phải số liệu của game. */
export const ROLE_BUYING_NOTES: Record<Role, { look: string; avoid: string }> = {
  GK: {
    look: "Phản xạ, bay người và chọn vị trí là cốt lõi; thêm bắt bóng chắc tay. Thủ môn chín muồi muộn nên tuổi 28–34 vẫn là đỉnh cao.",
    avoid: "Đừng chỉ nhìn OVR tổng: thủ môn yếu phản xạ nhưng bóng bổng tốt sẽ bị sút xa hạ gục. Phát bóng kém làm lối chơi phát động chậm.",
  },
  CB: {
    look: "Ý thức phòng ngự, cắt bóng, tắc bóng, sức mạnh, bật nhảy và đánh đầu. Nếu đá cao hàng thủ thì cần thêm tốc độ để đuổi bóng sau lưng.",
    avoid: "Trung vệ chậm và cao to dễ bị khoét khi hàng thủ dâng cao; trung vệ nhanh nhưng yếu không chiến dễ thua bóng bổng và phạt góc.",
  },
  FB: {
    look: "Tốc độ, tăng tốc, thể lực để lên xuống cả trận; tắc bóng và ý thức phòng ngự để không bị bỏ lại; tạt bóng nếu đội đá biên nhiều.",
    avoid: "Hậu vệ biên nhiều thể lực nhưng yếu phòng ngự chỉ hợp khi có tiền vệ phòng ngự che chắn phía sau.",
  },
  DM: {
    look: "Cắt bóng, tắc bóng, ý thức phòng ngự, sức mạnh và thể lực; chuyền ngắn đủ tốt để đưa bóng lên an toàn.",
    avoid: "Quyết liệt quá cao dễ dính thẻ. Đừng mua tiền vệ thiên công rồi mong họ làm việc phòng ngự.",
  },
  CM: {
    look: "Chuyền ngắn và dài, tầm nhìn, kiểm soát bóng, rê bóng và thể lực. Tiền vệ trung tâm là vị trí cần cân bằng nhất.",
    avoid: "Tránh người chỉ có một mặt mạnh (chỉ chuyền hoặc chỉ chạy) khi đội chỉ có 2–3 tiền vệ.",
  },
  WM: {
    look: "Tạt bóng, rê bóng, tốc độ và tăng tốc, nhanh nhẹn; thêm chuyền ngắn để phối hợp với hậu vệ biên.",
    avoid: "Tiền vệ cánh chậm và yếu rê bóng khó tạo khác biệt ở biên.",
  },
  AM: {
    look: "Tầm nhìn, chuyền ngắn, kiểm soát bóng, rê bóng, nhanh nhẹn, bình tĩnh; sút xa và dứt điểm là điểm cộng.",
    avoid: "Người rê bóng đẹp nhưng yếu chuyền sẽ giữ bóng quá lâu; kiểm tra thể lực nếu đội pressing nhiều.",
  },
  W: {
    look: "Tốc độ, tăng tốc, rê bóng, kiểm soát bóng, nhanh nhẹn; dứt điểm và bình tĩnh để biến cơ hội thành bàn thắng.",
    avoid: "Tiền đạo cánh nhanh nhưng yếu dứt điểm và chuyền sẽ chạy nhiều mà ít sản phẩm.",
  },
  ST: {
    look: "Dứt điểm, chọn vị trí, bình tĩnh, lực sút; thêm tốc độ nếu đội chọc khe, đánh đầu và sức mạnh nếu đội tạt bóng nhiều.",
    avoid: "Đừng mua tiền đạo chỉ vì OVR cao nếu lối chơi của đội không phục vụ được kiểu cầu thủ đó (vd cao to đánh đầu nhưng đội đá dưới thấp).",
  },
};
