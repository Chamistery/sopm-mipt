import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { listUsers, fullName, type UserSummary } from '@/api/users';
import { ApiError } from '@/api/client';
import { ROLE_LABELS_RU, type Role } from '@/auth/roles';
import { useAuthStore } from '@/auth/store';
import { homePathForRole } from '@/auth/redirectByRole';
import styles from './LoginPage.module.css';

interface LocationState {
  from?: { pathname: string };
}

/*
 * Dev-режим логина: список юзеров из GET /api/users → клик «Войти»
 * сохраняет `{userId, role}` в localStorage и редиректит на домашнюю
 * страницу роли. OAuth МФТИ подключим позже отдельным PR.
 */
export function LoginPage(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const signIn = useAuthStore((s) => s.signIn);
  const existingUser = useAuthStore((s) => s.user);

  const [filter, setFilter] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['users', 'list'],
    queryFn: listUsers,
  });

  useEffect(() => {
    if (existingUser) {
      const target =
        (location.state as LocationState | null)?.from?.pathname ??
        homePathForRole(existingUser.role);
      navigate(target, { replace: true });
    }
  }, [existingUser, location.state, navigate]);

  const filtered = useMemo(() => filterUsers(data ?? [], filter), [data, filter]);
  const selected = (data ?? []).find((u) => u.id === selectedId) ?? null;

  const handleSignIn = (): void => {
    if (!selected) return;
    signIn({
      userId: selected.id,
      role: selected.role,
      displayName: fullName(selected),
    });
    const target =
      (location.state as LocationState | null)?.from?.pathname ?? homePathForRole(selected.role);
    navigate(target, { replace: true });
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <header className={styles.header}>
          <div className={styles.brandSub}>ВШПИ МФТИ</div>
          <h1 className={styles.title}>Система управления проектным практикумом</h1>
          <p className={styles.subtitle}>Dev-режим: войдите как любой пользователь из БД</p>
        </header>

        <input
          className={styles.search}
          type="search"
          placeholder="Поиск по фамилии, email, роли"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          aria-label="Фильтр пользователей"
        />

        <div className={styles.list} role="listbox" aria-label="Список пользователей">
          {isLoading ? <ListMessage>Загружаем пользователей…</ListMessage> : null}

          {error ? (
            <ListMessage tone="error">
              {error instanceof ApiError
                ? `Ошибка ${error.status}: ${error.message}`
                : 'Не удалось загрузить пользователей. Проверьте, поднят ли бэк (make docker-up).'}
            </ListMessage>
          ) : null}

          {!isLoading && !error && filtered.length === 0 ? (
            <ListMessage>Нет пользователей по фильтру.</ListMessage>
          ) : null}

          {filtered.map((user) => (
            <UserOption
              key={user.id}
              user={user}
              selected={user.id === selectedId}
              onSelect={() => setSelectedId(user.id)}
            />
          ))}
        </div>

        <button
          type="button"
          className={styles.primary}
          disabled={!selected}
          onClick={handleSignIn}
        >
          {selected ? `Войти как ${fullName(selected)}` : 'Выберите пользователя'}
        </button>
      </div>
    </div>
  );
}

function filterUsers(users: UserSummary[], q: string): UserSummary[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return users;
  return users.filter((u) => {
    const haystack = [
      u.firstName,
      u.lastName,
      u.middleName ?? '',
      u.email,
      ROLE_LABELS_RU[u.role],
      u.role,
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(needle);
  });
}

function ListMessage({
  children,
  tone = 'muted',
}: {
  children: React.ReactNode;
  tone?: 'muted' | 'error';
}): JSX.Element {
  return <div className={tone === 'error' ? styles.errorRow : styles.mutedRow}>{children}</div>;
}

interface UserOptionProps {
  user: UserSummary;
  selected: boolean;
  onSelect: () => void;
}

function UserOption({ user, selected, onSelect }: UserOptionProps): JSX.Element {
  return (
    <button
      type="button"
      className={selected ? `${styles.row} ${styles.rowSelected}` : styles.row}
      onClick={onSelect}
      role="option"
      aria-selected={selected}
    >
      <div className={styles.rowMain}>
        <div className={styles.rowName}>{fullName(user)}</div>
        <div className={styles.rowEmail}>{user.email}</div>
      </div>
      <div className={styles.rowRole}>{roleBadge(user.role)}</div>
    </button>
  );
}

function roleBadge(role: Role): JSX.Element {
  return (
    <span className={styles[`role_${role}`] ?? styles.roleDefault}>{ROLE_LABELS_RU[role]}</span>
  );
}
