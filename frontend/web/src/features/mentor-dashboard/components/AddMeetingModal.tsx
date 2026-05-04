/*
 * Модалка «+ Назначить встречу» — pixel-port из mentor.html (1651–1693).
 *
 * Inline-портал не используем: модалка рендерится прямо в дереве страницы
 * и закрывает весь viewport фиксированным overlay. Esc + клик-по-overlay
 * закрывают её, focus возвращается к input'у темы при открытии.
 *
 * Сабмит сейчас атомарный — создаём встречу в одном POST и вызываем
 * `onSuccess` (родитель показывает баннер «Встреча назначена»).
 */

import type { JSX, FormEvent } from 'react';
import { useEffect, useRef, useState } from 'react';

import type { CreateMeetingInput } from '../hooks/useMeetings';
import styles from './AddMeetingModal.module.css';

const DURATIONS = [30, 45, 60, 90] as const;
const DEFAULT_DURATION = 45;

interface Props {
  onClose: () => void;
  onSubmit: (input: CreateMeetingInput) => void;
  isSubmitting?: boolean;
  serverError?: string | null;
}

export function AddMeetingModal({
  onClose,
  onSubmit,
  isSubmitting = false,
  serverError = null,
}: Props): JSX.Element {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState<number>(DEFAULT_DURATION);
  const [description, setDescription] = useState('');
  const [conferenceLink, setConferenceLink] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const titleRef = useRef<HTMLInputElement>(null);

  // Esc для закрытия. Зависимость на onClose позволяет родителю менять
  // обработчик без переподписки самой модалки на каждый рендер.
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

  // Базовый focus management — фокус в первый input при открытии,
  // блокировка скролла body. Полноценный focus-trap намеренно не делаем
  // (модалка короткая, на «Tab → за пределы» рассчитываем не сильнее
  // чем платформенный default).
  useEffect(() => {
    titleRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  function handleSubmit(e: FormEvent): void {
    e.preventDefault();
    if (isSubmitting) return;

    if (!title.trim()) {
      setValidationError('Укажите тему встречи');
      return;
    }
    if (!date) {
      setValidationError('Выберите дату');
      return;
    }
    if (!time) {
      setValidationError('Укажите время');
      return;
    }
    setValidationError(null);

    onSubmit({
      title: title.trim(),
      meetingDate: date,
      startTime: time,
      durationMinutes: duration,
      description: description.trim() || undefined,
      conferenceLink: conferenceLink.trim() || undefined,
    });
  }

  const error = validationError ?? serverError;

  return (
    <div
      className={styles.overlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Назначить встречу"
    >
      <form className={styles.modal} onSubmit={handleSubmit}>
        <div className={styles.header}>
          <h3 className={styles.title}>Назначить встречу</h3>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Закрыть модалку"
          >
            ✕
          </button>
        </div>

        <Field label="Тема встречи *" htmlFor="meeting-title">
          <input
            id="meeting-title"
            ref={titleRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Обзор спринта, постановка задач..."
            className={styles.input}
            required
          />
        </Field>

        <div className={styles.grid2}>
          <Field label="Дата *" htmlFor="meeting-date">
            <input
              id="meeting-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={styles.input}
              required
            />
          </Field>
          <Field label="Время *" htmlFor="meeting-time">
            <input
              id="meeting-time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className={styles.input}
              required
            />
          </Field>
        </div>

        <Field label="Длительность *">
          <div className={styles.radioRow} role="radiogroup" aria-label="Длительность">
            {DURATIONS.map((d) => (
              <label
                key={d}
                className={`${styles.radioChip} ${duration === d ? styles.radioChipActive : ''}`}
              >
                <input
                  type="radio"
                  name="meeting-duration"
                  value={d}
                  checked={duration === d}
                  onChange={() => setDuration(d)}
                  className={styles.radioInput}
                />
                {d} мин
              </label>
            ))}
          </div>
        </Field>

        <Field label="Повестка" htmlFor="meeting-description">
          <textarea
            id="meeting-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Что будем обсуждать..."
            className={styles.textarea}
            rows={3}
          />
        </Field>

        <Field label="Ссылка на конференцию" htmlFor="meeting-link">
          <input
            id="meeting-link"
            type="url"
            value={conferenceLink}
            onChange={(e) => setConferenceLink(e.target.value)}
            placeholder="https://zoom.us/j/..."
            className={styles.input}
          />
        </Field>

        {error ? (
          <div className={styles.error} role="alert">
            {error}
          </div>
        ) : null}

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
            {isSubmitting ? 'Сохраняем…' : 'Назначить'}
          </button>
        </div>
      </form>
    </div>
  );
}

interface FieldProps {
  label: string;
  htmlFor?: string;
  children: JSX.Element;
}

function Field({ label, htmlFor, children }: FieldProps): JSX.Element {
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={htmlFor}>
        {label}
      </label>
      {children}
    </div>
  );
}
