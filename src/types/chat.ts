export type MessageDirection = 'incoming' | 'outgoing';

export type Message = {
  id: string;
  text: string;
  direction: MessageDirection;
  timestamp: number;
  status?: 'sending' | 'sent' | 'failed';
  error?: string;
};

export type ChatSummary = {
  id: string;
  nickname: string;
  lastText: string;
  lastTimestamp: number;
  hasFailed: boolean;
};

export type Credentials = {
  apiUrl: string;
  idInstance: string;
  apiTokenInstance: string;
};

export type ConnectionStatus = 'offline' | 'connected' | 'ready';

export type StateInstance =
  | 'notAuthorized'
  | 'authorized'
  | 'blocked'
  | 'sleepMode'
  | 'starting'
  | 'yellowCard'
  | 'suspended';

export type StateInstanceResponse = {
  stateInstance: StateInstance;
};

export type NotificationBody = {
  typeWebhook?: string;
  timestamp?: number;
  idMessage?: string;
  senderData?: {
    chatId?: string;
    sender?: string;
    senderName?: string;
  };
  messageData?: {
    typeMessage?: string;
    textMessageData?: {
      textMessage?: string;
    };
    extendedTextMessageData?: {
      text?: string;
      description?: string;
      title?: string;
    };
  };
};

export type NotificationPayload = {
  receiptId?: string | number;
  body?: NotificationBody;
  status?: string;
  message?: string;
  code?: string;
};

export type SendMessageResponse = {
  idMessage?: string;
};

export type InstanceSettings = {
  webhookUrl?: string;
  incomingWebhook?: 'yes' | 'no';
  outgoingAPIMessageWebhook?: 'yes' | 'no';
  outgoingMessageWebhook?: 'yes' | 'no';
  enableLidMode?: 'yes' | 'no';
};

export type CheckWhatsappResponse = {
  existsWhatsapp?: boolean;
  chatId?: string;
  phoneNumber?: string;
};
