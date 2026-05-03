import styles from './StatsCard.module.css';

export type StatsCardTone = 'blue' | 'green' | 'purple' | 'warning' | 'neutral';

export interface StatsCardProps {
  label: string;
  value: number | string;
  hint?: string;
  tone?: StatsCardTone;
}

const TONE_CLASS: Record<StatsCardTone, string> = {
  blue: styles.toneBlue,
  green: styles.toneGreen,
  purple: styles.tonePurple,
  warning: styles.toneWarning,
  neutral: styles.toneNeutral,
};

export function StatsCard({ label, value, hint, tone = 'neutral' }: StatsCardProps): JSX.Element {
  return (
    <div className={`${styles.card} ${TONE_CLASS[tone]}`}>
      <div className={styles.value}>{value}</div>
      <div className={styles.label}>{label}</div>
      {hint ? <div className={styles.hint}>{hint}</div> : null}
    </div>
  );
}
