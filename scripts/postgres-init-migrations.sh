#!/bin/sh
# Применяем только .up.sql миграции при первом инициализации Postgres'а.
# Если положить migrations/ в /docker-entrypoint-initdb.d напрямую, init
# запустит и .down.sql файлы (они идут раньше .up.sql в алфавитном
# порядке) — это ломает свежие сборки (например 007_*.down.sql пытается
# ADD CONSTRAINT'а с именем, занятым в 001_create_tables.up.sql).

set -e

MIGRATIONS_DIR="${MIGRATIONS_DIR:-/migrations}"

echo ">>> Applying *.up.sql migrations from ${MIGRATIONS_DIR}"

for file in $(ls "${MIGRATIONS_DIR}"/*.up.sql | sort); do
  echo ">>> ${file}"
  psql -v ON_ERROR_STOP=1 \
       --username "${POSTGRES_USER}" \
       --dbname "${POSTGRES_DB}" \
       -f "${file}"
done

echo ">>> All migrations applied successfully."
