'use client';

import { useState, useRef, useEffect } from 'react';
import { Bell, Check, CheckCheck, X, Settings, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Notification {
  id: string;
  type: 'message' | 'assignment' | 'mention' | 'alert' | 'system';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  href?: string;
  icon?: React.ReactNode;
}

export interface NotificationBellProps {
  className?: string;
}

// Mock de notificações (em produção viria da API)
const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'message',
    title: 'Nova mensagem',
    message: 'João Silva enviou uma mensagem',
    timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 min atrás
    read: false,
    href: '/conversations/1',
  },
  {
    id: '2',
    type: 'assignment',
    title: 'Nova conversa atribuída',
    message: 'Você foi atribuído à conversa com Maria Santos',
    timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 min atrás
    read: false,
    href: '/conversations/2',
  },
  {
    id: '3',
    type: 'alert',
    title: 'SLA em risco',
    message: 'Conversa #1234 está próxima do limite de SLA',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2h atrás
    read: true,
    href: '/conversations/1234',
  },
  {
    id: '4',
    type: 'system',
    title: 'Atualização do sistema',
    message: 'Nova versão 2.5.0 disponível',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 dia atrás
    read: true,
  },
];

const notificationTypeColors = {
  message: 'bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-400',
  assignment: 'bg-accent-100 dark:bg-accent-950 text-accent-700 dark:text-accent-400',
  mention: 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-400',
  alert: 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400',
  system: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400',
};

export function NotificationBell({ className = '' }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !buttonRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleMarkAsRead(notificationId: string) {
    setNotifications(prev =>
      prev.map(n => (n.id === notificationId ? { ...n, read: true } : n))
    );
  }

  function handleMarkAllAsRead() {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }

  function handleClearAll() {
    setNotifications([]);
  }

  function formatTimestamp(timestamp: Date): string {
    return formatDistanceToNow(timestamp, {
      addSuffix: true,
      locale: ptBR,
    });
  }

  return (
    <div className={`relative ${className}`}>
      {/* Bell Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="
          relative p-2
          text-gray-600 dark:text-gray-400
          hover:bg-gray-100 dark:hover:bg-dark-bg-tertiary
          rounded-lg transition-colors
        "
        aria-label={`Notificações ${unreadCount > 0 ? `(${unreadCount} não lidas)` : ''}`}
      >
        <Bell className="w-5 h-5" />

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-error"></span>
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="
            absolute top-full right-0 mt-2
            w-96
            bg-white dark:bg-dark-bg-secondary
            border border-gray-200 dark:border-dark-border
            rounded-xl shadow-lg
            max-h-[500px] overflow-hidden
            z-50
            flex flex-col
          "
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-dark-border flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Notificações
              </h3>
              {unreadCount > 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {unreadCount} não {unreadCount === 1 ? 'lida' : 'lidas'}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="p-1.5 text-gray-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                  aria-label="Marcar todas como lidas"
                  title="Marcar todas como lidas"
                >
                  <CheckCheck className="w-4 h-4" />
                </button>
              )}

              <Link
                href="/admin/settings/notifications"
                className="p-1.5 text-gray-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                aria-label="Configurações de notificações"
                title="Configurações"
              >
                <Settings className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <Bell className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Nenhuma notificação
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-dark-border">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`
                      relative px-4 py-3
                      hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary
                      transition-colors
                      ${!notification.read ? 'bg-primary-50/30 dark:bg-primary-950/20' : ''}
                    `}
                  >
                    {/* Unread indicator */}
                    {!notification.read && (
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary-600" />
                    )}

                    {/* Content */}
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div
                        className={`
                          w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
                          ${notificationTypeColors[notification.type]}
                        `}
                      >
                        <Bell className="w-4 h-4" />
                      </div>

                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white mb-0.5">
                          {notification.title}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                          {formatTimestamp(notification.timestamp)}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {notification.href && (
                          <Link
                            href={notification.href}
                            className="p-1 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                            onClick={() => {
                              handleMarkAsRead(notification.id);
                              setIsOpen(false);
                            }}
                            aria-label="Abrir"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        )}

                        {!notification.read && (
                          <button
                            onClick={() => handleMarkAsRead(notification.id)}
                            className="p-1 text-gray-400 hover:text-success dark:hover:text-success transition-colors"
                            aria-label="Marcar como lida"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-200 dark:border-dark-border flex items-center justify-between">
              <button
                onClick={handleClearAll}
                className="text-xs text-gray-500 hover:text-error dark:hover:text-error transition-colors"
              >
                Limpar todas
              </button>

              <Link
                href="/admin/notifications"
                className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium transition-colors"
              >
                Ver todas →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
