import { useState } from 'react';
import type { FormEvent } from 'react';
import { API_URL } from '../../config';
import type { ChatSummary, ConnectionStatus } from '../../types/chat';
import type { Theme } from '../../hooks/useTheme';
import { isValidRecipient, maskPhone, MIN_PHONE_DIGITS } from '../../utils/phone';
import './Sidebar.css';

type SidebarProps = {
  status: ConnectionStatus;
  instanceState: string;
  theme: Theme;
  onToggleTheme: () => void;
  apiUrl: string;
  idInstance: string;
  apiTokenInstance: string;
  phone: string;
  isConfigured: boolean;
  activeChat: string;
  chats: ChatSummary[];
  onSelectChat: (chatKey: string) => void;
  onDeleteChat: (chatKey: string) => void;
  onApiUrlChange: (value: string) => void;
  onIdInstanceChange: (value: string) => void;
  onApiTokenInstanceChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onLogin: (event: FormEvent<HTMLFormElement>) => void;
  onLogout: () => void;
  onCreateChat: () => void;
};

export function Sidebar({
  status,
  instanceState,
  theme,
  onToggleTheme,
  apiUrl,
  idInstance,
  apiTokenInstance,
  phone,
  isConfigured,
  activeChat,
  chats,
  onSelectChat,
  onDeleteChat,
  onApiUrlChange,
  onIdInstanceChange,
  onApiTokenInstanceChange,
  onPhoneChange,
  onLogin,
  onLogout,
  onCreateChat,
}: SidebarProps) {
  const [showToken, setShowToken] = useState(false);

  return (
    <aside className="sidebar">
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

      {isConfigured ? (
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
      ) : (
        <form className="login-form" onSubmit={onLogin}>
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
      )}

      {isConfigured && !activeChat && (
      <form
        className="contact-form"
        onSubmit={(event) => {
          event.preventDefault();
          onCreateChat();
        }}
      >
        <label>
          <span>Номер получателя</span>
          <input
            type="tel"
            inputMode="tel"
            value={maskPhone(phone)}
            onChange={(event) => onPhoneChange(event.target.value)}
            placeholder="+7 999 123-45-67"
            aria-describedby="phone-hint"
            autoComplete="off"
          />
        </label>
        <small id="phone-hint" className="field-hint">
          С кодом страны, без «+». Минимум {MIN_PHONE_DIGITS} цифр.
        </small>
        <button type="submit" className="primary-button" disabled={!isValidRecipient(phone)}>
          Создать чат
        </button>
      </form>
      )}

      {isConfigured && chats.length > 0 && (
        <nav className="chat-list" aria-label="Чаты">
          <span className="chat-list-title">Чаты</span>
          <ul>
            {chats.map((chat) => (
              <li key={chat.id}>
                <button
                  type="button"
                  className={'chat-list-item' + (chat.id === activeChat ? ' active' : '')}
                  onClick={() => onSelectChat(chat.id)}
                  aria-current={chat.id === activeChat ? 'true' : undefined}
                >
                  <span className="chat-list-avatar">{chat.id.slice(-2)}</span>
                  <span className="chat-list-body">
                    <strong>+{chat.id}</strong>
                    <small>{chat.hasFailed ? '⚠ ' : ''}{chat.lastText || 'Нет сообщений'}</small>
                  </span>
                </button>
                <button
                  type="button"
                  className="chat-list-delete"
                  onClick={() => {
                    if (window.confirm('Удалить чат +' + chat.id + ' и всю переписку?')) onDeleteChat(chat.id);
                  }}
                  aria-label={'Удалить чат ' + chat.id}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </aside>
  );
}
