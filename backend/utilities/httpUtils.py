import logging
from fastapi.responses import JSONResponse, StreamingResponse
from typing import Any, Dict, Optional
import io

from utilities.errors import EmcError, Stage, classify, new_error_id, redact

logger = logging.getLogger(__name__)

_CODE_BY_STATUS = {
    400: "BAD_REQUEST", 401: "NOT_AUTHORIZED", 403: "FORBIDDEN",
    404: "NOT_FOUND", 405: "METHOD_NOT_ALLOWED", 409: "CONFLICT",
    422: "UNPROCESSABLE", 500: "INTERNAL_ERROR", 502: "UPSTREAM_ERROR",
    503: "SERVICE_UNAVAILABLE", 504: "UPSTREAM_TIMEOUT",
}


def _default_code(status: int) -> str:
    return _CODE_BY_STATUS.get(status, "ERROR" if status < 500 else "INTERNAL_ERROR")


def _default_stage(status: int) -> str:
    if status in (401, 403):
        return Stage.AUTH
    return Stage.REQUEST if status < 500 else Stage.INTERNAL


class HttpUtils:
    @staticmethod
    def response(data: Any = None, status: int = 200, message: Optional[str] = None):
        response_data = {}
        if message:
            response_data["message"] = message
        if data is not None:
            response_data["data"] = data
        return JSONResponse(content=response_data, status_code=status)

    @staticmethod
    def get_error_response(status: int, message: str, code: Optional[str] = None,
                           stage: Optional[str] = None, detail: Optional[str] = None,
                           hint: Optional[str] = None, error_id: Optional[str] = None,
                           log: Optional[logging.Logger] = None):
        """Build the error envelope.

        ``error`` and ``status`` are unchanged from the original shape, so every
        existing two-argument call site keeps working; the rest is additive.

        An ``error_id`` is minted here when the caller does not supply one, and
        the minting path also emits the matching log line. That pairing is the
        point: an id in a response that appears in no log entry is worse than no
        id at all, because a user quotes it and the operator finds nothing.
        Callers that already reported the error (``error_response``) pass their
        id in, which suppresses the duplicate log line.
        """
        code = code or _default_code(status)
        stage = stage or _default_stage(status)

        if error_id is None:
            error_id = new_error_id()
            (log or logger).warning("[%s][stage=%s][id=%s] %s",
                                    code, stage, error_id, message)

        payload: Dict[str, Any] = {
            "error": message,
            "status": status,
            "code": code,
            "stage": stage,
            "errorId": error_id,
        }
        if detail:
            payload["detail"] = redact(detail)
        if hint:
            payload["hint"] = hint
        return JSONResponse(content=payload, status_code=status)

    @staticmethod
    def from_error(error: EmcError, error_id: Optional[str] = None):
        """Render an already-classified error."""
        return HttpUtils.get_error_response(
            status=error.status, message=error.message, code=error.code,
            stage=error.stage, detail=error.detail, hint=error.hint,
            error_id=error_id,
        )

    @staticmethod
    def error_response(exc: BaseException, stage: str = Stage.INTERNAL,
                       log: Optional[logging.Logger] = None):
        """Classify ``exc``, log it at a level that matches its status, render it.

        Log level follows the resolved status, not the exception type: a 409 the
        caller can fix is a warning with no stack trace, while anything 5xx keeps
        its traceback. That is what makes a traceback in the log meaningful
        again instead of routine.
        """
        error = classify(exc, stage=stage)
        error_id = new_error_id()
        target = log or logger

        if error.is_server_fault:
            target.exception("[%s][stage=%s][id=%s] %s",
                             error.code, error.stage, error_id, error.message)
        else:
            target.warning("[%s][stage=%s][id=%s] %s | %s",
                           error.code, error.stage, error_id, error.message,
                           redact(error.detail or ""))

        return HttpUtils.from_error(error, error_id=error_id)

    @staticmethod
    def get_not_authorized():
        return HttpUtils.get_error_response(
            status=401,
            message="Not authorized. Please provide valid authentication.",
            code="NOT_AUTHORIZED",
            stage=Stage.AUTH,
        )

    @staticmethod
    def proxy(response: Any):
        if hasattr(response, 'json'):
            return JSONResponse(content=response.json(), status_code=response.status_code)
        return response

    @staticmethod
    def file_response(buffer: io.BytesIO, filename: str, content_type: str):
        buffer.seek(0)
        return StreamingResponse(
            buffer,
            media_type=content_type,
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )
