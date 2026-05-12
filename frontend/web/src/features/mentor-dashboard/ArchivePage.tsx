import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useRequireUser } from '@/auth/useCurrentUser';
import { useMentorArchiveDashboard } from './hooks/useMentorArchiveDashboard';
import { ArchiveProjectCard } from './components/ArchiveProjectCard';
import styles from './MentorDashboardPage.module.css';

const HIGHLIGHT_DURATION_MS = 2400;

/**
 * Mentor's archive — completed and archived projects only.
 *
 * Карточки рендерятся через `ArchiveProjectCard` — pixel-port из
 * mentor.html (1750-1810). Данные грузятся через
 * `useMentorArchiveDashboard` (агрегация на фронте: list + project/full +
 * sprintScores). См. lib/archiveAggregations.ts для расчёта avgScore /
 * finalGrade / finishedAt.
 *
 * Поддерживает ?highlight=:id — после открытия страницы скроллится к
 * карточке этого проекта и подсвечивает её на 2.4с (см.
 * ArchiveProjectCard.module.css :keyframes archiveHighlightAnim).
 */
export function ArchivePage(): JSX.Element {
  const me = useRequireUser();
  const dashboard = useMentorArchiveDashboard(me.userId);
  const [searchParams] = useSearchParams();
  const highlightId = Number(searchParams.get('highlight')) || null;
  const [highlightedId, setHighlightedId] = useState<number | null>(null);
  const cardRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  // Защита от повторного запуска анимации. useQueries в useMentorArchive
  // создаёт новую ссылку `dashboard.data` на каждый под-fetch, поэтому
  // useEffect без этого флага запускался бесконечно — карточка мигала
  // снова и снова. Ставим highlightId в ref после первого срабатывания.
  const highlightedOnceRef = useRef<number | null>(null);

  useEffect(() => {
    if (!highlightId || !dashboard.data) return;
    if (highlightedOnceRef.current === highlightId) return;
    if (!dashboard.data.some((p) => p.id === highlightId)) return;
    const node = cardRefs.current.get(highlightId);
    if (!node) return;
    highlightedOnceRef.current = highlightId;
    node.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlightedId(highlightId);
    const t = window.setTimeout(() => setHighlightedId(null), HIGHLIGHT_DURATION_MS);
    return () => window.clearTimeout(t);
  }, [highlightId, dashboard.data]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Архив проектов</h1>
          <div className={styles.context}>Завершённые проекты прошлых семестров</div>
        </div>
      </header>

      {dashboard.isLoading ? (
        <div className={styles.placeholder}>Загружаем архив…</div>
      ) : null}

      {/* Баннер ошибки показываем только когда нет ни одной успешно
          загруженной карточки. Подзапросы (sprint scores per team)
          могут падать на отдельных архивных командах, не влияя на
          главный список — без этой проверки баннер висел над успешно
          отрендеренными карточками, что выглядит как баг. */}
      {dashboard.isError && (!dashboard.data || dashboard.data.length === 0) ? (
        <div className={styles.error}>
          <div className={styles.errorTitle}>Не удалось загрузить архив</div>
        </div>
      ) : null}

      {dashboard.data && dashboard.data.length === 0 ? (
        <div className={styles.empty}>
          <h2 className={styles.emptyTitle}>Архив пуст</h2>
          <p className={styles.emptyText}>
            Когда вы завершите проект, он появится здесь — со всей историей команд и оценок.
          </p>
        </div>
      ) : null}

      {dashboard.data && dashboard.data.length > 0 ? (
        <div className={styles.columns}>
          {dashboard.data.map((project) => (
            <div
              key={project.id}
              ref={(el) => {
                if (el) cardRefs.current.set(project.id, el);
                else cardRefs.current.delete(project.id);
              }}
            >
              <ArchiveProjectCard
                project={project}
                highlighted={highlightedId === project.id}
              />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
