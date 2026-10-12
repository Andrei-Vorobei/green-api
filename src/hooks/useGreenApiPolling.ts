import { useEffect, useRef } from 'react';
import { deleteNotification, receiveNotification } from '../api/greenApi';
import type { Credentials, Message, NotificationBody } from '../types/chat';
import { normalizePhone } from '../utils/phone';

type UseGreenApiPollingOptions = {
  credentials: Credentials;
  enabled: boolean;
  onIncomingMessage: (chatKey: string, message: Message) => void;
  onError: (errorText: string) => void;
  onClearError: () => void;
};

const extractMessageText = (body?: NotificationBody): string => {
  if (!body?.messageData) return '';
  const md = body.messageData;

  // 1. Обычное текстовое сообщение: textMessageData.textMessage
  if (md.textMessageData?.textMessage) {
    return md.textMessageData.textMessage;
  }

  // 2. Расширенное текстовое сообщение (с цитатой, ссылкой и т.д.): extendedTextMessageData.text
  if (md.extendedTextMessageData?.text) {
    return md.extendedTextMessageData.text;
  }

  return '';
};

export const useGreenApiPolling = ({
  credentials,
  enabled,
  onIncomingMessage,
  onError,
  onClearError,
}: UseGreenApiPollingOptions): void => {
  const callbacksRef = useRef({ onIncomingMessage, onError, onClearError });

  useEffect(() => {
    callbacksRef.current = { onIncomingMessage, onError, onClearError };
  });

  useEffect(() => {
    if (!enabled || !credentials.idInstance || !credentials.apiTokenInstance) {
      return;
    }

    let timer: number | undefined;
    let retryDelay = 1500;
    const controller = new AbortController();

    const pollForMessages = async () => {
      try {
        const notification = await receiveNotification(credentials, controller.signal);

        if (notification) {
          if (notification.status === 'error' && notification.message) {
            callbacksRef.current.onError('Green-API: ' + notification.message);
            return;
          }

          const body = notification.body;
          const incomingText = extractMessageText(body);
          const chatId = body?.senderData?.chatId ?? '';
          const senderId = body?.senderData?.sender ?? '';
          // Чат определяем по номеру отправителя (цифры до @), так @c.us и @lid не мешают
          const chatKey = normalizePhone((senderId || chatId).split('@')[0]);
          const isIncomingText = body?.typeWebhook === 'incomingMessageReceived';

          console.log('[Green-API] Notification received', {
            receiptId: notification.receiptId,
            typeWebhook: body?.typeWebhook,
            typeMessage: body?.messageData?.typeMessage,
            chatId,
            hasTextMessage: Boolean(incomingText),
          });

          if (incomingText && chatKey && isIncomingText) {
            callbacksRef.current.onIncomingMessage(chatKey, {
              id: String(body?.idMessage ?? notification.receiptId ?? Date.now()),
              text: incomingText,
              direction: 'incoming',
              timestamp: body?.timestamp ? body.timestamp * 1000 : Date.now(),
            });
          }

          // Всегда подтверждаем и удаляем полученное уведомление из очереди Green-API
          if (notification.receiptId !== undefined && notification.receiptId !== null) {
            await deleteNotification(credentials, notification.receiptId, controller.signal);
          }
        }

        retryDelay = 1500;
        callbacksRef.current.onClearError();
      } catch (requestError) {
        if (controller.signal.aborted) {
          return;
        }

        const isRateLimited = requestError instanceof Error && requestError.message.includes('HTTP 429');
        // При превышении лимита запросов ждём дольше, чтобы не усугублять блокировку
        retryDelay = isRateLimited ? 30000 : 5000;
        console.error('[Green-API] Failed to receive notification', requestError);

        let errorMessage = isRateLimited
          ? 'Слишком много запросов к Green-API (429). Повтор через 30 секунд.'
          : requestError instanceof TypeError
            ? 'Сетевая ошибка: нет ответа от Green-API. Проверьте соединение и доступность хоста.'
            : requestError instanceof Error
              ? requestError.message
              : String(requestError);

        if (errorMessage.includes('custom webhook url is set')) {
          errorMessage =
            'В личном кабинете Green-API задан Webhook URL. Для получения сообщений через HTTP API очистите поле Webhook URL в настройках инстанса и подождите 1 минуту.';
        }

        callbacksRef.current.onError(errorMessage);
      } finally {
        if (!controller.signal.aborted) {
          timer = window.setTimeout(() => void pollForMessages(), retryDelay);
        }
      }
    };

    void pollForMessages();

    return () => {
      controller.abort();
      if (timer !== undefined) {
        window.clearTimeout(timer);
      }
    };
  }, [credentials, enabled]);
};
