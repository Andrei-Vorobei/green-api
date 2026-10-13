export const NICKNAME_MAX_LENGTH = 20;

export const normalizeNickname = (value: string): string =>
  value.replace(/\s+/g, ' ').trim().slice(0, NICKNAME_MAX_LENGTH);

export const getAvatarText = (chatKey: string, nickname: string): string =>
  nickname ? Array.from(nickname).slice(0, 2).join('').toUpperCase() : chatKey.slice(-2);
