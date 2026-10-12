import { useEffect, useRef, useState } from 'react';
import type { Message } from '../../types/chat';
import './MessageList.css';

type MessageListProps = {
  messages: Message[];
  isConfigured: boolean;
  hasActiveChat: boolean;
  onRetry: (id: string) => void;
  onDelete: (id: string) => void;
};

const BOTTOM_THRESHOLD = 48;

const dayKey = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.getFullYear() + '-' + date.getMonth() + '-' + date.getDate();
};

const formatDay = (timestamp: number): string => {
  const now = Date.now();
  if (dayKey(timestamp) === dayKey(now)) return 'Сегодня';
  if (dayKey(timestamp) === dayKey(now - 86_400_000)) return 'Вчера';
  return new Date(timestamp).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
};

const formatTime = (timestamp: number): string =>
  new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const StatusIcon = ({ status }: { status?: Message['status'] }) => {
  if (status === 'sending') return <span className="status-icon" title="Отправляется" aria-label="Отправляется">🕓</span>;
  if (status === 'sent') return <span className="status-icon" title="Отправлено" aria-label="Отправлено">✓</span>;
  if (status === 'failed') return <span className="status-icon" title="Не отправлено" aria-label="Не отправлено">!</span>;
  return null;
};

export function MessageList({ messages, isConfigured, hasActiveChat, onRetry, onDelete }: MessageListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const atBottomRef = useRef(true);
  const [atBottom, setAtBottom] = useState(true);

  const scrollToBottom = (smooth = true) => {
    const list = listRef.current;
    if (list) list.scrollTo({ top: list.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
  };

  const handleScroll = () => {
    const list = listRef.current;
    if (!list) return;
    const nearBottom = list.scrollHeight - list.scrollTop - list.clientHeight < BOTTOM_THRESHOLD;
    atBottomRef.current = nearBottom;
    setAtBottom(nearBottom);
  };

  // Прокручиваем вниз, если пользователь уже внизу или сам отправил сообщение
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (last && (atBottomRef.current || last.direction === 'outgoing')) {
      const list = listRef.current;
      if (list) list.scrollTo({ top: list.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  return (
    <div className="message-list-wrap">
      <div className="message-list" ref={listRef} onScroll={handleScroll} role="log" aria-live="polite">
        {messages.length === 0 ? (
          <div className="empty-state">
            {hasActiveChat ? (
              <>
                <p>Здесь пока пусто</p>
                <span>Напишите первое сообщение. Новые входящие появятся автоматически.</span>
              </>
            ) : (
              <>
                <p>Начните переписку</p>
                <ol className="empty-steps">
                  <li className={isConfigured ? 'done' : ''}>Подключитесь к Green-API</li>
                  <li>Введите номер получателя</li>
                  <li>Нажмите «Создать чат» и пишите</li>
                </ol>
              </>
            )}
          </div>
        ) : (
          messages.map((message, index) => {
            const previous = messages[index - 1];
            const isNewDay = !previous || dayKey(previous.timestamp) !== dayKey(message.timestamp);
            return (
              <div key={message.id} className="message-group">
                {isNewDay && <div className="day-separator">{formatDay(message.timestamp)}</div>}
                <div className={'message-row ' + (message.direction === 'outgoing' ? 'outgoing' : 'incoming')}>
                  <div className={'message-bubble' + (message.status === 'failed' ? ' failed' : '')}>
                    <p>{message.text}</p>
                    <time>
                      {formatTime(message.timestamp)}
                      {message.direction === 'outgoing' && <StatusIcon status={message.status} />}
                    </time>
                    {message.status === 'failed' && (
                      <div className="message-failure">
                        {message.error && <span>{message.error}</span>}
                        <div className="message-failure-actions">
                          <button type="button" onClick={() => onRetry(message.id)}>
                            Повторить
                          </button>
                          <button type="button" onClick={() => onDelete(message.id)}>
                            Удалить
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      {!atBottom && (
        <button type="button" className="scroll-down-button" onClick={() => scrollToBottom()}>
          ↓ Вниз
        </button>
      )}
    </div>
  );
}
