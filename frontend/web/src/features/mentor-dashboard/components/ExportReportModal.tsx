/*
 * Модалка «Выгрузить отчёт» — port из mentor.html (openExportReportModal,
 * common.js:856+) с упрощениями под текущий сценарий ментора в React.
 *
 * Фактическая генерация документов — отдельный backend-таск (`POST
 * /api/team-reports/export` или аналог); пока что модалка собирает
 * параметры и закрывает себя через `onSubmit`, родитель показывает
 * inline-баннер «Отчёт сформирован». Помечено TODO для бэкенда.
 *
 * Esc + click-по-overlay закрывают, focus management и анимация —
 * как в AddMeetingModal.
 */

import type { JSX, FormEvent } from 'react';
import { useEffect, useRef, useState } from 'react';

import styles from './ExportReportModal.module.css';

export type ExportFormat = 'pdf' | 'docx' | 'xlsx';

export interface ExportReportPeriodOption {
  /** Уникальный value опции (`current`, `all`, `sprint:201`). */
  value: string;
  label: string;
}

export interface ExportReportSelection {
  period: string;
  format: ExportFormat;
  includeTeamReports: boolean;
  includePersonal: boolean;
  includeScores: boolean;
  includeMeetings: boolean;
}

interface Props {
  periodOptions: ExportReportPeriodOption[];
  onClose: () => void;
  onSubmit: (selection: ExportReportSelection) => void;
  isSubmitting?: boolean;
}

const FORMATS: Array<{ value: ExportFormat; label: string }> = [
  { value: 'pdf', label: 'PDF' },
  { value: 'docx', label: 'DOCX' },
  { value: 'xlsx', label: 'XLSX' },
];

export function ExportReportModal({
  periodOptions,
  onClose,
  onSubmit,
  isSubmitting = false,
}: Props): JSX.Element {
  const initialPeriod = periodOptions[0]?.value ?? 'current';

  const [period, setPeriod] = useState(initialPeriod);
  const [format, setFormat] = useState<ExportFormat>('pdf');
  const [includeTeamReports, setIncludeTeamReports] = useState(true);
  const [includePersonal, setIncludePersonal] = useState(true);
  const [includeScores, setIncludeScores] = useState(true);
  const [includeMeetings, setIncludeMeetings] = useState(true);

  const periodRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    periodRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  function handleSubmit(e: FormEvent): void {
    e.preventDefault();
    if (isSubmitting) return;
    onSubmit({
      period,
      format,
      includeTeamReports,
      includePersonal,
      includeScores,
      includeMeetings,
    });
  }

  return (
    <div
      className={styles.overlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Выгрузить отчёт"
    >
      <form className={styles.modal} onSubmit={handleSubmit}>
        <div className={styles.header}>
          <h3 className={styles.title}>Выгрузить отчёт</h3>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Закрыть модалку"
          >
            ✕
          </button>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="export-period">
            Период
          </label>
          <select
            id="export-period"
            ref={periodRef}
            className={styles.select}
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            {periodOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Формат</span>
          <div className={styles.radioRow} role="radiogroup" aria-label="Формат">
            {FORMATS.map((f) => (
              <label
                key={f.value}
                className={`${styles.radioChip} ${format === f.value ? styles.radioChipActive : ''}`}
              >
                <input
                  type="radio"
                  name="export-format"
                  value={f.value}
                  checked={format === f.value}
                  onChange={() => setFormat(f.value)}
                  className={styles.radioInput}
                />
                {f.label}
              </label>
            ))}
          </div>
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Включить</span>
          <div className={styles.checkboxList}>
            <CheckboxRow
              label="Командные отчёты"
              checked={includeTeamReports}
              onChange={setIncludeTeamReports}
            />
            <CheckboxRow
              label="Личные вклады"
              checked={includePersonal}
              onChange={setIncludePersonal}
            />
            <CheckboxRow label="Оценки" checked={includeScores} onChange={setIncludeScores} />
            <CheckboxRow
              label="Встречи"
              checked={includeMeetings}
              onChange={setIncludeMeetings}
            />
          </div>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.btnGhost}
            onClick={onClose}
            disabled={isSubmitting}
          >
            Отмена
          </button>
          <button type="submit" className={styles.btnPrimary} disabled={isSubmitting}>
            {isSubmitting ? 'Готовим…' : 'Скачать'}
          </button>
        </div>
      </form>
    </div>
  );
}

interface CheckboxRowProps {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}

function CheckboxRow({ label, checked, onChange }: CheckboxRowProps): JSX.Element {
  return (
    <label className={styles.checkboxRow}>
      <input
        type="checkbox"
        className={styles.checkboxInput}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}
