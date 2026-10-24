"""Diễn giải phân tích bằng LLM (Giai đoạn 8, TÙY CHỌN, mặc định tắt).

Khi bật, nội dung báo cáo phân tích (số liệu cầu thủ/đội, ghi chú cá nhân nếu có) được gửi tới Claude API: đây là
chức năng duy nhất làm dữ liệu rời khỏi máy. Cần bật công tắc trong app VÀ có khóa do người dùng tự cung cấp
(biến môi trường ANTHROPIC_API_KEY, hoặc đăng nhập `ant auth login`); app không lưu khóa.
"""
import os
from typing import Any, Optional

from sqlmodel import Session

from app.services import settings

LLM_ENABLED = "llm_enabled"
DEFAULT_MODEL = "claude-opus-5-5"
MAX_TOKENS = 2000

SYSTEM_PROMPT = """Bạn là trợ lý chiến thuật cho người chơi FC Career Mode. Người dùng đưa cho bạn báo cáo phân tích một đối thủ \
(số liệu, điểm yếu, gợi ý của hệ thống luật, đội hình đáp trả đề xuất).

Nhiệm vụ: diễn giải báo cáo thành kế hoạch trận đấu ngắn gọn, bằng tiếng Việt.
- Chỉ dùng số liệu có trong báo cáo; không bịa chỉ số, cầu thủ hay kết quả. Nếu báo cáo thiếu dữ liệu, nói rõ.
- Nêu 3 điều quan trọng nhất cần làm, mỗi điều kèm chỉ số làm căn cứ.
- Nếu phong độ được ghi là chưa xác nhận, đừng dựa vào đó để kết luận.
- Gợi ý chiến thuật nói bằng lời chung, không giả định tên tùy chọn cụ thể trong menu game.
- Tối đa khoảng 300 từ."""


class LLMError(Exception):
    """Lỗi người dùng đọc được (không có khóa, hết hạn mức, mất kết nối...). `status` là mã HTTP đề xuất."""

    def __init__(self, message: str, status: int = 502):
        super().__init__(message)
        self.status = status


def model_name() -> str:
    return os.environ.get("COUNTERPICK_LLM_MODEL", DEFAULT_MODEL)


def has_credentials() -> bool:
    """Có khóa trong môi trường (đăng nhập `ant auth login` không phát hiện được từ đây, nhưng vẫn dùng được khi gọi)."""
    return bool(os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("ANTHROPIC_AUTH_TOKEN"))


def sdk_installed() -> bool:
    try:
        import anthropic  # noqa: F401
        return True
    except ImportError:
        return False


def is_enabled(session: Session) -> bool:
    return settings.get_int(session, LLM_ENABLED) == 1


def set_enabled(session: Session, enabled: bool) -> None:
    settings.set_int(session, LLM_ENABLED, 1 if enabled else None)


def status(session: Session) -> dict:
    return {
        "enabled": is_enabled(session), "sdk_installed": sdk_installed(), "has_api_key": has_credentials(),
        "model": model_name(),
        "privacy": "Khi bật, nội dung báo cáo phân tích được gửi tới Claude API (Anthropic). Mặc định tắt.",
    }


def get_client() -> Any:
    """Tách riêng để test thay bằng client giả."""
    import anthropic
    return anthropic.Anthropic()


def explain(report_markdown: str, client: Optional[Any] = None) -> dict:
    """Gọi Claude diễn giải báo cáo. Ném LLMError với thông điệp tiếng Việt khi lỗi."""
    if not sdk_installed() and client is None:
        raise LLMError("Chưa cài thư viện anthropic (pip install anthropic).", 503)
    import anthropic

    client = client or get_client()
    try:
        response = client.messages.create(
            model=model_name(),
            max_tokens=MAX_TOKENS,
            system=SYSTEM_PROMPT,
            output_config={"effort": "low"},   # diễn giải ngắn từ số liệu có sẵn, không cần suy luận sâu
            messages=[{"role": "user", "content": report_markdown}],
        )
    except anthropic.AuthenticationError as e:
        raise LLMError("Khóa API không hợp lệ hoặc chưa được cung cấp (đặt ANTHROPIC_API_KEY).", 401) from e
    except anthropic.PermissionDeniedError as e:
        raise LLMError("Khóa API không có quyền dùng mô hình này.", 403) from e
    except anthropic.RateLimitError as e:
        raise LLMError("Đã chạm giới hạn tốc độ của Claude API, thử lại sau ít phút.", 429) from e
    except anthropic.BadRequestError as e:
        raise LLMError(f"Claude API từ chối yêu cầu: {getattr(e, 'message', e)}", 400) from e
    except anthropic.APIConnectionError as e:
        raise LLMError("Không kết nối được tới Claude API (kiểm tra mạng).", 503) from e
    except anthropic.APIStatusError as e:
        raise LLMError(f"Claude API lỗi ({e.status_code}).", 502) from e
    except TypeError as e:
        # SDK ném TypeError (không phải lỗi HTTP) khi không tìm thấy thông tin xác thực nào. Chỉ bắt đúng trường hợp này.
        if "Could not resolve authentication method" not in str(e):
            raise
        raise LLMError("Chưa có khóa API: đặt biến môi trường ANTHROPIC_API_KEY (hoặc chạy `ant auth login`) rồi khởi động lại API.", 401) from e

    if response.stop_reason == "refusal":
        raise LLMError("Claude từ chối diễn giải nội dung này.", 422)
    text = "".join(b.text for b in response.content if b.type == "text").strip()
    if not text:
        raise LLMError("Claude không trả về nội dung.", 502)
    usage = getattr(response, "usage", None)
    return {
        "text": text, "model": response.model,
        "truncated": response.stop_reason == "max_tokens",
        "usage": {"input_tokens": usage.input_tokens, "output_tokens": usage.output_tokens} if usage else None,
    }
