import { NavLink, Outlet } from 'react-router-dom';

import styles from './CoordinatorLayout.module.css';

const TABS = [
  { to: '/admin', label: 'Дашборд', end: true },
  { to: '/admin/projects', label: 'Проекты', end: false },
  { to: '/admin/distribution', label: 'Распределение', end: false },
] as const;

export function CoordinatorLayout(): JSX.Element {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Координация практикума</h1>
          <p className={styles.subtitle}>
            Утверждение проектов, распределение студентов, контроль команд
          </p>
        </div>
      </header>

      <nav className={styles.tabs} aria-label="Разделы координатора">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              isActive ? `${styles.tab} ${styles.tabActive}` : styles.tab
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </div>
  );
}
