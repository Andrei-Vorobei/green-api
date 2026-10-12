import { useEffect } from 'react';
import './Toast.css';

type ToastProps = {
  message: string;
  onClose: () => void;
  duration?: number;
};

export function Toast({ message, onClose, duration = 7000 }: ToastProps) {
  // Таймер перезапускается при каждом новом тексте
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(onClose, duration);
    return () => window.clearTimeout(timer);
  }, [message, duration, onClose]);

  return (
    <div className="toast-region" role="alert" aria-live="assertive">
      {message && (
        <div className="toast">
          <span>{message}</span>
          <button type="button" onClick={onClose} aria-label="Закрыть уведомление">
            ×
          </button>
        </div>
      )}
    </div>
  );
}
