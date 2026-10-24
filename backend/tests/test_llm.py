from types import SimpleNamespace

import anthropic
import httpx2
import pytest

from app.services import llm


class FakeClient:
    """Thay cho anthropic.Anthropic(): ghi lại lời gọi, trả lời theo kịch bản."""

    def __init__(self, response=None, error=None):
        self.calls = []
        self._response, self._error = response, error
        self.messages = SimpleNamespace(create=self._create)

    def _create(self, **kwargs):
        self.calls.append(kwargs)
        if self._error:
            raise self._error
        return self._response


def reply(text="Kế hoạch: tấn công cánh phải.", stop="end_turn", model="claude-opus-5-5"):
    return SimpleNamespace(
        stop_reason=stop, model=model, content=[SimpleNamespace(type="thinking", thinking=""), SimpleNamespace(type="text", text=text)],
        usage=SimpleNamespace(input_tokens=1200, output_tokens=180),
    )


def status_error(cls, code):
    req = httpx2.Request("POST", "https://api.anthropic.com/v1/messages")
    return cls("lỗi", response=httpx2.Response(code, request=req, json={"error": {"type": "x", "message": "m"}}), body=None)


@pytest.fixture
def no_network(monkeypatch):
    def boom():
        raise AssertionError("Test không được tạo client thật / gọi mạng")
    monkeypatch.setattr(llm, "get_client", boom)


def install(monkeypatch, client):
    monkeypatch.setattr(llm, "get_client", lambda: client)
    return client


def test_disabled_by_default_and_explain_endpoint_refuses_without_calling_api(client, no_network):
    status = client.get("/llm/status").json()
    assert status["enabled"] is False and status["model"] == "claude-opus-5-5" and "gửi tới Claude API" in status["privacy"]
    r = client.post("/teams/22/explain")
    assert r.status_code == 403 and "đang tắt" in r.json()["detail"]
    assert client.post("/manual-lineups/1/explain").status_code in (403, 404)


def test_enable_then_explain_sends_report_to_claude(client, monkeypatch):
    fake = install(monkeypatch, FakeClient(reply()))
    assert client.put("/llm/enabled", json={"enabled": True}).json()["enabled"] is True
    client.put("/teams/22/note", json={"text": "Hay đá phạt góc ngắn."})
    out = client.post("/teams/22/explain").json()
    assert out["text"] == "Kế hoạch: tấn công cánh phải." and out["model"] == "claude-opus-5-5"
    assert out["usage"] == {"input_tokens": 1200, "output_tokens": 180} and out["truncated"] is False

    (call,) = fake.calls
    assert call["model"] == "claude-opus-5-5" and call["max_tokens"] == llm.MAX_TOKENS
    assert "Chỉ dùng số liệu có trong báo cáo" in call["system"]
    sent = call["messages"][0]["content"]
    assert "# Phân tích đối thủ: Test City" in sent and "Hay đá phạt góc ngắn." in sent     # gồm cả ghi chú của người dùng
    assert call["output_config"] == {"effort": "low"}
    assert not {"temperature", "top_p", "top_k", "thinking"} & set(call)                    # tham số đã bị gỡ ở model mới
    assert client.put("/llm/enabled", json={"enabled": False}).json()["enabled"] is False
    assert client.post("/teams/22/explain").status_code == 403                               # tắt lại là dừng ngay


def test_model_can_be_overridden_by_env(client, monkeypatch):
    monkeypatch.setenv("COUNTERPICK_LLM_MODEL", "claude-sonnet-5-5")
    fake = install(monkeypatch, FakeClient(reply(model="claude-sonnet-5-5")))
    client.put("/llm/enabled", json={"enabled": True})
    assert client.post("/teams/22/explain").json()["model"] == "claude-sonnet-5-5"
    assert fake.calls[0]["model"] == "claude-sonnet-5-5"


def test_manual_lineup_explain(client, monkeypatch):
    fake = install(monkeypatch, FakeClient(reply()))
    client.put("/llm/enabled", json={"enabled": True})
    lid = client.post("/manual-lineups", json={"name": "Nhập tay Y", "formation_id": 8, "player_ids": [101, 102, 103] + [None] * 8}).json()["id"]
    assert client.post(f"/manual-lineups/{lid}/explain").status_code == 200
    assert "# Phân tích đối thủ: Nhập tay Y" in fake.calls[0]["messages"][0]["content"]
    assert "Ghi chú cá nhân" not in fake.calls[0]["messages"][0]["content"]


@pytest.mark.parametrize("error, status, fragment", [
    (status_error(anthropic.AuthenticationError, 401), 401, "Khóa API không hợp lệ"),
    (status_error(anthropic.PermissionDeniedError, 403), 403, "không có quyền"),
    (status_error(anthropic.RateLimitError, 429), 429, "giới hạn tốc độ"),
    (status_error(anthropic.BadRequestError, 400), 400, "từ chối yêu cầu"),
    (status_error(anthropic.InternalServerError, 500), 502, "lỗi (500)"),
    (anthropic.APIConnectionError(request=httpx2.Request("POST", "https://api.anthropic.com")), 503, "kết nối"),
])
def test_api_errors_become_readable_http_errors(client, monkeypatch, error, status, fragment):
    install(monkeypatch, FakeClient(error=error))
    client.put("/llm/enabled", json={"enabled": True})
    r = client.post("/teams/22/explain")
    assert r.status_code == status and fragment in r.json()["detail"]


def test_refusal_empty_and_truncated_responses(client, monkeypatch):
    client.put("/llm/enabled", json={"enabled": True})
    install(monkeypatch, FakeClient(reply(stop="refusal")))
    r = client.post("/teams/22/explain")
    assert r.status_code == 422 and "từ chối" in r.json()["detail"]
    install(monkeypatch, FakeClient(SimpleNamespace(stop_reason="end_turn", model="m", content=[], usage=None)))
    assert client.post("/teams/22/explain").status_code == 502
    install(monkeypatch, FakeClient(reply(stop="max_tokens")))
    assert client.post("/teams/22/explain").json()["truncated"] is True


def test_status_reports_credentials_without_exposing_them(client, monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    monkeypatch.delenv("ANTHROPIC_AUTH_TOKEN", raising=False)
    assert client.get("/llm/status").json()["has_api_key"] is False
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-ant-secret-value")
    body = client.get("/llm/status").text
    assert '"has_api_key":true' in body.replace(" ", "") and "sk-ant-secret-value" not in body


def test_unknown_team_and_missing_sdk(client, monkeypatch, no_network):
    client.put("/llm/enabled", json={"enabled": True})
    assert client.post("/teams/999/explain").status_code == 404
    monkeypatch.setattr(llm, "sdk_installed", lambda: False)
    assert client.put("/llm/enabled", json={"enabled": True}).status_code == 409
    with pytest.raises(llm.LLMError, match="Chưa cài"):
        llm.explain("x")


def test_missing_credentials_typeerror_is_explained_but_other_typeerrors_propagate(client, monkeypatch):
    client.put("/llm/enabled", json={"enabled": True})
    install(monkeypatch, FakeClient(error=TypeError("Could not resolve authentication method. Expected one of api_key...")))
    r = client.post("/teams/22/explain")
    assert r.status_code == 401 and "ANTHROPIC_API_KEY" in r.json()["detail"]
    install(monkeypatch, FakeClient(error=TypeError("lỗi lập trình khác")))
    with pytest.raises(TypeError, match="lỗi lập trình khác"):
        client.post("/teams/22/explain")


def test_real_sdk_without_credentials_gives_readable_error(client, monkeypatch):
    """Dùng SDK thật (không gọi mạng vì thiếu khóa nên dừng trước khi gửi)."""
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    monkeypatch.delenv("ANTHROPIC_AUTH_TOKEN", raising=False)
    monkeypatch.setenv("HOME", "/nonexistent-home-for-test")
    client.put("/llm/enabled", json={"enabled": True})
    r = client.post("/teams/22/explain")
    assert r.status_code == 401 and "Chưa có khóa API" in r.json()["detail"]
