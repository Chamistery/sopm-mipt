import {
  groupApplicantsByPriority,
  inviteApplicant,
  rejectApplicant,
  MAX_PRIORITY,
  type Application,
} from '@/api/applications';
import styles from './ApplicantsBoard.module.css';

interface Props {
  applications: Application[];
  /** Optional override for invite/reject actions — used by Storybook. */
  onInvite?: (id: number) => Promise<void> | void;
  onReject?: (id: number) => Promise<void> | void;
  /** ID of the application currently being mutated, for spinner state. */
  pendingId?: number | null;
}

export function ApplicantsBoard({
  applications,
  onInvite,
  onReject,
  pendingId,
}: Props): JSX.Element {
  const grouped = groupApplicantsByPriority(applications);

  const handleInvite = async (id: number): Promise<void> => {
    if (onInvite) await onInvite(id);
    else await inviteApplicant(id);
  };
  const handleReject = async (id: number): Promise<void> => {
    if (onReject) await onReject(id);
    else await rejectApplicant(id);
  };

  if (applications.length === 0) {
    return (
      <div className={styles.empty}>
        Заявок ещё нет. Они появятся здесь после публикации проекта.
      </div>
    );
  }

  return (
    <div className={styles.board}>
      <div className={styles.columnsHeader}>
        {Array.from({ length: MAX_PRIORITY }, (_, i) => (
          <div key={i} className={styles.columnTitle}>
            Приоритет {i + 1}
          </div>
        ))}
      </div>
      <div className={styles.columns}>
        {grouped.buckets.map((bucket, idx) => (
          <PriorityColumn
            key={idx}
            priority={idx + 1}
            applications={bucket}
            pendingId={pendingId ?? null}
            onInvite={handleInvite}
            onReject={handleReject}
          />
        ))}
      </div>
      {grouped.other.length > 0 ? (
        <section className={styles.otherSection}>
          <div className={styles.otherTitle}>Без приоритета</div>
          <div className={styles.otherList}>
            {grouped.other.map((app) => (
              <ApplicantCard
                key={app.id}
                application={app}
                pendingId={pendingId ?? null}
                onInvite={handleInvite}
                onReject={handleReject}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

interface PriorityColumnProps {
  priority: number;
  applications: Application[];
  pendingId: number | null;
  onInvite: (id: number) => Promise<void>;
  onReject: (id: number) => Promise<void>;
}

function PriorityColumn({
  applications,
  pendingId,
  onInvite,
  onReject,
}: PriorityColumnProps): JSX.Element {
  if (applications.length === 0) {
    return <div className={styles.columnEmpty}>—</div>;
  }
  return (
    <div className={styles.column}>
      {applications.map((app) => (
        <ApplicantCard
          key={app.id}
          application={app}
          pendingId={pendingId}
          onInvite={onInvite}
          onReject={onReject}
        />
      ))}
    </div>
  );
}

interface CardProps {
  application: Application;
  pendingId: number | null;
  onInvite: (id: number) => Promise<void>;
  onReject: (id: number) => Promise<void>;
}

function ApplicantCard({ application, pendingId, onInvite, onReject }: CardProps): JSX.Element {
  const isInvited = application.status === 'Принято';
  const isRejected = application.status === 'Отклонено';
  const pending = pendingId === application.id;

  return (
    <article
      className={`${styles.card} ${isInvited ? styles.cardInvited : ''} ${
        isRejected ? styles.cardRejected : ''
      }`}
    >
      <div className={styles.cardHead}>
        <span className={styles.studentId}>Студент #{application.studentId}</span>
        <span className={styles.statusTag}>{application.status}</span>
      </div>
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.invite}
          onClick={() => void onInvite(application.id)}
          disabled={pending || isInvited}
          aria-label="Пригласить в команду"
        >
          {isInvited ? 'Принят' : '✓ В команду'}
        </button>
        <button
          type="button"
          className={styles.reject}
          onClick={() => void onReject(application.id)}
          disabled={pending || isRejected}
          aria-label="Отклонить заявку"
        >
          {isRejected ? 'Отклонён' : '✕ Отклонить'}
        </button>
      </div>
    </article>
  );
}
