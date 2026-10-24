// Diễn giải báo cáo bằng Claude, gọi thẳng từ trình duyệt bằng khóa API của chính người dùng.
// Đây là chức năng DUY NHẤT làm dữ liệu rời khỏi trình duyệt (tới api.anthropic.com), và chỉ khi người dùng bật + bấm nút.
export const DEFAULT_MODEL = "claude-opus-5-5";
const MAX_TOKENS = 2000;

const SYSTEM_PROMPT = `Bạn là trợ lý chiến thuật cho người chơi FC Career Mode. Người dùng đưa cho bạn báo cáo phân tích một đối thủ \
(số liệu, điểm yếu, gợi ý của hệ thống luật, đội hình đáp trả đề xuất).

Nhiệm vụ: diễn giải báo cáo thành kế hoạch trận đấu ngắn gọn, bằng tiếng Việt.
- Chỉ dùng số liệu có trong báo cáo; không bịa chỉ số, cầu thủ hay kết quả. Nếu báo cáo thiếu dữ liệu, nói rõ.
- Nêu 3 điều quan trọng nhất cần làm, mỗi điều kèm chỉ số làm căn cứ.
- Nếu phong độ được ghi là chưa xác nhận, đừng dựa vào đó để kết luận.
- Gợi ý chiến thuật nói bằng lời chung, không giả định tên tùy chọn cụ thể trong menu game.
- Tối đa khoảng 300 từ.`;

export class LlmError extends Error {}

const HTTP_MESSAGES: Record<number, string> = {
  401: "Khóa API không hợp lệ.",
  403: "Khóa API không có quyền dùng mô hình này.",
  404: "Không tìm thấy mô hình này (kiểm tra tên mô hình).",
  429: "Đã chạm giới hạn tốc độ của Claude API, thử lại sau ít phút.",
};

export interface Explanation { text: string; model: string; truncated: boolean }

export async function explainReport(markdown: string, apiKey: string, model = DEFAULT_MODEL, signal?: AbortSignal): Promise<Explanation> {
  if (!apiKey.trim()) throw new LlmError("Chưa nhập khóa API.");
  let res: Response;
  try {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal,
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey.trim(),
        "anthropic-version": "2023-06-01",
        // Khóa là của người dùng và chỉ nằm trong trình duyệt của họ; header này xác nhận việc gọi trực tiếp từ trình duyệt.
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model, max_tokens: MAX_TOKENS, system: SYSTEM_PROMPT, output_config: { effort: "low" },
        messages: [{ role: "user", content: markdown }],
      }),
    });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new LlmError("Không kết nối được tới Claude API (kiểm tra mạng).");
  }
  const body = (await res.json().catch(() => null)) as {
    error?: { message?: string }; content?: { type: string; text?: string }[]; model?: string; stop_reason?: string;
  } | null;
  if (!res.ok) {
    throw new LlmError(HTTP_MESSAGES[res.status] ?? `Claude API từ chối yêu cầu (${res.status}): ${body?.error?.message ?? "không rõ lý do"}`);
  }
  if (body?.stop_reason === "refusal") throw new LlmError("Claude từ chối diễn giải nội dung này.");
  const text = (body?.content ?? []).filter((b) => b.type === "text").map((b) => b.text ?? "").join("").trim();
  if (!text) throw new LlmError("Claude không trả về nội dung.");
  return { text, model: body?.model ?? model, truncated: body?.stop_reason === "max_tokens" };
}
