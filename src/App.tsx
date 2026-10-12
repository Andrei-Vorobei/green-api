import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import './App.css';
import { checkWhatsapp, cleanInstanceId, describeSendError, getSettings, getStateInstance, sendMessage, setSettings } from './api/greenApi';
import { ChatPanel } from './components/ChatPanel/ChatPanel';
import { Sidebar } from './components/Sidebar/Sidebar';
import { Toast } from './components/Toast/Toast';
import { useGreenApiPolling } from './hooks/useGreenApiPolling';
import { useTheme } from './hooks/useTheme';
import type { ChatSummary, ConnectionStatus, Credentials, Message } from './types/chat';
import { isValidRecipient, MIN_PHONE_DIGITS, normalizeRecipient, createChatId } from './utils/phone';
import {
  readStoredChats,
  readStoredCredentials,
  saveStoredChats,
  saveStoredCredentials,
} from './utils/storage';
import type { ChatsMap } from './utils/storage';

function App() {
  // Активное подключение стартует пустым: после перезагрузки нужно нажать «Подключиться».
  // Сохранённые данные только подставляются в форму
  const [credentials, setCredentials] = useState<Credentials>({
    apiUrl: '',
    idInstance: '',
    apiTokenInstance: '',
  });
  const [stored] = useState(readStoredCredentials);
  const [apiUrl, setApiUrl] = useState(stored.apiUrl);
  const [idInstanceInput, setIdInstanceInput] = useState(stored.idInstance);
  const [tokenInput, setTokenInput] = useState(stored.apiTokenInstance);
  const [phone, setPhone] = useState('');
  const [draft, setDraft] = useState('');
  const [chats, setChats] = useState<ChatsMap>(readStoredChats);
  const [error, setError] = useState('');
  const [instanceState, setInstanceState] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [activeChat, setActiveChat] = useState('');
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
  const [theme, toggleTheme] = useTheme();
  const dismissError = useCallback(() => setError(''), []);

  const isConfigured = useMemo(
    () => Boolean(credentials.idInstance && credentials.apiTokenInstance),
    [credentials],
  );

  const status: ConnectionStatus = isConfigured
    ? activeChat
      ? 'ready'
      : 'connected'
    : 'offline';

  // Поля формы сохраняются при каждом изменении и при подключении
  useEffect(() => {
    saveStoredCredentials({
      apiUrl,
      idInstance: idInstanceInput,
      apiTokenInstance: tokenInput,
    });
  }, [apiUrl, idInstanceInput, tokenInput]);

  useEffect(() => {
    saveStoredChats(chats);
  }, [chats]);

  const addMessage = useCallback((chatKey: string, message: Message) => {
    setChats((previous) => {
      const list = previous[chatKey] ?? [];
      if (list.some((item) => item.id === message.id)) return previous;
      return { ...previous, [chatKey]: [...list, message] };
    });
  }, []);

  const patchMessage = (chatKey: string, id: string, changes: Partial<Message>) =>
    setChats((previous) => ({
      ...previous,
      [chatKey]: (previous[chatKey] ?? []).map((message) =>
        message.id === id ? { ...message, ...changes } : message,
      ),
    }));

  const messages = useMemo(() => chats[activeChat] ?? [], [chats, activeChat]);

  const chatSummaries = useMemo<ChatSummary[]>(
    () =>
      Object.entries(chats)
        .map(([id, list]) => {
          const last = list[list.length - 1];
          return {
            id,
            lastText: last?.text ?? '',
            lastTimestamp: last?.timestamp ?? 0,
            hasFailed: list.some((message) => message.status === 'failed'),
          };
        })
        .sort((a, b) => b.lastTimestamp - a.lastTimestamp),
    [chats],
  );

  // Входящие от любого номера попадают в свой чат
  const handleIncomingMessage = useCallback(
    (chatKey: string, incomingMessage: Message) => addMessage(chatKey, incomingMessage),
    [addMessage],
  );

  // Ошибка опроса повторяется на каждом цикле: показываем тост один раз, пока опрос не восстановится
  const lastPollingErrorRef = useRef('');

  const handlePollingError = useCallback((errorText: string) => {
    if (lastPollingErrorRef.current === errorText) return;
    lastPollingErrorRef.current = errorText;
    setError(errorText);
  }, []);

  const handleClearPollingError = useCallback(() => {
    lastPollingErrorRef.current = '';
  }, []);

  useGreenApiPolling({
    credentials,
    // Приём стартует после подключения и выбора чата (кнопка «Начать чат»)
    enabled: Boolean(activeChat),
    onIncomingMessage: handleIncomingMessage,
    onError: handlePollingError,
    onClearError: handleClearPollingError,
  });

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const cleanId = cleanInstanceId(idInstanceInput);
    const cleanToken = tokenInput.trim();

    if (!cleanId || !cleanToken) {
      setError('Введите idInstance и apiTokenInstance');
      return;
    }

    const nextCredentials: Credentials = {
      apiUrl: apiUrl.trim(),
      idInstance: cleanId,
      apiTokenInstance: cleanToken,
    };

    saveStoredCredentials(nextCredentials);
    setError('');

    try {
      // Без incomingWebhook входящие не попадают в очередь receiveNotification
      const settings = await getSettings(nextCredentials);
      if (settings && (settings.incomingWebhook !== 'yes' || settings.webhookUrl)) {
        await setSettings(nextCredentials, {
          webhookUrl: '',
          incomingWebhook: 'yes',
          outgoingAPIMessageWebhook: 'yes',
        });
        setError('Включено получение входящих (incomingWebhook). Настройки применяются около минуты.');
      }

      const state = await getStateInstance(nextCredentials);
      // Подключение считается активным (и приём стартует) только после успешной проверки
      setCredentials(nextCredentials);
      setInstanceState(state?.stateInstance ?? '');
      if (state?.stateInstance === 'notAuthorized') {
        setError('Инстанс подключен, но не авторизован в WhatsApp. Отсканируйте QR-код в личном кабинете Green-API.');
      } else if (state?.stateInstance === 'blocked') {
        setError('Инстанс заблокирован в WhatsApp.');
      } else if (state?.stateInstance === 'starting') {
        setError('Инстанс запускается (сервисный режим). Подождите несколько минут.');
      } else if (state?.stateInstance === 'suspended') {
        setError('На инстансе действуют временные ограничения WhatsApp.');
      }
    } catch (checkError) {
      console.error('[Green-API] Connection check failed', checkError);
      // Форма остаётся открытой, чтобы можно было поправить данные
      setCredentials({ apiUrl: '', idInstance: '', apiTokenInstance: '' });
      setInstanceState('');
      setError(
        checkError instanceof Error && checkError.message.includes('HTTP 429')
          ? 'Слишком много запросов к Green-API (429). Подождите около минуты и подключитесь снова.'
          : checkError instanceof Error
            ? 'Ошибка подключения: ' + checkError.message
            : 'Не удалось подключиться к Green-API. Проверьте данные и доступность API.',
      );
    }
  };

  const handleCreateChat = () => {
    if (!isConfigured) return;
    if (!isValidRecipient(phone)) {
      setError('Введите номер получателя с кодом страны (не меньше ' + MIN_PHONE_DIGITS + ' цифр)');
      return;
    }

    setActiveChat(normalizeRecipient(phone));
    setMobileView('chat');
    setPhone('');
    setError('');
  };

  const deliverMessage = async (chatKey: string, id: string, text: string) => {
    setIsSending(true);
    try {
      const check = await checkWhatsapp(credentials, chatKey);
      if (check && check.existsWhatsapp === false) {
        throw new Error('Этот номер не зарегистрирован в WhatsApp');
      }
      const response = await sendMessage(credentials, check?.chatId || createChatId(chatKey), text);
      console.log('[Green-API] Message sent', { idMessage: response?.idMessage });
      patchMessage(chatKey, id, { status: 'sent', error: undefined });
    } catch (requestError) {
      console.error('[Green-API] Failed to send message', requestError);
      patchMessage(chatKey, id, { status: 'failed', error: describeSendError(requestError) });
    } finally {
      setIsSending(false);
    }
  };

  const handleSendMessage = async () => {
    const trimmed = draft.trim();

    if (!isConfigured) {
      setError('Сначала подключитесь к Green-API');
      return;
    }

    if (!trimmed) {
      setError('Введите текст сообщения');
      return;
    }

    if (!activeChat) {
      setError('Создайте чат с получателем');
      return;
    }

    const outgoingMessage: Message = {
      id: String(Date.now()),
      text: trimmed,
      direction: 'outgoing',
      timestamp: Date.now(),
      status: 'sending',
    };

    addMessage(activeChat, outgoingMessage);
    setDraft('');
    setError('');
    await deliverMessage(activeChat, outgoingMessage.id, trimmed);
  };

  const handleRetryMessage = async (id: string) => {
    const target = messages.find((message) => message.id === id);
    if (!target || isSending) return;

    patchMessage(activeChat, id, { status: 'sending', error: undefined });
    await deliverMessage(activeChat, id, target.text);
  };

  const handleDeleteMessage = (id: string) => {
    setChats((previous) => ({
      ...previous,
      [activeChat]: (previous[activeChat] ?? []).filter((message) => message.id !== id),
    }));
  };

  const handleSelectChat = (chatKey: string) => {
    if (!isConfigured) return;
    setActiveChat(chatKey);
    setMobileView('chat');
    setDraft('');
    setError('');
  };

  const handleDeleteChat = (chatKey: string) => {
    setChats((previous) => {
      const next = { ...previous };
      delete next[chatKey];
      return next;
    });
    if (activeChat === chatKey) {
      setActiveChat('');
      setMobileView('list');
    }
  };

  const handleLogout = () => {
    setInstanceState('');
    setCredentials({ apiUrl: '', idInstance: '', apiTokenInstance: '' });
    setActiveChat('');
    setMobileView('list');
    setError('');
  };

  return (
    <div className="app-shell">
      <Toast message={error} onClose={dismissError} />
      <main className={'app-card ' + (mobileView === 'chat' ? 'view-chat' : 'view-list')}>
        <Sidebar
          status={status}
          instanceState={instanceState}
          theme={theme}
          onToggleTheme={toggleTheme}
          apiUrl={apiUrl}
          idInstance={idInstanceInput}
          apiTokenInstance={tokenInput}
          phone={phone}
          isConfigured={isConfigured}
          activeChat={activeChat}
          chats={chatSummaries}
          onSelectChat={handleSelectChat}
          onDeleteChat={handleDeleteChat}
          onApiUrlChange={setApiUrl}
          onIdInstanceChange={setIdInstanceInput}
          onApiTokenInstanceChange={setTokenInput}
          onPhoneChange={setPhone}
          onLogin={handleLogin}
          onLogout={handleLogout}
          onCreateChat={handleCreateChat}
        />

        <ChatPanel
          activeChat={activeChat}
          isConfigured={isConfigured}
          messages={messages}
          draft={draft}
          isSending={isSending}
          onDraftChange={setDraft}
          onSendMessage={() => void handleSendMessage()}
          onRetryMessage={(id) => void handleRetryMessage(id)}
          onDeleteMessage={handleDeleteMessage}
          onBack={() => setMobileView('list')}
        />
      </main>
    </div>
  );
}

export default App;
