import './Composer.css';

type ComposerProps = {
  draft: string;
  activeChat: string;
  isSending: boolean;
  onDraftChange: (value: string) => void;
  onSendMessage: () => void;
};

export function Composer({
  draft,
  activeChat,
  isSending,
  onDraftChange,
  onSendMessage,
}: ComposerProps) {
  return (
    <div className="composer">
      <textarea
        rows={1}
        value={draft}
        onChange={(event) => onDraftChange(event.target.value)}
        placeholder={activeChat ? 'Напишите сообщение… (Enter — отправить, Shift+Enter — новая строка)' : 'Сначала создайте чат'}
        aria-label="Текст сообщения"
        disabled={!activeChat}
        onKeyDown={(event) => {
          // Enter отправляет, Shift+Enter переносит строку; IME-ввод не трогаем
          if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault();
            if (!isSending) onSendMessage();
          }
        }}
      />
      <button
        type="button"
        className="primary-button send-button"
        onClick={onSendMessage}
        disabled={!activeChat || isSending}
      >
        {isSending ? 'Отправка...' : 'Отправить'}
      </button>
    </div>
  );
}
