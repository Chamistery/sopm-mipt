/*
 * Pure helpers вокруг UserFile: валидация (тип/размер) и форматтеры
 * (размер, относительная дата). Вынесены в отдельный модуль, чтобы
 * можно было покрыть unit-тестами без рендера компонента.
 *
 * Решения:
 * - Лимит 10 МБ, как и в `architecture.md` («PDF/DOCX, без изображений,
 *   до 10 МБ»). Бэк дублирует ограничение в `user_handler.UploadFile`.
 * - Тип определяется и по MIME, и по расширению. На входе .docx может
 *   приехать с пустым type (Windows) — fallback на расширение.
 */

export const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MiB

export const ACCEPTED_EXTENSIONS = ['pdf', 'docx'] as const;
export type AcceptedExtension = (typeof ACCEPTED_EXTENSIONS)[number];

const MIME_TO_EXT: Record<string, AcceptedExtension> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
};

export type FileValidationError =
  | { kind: 'too-large'; sizeBytes: number; maxBytes: number }
  | { kind: 'wrong-type'; got: string };

export interface FileLike {
  name: string;
  size: number;
  type: string;
}

export function detectExtension(file: FileLike): AcceptedExtension | null {
  const fromMime = MIME_TO_EXT[file.type];
  if (fromMime) return fromMime;

  const dot = file.name.lastIndexOf('.');
  if (dot < 0) return null;
  const ext = file.name.slice(dot + 1).toLowerCase();
  return (ACCEPTED_EXTENSIONS as readonly string[]).includes(ext)
    ? (ext as AcceptedExtension)
    : null;
}

export function validateFile(file: FileLike): FileValidationError | null {
  const ext = detectExtension(file);
  if (!ext) {
    return { kind: 'wrong-type', got: file.type || file.name };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { kind: 'too-large', sizeBytes: file.size, maxBytes: MAX_FILE_BYTES };
  }
  return null;
}

export function formatValidationError(err: FileValidationError): string {
  switch (err.kind) {
    case 'too-large':
      return `Файл слишком большой (${formatFileSize(err.sizeBytes)}). Максимум — ${formatFileSize(err.maxBytes)}.`;
    case 'wrong-type':
      return 'Поддерживаются только PDF и DOCX.';
  }
}

const KB = 1024;
const MB = KB * 1024;

/**
 * Человекочитаемый размер: «456 Б», «1.2 КБ», «3.4 МБ». Округляем до
 * одного знака после запятой для килобайт и мегабайт.
 */
export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < KB) return `${bytes} Б`;
  if (bytes < MB) {
    const kb = bytes / KB;
    return `${trim(kb)} КБ`;
  }
  const mb = bytes / MB;
  return `${trim(mb)} МБ`;
}

function trim(n: number): string {
  // одна цифра после запятой, но без хвостового ".0"
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/**
 * Относительная дата на русском: «только что», «5 минут назад», «вчера»,
 * «3 дня назад», «12 марта 2026». Опорная точка — `now`, по умолчанию
 * текущее время; параметр нужен для детерминированных тестов и Storybook.
 */
export function formatRelativeDate(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;

  const diffMs = now.getTime() - date.getTime();
  if (diffMs < MINUTE_MS) return 'только что';
  if (diffMs < HOUR_MS) {
    const m = Math.floor(diffMs / MINUTE_MS);
    return `${m} ${pluralize(m, 'минуту', 'минуты', 'минут')} назад`;
  }
  if (diffMs < DAY_MS) {
    const h = Math.floor(diffMs / HOUR_MS);
    return `${h} ${pluralize(h, 'час', 'часа', 'часов')} назад`;
  }
  if (diffMs < 2 * DAY_MS) return 'вчера';
  if (diffMs < 7 * DAY_MS) {
    const d = Math.floor(diffMs / DAY_MS);
    return `${d} ${pluralize(d, 'день', 'дня', 'дней')} назад`;
  }
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function pluralize(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}
