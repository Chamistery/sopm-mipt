import { NavLink, useNavigate } from 'react-router-dom';

import { useCurrentUser } from '@/auth/useCurrentUser';
import { useAuthStore } from '@/auth/store';
import { ROLE_LABELS_RU } from '@/auth/roles';
import { homePathForRole } from '@/auth/redirectByRole';
import { RoleSwitcher } from './RoleSwitcher';
import styles from './Sidebar.module.css';

interface NavItem {
  to: string;
  label: string;
  /** When true, the link is highlighted only on an exact path match. */
  end?: boolean;
}

const NAV_BY_ROLE: Record<string, NavItem[]> = {
  student: [
    { to: '/student', label: 'Каталог проектов' },
    { to: '/profile', label: 'Мой профиль' },
  ],
  teamlead: [
    { to: '/student/project', label: 'Текущий проект' },
    { to: '/profile', label: 'Мой профиль' },
  ],
  mentor: [
    { to: '/mentor', label: 'Мои проекты' },
    { to: '/mentor/distribution', label: 'Незапущенные команды' },
    { to: '/mentor/archive', label: 'Архив проектов' },
    { to: '/profile', label: 'Мой профиль' },
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
            {item.label}
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
