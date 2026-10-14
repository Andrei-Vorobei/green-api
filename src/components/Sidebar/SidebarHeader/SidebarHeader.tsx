import type { ConnectionStatus } from '../../../types/chat';
import type { Theme } from '../../../hooks/useTheme';
import './SidebarHeader.css';

type SidebarHeaderProps = {
  status: ConnectionStatus;
  theme: Theme;
  onToggleTheme: () => void;
};

export function SidebarHeader({ status, theme, onToggleTheme }: SidebarHeaderProps) {
  return (
    <div className="panel-header">
      <div>
        <p className="eyebrow">Green-API</p>
        <h1>Чат</h1>
      </div>
      <div className="panel-actions">
        <button
          type="button"
          className="theme-toggle"
          onClick={onToggleTheme}
          aria-label={theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'}
          title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
        >
          {theme === 'dark' ? '☀' : '☾'}
        </button>
        <span className={'status-badge status-' + status}>{status}</span>
      </div>
    </div>
  );
}
