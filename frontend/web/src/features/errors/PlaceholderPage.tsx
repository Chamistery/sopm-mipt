import { Link } from 'react-router-dom';

interface Props {
  feature: string;
  branch: string;
}

/*
 * Заглушка для страниц, которые будут реализованы отдельными агентами.
 * Конкретная фича пишется в `web/src/features/<branch>/`. См. AGENT_PLAYBOOK.md.
 */
export function PlaceholderPage({ feature, branch }: Props): JSX.Element {
  return (
    <div
      style={{
        maxWidth: 640,
        background: 'var(--color-card)',
        border: '1px dashed var(--color-border)',
        borderRadius: 12,
        padding: 32,
        color: 'var(--color-text-secondary)',
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'var(--color-warning)',
          marginBottom: 8,
        }}
      >
        В работе
      </div>
      <h2 style={{ margin: '0 0 8px 0', color: 'var(--color-text)' }}>{feature}</h2>
      <p style={{ marginTop: 0, lineHeight: 1.6 }}>
        Эта страница пока не реализована. Соответствующая фича закреплена за модулем{' '}
        <code
          style={{ background: 'var(--color-surface-alt)', padding: '2px 6px', borderRadius: 4 }}
        >
          web/src/features/{branch}/
        </code>
        . См. <code>web/docs/AGENT_PLAYBOOK.md</code> для брифа агенту.
      </p>
      <p>
        <Link to="/profile">Перейти в профиль</Link>
      </p>
    </div>
  );
}
