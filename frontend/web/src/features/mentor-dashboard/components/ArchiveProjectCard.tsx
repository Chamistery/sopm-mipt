/*
 * ArchiveProjectCard — карточка архивного проекта на странице ментора
 * (`${basePath}`). Pixel-port из `mentor.html`:1750-1810.
 *
 * Отличия от активной `ProjectCard`:
 *   - бейдж «Продолжение» / «Новый» вместо StatusBadge типа «Активен»;
 *   - всегда показывается «Завершён» (status pill справа);
 *   - meta-row с количеством команд/спринтов и pill «Итог проекта»;
 *   - все iter-track-квадратики — reviewed (архив);
 *   - средний балл команды как зелёный pill вместо «Лидер: …»;
 *   - footer: «Завершён: <дата>» + ссылка на предшественника (фиолетовая);
 *   - ссылка «Полная информация →» ведёт на отдельную страницу
 *     `${basePath}/projects/:id/info` (MentorProjectInfoPage, readonly).
 *
 * Карточка сама по себе не Link — ссылку на конкретную команду рендерим
 * через `team-row`. На уровень проекта (список команд) ведёт клик по
 * заголовку (тот же URL, что и команда, если команда одна).
 */

import type { JSX } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { IterSquare } from './ProjectCard';
import type { ArchiveDashboardProject } from '../hooks/useMentorArchiveDashboard';
import { formatRuFinishedAt } from '../lib/archiveAggregations';
import { useArchiveBasePath } from '../lib/archiveBasePath';
import styles from './ArchiveProjectCard.module.css';

interface Props {
  project: ArchiveDashboardProject;
  /** Подсветка: target=highlight для ?highlight=:id. Опционально. */
  highlighted?: boolean;
}

export function ArchiveProjectCard({
  project,
  highlighted = false,
}: Props): JSX.Element {
  const basePath = useArchiveBasePath();
  const location = useLocation();
  const fromHere = location.pathname + location.search;
  const isContinuation = project.predecessorId != null;
  const teamsLabel = project.teams.length > 1 ? 'команды' : 'команда';

  return (
    <div
      className={`${styles.card} ${highlighted ? styles.highlighted : ''}`}
      data-archive-id={project.id}
    >
      <div className={styles.header}>
        <div className={styles.titleWrap}>
          <Link
            to={`${basePath}/projects/${project.id}`}
            className={styles.titleLink}
            title={project.title}
          >
            <h3 className={styles.title}>{project.title}</h3>
          </Link>
          {isContinuation ? (
            <span className={styles.continuationPill} title="Продолжение проекта">
              <ContinuationIcon />
              Продолжение
            </span>
          ) : (
            <span className={styles.newPill}>
              <PlusIcon />
              Новый
            </span>
          )}
        </div>
        <span className={styles.statusPill}>Завершён</span>
      </div>

      <div className={styles.meta}>
        Инициатор: {project.company || '—'}
        {project.semesterLabel ? ` · ${project.semesterLabel}` : ''}
        {' · '}Срок инициативы: {project.durationSemesters}{' '}
        {plural(project.durationSemesters, 'семестр', 'семестра', 'семестров')} (этот —{' '}
        {project.currentSemester}-й)
      </div>

      <div className={styles.metaRow}>
        <span>
          <b>{project.teams.length}</b> {teamsLabel}
        </span>
        <span>
          <b>{project.sprintsCount}</b>{' '}
          {plural(project.sprintsCount, 'спринт', 'спринта', 'спринтов')}
        </span>
        <span className={styles.gradeWrap}>
          Итог проекта: <span className={styles.gradePill}>{project.finalGrade}</span>
        </span>
        <Link
          to={`${basePath}/projects/${project.id}/info`}
          state={{ from: fromHere }}
          className={styles.infoLink}
          aria-label={`Полная информация о проекте ${project.title}`}
          data-testid="archive-card-info-link"
        >
          Полная информация <ArrowRight />
        </Link>
      </div>

      {project.teams.length > 0 ? (
        <div className={styles.teamList}>
          {project.teams.map((team) => (
            <Link
              key={team.id}
              to={`${basePath}/teams/${team.id}`}
              className={styles.teamRow}
            >
              <span className={styles.teamName}>{team.name}</span>
              <div className={styles.teamInfo}>
                <span className={styles.teamInfoItem}>
                  <PersonIcon />
                  {team.memberCount} чел.
                </span>
                {team.leader ? (
                  <span className={styles.teamInfoLeader}>Лидер: {team.leader}</span>
                ) : null}
                <span className={styles.teamScorePill}>
                  Ср. балл: {team.avgScore == null ? '—' : team.avgScore.toFixed(1)}
                </span>
              </div>
              <div className={styles.iterTrack} aria-hidden="true">
                {Array.from({ length: team.sprintCount }).map((_, i) => (
                  <IterSquare key={i} state="reviewed" />
                ))}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className={styles.emptyTeams}>В этом проекте не было команд.</div>
      )}

      <div className={styles.footer}>
        <span>Завершён: {formatRuFinishedAt(project.finishedAt)}</span>
        {project.predecessorId != null ? (
          <Link
            to={`${basePath}?highlight=${project.predecessorId}`}
            className={styles.predecessorLink}
          >
            <ContinuationIcon />
            Открыть предшественника <ArrowRight />
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

function ContinuationIcon(): JSX.Element {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M3 8h10M9 4l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlusIcon(): JSX.Element {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M8 3v10M3 8h10"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PersonIcon(): JSX.Element {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.2" />
      <path
        d="M1.5 14c0-2.5 2-4.5 4.5-4.5s4.5 2 4.5 4.5"
        stroke="currentColor"
        strokeWidth="1.2"
      />
    </svg>
  );
}

function ArrowRight(): JSX.Element {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M6 4l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
