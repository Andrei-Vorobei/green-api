import { Composer } from '../Composer/Composer';
import { MessageList } from '../MessageList/MessageList';
import type { Message } from '../../types/chat';
import './ChatPanel.css';

type ChatPanelProps = {
  activeChat: string;
  isConfigured: boolean;
  messages: Message[];
  draft: string;
  isSending: boolean;
  onDraftChange: (value: string) => void;
  onSendMessage: () => void;
  onRetryMessage: (id: string) => void;
  onDeleteMessage: (id: string) => void;
  onBack: () => void;
};

export function ChatPanel({
  activeChat,
  isConfigured,
  messages,
  draft,
  isSending,
  onDraftChange,
  onSendMessage,
  onRetryMessage,
  onDeleteMessage,
  onBack,
}: ChatPanelProps) {
  const avatarText = activeChat ? activeChat.slice(-2).toUpperCase() : 'WA';
  const titleText = activeChat ? '+' + activeChat : 'Выберите контакт';
  const statusText = isConfigured ? 'Онлайн' : 'Ожидание подключения';

  return (
    <section className="chat-panel" aria-label="Диалог">
      <header className="chat-header">
        <button type="button" className="back-button" onClick={onBack} aria-label="Назад к списку чатов">
          ←
        </button>
        <div className="avatar">{avatarText}</div>
        <div>
          <h2>{titleText}</h2>
          <p>{statusText}</p>
        </div>
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
