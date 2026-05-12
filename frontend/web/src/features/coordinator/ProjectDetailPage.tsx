/*
 * Координаторская страница проекта. Pixel-port из admin.html
 * (view-project, lines 2018-2062).
 *
 * Структура:
 *   breadcrumb «Дашборд → ProjectTitle»
 *   header (title + subtitle «Компания · Ментор» + кнопка «Редактировать»)
 *   proj-info-grid (2 col): 8 коротких полей + 4 длинных (goal /
 *     expectedResult / acceptanceCriteria / fullDescription)
 *   section «Команды проекта» + кнопка «Выгрузить отчёт»
 *   proj-team-picker — кнопки команд (клик ведёт в /admin/teams/:teamId)
 *
 * Известное упрощение: встроенный Гант ниже team-picker отложен — на
 * MVP клик по команде открывает /admin/teams/:teamId со всем Гантом
 * (read-only). В прототипе Гант рисуется тут же. Когда добавим
 * sprint-switcher + GanttChart в этот файл — апдейт.
 */

import { useParams, Link, useNavigate } from 'react-router-dom';

import { ApiError } from '@/api/client';
import { useProjectFullQuery } from './hooks/useProjects';
import styles from './ProjectDetailPage.module.css';

export function ProjectDetailPage(): JSX.Element {
  const { id: rawId } = useParams<{ id: string }>();
  const id = Number(rawId);

  if (!Number.isFinite(id) || id <= 0) {
    return <div className={styles.error}>Некорректный идентификатор проекта.</div>;
  }

  return <ProjectDetail id={id} />;
}

interface ProjectDetailProps {
  id: number;
}

function ProjectDetail({ id }: ProjectDetailProps): JSX.Element {
  const projectQuery = useProjectFullQuery(id);
  const navigate = useNavigate();

  if (projectQuery.isLoading) {
    return <div className={styles.loading}>Загружаем проект…</div>;
  }
  if (projectQuery.error) {
    return (
      <div className={styles.error}>
        {formatError(projectQuery.error, 'Не удалось загрузить проект')}
      </div>
    );
  }
  if (!projectQuery.data) {
    return <div className={styles.empty}>Проект не найден.</div>;
  }

  const { project, teams, sprints } = projectQuery.data;
  const mentorName = project.mentor
    ? `${project.mentor.lastName} ${project.mentor.firstName.charAt(0)}.`
    : '—';

  return (
    <div className={styles.page}>
      <nav className={styles.crumbs} aria-label="Хлебные крошки">
        <Link to="/admin" className={styles.crumbLink}>
          Дашборд
        </Link>
        <ChevronIcon />
        <span className={styles.crumbCurrent}>{project.title}</span>
      </nav>

      <header className={styles.header}>
        <div className={styles.headerInfo}>
          <h1 className={styles.title}>{project.title}</h1>
          <div className={styles.subtitle}>
            {(project.company || '—') + ' · Ментор: ' + mentorName}
          </div>
        </div>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={() => navigate(`/admin/projects/new?edit=${id}`)}
            title="Открыть форму заявки в режиме редактирования (TODO: edit-режим)"
          >
            <EditIcon />
            Редактировать
          </button>
        </div>
      </header>

      <div className={styles.infoGrid}>
        <InfoField label="Инициатор" value={project.company || '—'} />
        <InfoField label="Ментор" value={mentorName} />
        <InfoField
          label="Размер команды"
          value={`${project.teamSizeMin}–${project.teamSizeMax} чел.`}
        />
        <InfoField label="Команд (запрошено)" value={String(project.numTeams)} />
        <InfoField label="Спринтов" value={`${sprints.length} шт.`} />
        <InfoField
          label="Срок"
          value={formatDuration(project.durationSemesters ?? 1)}
        />
        <InfoField
          label="Технологии"
          value={(project.technologies ?? []).join(', ') || '—'}
        />
        <InfoField label="Образовательный результат" value={project.eduResult || '—'} />

        <InfoFieldFull label="Цель проекта" value={project.goal || project.description || '—'} />
        <InfoFieldFull
          label="Ожидаемый результат"
          value={project.expectedResult || '—'}
        />
        <InfoFieldFull
          label="Критерии приёмки"
          value={project.acceptanceCriteria || '—'}
        />
        <InfoFieldFull
          label="Полное описание"
          value={project.fullDescription || project.description || '—'}
        />
      </div>

      <div className={styles.sectionRow}>
        <h2 className={styles.sectionTitle}>Команды проекта</h2>
      </div>

      {teams.length === 0 ? (
        <div className={styles.empty}>У проекта пока нет команд.</div>
      ) : (
        <div className={styles.teamPicker}>
          {teams.map((team) => (
            <Link
              key={team.id}
              to={`/admin/teams/${team.id}`}
              className={styles.teamBtn}
            >
              {team.name}
              {team.leader
                ? ` · ${team.leader.lastName} ${team.leader.firstName.charAt(0)}.`
                : ''}
            </Link>
          ))}
        </div>
      )}

      <div className={styles.ganttHint}>
        Откройте команду чтобы увидеть её диаграмму Ганта, отчёты и встречи.
      </div>
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className={styles.infoField}>
      <label className={styles.infoLabel}>{label}</label>
      <span className={styles.infoValue}>{value}</span>
    </div>
  );
}

function InfoFieldFull({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className={`${styles.infoField} ${styles.infoFull}`}>
      <label className={styles.infoLabel}>{label}</label>
      <p className={styles.infoValue}>{value}</p>
    </div>
  );
}

function formatDuration(semesters: number): string {
  const word =
    semesters === 1
      ? 'семестр'
      : semesters >= 2 && semesters <= 4
        ? 'семестра'
        : 'семестров';
  return `${semesters} ${word}`;
}

function ChevronIcon(): JSX.Element {
  return (
    <svg width="14" height="14" fill="none" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M6 4l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EditIcon(): JSX.Element {
  return (
    <svg width="14" height="14" fill="none" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M11.5 1.5l3 3-9 9H2.5v-3l9-9z"
        stroke="currentColor"
        strokeWidth="1.4"
      />
    </svg>
  );
}

function formatError(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return `${fallback}: ${err.message}`;
  if (err instanceof Error) return `${fallback}: ${err.message}`;
  return fallback;
}
