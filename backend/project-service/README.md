# SOPM Project Service

REST API сервис для управления проектами, шаблонами, заявками и пользователями.

## Технологический стек

- **Go** 1.24.2
- **PostgreSQL** 16
- **Docker** и **Docker Compose**
- Библиотеки:
  - `github.com/jackc/pgx/v5` - PostgreSQL драйвер
  - `github.com/doug-martin/goqu/v9` - SQL builder
  - `github.com/google/uuid` - генерация UUID

## Структура проекта

```
.
├── cmd/
│   └── api/
│       └── main.go              # Точка входа приложения
├── internal/
│   ├── config/                  # Конфигурация приложения
│   ├── database/                # Подключение к БД
│   ├── handlers/                # HTTP обработчики
│   ├── httputil/                # HTTP утилиты
│   ├── middleware/              # Middleware (CORS, Logger)
│   ├── models/                  # Модели данных
│   └── repository/              # Слой работы с БД
├── migrations/                  # SQL миграции
├── docker-compose.yml           # Docker Compose конфигурация
├── Dockerfile                   # Docker образ приложения
├── Makefile                     # Команды для разработки
├── swagger.yaml                 # OpenAPI спецификация
└── README.md                    # Этот файл
```

## Быстрый старт

### Вариант 1: Docker Compose (рекомендуется)

Это самый простой способ запустить проект вместе с базой данных:

```bash
# Запустить все сервисы (PostgreSQL + API)
make docker-up

# Или напрямую
docker-compose up --build -d
```

Сервис будет доступен по адресу: `http://localhost:8080`

### Вариант 2: Локальный запуск

Для локальной разработки без Docker:

#### Предварительные требования

- Go 1.24.2 или выше
- PostgreSQL 16
- Make (опционально)

#### Шаги запуска

1. **Установите зависимости**

```bash
go mod download
```

2. **Настройте PostgreSQL**

Создайте базу данных:

```sql
CREATE DATABASE sopm;
```

3. **Примените миграции**

```bash
# Применить миграции вручную
psql -h localhost -U postgres -d sopm -f migrations/001_create_tables.up.sql
psql -h localhost -U postgres -d sopm -f migrations/003_create_users_table.up.sql

# Или через Makefile
make migrate-up
```

4. **Настройте переменные окружения**

Создайте файл `.env` или установите переменные окружения:

```bash
export SERVER_PORT=8080
export SERVER_HOST=0.0.0.0
export DB_HOST=localhost
export DB_PORT=5432
export DB_USER=postgres
export DB_PASSWORD=postgres
export DB_NAME=sopm
export DB_SSLMODE=disable
```

5. **Запустите сервис**

```bash
# Через Makefile
make run

# Или напрямую
go run ./cmd/api/main.go
```

## Переменные окружения

| Переменная | Описание | Значение по умолчанию |
|------------|----------|-----------------------|
| `SERVER_PORT` | Порт HTTP сервера | `8080` |
| `SERVER_HOST` | Хост HTTP сервера | `0.0.0.0` |
| `DB_HOST` | Хост PostgreSQL | `localhost` |
| `DB_PORT` | Порт PostgreSQL | `5432` |
| `DB_USER` | Имя пользователя БД | `postgres` |
| `DB_PASSWORD` | Пароль БД | `postgres` |
| `DB_NAME` | Имя базы данных | `sopm` |
| `DB_SSLMODE` | SSL режим подключения | `disable` |

## API Endpoints

### Health Check

- `GET /health` - Проверка состояния сервиса

### Templates (Шаблоны)

- `POST /api/templates` - Создать шаблон
- `GET /api/templates` - Получить все шаблоны
- `GET /api/templates/{id}` - Получить шаблон по ID
- `PUT /api/templates/{id}` - Обновить шаблон
- `DELETE /api/templates/{id}` - Удалить шаблон

### Projects (Проекты)

- `POST /api/projects` - Создать проект
- `GET /api/projects` - Получить список проектов (с фильтрацией и пагинацией)
- `GET /api/projects/{id}` - Получить проект по ID
- `PUT /api/projects/{id}` - Обновить проект
- `DELETE /api/projects/{id}` - Удалить проект

**Параметры фильтрации для GET /api/projects:**
- `limit` - Количество проектов на странице (по умолчанию: 20)
- `offset` - Смещение для пагинации (по умолчанию: 0)
- `company` - Фильтр по компании
- `course` - Фильтр по курсу
- `status` - Фильтр по статусу (Черновик, Опубликован, Активный, Завершен, Архивный)

### Applications (Заявки)

- `POST /api/applications` - Создать заявку
- `GET /api/applications?studentId={id}` - Получить заявки студента
- `GET /api/applications/project?projectId={id}` - Получить заявки на проект
- `PUT /api/applications/{id}` - Обновить заявку
- `PUT /api/applications/priorities?studentId={id}` - Обновить приоритеты заявок
- `DELETE /api/applications/{id}` - Удалить заявку

### Users (Пользователи)

- `POST /api/users` - Создать пользователя
- `GET /api/users` - Получить всех пользователей
- `GET /api/users/{id}` - Получить пользователя по ID

## Примеры запросов

### Создание шаблона

```bash
curl -X POST http://localhost:8080/api/templates \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Проект по разработке",
    "fields": [
      {
        "id": "desc",
        "name": "Описание",
        "type": "Маркдаун",
        "required": true
      },
      {
        "id": "team_size",
        "name": "Размер команды",
        "type": "Число",
        "required": true
      }
    ]
  }'
```

### Создание проекта

```bash
curl -X POST http://localhost:8080/api/projects \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Разработка мобильного приложения",
    "templateId": "UUID-шаблона",
    "fieldValues": [
      {
        "fieldId": "desc",
        "value": "Проект по созданию мобильного приложения для iOS и Android"
      },
      {
        "fieldId": "team_size",
        "value": "5"
      }
    ],
    "mentorId": 1,
    "creatorId": 1,
    "maxSlots": 5,
    "company": "Tech Corp",
    "course": "Разработка ПО"
  }'
```

### Получение проектов с фильтрацией

```bash
# Получить проекты компании "Tech Corp" с пагинацией
curl "http://localhost:8080/api/projects?company=Tech%20Corp&limit=10&offset=0"

# Получить активные проекты
curl "http://localhost:8080/api/projects?status=Активный"
```

### Создание заявки

```bash
curl -X POST http://localhost:8080/api/applications \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": 1,
    "studentId": 5,
    "priority": 1
  }'
```

## Swagger/OpenAPI

Полная документация API доступна в файле `swagger.yaml`. Вы можете открыть её в:

- [Swagger Editor](https://editor.swagger.io/) - вставьте содержимое файла
- [Swagger UI](https://petstore.swagger.io/) - загрузите файл swagger.yaml

Для локального просмотра можно использовать:

```bash
# С помощью Docker
docker run -p 8081:8080 -e SWAGGER_JSON=/swagger.yaml -v $(pwd)/swagger.yaml:/swagger.yaml swaggerapi/swagger-ui

# Откройте http://localhost:8081 в браузере
```

## Полезные команды Makefile

```bash
make help          # Показать доступные команды
make build         # Собрать приложение
make run           # Запустить приложение
make docker-up     # Запустить Docker Compose
make docker-down   # Остановить Docker Compose
make docker-logs   # Показать логи Docker
make migrate-up    # Применить миграции
make migrate-down  # Откатить миграции
make test          # Запустить тесты
make clean         # Очистить артефакты сборки
```

## Тестирование

Запуск тестов:

```bash
# Все тесты
make test

# Или напрямую
go test -v ./...

# С покрытием кода
go test -v -coverprofile=coverage.out ./...
go tool cover -html=coverage.out
```

## Разработка

### Структура кода

- **handlers** - HTTP обработчики для каждого ресурса (Template, Project, Application, User)
- **repository** - Слой доступа к данным с интерфейсами для тестирования
- **models** - Структуры данных и константы
- **middleware** - CORS и логирование запросов
- **httputil** - Утилиты для работы с HTTP (парсинг параметров, ответы)

### Добавление нового endpoint

1. Создайте/обновите модель в `internal/models/`
2. Добавьте методы в соответствующий repository в `internal/repository/`
3. Создайте handler в `internal/handlers/`
4. Зарегистрируйте роут в `cmd/api/main.go` в функции `setupRoutes()`
5. Обновите `swagger.yaml` с новым endpoint

## Остановка сервисов

```bash
# Остановить Docker Compose
make docker-down

# Или напрямую
docker-compose down

# Остановить и удалить volumes (очистить БД)
docker-compose down -v
```

## Troubleshooting

### Порт уже занят

Если порт 8080 или 5432 уже занят, измените порты в `docker-compose.yml`:

```yaml
services:
  postgres:
    ports:
      - "5433:5432"  # Вместо 5432:5432

  project-service:
    ports:
      - "8081:8080"  # Вместо 8080:8080
```

### Ошибка подключения к БД

Убедитесь, что:
1. PostgreSQL запущен
2. Переменные окружения настроены правильно
3. База данных `sopm` создана
4. Миграции применены

### Проблемы с миграциями

```bash
# Откатить все миграции
make migrate-down

# Применить заново
make migrate-up
```

## Лицензия

Проект создан для образовательных целей (HSSE Project).

## Контакты

По вопросам обращайтесь к команде разработки проекта.
