/*
 * StatsRow — 3 stat-карточки на верху админ-дашборда. Pixel-port из
 * admin.html:820-839. Layout: grid 3 col, left-border акцент по тону.
 */

import type { JSX } from 'react';

import type { CoordinatorDashboardStats } from '@/api/coordinatorDashboard';
import styles from './StatsRow.module.css';

interface Props {
  stats: CoordinatorDashboardStats;
}

export function StatsRow({ stats }: Props): JSX.Element {
  return (
    <div className={styles.row}>
      <Card tone="blue" value={stats.activeProjects} label="Активных проектов" />
      <Card tone="green" value={stats.teams} label="Команд" />
      <Card tone="purple" value={stats.students} label="Студентов" />
    </div>
  );
}

interface CardProps {
  tone: 'blue' | 'green' | 'purple';
  value: number;
  label: string;
}

function Card({ tone, value, label }: CardProps): JSX.Element {
  const toneClass = tone === 'blue' ? styles.blue : tone === 'green' ? styles.green : styles.purple;
  return (
    <div className={`${styles.card} ${toneClass}`}>
      <div>
        <div className={styles.value}>{value}</div>
        <div className={styles.label}>{label}</div>
      </div>
    </div>
  );
}
