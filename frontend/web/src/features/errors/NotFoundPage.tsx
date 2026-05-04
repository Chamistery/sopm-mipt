import { Link } from 'react-router-dom';

export function NotFoundPage(): JSX.Element {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        background: 'var(--color-surface)',
        color: 'var(--color-text-secondary)',
      }}
    >
      <div style={{ fontSize: 48, fontWeight: 800, color: 'var(--color-primary)' }}>404</div>
      <div>Страница не найдена</div>
      <Link to="/">На главную</Link>
    </div>
  );
}
