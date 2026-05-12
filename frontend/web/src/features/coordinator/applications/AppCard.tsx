/*
 * AppCard — карточка одной заявки. Pixel-port из admin.html (app-card +
 * app-card-head + app-card-changes + app-card-actions).
 */

import { Link } from 'react-router-dom';
import type { JSX } from 'react';

import type { CoordApplication } from './buildApplications';
import styles from './AppCard.module.css';

interface Props {
  application: CoordApplication;
  onApprove: () => void;
  onReject: () => void;
  approving: boolean;
  rejecting: boolean;
}

export function AppCard({
  application,
  onApprove,
  onReject,
  approving,
  rejecting,
}: Props): JSX.Element {
  const isCreate = application.type === 'create';
  return (
    <div className={styles.card} data-app-id={application.projectId}>
      <div className={styles.head}>
        <div className={styles.titleWrap}>
          <h3 className={styles.title}>{application.projectTitle}</h3>
          <div className={styles.meta}>
            Ментор: <b>{application.mentor}</b> · Подано: {application.submittedAt}
          </div>
        </div>
        <div className={styles.badges}>
          <span className={`${styles.typeBadge} ${isCreate ? styles.typeCreate : styles.typeEdit}`}>
            {isCreate ? 'Создание' : 'Редактирование'}
          </span>
          <span className={`${styles.statusBadge} ${styles.statusPending}`}>
            Ожидает утверждения
          </span>
        </div>
      </div>

      <div className={styles.changes}>
        <div className={styles.changesTitle}>
          {isCreate ? 'Поля новой заявки' : 'Изменения'}
        </div>
        {application.changes.length === 0 ? (
          <div className={styles.diffItem}>Без изменений (pendingProposalData пуст)</div>
        ) : (
          application.changes.map((c) => (
            <div key={c.field} className={styles.diffItem}>
              <span className={styles.diffField}>{c.field}:</span>{' '}
              {isCreate ? (
                <span className={styles.diffNew}>{c.new}</span>
              ) : (
                <>
                  <span className={styles.diffOld}>{c.old || '—'}</span>
                  {' → '}
                  <span className={styles.diffNew}>{c.new}</span>
                </>
              )}
            </div>
          ))
        )}
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.btnSuccess}
          onClick={onApprove}
          disabled={approving || rejecting}
        >
          <CheckIcon />
          {approving ? 'Применяем…' : 'Утвердить заявку'}
        </button>
        <button
          type="button"
          className={styles.btnDanger}
          onClick={onReject}
          disabled={approving || rejecting}
        >
          {rejecting ? 'Отклоняем…' : 'Отклонить'}
        </button>
        <Link
          to={`/admin/projects/${application.projectId}`}
          className={styles.btnSecondary}
        >
          Посмотреть проект
        </Link>
      </div>
    </div>
  );
}

function CheckIcon(): JSX.Element {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
      style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 4 }}
    >
      <path
        d="M3 7l3 3 5-5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
