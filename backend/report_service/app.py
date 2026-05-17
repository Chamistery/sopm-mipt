"""
FastAPI-обёртка над build_sprint_report.py — отдаёт DOCX-blob.

Эндпоинты:
    POST /render/team    body=data                      -> docx
    POST /render/student body=data + ?studentIndex=N    -> docx

Сервис вызывается project-service (Go) по docker-сети.
"""
from __future__ import annotations

import io
from typing import Any

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import Response

from build_sprint_report import build_docx, build_multi_docx, build_student_docx

app = FastAPI(title="sopm-report-service", version="1.0")

DOCX_MIME = (
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
)


@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok"}


def _docx_to_bytes(doc) -> bytes:
    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()


@app.post("/render/team")
def render_team(data: dict[str, Any]) -> Response:
    try:
        doc = build_docx(data)
    except KeyError as e:
        raise HTTPException(400, f"missing field: {e.args[0]}") from e
    except Exception as e:
        raise HTTPException(500, f"render error: {e}") from e
    return Response(content=_docx_to_bytes(doc), media_type=DOCX_MIME)


@app.post("/render/team/multi")
def render_team_multi(payload: dict[str, Any]) -> Response:
    """Несколько спринтов одной командой в одном DOCX (page break между)."""
    sprints = payload.get("sprints")
    if not isinstance(sprints, list) or not sprints:
        raise HTTPException(400, "payload.sprints must be a non-empty list")
    try:
        doc = build_multi_docx(sprints)
    except KeyError as e:
        raise HTTPException(400, f"missing field: {e.args[0]}") from e
    except Exception as e:
        raise HTTPException(500, f"render error: {e}") from e
    return Response(content=_docx_to_bytes(doc), media_type=DOCX_MIME)


@app.post("/render/student")
def render_student(
    data: dict[str, Any],
    student_index: int = Query(0, alias="studentIndex", ge=0),
) -> Response:
    members = data.get("members_with_tasks") or []
    if student_index >= len(members):
        raise HTTPException(
            400,
            f"studentIndex {student_index} out of range (members={len(members)})",
        )
    try:
        doc = build_student_docx(data, student_index=student_index)
    except KeyError as e:
        raise HTTPException(400, f"missing field: {e.args[0]}") from e
    except Exception as e:
        raise HTTPException(500, f"render error: {e}") from e
    return Response(content=_docx_to_bytes(doc), media_type=DOCX_MIME)
