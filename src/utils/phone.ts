export const normalizePhone = (value: string): string => value.replace(/\D/g, '');

export const createChatId = (phone: string): string => {
  const cleaned = normalizePhone(phone);
  return cleaned ? cleaned + '@c.us' : '';
};

export const MIN_PHONE_DIGITS = 10;

// Российский номер, набранный через 8, приводим к международному виду (7...)
export const normalizeRecipient = (value: string): string => {
  const digits = formatPhoneDisplay(value);
  return digits.length === 11 && digits.startsWith('8') ? '7' + digits.slice(1) : digits;
};

export const isValidRecipient = (value: string): boolean =>
  normalizeRecipient(value).length >= MIN_PHONE_DIGITS;

// +7 999 123-45-67 для 11-значных номеров, для остальных — группы по 3 цифры
export const maskPhone = (value: string): string => {
  const digits = normalizeRecipient(value);
  if (!digits) return '';

  if (digits.length <= 11 && digits.startsWith('7')) {
    const parts = [digits.slice(1, 4), digits.slice(4, 7), digits.slice(7, 9), digits.slice(9, 11)];
    let result = '+7';
    if (parts[0]) result += ' ' + parts[0];
    if (parts[1]) result += ' ' + parts[1];
    if (parts[2]) result += '-' + parts[2];
    if (parts[3]) result += '-' + parts[3];
    return result;
  }

  return '+' + (digits.match(/.{1,3}/g) ?? []).join(' ');
};

export const formatPhoneDisplay = (value: string): string => {
  const digits = normalizePhone(value);
  if (!digits) return '';
  return digits.slice(0, 15);
};
