import { useState } from 'react';
import type { FormEvent } from 'react';
import { Composer } from '../Composer/Composer';
import { MessageList } from '../MessageList/MessageList';
import type { Message } from '../../types/chat';
import { getAvatarText, NICKNAME_MAX_LENGTH } from '../../utils/nickname';
import './ChatPanel.css';

type ChatTitleProps = {
  chatKey: string;
  nickname: string;
  statusText: string;
  onRename: (value: string) => void;
};

// Ключ chatKey на компоненте сбрасывает режим редактирования при смене чата
function ChatTitle({ chatKey, nickname, statusText, onRename }: ChatTitleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(nickname);

  const startEditing = () => {
    setValue(nickname);
    setIsEditing(true);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onRename(value);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <form className="nickname-form" onSubmit={handleSubmit}>
        <input
          type="text"
          value={value}
          maxLength={NICKNAME_MAX_LENGTH}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setIsEditing(false);
          }}
          placeholder="Имя чата"
          aria-label="Имя чата"
          autoFocus
        />
        <button type="submit" className="nickname-button" aria-label="Сохранить имя" title="Сохранить">
          ✓
        </button>
        <button
          type="button"
          className="nickname-button"
          onClick={() => setIsEditing(false)}
          aria-label="Отменить"
          title="Отменить"
        >
          ✕
        </button>
      </form>
    );
  }

  return (
    <div className="chat-title">
      <div className="chat-title-text">
        <h2>{nickname || '+' + chatKey}</h2>
        <p>{nickname ? '+' + chatKey : statusText}</p>
      </div>
      <button
        type="button"
        className="nickname-button"
        onClick={startEditing}
        aria-label="Переименовать чат"
        title="Переименовать"
      >
        ✎
      </button>
    </div>
  );
}

type ChatPanelProps = {
  activeChat: string;
  nickname: string;
  isConfigured: boolean;
  messages: Message[];
  draft: string;
  isSending: boolean;
  onDraftChange: (value: string) => void;
  onSendMessage: () => void;
  onRetryMessage: (id: string) => void;
  onDeleteMessage: (id: string) => void;
  onRenameChat: (value: string) => void;
  onBack: () => void;
};

export function ChatPanel({
  activeChat,
  nickname,
  isConfigured,
  messages,
  draft,
  isSending,
  onDraftChange,
  onSendMessage,
  onRetryMessage,
  onDeleteMessage,
  onRenameChat,
  onBack,
}: ChatPanelProps) {
  const avatarText = activeChat ? getAvatarText(activeChat, nickname) : 'WA';
  const statusText = isConfigured ? 'Онлайн' : 'Ожидание подключения';

  return (
    <section className="chat-panel" aria-label="Диалог">
      <header className="chat-header">
        <button type="button" className="back-button" onClick={onBack} aria-label="Назад к списку чатов">
          ←
        </button>
        <div className="avatar">{avatarText}</div>
        {activeChat ? (
          <ChatTitle
            key={activeChat}
            chatKey={activeChat}
            nickname={nickname}
            statusText={statusText}
            onRename={onRenameChat}
          />
        ) : (
          <div className="chat-title-text">
            <h2>Выберите контакт</h2>
            <p>{statusText}</p>
          </div>
        )}
      </header>

      <MessageList
        messages={messages}
        isConfigured={isConfigured}
        hasActiveChat={Boolean(activeChat)}
        onRetry={onRetryMessage}
        onDelete={onDeleteMessage}
      />

      <Composer
        draft={draft}
        activeChat={activeChat}
        isSending={isSending}
        onDraftChange={onDraftChange}
        onSendMessage={onSendMessage}
      />
    </section>
  );
}
