import { describe, expect, it } from 'vitest';

import {
  MAX_FILE_BYTES,
  detectExtension,
  formatFileSize,
  formatRelativeDate,
  formatValidationError,
  validateFile,
  type FileLike,
} from './userFiles';

function file(overrides: Partial<FileLike> = {}): FileLike {
  return { name: 'sample.pdf', size: 1024, type: 'application/pdf', ...overrides };
}

describe('formatFileSize', () => {
  it('returns bytes for tiny files', () => {
    expect(formatFileSize(0)).toBe('0 Б');
    expect(formatFileSize(456)).toBe('456 Б');
  });

  it('returns kilobytes with one decimal when needed', () => {
    expect(formatFileSize(1024)).toBe('1 КБ');
    expect(formatFileSize(1536)).toBe('1.5 КБ');
    expect(formatFileSize(245 * 1024)).toBe('245 КБ');
  });

  it('returns megabytes for >=1 MiB', () => {
    expect(formatFileSize(1024 * 1024)).toBe('1 МБ');
    expect(formatFileSize(Math.round(1.2 * 1024 * 1024))).toBe('1.2 МБ');
    expect(formatFileSize(10 * 1024 * 1024)).toBe('10 МБ');
  });

  it('handles invalid input gracefully', () => {
    expect(formatFileSize(-1)).toBe('—');
    expect(formatFileSize(Number.NaN)).toBe('—');
  });

  it('drops trailing zero on whole numbers', () => {
    // 2 * 1024 КБ = ровно 2 МБ — не «2.0 МБ»
    expect(formatFileSize(2 * 1024 * 1024)).toBe('2 МБ');
  });
});

describe('formatRelativeDate', () => {
  const now = new Date('2026-05-04T12:00:00Z');

  it('says "только что" within a minute', () => {
    expect(formatRelativeDate('2026-05-04T11:59:30Z', now)).toBe('только что');
  });

  it('formats minutes with russian pluralization', () => {
    expect(formatRelativeDate('2026-05-04T11:59:00Z', now)).toBe('1 минуту назад');
    expect(formatRelativeDate('2026-05-04T11:57:00Z', now)).toBe('3 минуты назад');
    expect(formatRelativeDate('2026-05-04T11:35:00Z', now)).toBe('25 минут назад');
  });

  it('formats hours and "вчера"', () => {
    expect(formatRelativeDate('2026-05-04T09:00:00Z', now)).toBe('3 часа назад');
    expect(formatRelativeDate('2026-05-03T11:00:00Z', now)).toBe('вчера');
  });

  it('formats day counts up to a week', () => {
    expect(formatRelativeDate('2026-05-01T12:00:00Z', now)).toBe('3 дня назад');
    expect(formatRelativeDate('2026-04-29T12:00:00Z', now)).toBe('5 дней назад');
  });

  it('falls back to absolute russian date past a week', () => {
    const out = formatRelativeDate('2026-03-15T12:00:00Z', now);
    expect(out).toContain('марта');
    expect(out).toContain('2026');
  });

  it('returns the input unchanged if not a valid date', () => {
    expect(formatRelativeDate('not-a-date', now)).toBe('not-a-date');
  });
});

describe('detectExtension', () => {
  it('detects via MIME type', () => {
    expect(detectExtension(file({ name: 'foo', type: 'application/pdf' }))).toBe('pdf');
    expect(
      detectExtension(
        file({
          name: 'foo',
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        }),
      ),
    ).toBe('docx');
  });

  it('falls back to extension when MIME is empty', () => {
    expect(detectExtension(file({ name: 'cv.docx', type: '' }))).toBe('docx');
    expect(detectExtension(file({ name: 'CV.PDF', type: '' }))).toBe('pdf');
  });

  it('returns null for unsupported types', () => {
    expect(detectExtension(file({ name: 'photo.jpg', type: 'image/jpeg' }))).toBeNull();
    expect(detectExtension(file({ name: 'noext', type: '' }))).toBeNull();
  });
});

describe('validateFile', () => {
  it('passes a normal pdf file', () => {
    expect(validateFile(file({ size: 100_000 }))).toBeNull();
  });

  it('rejects a file over 10 MiB', () => {
    const result = validateFile(file({ size: MAX_FILE_BYTES + 1 }));
    expect(result?.kind).toBe('too-large');
  });

  it('rejects an unsupported type', () => {
    const result = validateFile(file({ name: 'photo.jpg', type: 'image/jpeg' }));
    expect(result?.kind).toBe('wrong-type');
  });

  it('passes exactly at the limit', () => {
    expect(validateFile(file({ size: MAX_FILE_BYTES }))).toBeNull();
  });

  it('formats validation errors in russian', () => {
    expect(formatValidationError({ kind: 'wrong-type', got: 'image/jpeg' })).toContain('PDF');
    expect(
      formatValidationError({
        kind: 'too-large',
        sizeBytes: 11 * 1024 * 1024,
        maxBytes: MAX_FILE_BYTES,
      }),
    ).toContain('Максимум');
  });
});
