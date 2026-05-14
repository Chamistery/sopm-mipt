import { useQuery } from '@tanstack/react-query';

import { ApiError } from '@/api/client';
import { getFieldValue } from '@/api/projects';
import { getUserProfile, type UserSummary } from '@/api/users';

import { useProjectDetails } from '../hooks/useCatalog';
import type { CatalogProject } from '../types';
import styles from './ProjectDetailsView.module.css';

interface Props {
  /** Catalog row already in memory — gives us mentorName, company etc. while details load. */
  baseInfo: CatalogProject;
  /** Resolved mentor from catalog data, if available. */
  mentor: UserSummary | null;
  /** Where the user came from — affects back-link text and footer action. */
  origin: 'catalog' | 'choices';
  /** True when the project sits in one of the student's priority slots. */
  selected: boolean;
  /** Total selected count is 5 — used to hide «Хочу в проект». */
  selectionFull: boolean;
  /** Application has been submitted — UI is read-only. */
  readOnly: boolean;
  onBack: () => void;
  onSelect: (id: number) => void;
  onRemove: (id: number) => void;
}

export function ProjectDetailsView({
  baseInfo,
  mentor,
  origin,
  selected,
  selectionFull,
  readOnly,
  onBack,
  onSelect,
  onRemove,
}: Props): JSX.Element {
  const { data, isLoading, error } = useProjectDetails(baseInfo.id);

  const mentorProfile = useQuery({
    queryKey: ['user', baseInfo.mentorId, 'profile'],
    queryFn: () => getUserProfile(baseInfo.mentorId),
    staleTime: 5 * 60_000,
  });

  const description =
    data?.fullDescription ||
    data?.description ||
    getFieldValue(data, 'description') ||
    baseInfo.description ||
    '';

  const technologies =
    data?.technologies && data.technologies.length > 0
      ? data.technologies
      : baseInfo.technologies && baseInfo.technologies.length > 0
        ? baseInfo.technologies
        : null;
  const technologiesFallback = !technologies ? getFieldValue(data, 'technologies') : '';

  const eduResult =
    data?.eduResult ||
    data?.expectedResult ||
    getFieldValue(data, 'goals') ||
    '';

  const requirements =
    data?.acceptanceCriteria ||
    getFieldValue(data, 'requirements') ||
    '';

  const mentorInitials = mentor
    ? `${(mentor.lastName?.[0] ?? '').toUpperCase()}${(mentor.firstName?.[0] ?? '').toUpperCase()}`
    : baseInfo.mentorName
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() ?? '')
        .join('');

  return (
    <div className={styles.wrap}>
      <div className={styles.breadcrumb}>
        <button type="button" className={styles.backBtn} onClick={onBack}>
          <svg width="16" height="16" fill="none" viewBox="0 0 16 16" aria-hidden="true">
            <path
              d="M10 4l-4 4 4 4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {origin === 'catalog' ? 'Назад к списку проектов' : 'Назад к выбранным проектам'}
        </button>
      </div>

      <div className={styles.card}>
        <div className={styles.company}>{baseInfo.company ?? '—'}</div>
        <h2 className={styles.title}>{baseInfo.title}</h2>

        {isLoading ? <div className={styles.placeholder}>Загружаем детали…</div> : null}
        {error ? (
          <div className={styles.error}>
            {error instanceof ApiError ? error.message : 'Не удалось загрузить детали проекта.'}
          </div>
        ) : null}

        {description ? (
          <section className={styles.section}>
            <div className={styles.sectionTitle}>Описание проекта</div>
            <div className={styles.sectionBody}>{description}</div>
          </section>
        ) : null}

        {technologies ? (
          <section className={styles.section}>
            <div className={styles.sectionTitle}>Технологии</div>
            <div className={styles.tags}>
              {technologies.map((t) => (
                <span key={t} className={styles.tag}>
                  {t}
                </span>
              ))}
            </div>
          </section>
        ) : technologiesFallback ? (
          <section className={styles.section}>
            <div className={styles.sectionTitle}>Технологии</div>
            <div className={styles.sectionBody}>{technologiesFallback}</div>
          </section>
        ) : null}

        {eduResult ? (
          <section className={styles.section}>
            <div className={styles.sectionTitle}>Образовательный результат</div>
            <div className={styles.sectionBody}>{eduResult}</div>
          </section>
        ) : null}

        {requirements ? (
          <section className={styles.section}>
            <div className={styles.sectionTitle}>Требования к участникам</div>
            <div className={styles.sectionBody}>{requirements}</div>
          </section>
        ) : null}

        <section className={styles.section}>
          <div className={styles.sectionTitle}>Ментор</div>
          <div className={styles.mentor}>
            <div className={styles.avatar}>{mentorInitials || '?'}</div>
            <div className={styles.mentorInfo}>
              <div className={styles.mentorName}>{baseInfo.mentorName}</div>
              {mentor?.direction ? (
                <div className={styles.mentorRole}>{mentor.direction}</div>
              ) : null}
              <div className={styles.mentorContacts}>
                {mentor?.email ? (
                  <a href={`mailto:${mentor.email}`}>{mentor.email}</a>
                ) : null}
                {mentorProfile.data?.telegram ? (
                  <a
                    href={
                      mentorProfile.data.telegram.startsWith('http')
                        ? mentorProfile.data.telegram
                        : `https://t.me/${mentorProfile.data.telegram.replace(/^@/, '')}`
                    }
                    target="_blank"
                    rel="noreferrer"
                  >
                    {mentorProfile.data.telegram.startsWith('@')
                      ? mentorProfile.data.telegram
                      : `@${mentorProfile.data.telegram.replace(/^@/, '')}`}
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <div className={styles.footer}>
          <span className={styles.meta}>
            {baseInfo.teamSizeMax ? (
              <>
                <b>{baseInfo.teamSizeMax}</b> чел.
              </>
            ) : null}
            {baseInfo.numTeams ? (
              <>
                {' · '}
                <b>{baseInfo.numTeams}</b>{' '}
                {baseInfo.numTeams === 1 ? 'команда' : 'команды'}
              </>
            ) : null}
            {baseInfo.filledSlots != null ? (
              <>
                {' · '}
                <b>{baseInfo.filledSlots}</b> занято
              </>
            ) : null}
          </span>
          <div className={styles.footerAction}>
            {readOnly ? (
              selected ? (
                <span className={styles.readOnlyMark}>✓ В заявке</span>
              ) : null
            ) : selected ? (
              <button
                type="button"
                className={styles.removeBtn}
                onClick={() => {
                  onRemove(baseInfo.id);
                  if (origin === 'choices') onBack();
                }}
              >
                Убрать из выбранных
              </button>
            ) : origin === 'catalog' ? (
              selectionFull ? (
                <span className={styles.fullHint}>Выбрано 5 проектов</span>
              ) : (
                <button
                  type="button"
                  className={styles.wantBtn}
                  disabled={baseInfo.unqualified}
                  onClick={() => {
                    onSelect(baseInfo.id);
                    onBack();
                  }}
                >
                  Хочу в проект
                </button>
              )
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
