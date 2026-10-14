import './ConnectionCard.css';

type ConnectionCardProps = {
  idInstance: string;
  instanceState: string;
  onLogout: () => void;
};

export function ConnectionCard({ idInstance, instanceState, onLogout }: ConnectionCardProps) {
  return (
    <div className="connection-card">
      <div className="connection-card-row">
        <span className={'state-dot state-' + (instanceState || 'unknown')} aria-hidden="true" />
        <div>
          <strong>Инстанс {idInstance}</strong>
          <span>{instanceState || 'состояние неизвестно'}</span>
        </div>
      </div>
      <button type="button" className="secondary-button" onClick={onLogout}>
        Выйти
      </button>
    </div>
  );
}
