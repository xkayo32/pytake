'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  MessageSquare,
  Inbox,
  Clock,
  CheckCircle,
  BarChart2,
  User
} from 'lucide-react';
import { useUnreadCount } from '@/hooks/useUnreadCount';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  showUnreadBadge?: boolean;
}

export function AgentSidebar() {
  const pathname = usePathname();
  const { unreadCount } = useUnreadCount();

  const navigation: NavItem[] = [
    { name: 'Dashboard', href: '/agent', icon: BarChart2 },
    { name: 'Fila de Atendimento', href: '/agent/queue', icon: Inbox },
    { name: 'Conversas Ativas', href: '/agent/conversations', icon: MessageSquare, showUnreadBadge: true },
    { name: 'Histórico', href: '/agent/history', icon: Clock },
    { name: 'Atendimentos Concluídos', href: '/agent/completed', icon: CheckCircle },
    { name: 'Meu Perfil', href: '/agent/profile', icon: User },
  ];

  return (
    <aside className="hidden md:flex md:flex-shrink-0">
      <div className="flex flex-col w-64">
        <div className="flex flex-col flex-grow bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 pt-5 pb-4 overflow-y-auto">
          {/* Logo */}
          <div className="flex items-center flex-shrink-0 px-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">P</span>
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">PyTake</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="mt-8 flex-1 px-2 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href ||
                              (item.href !== '/agent' && pathname?.startsWith(item.href));
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    group flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-lg transition-colors
                    ${isActive
                      ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }
                  `}
                >
                  <div className="flex items-center">
                    <Icon
                      className={`
                        mr-3 flex-shrink-0 h-5 w-5
                        ${isActive
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-500 dark:group-hover:text-gray-400'
                        }
                      `}
                    />
                    {item.name}
                  </div>
                  {(item.badge !== undefined && item.badge > 0) || (item.showUnreadBadge && unreadCount > 0) ? (
                    <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                      {item.showUnreadBadge ? (unreadCount > 99 ? '99+' : unreadCount) : item.badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>

          {/* User Role Badge */}
          <div className="flex-shrink-0 px-4 py-3 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-center">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                Agente de Atendimento
              </span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
