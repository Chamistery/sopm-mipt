import { ROLES, ROLE_LABELS_RU, type Role } from '@/auth/roles';
import styles from './RoleSwitcher.module.css';

interface Props {
  currentRole: Role;
  onChange: (role: Role) => void;
}

/*
 * Тестовый переключатель ролей в сайдбаре. Меняет роль текущего пользователя
 * без перелогина — для разработки/демо. В продакшене этот блок должен скрываться
 * (см. ADR 0003).
 */
export function RoleSwitcher({ currentRole, onChange }: Props): JSX.Element {
  return (
    <div className={styles.wrap}>
      <label className={styles.label} htmlFor="role-switcher">
        Тестовый режим — роль
      </label>
      <select
        id="role-switcher"
        className={styles.select}
        value={currentRole}
        onChange={(e) => onChange(e.target.value as Role)}
      >
        {ROLES.map((role) => (
          <option key={role} value={role}>
            {ROLE_LABELS_RU[role]}
          </option>
        ))}
      </select>
    </div>
  );
}
