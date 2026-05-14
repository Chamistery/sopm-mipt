import { useRef, useState } from 'react';

import type { CreateProjectRequest } from '@/api/projects';
import { FieldNumber } from './FieldNumber';
import { FileDrop, type AttachedFile } from './FileDrop';
import { SectionNav } from './SectionNav';
import { SprintTimelinePreview } from './SprintTimelinePreview';
import { StepDots } from './StepDots';
import {
  emptyProposalData,
  firstMissingField,
  isSectionComplete,
  type ProposalData,
  type SectionIndex,
} from '../lib/projectFormState';
import styles from './NewProjectForm.module.css';

const SECTION_LABELS = [
  'Основная информация',
  'Требования и технологии',
  'Описание и критерии',
  'Параметры реализации',
];

export interface NewProjectFormSubmit {
  proposal: ProposalData;
}

interface PredecessorOption {
  id: number;
  title: string;
}

/**
 * Режим работы формы:
 *  - `create`   — пустая форма, кнопки «Назад/Далее/Создать проект» (текущий
 *                 экран `/mentor/projects/new`).
 *  - `edit`     — заполненная форма для редактирования активного проекта;
 *                 финальная кнопка «Сохранить изменения». Сейчас save отключён
 *                 (бэк PUT /api/projects/:id/proposal не реализован), кнопка
 *                 disabled с tooltip — см. MentorProjectInfoPage.
 *  - `readonly` — только просмотр (архивный проект): все поля disabled / readOnly,
 *                 кнопок навигации/сохранения нет — единственная кнопка «Закрыть»
 *                 рендерит вызывающая страница.
 */
export type NewProjectFormMode = 'create' | 'edit' | 'readonly';

interface Props {
  initial?: ProposalData;
  /** Режим: `create` по умолчанию. См. NewProjectFormMode. */
  mode?: NewProjectFormMode;
  /** Список архивных проектов для селекта «Проект-предшественник». */
  predecessors?: PredecessorOption[];
  /** Загружает заявку выбранного предшественника и подставляет в форму. */
  onFetchPredecessor?: (projectId: number) => Promise<ProposalData | null>;
  onSubmit: (value: NewProjectFormSubmit) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  serverError?: string | null;
  /** Текст финальной кнопки. По умолчанию — «Создать проект» / «Сохранить изменения». */
  submitLabel?: string;
  /** Если true (или есть `submitDisabledHint`) — финальная кнопка disabled. */
  submitDisabled?: boolean;
  submitDisabledHint?: string;
  /**
   * Подпись secondary-кнопки возврата на section 0 (в edit/readonly).
   * Например: 'К дашборду', 'К заявкам', 'Архив'. По умолчанию — 'Закрыть'.
   */
  cancelLabel?: string;
  /** Доп. слот в подвале (например, ссылка «Закрыть» в readonly). */
  footerExtras?: React.ReactNode;
  /** Доп. слот перед карточкой (банеры edit/readonly). */
  headerBanner?: React.ReactNode;
  /** Если true — скрыть «Заявка на проект» / «Заполните все поля…» (для edit/readonly). */
  hideIntro?: boolean;
}

/**
 * 4-секционная форма заявки на проект — pixel-port `mentor.html#view-create`.
 *
 * Секции:
 *   0. Основная информация (5 полей + контакт ментора + checkbox продолжения)
 *   1. Требования и технологии (2 textarea + extra-box доп.требований)
 *   2. Описание и критерии (3 textarea)
 *   3. Параметры реализации (radio-семестры + sprint-config + teams + ресурсы + file-drop)
 */
export function NewProjectForm({
  initial,
  mode = 'create',
  predecessors = [],
  onFetchPredecessor,
  onSubmit,
  onCancel,
  isSubmitting,
  serverError,
  submitLabel,
  submitDisabled,
  submitDisabledHint,
  cancelLabel,
  footerExtras,
  headerBanner,
  hideIntro,
}: Props): JSX.Element {
  const [data, setData] = useState<ProposalData>(initial ?? emptyProposalData());
  const [section, setSection] = useState<SectionIndex>(0);
  const [highlightField, setHighlightField] = useState<string | null>(null);
  const [files, setFiles] = useState<AttachedFile[]>([]);
  const [templateApplied, setTemplateApplied] = useState(false);
  const fileIdRef = useRef(0);

  const isReadonly = mode === 'readonly';
  const isEdit = mode === 'edit';
  // В режиме просмотра/редактирования секция «Является ли продолжением» не
  // имеет смысла (для edit — флаг уже зафиксирован при создании, для readonly —
  // просто данные).
  const hideContinuationBox = isReadonly || isEdit;
  // В режиме edit спринты уже стартовали — менять конфигурацию нельзя.
  // Поля sprint-section получают disabled.
  const sprintSectionLocked = isEdit;

  const update = (patch: Partial<ProposalData>): void => {
    setData((prev) => ({ ...prev, ...patch }));
    setHighlightField(null);
  };
  const updateMentor = (patch: Partial<ProposalData['mentor']>): void => {
    setData((prev) => ({ ...prev, mentor: { ...prev.mentor, ...patch } }));
    setHighlightField(null);
  };
  const updateSprints = (patch: Partial<ProposalData['sprints']>): void => {
    setData((prev) => ({ ...prev, sprints: { ...prev.sprints, ...patch } }));
    setHighlightField(null);
  };

  const goNext = (): void => {
    const missing = firstMissingField(data, section);
    if (missing) {
      setHighlightField(missing);
      return;
    }
    if (section < 3) {
      setSection(((section + 1) as SectionIndex));
    } else {
      onSubmit({ proposal: data });
    }
  };

  // Сохранение из любой секции — для edit-режима. Проверяем все 4 секции
  // подряд, и если какая-то не заполнена — переключаем на неё и подсвечиваем
  // обязательное поле. Иначе — submit.
  const saveFromAnywhere = (): void => {
    for (let i = 0; i <= 3; i += 1) {
      const idx = i as SectionIndex;
      const missing = firstMissingField(data, idx);
      if (missing) {
        if (idx !== section) setSection(idx);
        setHighlightField(missing);
        return;
      }
    }
    onSubmit({ proposal: data });
  };

  const goPrev = (): void => {
    if (section > 0) setSection(((section - 1) as SectionIndex));
  };

  const goTo = (idx: number): void => {
    // Allow free navigation; valdiation triggers only on Next/submit
    if (idx >= 0 && idx <= 3) setSection(idx as SectionIndex);
    setHighlightField(null);
  };

  const handlePredecessorChange = async (id: number): Promise<void> => {
    update({ predecessorProjectId: id || null });
    setTemplateApplied(false);
  };

  const handleFillFromTemplate = async (): Promise<void> => {
    if (!data.predecessorProjectId || !onFetchPredecessor) return;
    const tpl = await onFetchPredecessor(data.predecessorProjectId);
    if (tpl) {
      // сохраняем флаг продолжения и id, остальное берём из шаблона
      const merged: ProposalData = {
        ...tpl,
        isContinuation: true,
        predecessorProjectId: data.predecessorProjectId,
      };
      setData(merged);
      setTemplateApplied(true);
    }
  };

  const fieldErr = (name: string): boolean => highlightField === name;

  return (
    <div className={styles.layout}>
      <SectionNav
        items={SECTION_LABELS.map((l) => ({ label: l }))}
        active={section}
        onSelect={goTo}
      />
      <div className={styles.card}>
        {headerBanner}
        {!hideIntro ? (
          <>
            <h2 className={styles.cardTitle}>Заявка на проект</h2>
            <p className={styles.cardDesc}>
              Заполните все поля в соответствии с Приложением 1 Положения о проектном практикуме
            </p>
          </>
        ) : null}

        {/* Section 0 */}
        {section === 0 ? (
          <div className={styles.sectionContent} data-section={0}>
            {!hideContinuationBox ? (
            <div className={`${styles.extraBox} ${styles.continuationBox}`}>
              <div className={`${styles.extraBoxTitle} ${styles.continuationTitle}`}>
                Является ли проект продолжением?
              </div>
              <div className={styles.formHint}>
                Отметьте, если этот проект — продолжение вашего завершённого проекта из прошлого
                семестра. Студенты увидят соответствующий бейдж в каталоге.
              </div>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={data.isContinuation}
                  onChange={(e) => {
                    const v = e.target.checked;
                    update({ isContinuation: v, predecessorProjectId: v ? data.predecessorProjectId : null });
                    if (!v) setTemplateApplied(false);
                  }}
                />
                <span>Это продолжение моего предыдущего проекта</span>
              </label>
              {data.isContinuation ? (
                <div className={styles.predecessorWrap}>
                  <span className={styles.smallLabel}>
                    Проект-предшественник <span className={styles.required}>*</span>
                  </span>
                  <select
                    className={styles.input}
                    value={data.predecessorProjectId ?? ''}
                    onChange={(e) => handlePredecessorChange(Number(e.target.value))}
                  >
                    <option value="">— выберите проект из архива —</option>
                    {predecessors.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                  <div className={styles.formHint}>
                    Показаны только ваши завершённые проекты из прошлых семестров.
                  </div>
                  {data.predecessorProjectId ? (
                    <div className={styles.fillTemplateWrap}>
                      <div className={styles.formHint}>
                        Можете заполнить поля заявки по шаблону проекта-предшественника. Все
                        значения остаются редактируемыми — измените то, что изменилось во втором
                        семестре.
                      </div>
                      <button
                        type="button"
                        className={styles.fillTemplateBtn}
                        onClick={handleFillFromTemplate}
                      >
                        Заполнить по шаблону
                      </button>
                      {templateApplied ? (
                        <span className={styles.fillTemplateOk}>Поля заполнены</span>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
            ) : null}

            <Field
              label="Полное название проекта"
              fieldNumber={1}
              required
              hint="Название должно отражать содержание результата и его конструктивных особенностей"
              error={fieldErr('title')}
            >
              <input
                className={`${styles.input} ${fieldErr('title') ? styles.inputError : ''}`}
                value={data.title}
                placeholder="Отражает содержание результата и конструктивные особенности"
                onChange={(e) => update({ title: e.target.value })}
                readOnly={isReadonly}
              />
            </Field>

            <Field
              label="Наименование Инициатора"
              fieldNumber={2}
              required
              hint="Полное название организации-заказчика или подразделения МФТИ"
              error={fieldErr('company')}
            >
              <input
                className={`${styles.input} ${fieldErr('company') ? styles.inputError : ''}`}
                value={data.company}
                placeholder="Название организации"
                onChange={(e) => update({ company: e.target.value })}
                readOnly={isReadonly}
              />
            </Field>

            <Field
              label="Информация о менторе проекта"
              fieldNumber={3}
              required
              hint="ФИО, должность, электронная почта, телеграм, телефон"
            >
              <div className={styles.grid2}>
                <input
                  className={`${styles.input} ${fieldErr('mentor.fullName') ? styles.inputError : ''}`}
                  value={data.mentor.fullName}
                  placeholder="ФИО ментора"
                  onChange={(e) => updateMentor({ fullName: e.target.value })}
                  readOnly={isReadonly}
                />
                <input
                  className={`${styles.input} ${fieldErr('mentor.role') ? styles.inputError : ''}`}
                  value={data.mentor.role}
                  placeholder="Должность"
                  onChange={(e) => updateMentor({ role: e.target.value })}
                  readOnly={isReadonly}
                />
                <input
                  type="email"
                  className={`${styles.input} ${fieldErr('mentor.email') ? styles.inputError : ''}`}
                  value={data.mentor.email}
                  placeholder="Электронная почта"
                  onChange={(e) => updateMentor({ email: e.target.value })}
                  readOnly={isReadonly}
                />
                <input
                  className={styles.input}
                  value={data.mentor.telegram}
                  placeholder="Телеграм"
                  onChange={(e) => updateMentor({ telegram: e.target.value })}
                  readOnly={isReadonly}
                />
                <input
                  className={`${styles.input} ${styles.gridFull}`}
                  value={data.mentor.phone}
                  placeholder="Телефон"
                  onChange={(e) => updateMentor({ phone: e.target.value })}
                  readOnly={isReadonly}
                />
              </div>
            </Field>

            <Field
              label="Цель проекта"
              fieldNumber={4}
              required
              hint="Формулирует цель проектной деятельности как решение некоторой проблемы"
              error={fieldErr('goal')}
            >
              <textarea
                className={`${styles.textarea} ${fieldErr('goal') ? styles.inputError : ''}`}
                value={data.goal}
                placeholder="Формулирует цель проектной деятельности как решение некоторой проблемы"
                onChange={(e) => update({ goal: e.target.value })}
                readOnly={isReadonly}
              />
            </Field>

            <Field
              label="Результат (продукт)"
              fieldNumber={5}
              required
              hint="Содержит ожидаемый результат проектной деятельности"
              error={fieldErr('expectedResult')}
            >
              <textarea
                className={`${styles.textarea} ${fieldErr('expectedResult') ? styles.inputError : ''}`}
                value={data.expectedResult}
                placeholder="Ожидаемый результат проектной деятельности"
                onChange={(e) => update({ expectedResult: e.target.value })}
                readOnly={isReadonly}
              />
            </Field>
          </div>
        ) : null}

        {/* Section 1 */}
        {section === 1 ? (
          <div className={styles.sectionContent} data-section={1}>
            <Field
              label="Требования к инструментам и технологиям"
              fieldNumber={6}
              required
              hint="Критический, не исчерпывающий перечень средств реализации проекта"
              error={fieldErr('technologies')}
            >
              <textarea
                className={`${styles.textarea} ${fieldErr('technologies') ? styles.inputError : ''}`}
                value={data.technologies}
                placeholder="Python, Django, PostgreSQL, React..."
                onChange={(e) => update({ technologies: e.target.value })}
                readOnly={isReadonly}
              />
            </Field>

            <Field
              label="Требования к компетенциям участников"
              fieldNumber={7}
              required
              hint="Перечень необходимых базовых компетенций, без овладения которыми студенты не допускаются к участию"
              error={fieldErr('competencies')}
            >
              <textarea
                className={`${styles.textarea} ${fieldErr('competencies') ? styles.inputError : ''}`}
                value={data.competencies}
                placeholder="Перечислите базовые компетенции"
                onChange={(e) => update({ competencies: e.target.value })}
                readOnly={isReadonly}
              />
            </Field>

            <div className={styles.extraBox}>
              <div className={styles.extraBoxTitle}>Дополнительные требования к студентам</div>
              <div className={styles.grid2}>
                <div>
                  <span className={styles.smallLabel}>Минимальный рейтинг</span>
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    className={styles.input}
                    value={data.minRating ?? ''}
                    placeholder="Напр.: 3.5"
                    onChange={(e) => update({ minRating: e.target.value === '' ? null : Number(e.target.value) })}
                    readOnly={isReadonly}
                  />
                </div>
                <div>
                  <span className={styles.smallLabel}>Минимальный средний балл</span>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    step={0.1}
                    className={styles.input}
                    value={data.minGpa ?? ''}
                    placeholder="Напр.: 7.0"
                    onChange={(e) => update({ minGpa: e.target.value === '' ? null : Number(e.target.value) })}
                    readOnly={isReadonly}
                  />
                </div>
                <div className={styles.gridFull}>
                  <span className={styles.smallLabel}>Требования к курсу обучения</span>
                  <div className={styles.checkboxGroup}>
                    {[1, 2, 3, 4].map((c) => (
                      <label key={c} className={styles.checkboxPill}>
                        <input
                          type="checkbox"
                          checked={data.allowedCourses.includes(c)}
                          onChange={(e) => {
                            const next = e.target.checked
                              ? [...data.allowedCourses, c]
                              : data.allowedCourses.filter((x) => x !== c);
                            update({ allowedCourses: next.sort() });
                          }}
                          disabled={isReadonly}
                        />
                        {c} курс
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Section 2 */}
        {section === 2 ? (
          <div className={styles.sectionContent} data-section={2}>
            <Field
              label="Описание проекта"
              fieldNumber={8}
              required
              hint="Подробное описание проекта"
              error={fieldErr('description')}
            >
              <textarea
                className={`${styles.textarea} ${styles.textareaLg} ${fieldErr('description') ? styles.inputError : ''}`}
                value={data.description}
                placeholder="Подробное описание проекта"
                onChange={(e) => update({ description: e.target.value })}
                readOnly={isReadonly}
              />
            </Field>

            <Field
              label="Критерии приёмки результата"
              fieldNumber={9}
              required
              hint="Описание функциональных требований и конструктивных особенностей ожидаемого результата"
              error={fieldErr('acceptanceCriteria')}
            >
              <textarea
                className={`${styles.textarea} ${fieldErr('acceptanceCriteria') ? styles.inputError : ''}`}
                value={data.acceptanceCriteria}
                placeholder="Функциональные требования"
                onChange={(e) => update({ acceptanceCriteria: e.target.value })}
                readOnly={isReadonly}
              />
            </Field>

            <Field
              label="Ожидаемый образовательный результат"
              fieldNumber={10}
              required
              hint="Перечень новых и развитых компетенций"
              error={fieldErr('eduResult')}
            >
              <textarea
                className={`${styles.textarea} ${fieldErr('eduResult') ? styles.inputError : ''}`}
                value={data.eduResult}
                placeholder="Перечень компетенций"
                onChange={(e) => update({ eduResult: e.target.value })}
                readOnly={isReadonly}
              />
            </Field>
          </div>
        ) : null}

        {/* Section 3 */}
        {section === 3 ? (
          <div className={styles.sectionContent} data-section={3}>
            <Field
              label="Срок реализации проекта"
              fieldNumber={11}
              required
              hint="Укажите количество семестров"
            >
              <div className={styles.radioGroup}>
                {[1, 2, 3].map((sem) => (
                  <label key={sem} className={styles.radioPill}>
                    <input
                      type="radio"
                      name="durationSemesters"
                      checked={data.durationSemesters === sem}
                      onChange={() => update({ durationSemesters: sem as 1 | 2 | 3 })}
                      disabled={isReadonly || sprintSectionLocked}
                    />
                    {sem === 1 ? '1 семестр' : `${sem} семестра`}
                  </label>
                ))}
              </div>
            </Field>

            <div className={styles.extraBox}>
              <div className={styles.extraBoxTitle}>Настройка спринтов</div>
              <div className={styles.formHint}>
                Все команды проекта работают по одному расписанию спринтов.
              </div>
              <div className={styles.grid2} style={{ marginTop: 10 }}>
                <div>
                  <span className={styles.smallLabel}>
                    Количество спринтов <span className={styles.required}>*</span>
                  </span>
                  <input
                    type="number"
                    min={2}
                    max={10}
                    className={`${styles.input} ${fieldErr('sprints.count') ? styles.inputError : ''}`}
                    value={data.sprints.count}
                    onChange={(e) => updateSprints({ count: Number(e.target.value) })}
                    readOnly={isReadonly}
                    disabled={sprintSectionLocked}
                  />
                </div>
                <div>
                  <span className={styles.smallLabel}>
                    Дата начала первого спринта <span className={styles.required}>*</span>
                  </span>
                  <input
                    type="date"
                    aria-label="Дата начала первого спринта"
                    className={`${styles.input} ${fieldErr('sprints.startDate') ? styles.inputError : ''}`}
                    value={data.sprints.startDate}
                    onChange={(e) => updateSprints({ startDate: e.target.value })}
                    readOnly={isReadonly}
                    disabled={sprintSectionLocked}
                  />
                </div>
              </div>

              <div className={styles.modeSwitch}>
                <button
                  type="button"
                  className={`${styles.modeBtn} ${data.sprints.mode === 'simple' ? styles.modeBtnActive : ''}`}
                  onClick={() => updateSprints({ mode: 'simple' })}
                  disabled={isReadonly || sprintSectionLocked}
                >
                  Одинаковая длительность
                </button>
                <button
                  type="button"
                  className={`${styles.modeBtn} ${data.sprints.mode === 'custom' ? styles.modeBtnActive : ''}`}
                  onClick={() => {
                    const custom = Array.from({ length: data.sprints.count }, () => data.sprints.durationWeeks);
                    updateSprints({ mode: 'custom', customWeeks: custom });
                  }}
                  disabled={isReadonly || sprintSectionLocked}
                >
                  Настроить каждый
                </button>
              </div>

              {data.sprints.mode === 'simple' ? (
                <div style={{ marginTop: 12 }}>
                  <span className={styles.smallLabel}>
                    Продолжительность каждого спринта <span className={styles.required}>*</span>
                  </span>
                  <div className={styles.radioGroup}>
                    {[2, 3, 4].map((w) => (
                      <label key={w} className={`${styles.radioPill} ${styles.radioPillSm}`}>
                        <input
                          type="radio"
                          name="sprint_dur"
                          checked={data.sprints.durationWeeks === w}
                          onChange={() => updateSprints({ durationWeeks: w })}
                          disabled={isReadonly || sprintSectionLocked}
                        />
                        {w} нед.
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}

              <div style={{ marginTop: 14 }}>
                <SprintTimelinePreview
                  config={data.sprints}
                  onCustomDurationChange={(idx, weeks) => {
                    const custom = (data.sprints.customWeeks ?? []).slice();
                    while (custom.length < data.sprints.count) {
                      custom.push(data.sprints.durationWeeks);
                    }
                    custom[idx] = weeks;
                    updateSprints({ customWeeks: custom });
                  }}
                />
              </div>
            </div>

            <Field
              label="Количество команд для параллельной разработки"
              fieldNumber={12}
              required
              hint="Сколько параллельных команд могут работать над проектом"
            >
              <div className={styles.grid2}>
                <div>
                  <span className={styles.smallLabel}>Количество команд</span>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    className={`${styles.input} ${fieldErr('numTeams') ? styles.inputError : ''}`}
                    value={data.numTeams}
                    onChange={(e) => update({ numTeams: Number(e.target.value) })}
                    readOnly={isReadonly}
                  />
                </div>
                <div>
                  <span className={styles.smallLabel}>Студентов в команде</span>
                  <div className={styles.teamSizeRow}>
                    <input
                      type="number"
                      min={1}
                      max={7}
                      className={`${styles.teamSizeInput} ${fieldErr('teamSizeMin') ? styles.inputError : ''}`}
                      value={data.teamSizeMin}
                      onChange={(e) => update({ teamSizeMin: Number(e.target.value) })}
                      readOnly={isReadonly}
                    />
                    <span className={styles.teamSizeSep}>—</span>
                    <input
                      type="number"
                      min={1}
                      max={7}
                      className={`${styles.teamSizeInput} ${fieldErr('teamSizeMax') ? styles.inputError : ''}`}
                      value={data.teamSizeMax}
                      onChange={(e) => update({ teamSizeMax: Number(e.target.value) })}
                      readOnly={isReadonly}
                    />
                    <span className={styles.teamSizeUnit}>чел.</span>
                  </div>
                </div>
              </div>
            </Field>

            <Field
              label="Ресурсы, предоставляемые Инициатором"
              fieldNumber={13}
              hint="Укажите ресурсы или «Не требуется»"
            >
              <textarea
                className={styles.textarea}
                value={data.resources}
                placeholder="Оборудование, ПО, доступ к данным..."
                onChange={(e) => update({ resources: e.target.value })}
                readOnly={isReadonly}
              />
            </Field>

            {!isReadonly ? (
              <FileDrop
                files={files}
                onFilesAdded={(added) => {
                  const next: AttachedFile[] = added.map((f) => {
                    fileIdRef.current += 1;
                    return { id: `f-${fileIdRef.current}`, name: f.name, size: f.size };
                  });
                  setFiles((prev) => [...prev, ...next]);
                }}
                onFileRemoved={(id) => setFiles((prev) => prev.filter((f) => f.id !== id))}
              />
            ) : null}
          </div>
        ) : null}

        {highlightField ? (
          <div className={styles.errorInline} role="alert">
            Обязательное поле — заполните выделенное красным.
          </div>
        ) : null}
        {serverError ? <div className={styles.errorBlock}>{serverError}</div> : null}

        <div className={styles.footer}>
          <StepDots total={4} active={section} onSelect={goTo} />
          {isReadonly ? (
            <div className={styles.actions}>
              {footerExtras}
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={onCancel}
              >
                {cancelLabel ?? 'Закрыть'}
              </button>
            </div>
          ) : isEdit ? (
            // В edit-режиме «Сохранить изменения» всегда доступно — ментор не
            // обязан долистывать до последней секции, чтобы применить правку
            // одного поля. «Далее» остаётся отдельной кнопкой, пока есть куда
            // переходить.
            <div className={styles.actions}>
              {footerExtras}
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={section === 0 ? onCancel : goPrev}
                disabled={isSubmitting}
              >
                {section === 0 ? cancelLabel ?? 'Закрыть' : 'Назад'}
              </button>
              {section < 3 ? (
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={goNext}
                  disabled={isSubmitting}
                  data-testid="form-next"
                >
                  Далее
                </button>
              ) : null}
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={saveFromAnywhere}
                disabled={isSubmitting || Boolean(submitDisabled)}
                data-testid="form-save"
                title={submitDisabledHint}
              >
                {isSubmitting ? 'Сохраняем…' : submitLabel ?? 'Сохранить изменения'}
              </button>
            </div>
          ) : (
            <div className={styles.actions}>
              {footerExtras}
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={section === 0 ? onCancel : goPrev}
                disabled={isSubmitting}
              >
                {section === 0 ? 'Отмена' : 'Назад'}
              </button>
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={goNext}
                disabled={isSubmitting || (section === 3 && Boolean(submitDisabled))}
                data-testid="form-next"
                title={section === 3 ? submitDisabledHint : undefined}
              >
                {section === 3
                  ? isSubmitting
                    ? 'Сохраняем…'
                    : submitLabel ?? 'Создать проект'
                  : 'Далее'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface FieldProps {
  label: string;
  fieldNumber: number;
  required?: boolean;
  hint?: string;
  error?: boolean;
  children: React.ReactNode;
}

function Field({ label, fieldNumber, required, hint, error, children }: FieldProps): JSX.Element {
  return (
    <div className={`${styles.field} ${error ? styles.fieldError : ''}`}>
      <label className={styles.fieldLabel}>
        <FieldNumber n={fieldNumber} />
        <span>{label}</span>
        {required ? <span className={styles.required}>*</span> : null}
      </label>
      {hint ? <div className={styles.formHint}>{hint}</div> : null}
      {children}
      {error ? <div className={styles.fieldHintError}>Обязательное поле</div> : null}
    </div>
  );
}

/**
 * Builds the API payload from a validated form. Accepts identity context (mentor) so
 * the form component itself stays free of auth wiring.
 */
export function buildCreateProjectRequest(
  proposal: ProposalData,
  context: { mentorId: number },
): CreateProjectRequest {
  const technologies = proposal.technologies
    .split(/[,\n]/)
    .map((t) => t.trim())
    .filter(Boolean);

  return {
    title: proposal.title,
    mentorId: context.mentorId,
    creatorId: context.mentorId,
    company: proposal.company,
    description: proposal.description,
    fullDescription: proposal.description,
    technologies,
    teamSizeMin: proposal.teamSizeMin,
    teamSizeMax: proposal.teamSizeMax,
    numTeams: proposal.numTeams,
    minGpa: proposal.minGpa ?? undefined,
    goal: proposal.goal,
    expectedResult: proposal.expectedResult,
    acceptanceCriteria: proposal.acceptanceCriteria,
    competencies: proposal.competencies,
    resources: proposal.resources,
    eduResult: proposal.eduResult,
    durationSemesters: proposal.durationSemesters,
    predecessorProjectId: proposal.isContinuation ? proposal.predecessorProjectId : null,
    proposalData: proposal,
  };
}

// Re-export for tests / Storybook conveniences.
export { isSectionComplete };
export type { ProposalData };
