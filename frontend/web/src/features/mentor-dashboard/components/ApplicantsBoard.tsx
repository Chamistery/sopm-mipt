import {
  flattenPriorityBuckets,
  isInvited,
  isRecommended,
  type ApplicantItem,
  type ApplicantPriorityBuckets,
  type ApplicantTeamBucket,
} from '@/api/applications';
import styles from './ApplicantsBoard.module.css';

interface BoardProps {
  qualified: ApplicantPriorityBuckets;
  unqualified: ApplicantPriorityBuckets;
  teams: ApplicantTeamBucket[];
  /** ID of the application currently being mutated, for disabled state. */
  pendingApplicationId?: number | null;
  /** Recommend the applicant into a team. */
  onRecommend: (applicationId: number, teamId: number) => void;
  /** Drop a previous recommendation. */
  onUnrecommend: (applicationId: number) => void;
  /** Send the official invite (locks the slot). */
  onInvite: (applicationId: number) => void;
}

/**
 * Mentor distribution board: applicants by priority on the left, teams on
 * the right. Pure presentational — page passes mutations in via callbacks.
 */
export function ApplicantsBoard({
  qualified,
  unqualified,
  teams,
  pendingApplicationId,
  onRecommend,
  onUnrecommend,
  onInvite,
}: BoardProps): JSX.Element {
  const totalApplicants =
    countItems(qualified) + countItems(unqualified) + teams.reduce((s, t) => s + t.members.length, 0);

  if (totalApplicants === 0) {
    return (
      <div className={styles.empty}>Заявок ещё нет. Они появятся здесь после публикации проекта.</div>
    );
  }

  return (
    <div className={styles.layout}>
      <div className={styles.boardSide}>
        <ApplicantBuckets
          title="Подходящие"
          buckets={qualified}
          teams={teams}
          pendingId={pendingApplicationId ?? null}
          onRecommend={onRecommend}
          onUnrecommend={onUnrecommend}
          onInvite={onInvite}
        />
        {countItems(unqualified) > 0 ? (
          <ApplicantBuckets
            title="Не подходят по требованиям"
            buckets={unqualified}
            teams={teams}
            pendingId={pendingApplicationId ?? null}
            onRecommend={onRecommend}
            onUnrecommend={onUnrecommend}
            onInvite={onInvite}
            warning
          />
        ) : null}
      </div>
      <aside className={styles.teamsSide}>
        <h3 className={styles.teamsTitle}>Команды</h3>
        {teams.length === 0 ? (
          <div className={styles.teamsEmpty}>
            Команд ещё нет. Создайте их во вкладке проекта, чтобы начать распределение.
          </div>
        ) : (
          teams.map((team) => (
            <TeamCard
              key={team.teamId}
              team={team}
              pendingId={pendingApplicationId ?? null}
              onUnrecommend={onUnrecommend}
            />
          ))
        )}
      </aside>
    </div>
  );
}

function countItems(buckets: ApplicantPriorityBuckets): number {
  return flattenPriorityBuckets(buckets).reduce((s, c) => s + c.items.length, 0);
}

interface BucketsProps {
  title: string;
  buckets: ApplicantPriorityBuckets;
  teams: ApplicantTeamBucket[];
  pendingId: number | null;
  onRecommend: (applicationId: number, teamId: number) => void;
  onUnrecommend: (applicationId: number) => void;
  onInvite: (applicationId: number) => void;
  warning?: boolean;
}

function ApplicantBuckets({
  title,
  buckets,
  teams,
  pendingId,
  onRecommend,
  onUnrecommend,
  onInvite,
  warning,
}: BucketsProps): JSX.Element {
  const columns = flattenPriorityBuckets(buckets);
  return (
    <section className={`${styles.board} ${warning ? styles.boardWarning : ''}`}>
      <h3 className={styles.boardTitle}>{title}</h3>
      <div className={styles.columnsHeader}>
        {columns.map((col) => (
          <div key={col.priority} className={styles.columnTitle}>
            Приоритет {col.priority}
          </div>
        ))}
      </div>
      <div className={styles.columns}>
        {columns.map((col) => (
          <PriorityColumn
            key={col.priority}
            items={col.items}
            teams={teams}
            pendingId={pendingId}
            onRecommend={onRecommend}
            onUnrecommend={onUnrecommend}
            onInvite={onInvite}
          />
        ))}
      </div>
    </section>
  );
}

interface ColumnProps {
  items: ApplicantItem[];
  teams: ApplicantTeamBucket[];
  pendingId: number | null;
  onRecommend: (applicationId: number, teamId: number) => void;
  onUnrecommend: (applicationId: number) => void;
  onInvite: (applicationId: number) => void;
}

function PriorityColumn({
  items,
  teams,
  pendingId,
  onRecommend,
  onUnrecommend,
  onInvite,
}: ColumnProps): JSX.Element {
  if (items.length === 0) {
    return <div className={styles.columnEmpty}>—</div>;
  }
  return (
    <div className={styles.column}>
      {items.map((item) => (
        <ApplicantCard
          key={item.applicationId}
          item={item}
          teams={teams}
          pendingId={pendingId}
          onRecommend={onRecommend}
          onUnrecommend={onUnrecommend}
          onInvite={onInvite}
        />
      ))}
    </div>
  );
}

interface CardProps {
  item: ApplicantItem;
  teams: ApplicantTeamBucket[];
  pendingId: number | null;
  onRecommend: (applicationId: number, teamId: number) => void;
  onUnrecommend: (applicationId: number) => void;
  onInvite: (applicationId: number) => void;
}

function ApplicantCard({
  item,
  teams,
  pendingId,
  onRecommend,
  onUnrecommend,
  onInvite,
}: CardProps): JSX.Element {
  const recommended = isRecommended(item);
  const invited = isInvited(item);
  const pending = pendingId === item.applicationId;

  return (
    <article
      className={`${styles.card} ${recommended ? styles.cardRecommended : ''} ${
        invited ? styles.cardInvited : ''
      }`}
    >
      <div className={styles.cardHead}>
        <span className={styles.studentName}>{item.name}</span>
        <span className={styles.statusTag}>{item.status}</span>
      </div>
      <div className={styles.cardMeta}>
        <span>Курс {item.course}</span>
        <span>GPA {item.gpa.toFixed(2)}</span>
      </div>

      {invited ? (
        <div className={styles.invitedNote}>Приглашение отправлено</div>
      ) : recommended && item.teamId != null ? (
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.invite}
            disabled={pending}
            onClick={() => onInvite(item.applicationId)}
          >
            ✓ Пригласить
          </button>
          <button
            type="button"
            className={styles.unrecommend}
            disabled={pending}
            onClick={() => onUnrecommend(item.applicationId)}
            aria-label="Убрать из команды"
          >
            ✕
          </button>
        </div>
      ) : teams.length > 0 ? (
        <div className={styles.teamsRow} role="group" aria-label="Назначить в команду">
          {teams.map((team) => (
            <button
              key={team.teamId}
              type="button"
              className={styles.teamPick}
              disabled={pending}
              onClick={() => onRecommend(item.applicationId, team.teamId)}
              title={`Рекомендовать в ${team.name}`}
            >
              + {team.name}
            </button>
          ))}
        </div>
      ) : (
        <div className={styles.noTeams}>Создайте команды, чтобы распределить</div>
      )}
    </article>
  );
}

interface TeamCardProps {
  team: ApplicantTeamBucket;
  pendingId: number | null;
  onUnrecommend: (applicationId: number) => void;
}

function TeamCard({ team, pendingId, onUnrecommend }: TeamCardProps): JSX.Element {
  return (
    <section className={styles.teamCard}>
      <header className={styles.teamHead}>
        <span className={styles.teamName}>{team.name}</span>
        <span className={styles.teamCount}>
          {team.members.length} / {team.maxSize}
        </span>
      </header>
      {team.members.length === 0 ? (
        <div className={styles.teamEmpty}>Пусто — добавляйте студентов слева</div>
      ) : (
        <ul className={styles.teamList}>
          {team.members.map((m) => (
            <li key={m.applicationId} className={styles.teamMember}>
              <span className={styles.teamMemberName}>{m.name}</span>
              <span className={styles.teamMemberStatus}>{m.status}</span>
              <button
                type="button"
                className={styles.teamRemove}
                disabled={pendingId === m.applicationId}
                onClick={() => onUnrecommend(m.applicationId)}
                aria-label={`Убрать ${m.name} из ${team.name}`}
                title="Убрать"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
