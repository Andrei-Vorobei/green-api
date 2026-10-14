import { isValidRecipient, maskPhone, MIN_PHONE_DIGITS } from '../../../utils/phone';
import './AddChatForm.css';

type AddChatFormProps = {
  phone: string;
  onPhoneChange: (value: string) => void;
  onSubmit: () => void;
};

export function AddChatForm({ phone, onPhoneChange, onSubmit }: AddChatFormProps) {
  return (
    <form
      className="contact-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <label>
        <span>Номер получателя</span>
        <input
          type="tel"
          inputMode="tel"
          value={maskPhone(phone)}
          onChange={(event) => onPhoneChange(event.target.value)}
          placeholder="+7 999 123-45-67"
          aria-describedby="phone-hint"
          autoComplete="off"
        />
      </label>
      <small id="phone-hint" className="field-hint">
        С кодом страны, без «+». Минимум {MIN_PHONE_DIGITS} цифр.
      </small>
      <button type="submit" className="primary-button" disabled={!isValidRecipient(phone)}>
        Добавить чат
      </button>
    </form>
  );
}
