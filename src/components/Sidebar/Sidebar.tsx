import type { FormEvent } from 'react';
import type { ChatSummary, ConnectionStatus } from '../../types/chat';
import type { Theme } from '../../hooks/useTheme';
import { AddChatForm } from './AddChatForm/AddChatForm';
import { ChatList } from './ChatList/ChatList';
import { ConnectionCard } from './ConnectionCard/ConnectionCard';
import { LoginForm } from './LoginForm/LoginForm';
import { SidebarHeader } from './SidebarHeader/SidebarHeader';
import './Sidebar.css';

type SidebarProps = {
  status: ConnectionStatus;
  instanceState: string;
  theme: Theme;
  onToggleTheme: () => void;
  apiUrl: string;
  idInstance: string;
  apiTokenInstance: string;
  phone: string;
  isConfigured: boolean;
  activeChat: string;
  chats: ChatSummary[];
  onSelectChat: (chatKey: string) => void;
  onDeleteChat: (chatKey: string) => void;
  onApiUrlChange: (value: string) => void;
  onIdInstanceChange: (value: string) => void;
  onApiTokenInstanceChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onLogin: (event: FormEvent<HTMLFormElement>) => void;
  onLogout: () => void;
  onCreateChat: () => void;
};

export function Sidebar({
  status,
  instanceState,
  theme,
  onToggleTheme,
  apiUrl,
  idInstance,
  apiTokenInstance,
  phone,
  isConfigured,
  activeChat,
  chats,
  onSelectChat,
  onDeleteChat,
  onApiUrlChange,
  onIdInstanceChange,
  onApiTokenInstanceChange,
  onPhoneChange,
  onLogin,
  onLogout,
  onCreateChat,
}: SidebarProps) {
  return (
    <aside className="sidebar">
      <SidebarHeader status={status} theme={theme} onToggleTheme={onToggleTheme} />

      {isConfigured ? (
        <>
          <ConnectionCard idInstance={idInstance} instanceState={instanceState} onLogout={onLogout} />
          <AddChatForm phone={phone} onPhoneChange={onPhoneChange} onSubmit={onCreateChat} />
          <ChatList
            chats={chats}
            activeChat={activeChat}
            onSelectChat={onSelectChat}
            onDeleteChat={onDeleteChat}
          />
        </>
      ) : (
        <LoginForm
          apiUrl={apiUrl}
          idInstance={idInstance}
          apiTokenInstance={apiTokenInstance}
          onApiUrlChange={onApiUrlChange}
          onIdInstanceChange={onIdInstanceChange}
          onApiTokenInstanceChange={onApiTokenInstanceChange}
          onSubmit={onLogin}
        />
      )}
    </aside>
  );
}
