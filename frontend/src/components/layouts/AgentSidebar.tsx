'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  MessageSquare,
  Inbox,
  Clock,
  CheckCircle,
  ListTodo,
  User,
  Settings,
} from 'lucide-react';
import { useUnreadCount } from '@/hooks/useUnreadCount';
import { useAuthStore } from '@/store/authStore';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  showBadge?: boolean;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navigationGroups: NavGroup[] = [
  {
    title: 'Principal',
    items: [
      { name: 'Dashboard', href: '/agent', icon: LayoutDashboard },
      { name: 'Caixa de Entrada', href: '/agent/inbox', icon: Inbox, showBadge: true },
    ],
  },
  {
    title: 'Atendimento',
    items: [
      { name: 'Conversas Ativas', href: '/agent/conversations', icon: MessageSquare },
      { name: 'Fila', href: '/agent/queue', icon: ListTodo },
      { name: 'Histórico', href: '/agent/history', icon: Clock },
      { name: 'Concluídos', href: '/agent/completed', icon: CheckCircle },
    ],
  },
  {
    title: 'Configurações',
    items: [
      { name: 'Perfil', href: '/agent/profile', icon: User },
      { name: 'Preferências', href: '/agent/preferences', icon: Settings },
    ],
  },
];

export function AgentSidebar() {
  const pathname = usePathname();
  const { unreadCount } = useUnreadCount();
  const { user } = useAuthStore();

  const getInitials = (name?: string) => {
    if (!name) return 'AG';
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <aside className="hidden md:flex md:flex-shrink-0">
      <div className="flex flex-col w-64">
        <div className="flex flex-col flex-grow bg-white dark:bg-dark-bg-primary border-r border-gray-200 dark:border-dark-border pt-4 pb-4 overflow-y-auto">
          {/* Logo - Profissional com gradiente */}
          <div className="flex items-center flex-shrink-0 px-6 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-600 to-accent-600 flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-lg">PT</span>
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">PyTake</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Agent Portal</div>
              </div>
            </div>
          </div>

          {/* Navigation - Agrupada por seções */}
          <nav className="flex-1 px-3 space-y-6">
            {navigationGroups.map((group) => (
              <div key={group.title}>
                <p className="px-3 mb-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {group.title}
                </p>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const cleanHref = item.href.split('?')[0];
                    const isActive =
                      pathname === cleanHref ||
                      (cleanHref !== '/agent' && pathname?.startsWith(cleanHref));
                    const Icon = item.icon;

                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                          isActive
                            ? 'bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300 shadow-sm'
                            : 'text-gray-700 dark:text-dark-text-primary hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="font-medium text-sm truncate">{item.name}</span>
                        {item.showBadge && unreadCount > 0 && (
                          <span className="ml-auto inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold text-white bg-error rounded-full">
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Footer - Agent Info */}
          <div className="px-4 py-3 border-t border-gray-100 dark:border-dark-border">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                <span className="text-sm font-bold text-white">{getInitials(user?.full_name)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {user?.full_name || 'Agente'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">Atendimento</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
