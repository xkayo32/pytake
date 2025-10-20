'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Bot,
  MessageSquare,
  Send,
  BarChart3,
  Settings,
  Phone,
  UserPlus,
  Layers,
  ListTodo,
  Key
} from 'lucide-react';
import { useUnreadCount } from '@/hooks/useUnreadCount';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  showBadge?: boolean;
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Conversas', href: '/admin/conversations', icon: MessageSquare, showBadge: true },
  { name: 'Contatos', href: '/admin/contacts', icon: UserPlus },
  { name: 'Chatbots', href: '/admin/chatbots', icon: Bot },
  { name: 'Campanhas', href: '/admin/campaigns', icon: Send },
  { name: 'Usuários', href: '/admin/users', icon: Users },
  { name: 'Departamentos', href: '/admin/departments', icon: Users },
  { name: 'Filas', href: '/admin/queues', icon: ListTodo },
  { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  { name: 'WhatsApp', href: '/admin/whatsapp', icon: Phone },
  { name: 'Secrets', href: '/admin/secrets', icon: Key },
  { name: 'Configurações', href: '/admin/settings', icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { unreadCount } = useUnreadCount();

  return (
    <aside className="hidden md:flex md:flex-shrink-0">
      <div className="flex flex-col w-64">
        <div className="flex flex-col flex-grow bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 pt-5 pb-4 overflow-y-auto">
          {/* Logo - Minimal */}
          <div className="flex items-center flex-shrink-0 px-4 mb-8">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gray-900 dark:bg-white rounded-lg flex items-center justify-center">
                <span className="text-white dark:text-gray-900 font-bold text-lg">P</span>
              </div>
              <span className="text-xl font-semibold text-gray-900 dark:text-white">PyTake</span>
            </div>
          </div>

          {/* Navigation - Flat Style */}
          <nav className="flex-1 px-3 space-y-0.5">
            {navigation.map((item) => {
              const isActive = pathname === item.href ||
                              (item.href !== '/admin' && pathname?.startsWith(item.href));
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    group flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors
                    ${isActive
                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-white'
                    }
                  `}
                >
                  <div className="flex items-center">
                    <Icon className="mr-3 flex-shrink-0 h-4 w-4" />
                    {item.name}
                  </div>
                  {item.showBadge && unreadCount > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold text-white bg-red-500 rounded-full">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User Role Badge - Minimal */}
          <div className="flex-shrink-0 px-4 py-3 border-t border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-center">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Administrador
              </span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
