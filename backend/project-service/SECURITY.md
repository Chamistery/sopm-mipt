# Безопасность

## Защита от SQL-инъекций и XSS

Проект использует многоуровневую защиту от SQL-инъекций и других типов атак:

### 1. Параметризованные запросы

Все SQL-запросы в проекте используют **параметризованные запросы** через библиотеку `goqu` и драйвер `pgx`:

```go
// ✅ Безопасно - использует параметры
sql, args, err := r.dialect.From("projects").
    Where(goqu.C("id").Eq(id)).
    ToSQL()
```

**Никогда не делайте так:**
```go
// ❌ ОПАСНО - SQL-инъекция!
sql := fmt.Sprintf("SELECT * FROM projects WHERE id = %s", userInput)
```

### 2. Валидация входных данных

Все endpoints используют валидацию через пакет `internal/validation`:

#### Основные валидаторы:

- **RequiredString** - проверка обязательных полей
- **MaxLength/MinLength** - ограничение длины строк
- **Email** - валидация email-адресов
- **UUID** - валидация UUID формата
- **PositiveInt/NonNegativeInt** - проверка числовых значений
- **IntRange** - проверка диапазона чисел
- **SafeString** - комплексная проверка на SQL-инъекции и XSS

#### Пример использования:

```go
v := validation.NewValidator()
v.RequiredString("title", req.Title)
v.MaxLength("title", req.Title, 500)
v.SafeString("title", req.Title)

if v.HasErrors() {
    httputil.RespondError(w, http.StatusBadRequest, v.Errors().Error())
    return
}
```

### 3. Защита от SQL-инъекций

Валидатор `SafeString` проверяет наличие опасных SQL-паттернов:

- `UNION`, `SELECT`, `INSERT`, `UPDATE`, `DELETE`
- `DROP`, `CREATE`, `ALTER`
- `EXEC`, `EXECUTE`
- И другие SQL-команды

**Пример атаки, которая будет заблокирована:**
```
'; DROP TABLE users; --
1' UNION SELECT null, null --
```

### 4. Защита от XSS (Cross-Site Scripting)

Валидатор проверяет наличие опасного HTML/JavaScript:

- `<script>` теги
- `javascript:` протокол
- `onerror=`, `onload=` атрибуты
- `<iframe>`, `<object>`, `<embed>` теги

**Пример атаки, которая будет заблокирована:**
```
<script>alert('xss')</script>
<img src=x onerror=alert('xss')>
javascript:alert('xss')
```

### 5. Валидация enum-значений

Все enum-поля (статусы, типы) проверяются на соответствие допустимым значениям:

```go
v.ValidProjectStatus("status", models.ProjectStatus(req.Status))
v.ValidApplicationStatus("status", models.ApplicationStatus(req.Status))
v.ValidFieldType("type", field.Type)
v.ValidRole("role", user.Role)
```

### 6. Ограничения на размер данных

Все массивы и строки имеют ограничения:

- **Максимальная длина строк:**
  - Title: 500 символов
  - Name: 200 символов
  - Email: 255 символов
  - Field values: 10,000 символов

- **Максимальный размер массивов:**
  - Template fields: 50 элементов
  - Field values: 100 элементов
  - Applications batch update: 100 элементов

- **Пагинация:**
  - Максимальный limit: 100 записей

## Рекомендации по безопасности

### Для разработчиков:

1. **Всегда используйте валидацию** перед работой с данными пользователя
2. **Никогда не конкатенируйте** пользовательский ввод в SQL-запросы
3. **Используйте goqu** для построения запросов вместо сырого SQL
4. **Избегайте `goqu.L()`** (literal SQL) с пользовательскими данными
5. **Проверяйте возвращаемые ошибки** от валидаторов

### Пример безопасного endpoint:

```go
func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
    var req CreateRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        httputil.RespondError(w, http.StatusBadRequest, "Invalid request body")
        return
    }

    // 1. Валидация всех полей
    v := validation.NewValidator()
    v.RequiredString("title", req.Title)
    v.MaxLength("title", req.Title, 500)
    v.SafeString("title", req.Title)

    if v.HasErrors() {
        httputil.RespondError(w, http.StatusBadRequest, v.Errors().Error())
        return
    }

    // 2. Используйте параметризованные запросы
    entity := &models.Entity{
        Title: strings.TrimSpace(req.Title),
    }

    // 3. Repository использует goqu и pgx
    if err := h.repo.Create(r.Context(), entity); err != nil {
        httputil.RespondError(w, http.StatusInternalServerError, "Failed to create")
        return
    }

    httputil.RespondSuccess(w, http.StatusCreated, entity)
}
```

## Тестирование безопасности

Все валидаторы покрыты тестами в `internal/validation/validator_test.go`.

Запуск тестов:
```bash
go test ./internal/validation/...
```

### Тестирование SQL-инъекций:

```bash
# Попытка SQL-инъекции в заголовок проекта
curl -X POST http://localhost:8080/api/projects \
  -H "Content-Type: application/json" \
  -d '{
    "title": "'; DROP TABLE projects; --",
    "templateId": "550e8400-e29b-41d4-a716-446655440000"
  }'

# Ожидаемый ответ: HTTP 400
# {"error": "title: contains potentially malicious content"}
```

### Тестирование XSS:

```bash
# Попытка XSS в имени шаблона
curl -X POST http://localhost:8080/api/templates \
  -H "Content-Type: application/json" \
  -d '{
    "name": "<script>alert('xss')</script>",
    "fields": []
  }'

# Ожидаемый ответ: HTTP 400
# {"error": "name: contains potentially malicious HTML/JavaScript"}
```

## Дополнительные меры безопасности

### Рекомендуется добавить:

1. **Rate Limiting** - ограничение частоты запросов
2. **Authentication & Authorization** - аутентификация и авторизация
3. **HTTPS** - использование TLS/SSL в production
4. **CORS** - настройка CORS политики (уже есть middleware)
5. **Logging** - логирование подозрительных запросов (уже есть middleware)
6. **Database constraints** - ограничения на уровне БД
7. **Input sanitization** - дополнительная очистка данных перед сохранением
8. **SQL injection scanner** - автоматическое сканирование кода

## Контакты

По вопросам безопасности обращайтесь к команде разработки.
