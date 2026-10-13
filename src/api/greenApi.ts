import { API_URL } from '../config';
import type {
  CheckWhatsappResponse,
  Credentials,
  InstanceSettings,
  NotificationPayload,
  SendMessageResponse,
  StateInstanceResponse,
} from '../types/chat';

export const cleanInstanceId = (idInstance: string): string => {
  return idInstance.trim().replace(/^waInstance/i, '');
};

export const resolveApiBaseUrl = (credentials: Credentials): string => {
  const rawApiUrl = credentials.apiUrl.trim();
  if (!rawApiUrl) return API_URL;

  const url = rawApiUrl.replace(/\/+$/, '');
  return (/^https?:\/\//i.test(url) ? url : 'https://' + url).replace(/\/waInstance.*$/i, '');
};

export const getApiUrl = (credentials: Credentials, method: string, suffix = ''): string => {
  const baseUrl = resolveApiBaseUrl(credentials);
  const idInstance = cleanInstanceId(credentials.idInstance);
  const token = credentials.apiTokenInstance.trim();
  const suffixPart = suffix ? '/' + encodeURIComponent(suffix) : '';
  return baseUrl + '/waInstance' + idInstance + '/' + method + '/' + token + suffixPart;
};

export const fetchJson = async <T>(url: string, init?: RequestInit): Promise<T | null> => {
  const response = await fetch(url, init);
  const text = await response.text();

  if (!response.ok) {
    let errorDetails = '';
    if (text) {
      try {
        const parsed = JSON.parse(text);
        if (parsed && typeof parsed === 'object') {
          errorDetails =
            parsed.invokeStatus?.description ||
            parsed.correspondentsStatus?.description ||
            parsed.message ||
            parsed.error ||
            parsed.description ||
            text;
        } else {
          errorDetails = text;
        }
      } catch {
        errorDetails = text;
      }
    }
    const message = errorDetails
      ? 'HTTP ' + response.status + ' ' + response.statusText + ': ' + errorDetails
      : 'HTTP ' + response.status + ' ' + response.statusText;
    throw new Error(message);
  }

  if (!text || text === 'null') {
    return null;
  }

  return JSON.parse(text) as T;
};

export const describeSendError = (error: unknown): string => {
  const raw = error instanceof Error ? error.message : String(error);

  if (/HTTP 466|quota/i.test(raw)) {
    return 'Лимит тарифа Green-API: бесплатный тариф позволяет писать только на разрешённые номера. Смените тариф или выберите разрешённый номер.';
  }
  if (/HTTP 401|HTTP 403/.test(raw)) {
    return 'Неверный idInstance или apiTokenInstance.';
  }
  if (/HTTP 429/.test(raw)) {
    return 'Слишком много запросов. Подождите немного и повторите.';
  }
  if (error instanceof TypeError) {
    return 'Нет связи с Green-API. Проверьте соединение.';
  }
  return raw;
};

export const getStateInstance = async (
  credentials: Credentials,
  signal?: AbortSignal,
): Promise<StateInstanceResponse | null> => {
  return fetchJson<StateInstanceResponse>(getApiUrl(credentials, 'getStateInstance'), {
    signal,
  });
};

export const getSettings = async (
  credentials: Credentials,
  signal?: AbortSignal,
): Promise<InstanceSettings | null> => {
  return fetchJson<InstanceSettings>(getApiUrl(credentials, 'getSettings'), { signal });
};

export const setSettings = async (
  credentials: Credentials,
  settings: InstanceSettings,
  signal?: AbortSignal,
): Promise<void> => {
  await fetchJson(getApiUrl(credentials, 'setSettings'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
    signal,
  });
};

export const checkWhatsapp = async (
  credentials: Credentials,
  phoneNumber: string,
  signal?: AbortSignal,
): Promise<CheckWhatsappResponse | null> => {
  return fetchJson<CheckWhatsappResponse>(getApiUrl(credentials, 'checkWhatsapp'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber: Number(phoneNumber) }),
    signal,
  });
};

export const receiveNotification = async (
  credentials: Credentials,
  signal?: AbortSignal,
): Promise<NotificationPayload | null> => {
  const url = getApiUrl(credentials, 'receiveNotification') + '?receiveTimeout=5';
  return fetchJson<NotificationPayload>(url, {
    signal,
  });
};

export const deleteNotification = async (
  credentials: Credentials,
  receiptId: string | number,
  signal?: AbortSignal,
): Promise<void> => {
  await fetchJson(getApiUrl(credentials, 'deleteNotification', String(receiptId)), {
    method: 'DELETE',
    signal,
  });
};

export const sendMessage = async (
  credentials: Credentials,
  chatId: string,
  message: string,
  signal?: AbortSignal,
): Promise<SendMessageResponse | null> => {
  return fetchJson<SendMessageResponse>(getApiUrl(credentials, 'sendMessage'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chatId,
      message,
    }),
    signal,
  });
};
