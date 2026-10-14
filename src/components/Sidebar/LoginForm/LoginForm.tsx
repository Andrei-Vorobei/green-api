import { useState } from 'react';
import type { FormEvent } from 'react';
import { API_URL } from '../../../config';
import './LoginForm.css';

type LoginFormProps = {
  apiUrl: string;
  idInstance: string;
  apiTokenInstance: string;
  onApiUrlChange: (value: string) => void;
  onIdInstanceChange: (value: string) => void;
  onApiTokenInstanceChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function LoginForm({
  apiUrl,
  idInstance,
  apiTokenInstance,
  onApiUrlChange,
  onIdInstanceChange,
  onApiTokenInstanceChange,
  onSubmit,
}: LoginFormProps) {
  const [showToken, setShowToken] = useState(false);

  return (
    <form className="login-form" onSubmit={onSubmit}>
      <label>
        <span>apiUrl</span>
        <input
          type="text"
          value={apiUrl}
          onChange={(event) => onApiUrlChange(event.target.value)}
          placeholder={API_URL}
        />
      </label>

      <label>
        <span>idInstance</span>
        <input
          type="text"
          value={idInstance}
          onChange={(event) => onIdInstanceChange(event.target.value)}
          placeholder="1101234567"
        />
      </label>

      <label>
        <span>apiTokenInstance</span>
        <div className="token-field">
          <input
            type={showToken ? 'text' : 'password'}
            value={apiTokenInstance}
            onChange={(event) => onApiTokenInstanceChange(event.target.value)}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            autoComplete="off"
          />
          <button
            type="button"
            className="token-toggle"
            onClick={() => setShowToken((value) => !value)}
            aria-label={showToken ? 'Скрыть токен' : 'Показать токен'}
            aria-pressed={showToken}
          >
            {showToken ? 'Скрыть' : 'Показать'}
          </button>
        </div>
      </label>

      <div className="login-actions">
        <button type="submit" className="primary-button">
          Подключиться
        </button>
      </div>
    </form>
  );
}
