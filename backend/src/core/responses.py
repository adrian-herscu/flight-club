from typing import Any


def success_response(*, request_id: str, data: Any) -> dict[str, Any]:
    return {"request_id": request_id, "data": data}


def error_response(*, request_id: str, code: str, message: str, details: Any | None = None) -> dict[str, Any]:
    payload: dict[str, Any] = {"request_id": request_id, "error": {"code": code, "message": message}}
    if details is not None:
        payload["error"]["details"] = details
    return payload
