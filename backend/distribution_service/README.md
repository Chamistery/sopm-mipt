# Сервис автоматизированного распределения студентов

## Описание

Микросервис для автоматизированного распределения студентов по проектам и командам в рамках системы управления проектным практикумом МФТИ.

Использует **алгоритм Гейля-Шэпли** (Gale-Shapley matching algorithm) для стабильного двустороннего распределения:
- **Со стороны студентов**: критерий - приоритет проекта (1-5)
- **Со стороны проектов**: критерий - рейтинг студента

## Архитектура

Сервис реализован на основе **гексагональной архитектуры** (Hexagonal Architecture):

```
┌─────────────────────────────────────────────────────────────┐
│                    HTTP API (Driving)                        │
│                   /api/distribution/start                    │
│                   /api/distribution/status                   │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│              DistributionService (Core)                      │
│  - Оркестрирует получение данных                            │
│  - Запускает алгоритм распределения                         │
│  - Обновляет результаты в БД                               │
└────┬─────────────────────────────────────┬──────────────────┘
     │                                     │
┌────▼────────────────────┐   ┌───────────▼──────────────────┐
│  GaleShapleyDistribution │   │  Config & Logging            │
│  (Core Algorithm)        │   │  (Core Support)              │
│                          │   │                              │
│ Процесс распределения:   │   │ - JSON конфигурация         │
│ 1. Группировка по        │   │ - JSON логирование          │
│    приоритетам           │   │ - Переменные окружения      │
│ 2. Итерация по           │   │                              │
│    проектам              │   │                              │
│ 3. Заполнение команд     │   │                              │
│    полностью (по         │   │                              │
│    очереди)              │   │                              │
│ 4. Стабилизация          │   │                              │
│    распределения         │   │                              │
└────┬──────────────────────┘   └──────────────────────────────┘
     │
┌────▼──────────────────────────────────────────────────────────┐
│              Driven Adapters (HTTP Clients)                    │
│                                                                │
│ ┌──────────────────────────────────────────────────────────┐  │
│ │ Applications Adapter (заявки на распределение)           │  │
│ │ - GET /api/applications → список заявок                 │  │
│ │ - PUT /api/applications/batch → обновление статусов     │  │
│ └──────────────────────────────────────────────────────────┘  │
│ ┌──────────────────────────────────────────────────────────┐  │
│ │ Projects Adapter (информация о проектах)                │  │
│ │ - GET /api/projects → список проектов                   │  │
│ │ - GET /api/projects/{id}/teams → команды проекта       │  │
│ └──────────────────────────────────────────────────────────┘  │
│ ┌──────────────────────────────────────────────────────────┐  │
│ │ Students Adapter (данные о студентах)                   │  │
│ │ - GET /api/users?role=student → студенты                │  │
│ │ - GET /api/students/ratings → рейтинги по проектам     │  │
│ └──────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

## Структура проекта

```
destribution_service/
├── core/                           # Бизнес-логика
│   ├── domain/
│   │   └── models.hpp             # Модели данных
│   ├── ports/                      # Интерфейсы (Ports)
│   │   ├── driven/
│   │   │   ├── applications_port.hpp
│   │   │   ├── projects_port.hpp
│   │   │   └── students_port.hpp
│   │   │   
│   │   └── driving/
│   │       └── server_port.hpp
│   ├── services/
│   │   ├── distribution_service.hpp
│   │   └── distribution_service.cpp
│   ├── logger/
│   │   └── logger.hpp
│   │   
│   └── config/
│       ├── config_manager.hpp
│       └── config_manager.cpp     # Конфиг + env vars
│
├── algorithms/                     # Алгоритмы
│   ├── gale_shapley.hpp
│   └── gale_shapley.cpp           # Алгоритм Гейля-Шэпли
│
├── adapters/
│   ├── driven/                     # Driven Adapters (исходящие)
│   │   └── http/
│   │       ├── applications_adapter.hpp/cpp
│   │       ├── projects_adapter.hpp/cpp
│   │       └── students_adapter.hpp/cpp
│   │   
│   └── driving/                    # Driving Adapters (входящие)
│       └── http_server/
│           ├── http_server.hpp
│           └── http_server.cpp    # HTTP сервер
│
├── config/
│   └── distribution_service.json  # Конфигурация
│
├── main.cpp                        # Точка входа
├── CMakeLists.txt                 # Сборка
└── README.md                       # Документация
```

## Алгоритм Гейля-Шэпли

### Описание

Классический алгоритм для поиска стабильного соответствия в двусторонней системе сопоставления.

**Стабильность** означает, что нет двух участников (студент и проект), которые оба предпочли бы друг друга своим текущим партнёрам.

### Адаптация для нашей задачи

1. **Студенты** предлагают проектам в порядке своих приоритетов (1-5)
2. **Проекты** выбирают студентов по рейтингу
3. **Одна команда заполняется полностью**, затем переход к следующей
4. Один студент распределяется ровно в один проект и ровно в одну команду

## Конфигурация

### Файл конфигурации (JSON)

`config/distribution_service.json`:

```json
{
  "http_port": 8080,
  "projects_service_url": "http://localhost:8001",
  "students_service_url": "http://localhost:8002",
  "applications_service_url": "http://localhost:8003",
  "http_timeout_ms": 30000,
  "log_level": "INFO",
  "log_file": "./logs/distribution_service.log"
}
```

### Переменные окружения

Все параметры конфигурации могут быть переопределены через переменные окружения с префиксом `DIST_SERVICE_`:

```bash
export DIST_SERVICE_http_port=9000
export DIST_SERVICE_projects_service_url=http://projects.service:8001
export DIST_SERVICE_students_service_url=http://students.service:8002
export DIST_SERVICE_applications_service_url=http://applications.service:8003
export DIST_SERVICE_http_timeout_ms=60000
export DIST_SERVICE_log_level=DEBUG
export DIST_SERVICE_log_file=/var/log/distribution_service.log
```

**Приоритет загрузки:**
1. Переменные окружения (наивысший приоритет)
2. Файл конфигурации
3. Значения по умолчанию (наименьший приоритет)

## API

### Запуск распределения

**Запрос:**
```
GET /api/distribution/start
```

**Ответ (успех - 200):**
```json
{
  "status": "success",
  "recommended_count": 85,
  "not_recommended_count": 15
}
```

**Ответ (ошибка - 500):**
```json
{
  "status": "error",
  "message": "Failed to fetch applications: Connection refused"
}
```

### Проверка статуса

**Запрос:**
```
GET /api/distribution/status
```

**Ответ (200):**
```json
{
  "status": "running",
  "message": "Distribution service is ready"
}
```

## Логирование

Все события записываются в JSON формате для удобства парсирования:

```json
{"timestamp": "2025-04-14 15:30:45.123", "level": "INFO", "message": "Starting Gale-Shapley distribution algorithm"}
{"timestamp": "2025-04-14 15:30:45.234", "level": "DEBUG", "message": "Project 1: 3 teams, capacity: 5 per team"}
{"timestamp": "2025-04-14 15:30:45.456", "level": "INFO", "message": "Distribution completed: 85 recommended, 15 not recommended"}
```

**Уровни логирования:**
- `DEBUG` - подробная информация о процессе
- `INFO` - основная информация (запуск, завершение, статистика)
- `WARNING` - предупреждения
- `ERROR` - ошибки

## Зависимости

### Внешние библиотеки

- **curl** (libcurl) - для HTTP запросов к другим сервисам
- **nlohmann/json** - для работы с JSON
- **httplib** (cpp-httplib) - для HTTP сервера
- **pthread** - для многопоточности

### Установка зависимостей (Ubuntu/Debian)

```bash
sudo apt-get install -y \
    libcurl4-openssl-dev \
    nlohmann-json3-dev \
    build-essential \
    cmake

# Httplib устанавливается как header-only library
# или через conan/vcpkg
```

### Установка через Conan

```bash
conan install . --build=missing
```

## Сборка

### CMake

```bash
mkdir build
cd build
cmake ..
cmake --build .
```

### С релизной оптимизацией

```bash
mkdir build
cd build
cmake -DCMAKE_BUILD_TYPE=Release ..
cmake --build . --config Release
```

## Запуск

### С конфигом по умолчанию

```bash
./distribution_service
```

### С пользовательским конфигом

```bash
./distribution_service /path/to/config.json
```

### С переменными окружения

```bash
export DIST_SERVICE_http_port=9000
export DIST_SERVICE_log_level=DEBUG
./distribution_service
```

## Тестирование API

### Запуск распределения

```bash
curl -X GET http://localhost:8080/api/distribution/start
```

### Проверка статуса

```bash
curl -X GET http://localhost:8080/api/distribution/status
```

## Интеграция с другими сервисами

### Требуемые API от других сервисов

#### Сервис управления заявками

```
GET /api/applications → список всех заявок
{
  "applications": [
    {
      "project_id": 1,
      "student_id": 101,
      "priority": 1,
      "status": "Ожидает"
    }
  ]
}

PUT /api/applications/batch → обновить статусы заявок
[
  {
    "project_id": 1,
    "student_id": 101,
    "priority": 1,
    "status": "Рекомендован",
    "team_id": 5
  }
]
```

#### Сервис управления проектами

```
GET /api/projects → список проектов с командами
{
  "projects": [
    {
      "id": 1,
      "num_teams": 2,
      "team_size_min": 3,
      "team_size_max": 5,
      "min_gpa": 4,
      "courses": [1, 2, 4],
      "teams": [
        {"id": 10, "name": "Team 1", "current_size": 0},
        {"id": 11, "name": "Team 2", "current_size": 0}
      ]
    }
  ]
}

GET /api/projects/{id}/teams → команды проекта
```

#### Сервис управления студентами

```
GET /api/users?role=student → список студентов
{
  "users": [
    {"id": 101, "course": 1, "gpa": 4.5},
    {"id": 102, "course": 2, "gpa": 3.8}
  ]
}

GET /api/students/ratings → рейтинги студентов
{
  "ratings": {
    "1": {
      "101": 90,
      "102": 85
    },
    "2": {
      "101": 88,
      "103": 92
    }
  }
}
```

## Обработка ошибок

Сервис использует `std::expected<T, E>` для безопасной обработки ошибок:

```cpp
auto result = distribution_service->ExecuteDistribution();
if (!result) {
    // Обработать ошибку
    std::string error = result.error();
} else {
    // Использовать результат
    auto distribution = result.value();
}
```

## Производительность

- **Временная сложность**: O(n² · m) где n - количество студентов, m - количество проектов
- **Пространственная сложность**: O(n · m)
- **Типичное время выполнения** для 500 студентов и 20 проектов: ~100-500ms

## Планы развития

- [ ] Добавить поддержку постоянной БД (PostgreSQL адаптер)
- [ ] Параллелизм при загрузке данных из сервисов
- [ ] Метрики и мониторинг (Prometheus)
- [ ] WebSocket API для мониторинга прогресса распределения
- [ ] Валидация входных данных с JSON Schema
- [ ] Юнит-тесты и интеграционные тесты

## Автор

Backend команда МФТИ

## Лицензия

Внутренний проект МФТИ
