import { NavLink, useNavigate } from 'react-router-dom';

import { useCurrentUser } from '@/auth/useCurrentUser';
import { useAuthStore } from '@/auth/store';
import { ROLE_LABELS_RU } from '@/auth/roles';
import { homePathForRole } from '@/auth/redirectByRole';
import { RoleSwitcher } from './RoleSwitcher';
import styles from './Sidebar.module.css';

type IconKey = 'dashboard' | 'distribution' | 'archive' | 'catalog' | 'project' | 'profile';

interface NavItem {
  to: string;
  label: string;
  icon?: IconKey;
  /** When true, the link is highlighted only on an exact path match. */
  end?: boolean;
}

/** SVG-иконки для пунктов sidebar — пиксель-копии из прототипа
 *  mentor.html:509-520. Ширина/высота 20×20, currentColor. */
function NavIcon({ kind }: { kind: IconKey }): JSX.Element {
  switch (kind) {
    case 'dashboard':
      return (
        <svg width="20" height="20" fill="none" viewBox="0 0 20 20" aria-hidden="true">
          <rect x="2" y="2" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
          <rect x="11" y="2" width="7" height="4" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
          <rect x="2" y="11" width="7" height="4" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
          <rect x="11" y="8" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      );
    case 'distribution':
      return (
        <svg width="20" height="20" fill="none" viewBox="0 0 20 20" aria-hidden="true">
          <rect x="3" y="3" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.4" />
          <path d="M8 7v6l5-3-5-3z" fill="currentColor" />
        </svg>
      );
    case 'archive':
      return (
        <svg width="20" height="20" fill="none" viewBox="0 0 20 20" aria-hidden="true">
          <path d="M3 5h14v3H3z" stroke="currentColor" strokeWidth="1.4" />
          <path d="M4 8v8a1 1 0 001 1h10a1 1 0 001-1V8" stroke="currentColor" strokeWidth="1.4" />
          <path d="M8 11h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      );
    case 'catalog':
      return (
        <svg width="20" height="20" fill="none" viewBox="0 0 20 20" aria-hidden="true">
          <rect x="3" y="3" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.4" />
          <path d="M3 8h14" stroke="currentColor" strokeWidth="1.4" />
          <path d="M8 8v9" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      );
    case 'project':
      return (
        <svg width="20" height="20" fill="none" viewBox="0 0 20 20" aria-hidden="true">
          <path d="M3 5a2 2 0 012-2h4l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V5z" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      );
    case 'profile':
      return (
        <svg width="20" height="20" fill="none" viewBox="0 0 20 20" aria-hidden="true">
          <circle cx="10" cy="7" r="3.2" stroke="currentColor" strokeWidth="1.4" />
          <path d="M3.5 17c0-3.3 2.9-6 6.5-6s6.5 2.7 6.5 6" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      );
  }
}

const NAV_BY_ROLE: Record<string, NavItem[]> = {
  student: [
    { to: '/student', label: 'Каталог проектов', icon: 'catalog' },
    { to: '/profile', label: 'Мой профиль', icon: 'profile' },
  ],
  teamlead: [
    { to: '/student/project', label: 'Текущий проект', icon: 'project' },
    { to: '/profile', label: 'Мой профиль', icon: 'profile' },
  ],
  mentor: [
    { to: '/mentor', label: 'Дашборд', icon: 'dashboard', end: true },
    { to: '/mentor/distribution', label: 'Незапущенные команды', icon: 'distribution' },
    { to: '/mentor/archive', label: 'Архив проектов', icon: 'archive' },
  ],
  coordinator: [
    { to: '/admin', label: 'Координация', end: true },
    { to: '/admin/projects', label: 'Проекты' },
    { to: '/admin/distribution', label: 'Распределение' },
    { to: '/profile', label: 'Мой профиль' },
  ],
  admin: [
    { to: '/admin', label: 'Администрирование' },
    { to: '/profile', label: 'Мой профиль' },
  ],
};

export function Sidebar(): JSX.Element {
  const user = useCurrentUser();
  const signOut = useAuthStore((s) => s.signOut);
  const navigate = useNavigate();

  if (!user) return <aside className={styles.sidebar} />;

  const items = NAV_BY_ROLE[user.role] ?? [];

  const handleSignOut = (): void => {
    signOut();
    navigate('/login', { replace: true });
  };

  return (
    <aside className={styles.sidebar} aria-label="Главное меню">
      <div className={styles.brand}>
        <div className={styles.brandSub}>ВШПИ МФТИ</div>
        <div className={styles.brandMain}>
          Система управления
          <br />
          проектным практикумом
        </div>
      </div>

      <RoleSwitcher
        currentRole={user.role}
        onChange={(role) => {
          useAuthStore.getState().switchRole(role);
          navigate(homePathForRole(role), { replace: true });
        }}
      />

      <nav className={styles.nav}>
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end ?? item.to === '/'}
            className={({ isActive }) =>
              isActive ? `${styles.navItem} ${styles.navItemActive}` : styles.navItem
            }
          >
            {item.icon ? <NavIcon kind={item.icon} /> : null}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className={styles.user}>
        <div className={styles.userName}>{user.displayName}</div>
        <div className={styles.userRole}>{ROLE_LABELS_RU[user.role]}</div>
        <button type="button" className={styles.signOut} onClick={handleSignOut}>
          Выйти
        </button>
      </div>
    </aside>
  );
}
