import { useState, type FormEvent } from 'react';

import type { CreateProjectRequest } from '@/api/projects';
import styles from './NewProjectForm.module.css';

export interface NewProjectFormState {
  title: string;
  company: string;
  course: string;
  maxSlots: string;
  description: string;
}

const EMPTY_FORM: NewProjectFormState = {
  title: '',
  company: '',
  course: '',
  maxSlots: '5',
  description: '',
};

export interface NewProjectFormResult {
  title: string;
  company?: string;
  course?: string;
  maxSlots: number;
  description?: string;
}

export interface NewProjectFormErrors {
  title?: string;
  maxSlots?: string;
}

/**
 * Validates the form input. Returns either the typed result or a map of
 * field-level errors. Pure function — exposed for unit tests.
 */
export function validateNewProjectForm(
  form: NewProjectFormState,
): { ok: true; value: NewProjectFormResult } | { ok: false; errors: NewProjectFormErrors } {
  const errors: NewProjectFormErrors = {};
  const title = form.title.trim();
  if (title.length < 3) {
    errors.title = 'Название не короче 3 символов';
  }
  const maxSlotsNum = Number.parseInt(form.maxSlots, 10);
  if (!Number.isInteger(maxSlotsNum) || maxSlotsNum < 1) {
    errors.maxSlots = 'Минимум 1 место';
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  const result: NewProjectFormResult = {
    title,
    maxSlots: maxSlotsNum,
  };
  const company = form.company.trim();
  if (company) result.company = company;
  const course = form.course.trim();
  if (course) result.course = course;
  const description = form.description.trim();
  if (description) result.description = description;
  return { ok: true, value: result };
}

interface Props {
  /** Pre-filled values, used by the Storybook stories. */
  initialValues?: Partial<NewProjectFormState>;
  /** Submit handler — receives validated, trimmed data. */
  onSubmit: (value: NewProjectFormResult) => void;
  /** Cancel handler — link back to the dashboard. */
  onCancel: () => void;
  /** Whether a submission is in flight. */
  isSubmitting?: boolean;
  /** Optional server-side error to display under the form. */
  serverError?: string | null;
  /**
   * Whether template metadata is still loading. The form needs at least
   * one template to construct a CreateProjectRequest, so we disable the
   * submit until we have a templateId.
   */
  templateMissing?: boolean;
}

export function NewProjectForm({
  initialValues,
  onSubmit,
  onCancel,
  isSubmitting,
  serverError,
  templateMissing,
}: Props): JSX.Element {
  const [form, setForm] = useState<NewProjectFormState>({ ...EMPTY_FORM, ...initialValues });
  const [errors, setErrors] = useState<NewProjectFormErrors>({});
  const [showDetails, setShowDetails] = useState(false);

  const update = (patch: Partial<NewProjectFormState>): void =>
    setForm((prev) => ({ ...prev, ...patch }));

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const result = validateNewProjectForm(form);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    onSubmit(result.value);
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <section className={styles.card}>
        <div className={styles.sectionHead}>Основное</div>
        <div className={styles.grid}>
          <Field
            label="Название"
            value={form.title}
            placeholder="Например: Платформа автоматизации тестирования"
            error={errors.title}
            onChange={(v) => update({ title: v })}
            required
          />
          <Field
            label="Компания-заказчик"
            value={form.company}
            placeholder="МФТИ, Яндекс…"
            onChange={(v) => update({ company: v })}
          />
          <Field
            label="Курс"
            value={form.course}
            placeholder="2"
            onChange={(v) => update({ course: v })}
          />
          <Field
            label="Максимум мест"
            value={form.maxSlots}
            type="number"
            error={errors.maxSlots}
            onChange={(v) => update({ maxSlots: v })}
            required
          />
        </div>
      </section>

      <section className={styles.card}>
        <button
          type="button"
          className={styles.detailsToggle}
          onClick={() => setShowDetails((s) => !s)}
          aria-expanded={showDetails}
        >
          {showDetails ? '− Скрыть подробности' : '+ Подробности (необязательно)'}
        </button>
        {showDetails ? (
          <div className={styles.detailsBody}>
            <label className={styles.field}>
              <div className={styles.fieldLabel}>Краткое описание</div>
              <textarea
                className={styles.textarea}
                rows={4}
                value={form.description}
                placeholder="О чём проект, что он решает"
                onChange={(e) => update({ description: e.target.value })}
              />
            </label>
            <p className={styles.hint}>
              Расширенные поля (цели, технологии, ожидаемый результат, требования) появятся
              следом за выпуском «полной» версии шаблона проекта на бэке.
            </p>
          </div>
        ) : null}
      </section>

      {serverError ? <div className={styles.error}>{serverError}</div> : null}
      {templateMissing ? (
        <div className={styles.warning}>
          Не удалось загрузить шаблон проекта. Создание временно недоступно — обратитесь к
          координатору, чтобы добавить шаблон.
        </div>
      ) : null}

      <div className={styles.actions}>
        <button
          type="submit"
          className={styles.primary}
          disabled={isSubmitting || templateMissing}
        >
          {isSubmitting ? 'Сохраняем…' : 'Создать проект'}
        </button>
        <button type="button" className={styles.secondary} onClick={onCancel}>
          Отмена
        </button>
      </div>
    </form>
  );
}

/**
 * Builds a CreateProjectRequest payload by stitching the validated form
 * result with mentor / template context. Pure helper — keeps the page
 * component free of business plumbing.
 */
export function buildCreateProjectRequest(
  value: NewProjectFormResult,
  context: { mentorId: number; templateId: string },
): CreateProjectRequest {
  return {
    title: value.title,
    templateId: context.templateId,
    mentorId: context.mentorId,
    creatorId: context.mentorId,
    maxSlots: value.maxSlots,
    company: value.company,
    course: value.course,
    fieldValues: value.description ? [{ fieldId: 'description', value: value.description }] : [],
  };
}

interface FieldProps {
  label: string;
  value: string;
  placeholder?: string;
  type?: 'text' | 'number';
  required?: boolean;
  error?: string;
  onChange: (value: string) => void;
}

function Field({
  label,
  value,
  placeholder,
  type = 'text',
  required,
  error,
  onChange,
}: FieldProps): JSX.Element {
  return (
    <label className={styles.field}>
      <div className={styles.fieldLabel}>
        {label}
        {required ? <span className={styles.required}> *</span> : null}
      </div>
      <input
        className={`${styles.input} ${error ? styles.inputError : ''}`}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
      />
      {error ? <div className={styles.errorInline}>{error}</div> : null}
    </label>
  );
}
