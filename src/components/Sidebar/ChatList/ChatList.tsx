import type { ChatSummary } from '../../../types/chat';
import { getAvatarText } from '../../../utils/nickname';
import './ChatList.css';

type ChatListProps = {
  chats: ChatSummary[];
  activeChat: string;
  onSelectChat: (chatKey: string) => void;
  onDeleteChat: (chatKey: string) => void;
};

export function ChatList({ chats, activeChat, onSelectChat, onDeleteChat }: ChatListProps) {
  if (chats.length === 0) return null;

  return (
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
              <span className="chat-list-avatar">{getAvatarText(chat.id, chat.nickname)}</span>
              <span className="chat-list-body">
                <strong>{chat.nickname || '+' + chat.id}</strong>
                <small>
                  {chat.nickname ? '+' + chat.id + ' · ' : ''}
                  {chat.hasFailed ? '⚠ ' : ''}
                  {chat.lastText || 'Нет сообщений'}
                </small>
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
  );
}
