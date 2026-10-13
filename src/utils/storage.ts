import type { Credentials, Message } from '../types/chat';

export const STORAGE_KEY = 'green-api-credentials';

export const readStoredCredentials = (): Credentials => {
  if (typeof window === 'undefined') {
    return { apiUrl: '', idInstance: '', apiTokenInstance: '' };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { apiUrl: '', idInstance: '', apiTokenInstance: '' };
    }

    const parsed = JSON.parse(raw) as Partial<Credentials>;
    return {
      apiUrl: parsed.apiUrl ?? '',
      idInstance: parsed.idInstance ?? '',
      apiTokenInstance: parsed.apiTokenInstance ?? '',
    };
  } catch {
    return { apiUrl: '', idInstance: '', apiTokenInstance: '' };
  }
};

export type ChatsMap = Record<string, Message[]>;

const CHATS_KEY = 'green-api-chats';
export const MAX_MESSAGES_PER_CHAT = 200;

export const readStoredChats = (): ChatsMap => {
  if (typeof window === 'undefined') return {};

  try {
    const raw = window.localStorage.getItem(CHATS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as ChatsMap;
    const result: ChatsMap = {};
    for (const [key, list] of Object.entries(parsed)) {
      if (!Array.isArray(list)) continue;
      // Сообщения, которые не успели отправиться до перезагрузки, помечаем как неотправленные
      result[key] = list.map((message) =>
        message.status === 'sending'
          ? { ...message, status: 'failed', error: 'Отправка прервана. Повторите.' }
          : message,
      );
    }
    return result;
  } catch {
    return {};
  }
};

export const saveStoredChats = (chats: ChatsMap): void => {
  if (typeof window === 'undefined') return;

  const trimmed: ChatsMap = {};
  for (const [key, list] of Object.entries(chats)) {
    trimmed[key] = list.slice(-MAX_MESSAGES_PER_CHAT);
  }

  try {
    window.localStorage.setItem(CHATS_KEY, JSON.stringify(trimmed));
  } catch {
    // переполнение хранилища не должно ломать приложение
  }
};

export const clearStoredChats = (): void => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(CHATS_KEY);
};

export const saveStoredCredentials = (credentials: Credentials): void => {
  if (typeof window === 'undefined') return;
  if (credentials.apiUrl || credentials.idInstance || credentials.apiTokenInstance) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(credentials));
  } else {
    window.localStorage.removeItem(STORAGE_KEY);
  }
};

export type NicknamesMap = Record<string, string>;

const NICKNAMES_KEY = 'green-api-nicknames';

export const readStoredNicknames = (): NicknamesMap => {
  if (typeof window === 'undefined') return {};

  try {
    const raw = window.localStorage.getItem(NICKNAMES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as NicknamesMap;
    const result: NicknamesMap = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === 'string' && value) result[key] = value;
    }
    return result;
  } catch {
    return {};
  }
};

export const saveStoredNicknames = (nicknames: NicknamesMap): void => {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(NICKNAMES_KEY, JSON.stringify(nicknames));
  } catch {
    // переполнение хранилища не должно ломать приложение
  }
};
