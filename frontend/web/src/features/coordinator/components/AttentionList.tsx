/*
 * AttentionList — блок «Требует внимания» под stats-row. Pixel-port из
 * admin.html:842-856. Если оба счётчика 0 — не рендерится.
 */

import type { JSX } from 'react';
import { Link } from 'react-router-dom';

import type { CoordinatorDashboardAttention } from '@/api/coordinatorDashboard';
import styles from './AttentionList.module.css';

interface Props {
  attention: CoordinatorDashboardAttention;
}

export function AttentionList({ attention }: Props): JSX.Element | null {
  const { pendingApplications, unassignedStudents } = attention;
  const total = pendingApplications + (unassignedStudents > 0 ? 1 : 0);
  if (pendingApplications === 0 && unassignedStudents === 0) {
    return null;
  }

  return (
    <>
      <h2 className={styles.sectionTitle}>
        Требует внимания
        <span className={styles.badge}>{total > 0 ? total : pendingApplications}</span>
      </h2>
      <div className={styles.list}>
        {pendingApplications > 0 ? (
          <Link to="/admin/applications" className={`${styles.item} ${styles.warn}`}>
            <span className={`${styles.icon} ${styles.iconWarn}`}>
              <WarnIcon />
            </span>
            {pendingApplications}{' '}
            {pluralize(pendingApplications, 'заявка', 'заявки', 'заявок')} ожидают
            утверждения
          </Link>
        ) : null}
        {unassignedStudents > 0 ? (
          <Link to="/admin/distribution" className={`${styles.item} ${styles.info}`}>
            <span className={`${styles.icon} ${styles.iconInfo}`}>
              <InfoIcon />
            </span>
            Распределение — не завершено, {unassignedStudents}{' '}
            {pluralize(unassignedStudents, 'студент', 'студента', 'студентов')} без команды
          </Link>
        ) : null}
      </div>
    </>
  );
}

function pluralize(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

function WarnIcon(): JSX.Element {
  return (
    <svg width="18" height="18" fill="none" viewBox="0 0 18 18" aria-hidden="true">
      <path d="M9 2L1.5 16h15L9 2z" stroke="currentColor" strokeWidth="1.4" />
      <path d="M9 7v4M9 13v1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function InfoIcon(): JSX.Element {
  return (
    <svg width="18" height="18" fill="none" viewBox="0 0 18 18" aria-hidden="true">
      <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.4" />
      <path d="M9 5v4M9 11v1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
