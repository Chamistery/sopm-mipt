# report_service

Python-сайдкар, который рендерит DOCX-отчёты об итерации.
Логика рендеринга — в `build_sprint_report.py` (тот же скрипт, что
лежит в корне репо для CLI-использования).

## Эндпоинты

| Метод | Путь             | Параметры                         | Ответ                           |
|-------|------------------|-----------------------------------|---------------------------------|
| GET   | `/healthz`       | —                                 | `{"status":"ok"}`               |
| POST  | `/render/team`   | body: `data` (JSON по схеме)      | `application/docx` blob         |
| POST  | `/render/student`| body: `data` + `?studentIndex=N`  | `application/docx` blob         |

Схема `data` — см. `EXAMPLE_DATA` в `build_sprint_report.py`.
Поля: `project`, `team`, `sprint`, `report`, `team_report`,
`members_with_tasks[]`, `meetings[]`.

## Запуск локально

```bash
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8091
```

## В docker-compose

Поднимается как сервис `report-service` на внутреннем порту 8091.
`project-service` ходит сюда по `REPORT_SERVICE_URL=http://report-service:8091`.
