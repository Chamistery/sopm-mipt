import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  getUser,
  getUserProfile,
  updateUserProfile,
  fullName,
  type ProfileLink,
  type UserProfile,
  type UserSummary,
} from '@/api/users';
import { ApiError } from '@/api/client';
import { useRequireUser } from '@/auth/useCurrentUser';
import { ROLE_LABELS_RU } from '@/auth/roles';
import { UserFilesSection } from './components/UserFilesSection';
import styles from './ProfilePage.module.css';

interface FormState {
  telegram: string;
  phone: string;
  about: string;
  skillsText: string;
  links: ProfileLink[];
}

const EMPTY_FORM: FormState = {
  telegram: '',
  phone: '',
  about: '',
  skillsText: '',
  links: [],
};

export function ProfilePage(): JSX.Element {
  const me = useRequireUser();
  const queryClient = useQueryClient();

  const userQuery = useQuery({
    queryKey: ['user', me.userId],
    queryFn: () => getUser(me.userId),
  });

  const profileQuery = useQuery({
    queryKey: ['user', me.userId, 'profile'],
    queryFn: () => getUserProfile(me.userId),
  });

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [savedToast, setSavedToast] = useState(false);

  useEffect(() => {
    if (profileQuery.data) {
      setForm(profileToForm(profileQuery.data));
    }
  }, [profileQuery.data]);

  const mutation = useMutation({
    mutationFn: () =>
      updateUserProfile(me.userId, {
        telegram: form.telegram.trim() || null,
        phone: form.phone.trim() || null,
        about: form.about.trim() || null,
        skills: parseSkills(form.skillsText),
        links: form.links.filter((l) => l.url.trim() !== ''),
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['user', me.userId, 'profile'], updated);
      setSavedToast(true);
      window.setTimeout(() => setSavedToast(false), 1500);
    },
  });

  if (userQuery.isLoading || profileQuery.isLoading) {
    return <div className={styles.placeholder}>Загружаем профиль…</div>;
  }

  if (userQuery.error || profileQuery.error) {
    const err = (userQuery.error ?? profileQuery.error) as unknown;
    const msg =
      err instanceof ApiError
        ? `Ошибка ${err.status}: ${err.message}`
        : 'Не удалось загрузить профиль.';
    return <div className={styles.error}>{msg}</div>;
  }

  const user = userQuery.data as UserSummary;

  const update = (patch: Partial<FormState>): void => setForm((prev) => ({ ...prev, ...patch }));

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Мой профиль</h1>
        <p className={styles.subtitle}>Контакты и навыки видны другим участникам ваших проектов</p>
      </header>

      <section className={styles.card}>
        <div className={styles.sectionHead}>Основное</div>
        <div className={styles.grid}>
          <ReadField
            label="ФИО"
            value={`${fullName(user)}${user.middleName ? ` ${user.middleName}` : ''}`}
          />
          <ReadField label="Email" value={user.email} />
          <ReadField label="Роль" value={ROLE_LABELS_RU[user.role]} />
          {user.course ? <ReadField label="Курс" value={user.course} /> : null}
          {user.group ? <ReadField label="Группа" value={user.group} /> : null}
          {user.gpa != null ? <ReadField label="Средний балл" value={String(user.gpa)} /> : null}
          {user.direction ? <ReadField label="Направление" value={user.direction} /> : null}
          {user.company ? <ReadField label="Организация" value={user.company} /> : null}
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.sectionHead}>Контакты</div>
        <div className={styles.grid}>
          <Field
            label="Telegram"
            value={form.telegram}
            placeholder="@username"
            onChange={(v) => update({ telegram: v })}
          />
          <Field
            label="Телефон"
            value={form.phone}
            placeholder="+7 999 123-45-67"
            onChange={(v) => update({ phone: v })}
          />
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.sectionHead}>О себе</div>
        <textarea
          className={styles.textarea}
          rows={4}
          value={form.about}
          placeholder="Коротко: чем интересуетесь, что любите делать в коде"
          onChange={(e) => update({ about: e.target.value })}
        />
      </section>

      <section className={styles.card}>
        <div className={styles.sectionHead}>Навыки</div>
        <p className={styles.hint}>Через запятую: «Python, Django, PostgreSQL»</p>
        <input
          className={styles.input}
          value={form.skillsText}
          onChange={(e) => update({ skillsText: e.target.value })}
        />
      </section>

      <section className={styles.card}>
        <div className={styles.sectionHead}>Ссылки</div>
        <LinksEditor links={form.links} onChange={(links) => update({ links })} />
      </section>

      <section className={styles.card}>
        <div className={styles.sectionHead}>Файлы</div>
        <UserFilesSection userId={me.userId} />
      </section>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.primary}
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? 'Сохраняем…' : 'Сохранить'}
        </button>
        {mutation.error ? (
          <span className={styles.errorInline}>
            {mutation.error instanceof ApiError ? mutation.error.message : 'Не удалось сохранить'}
          </span>
        ) : null}
        {savedToast ? <span className={styles.toast}>Сохранено</span> : null}
      </div>
    </div>
  );
}

function profileToForm(profile: UserProfile): FormState {
  return {
    telegram: profile.telegram ?? '',
    phone: profile.phone ?? '',
    about: profile.about ?? '',
    skillsText: profile.skills.join(', '),
    links: profile.links.length > 0 ? profile.links : [],
  };
}

function parseSkills(raw: string): string[] {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

interface ReadFieldProps {
  label: string;
  value: string;
}

function ReadField({ label, value }: ReadFieldProps): JSX.Element {
  return (
    <div className={styles.field}>
      <div className={styles.fieldLabel}>{label}</div>
      <div className={styles.fieldValue}>{value}</div>
    </div>
  );
}

interface FieldProps {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}

function Field({ label, value, placeholder, onChange }: FieldProps): JSX.Element {
  return (
    <label className={styles.field}>
      <div className={styles.fieldLabel}>{label}</div>
      <input
        className={styles.input}
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

interface LinksEditorProps {
  links: ProfileLink[];
  onChange: (next: ProfileLink[]) => void;
}

function LinksEditor({ links, onChange }: LinksEditorProps): JSX.Element {
  const update = (idx: number, patch: Partial<ProfileLink>): void => {
    const next = links.slice();
    const current = next[idx];
    if (!current) return;
    next[idx] = { ...current, ...patch };
    onChange(next);
  };
  const remove = (idx: number): void => {
    const next = links.slice();
    next.splice(idx, 1);
    onChange(next);
  };
  const add = (): void => {
    onChange([...links, { type: 'GitHub', url: '' }]);
  };

  return (
    <div className={styles.linksList}>
      {links.map((link, idx) => (
        <div key={idx} className={styles.linkRow}>
          <input
            className={styles.input}
            style={{ maxWidth: 140 }}
            value={link.type}
            placeholder="GitHub / GitLab / Портфолио"
            onChange={(e) => update(idx, { type: e.target.value })}
          />
          <input
            className={styles.input}
            value={link.url}
            placeholder="https://…"
            onChange={(e) => update(idx, { url: e.target.value })}
          />
          <button type="button" className={styles.linkRemove} onClick={() => remove(idx)}>
            Удалить
          </button>
        </div>
      ))}
      <button type="button" className={styles.linkAdd} onClick={add}>
        + Добавить ссылку
      </button>
    </div>
  );
}
