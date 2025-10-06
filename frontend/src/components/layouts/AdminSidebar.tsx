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
  Layers
} from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Conversas', href: '/admin/conversations', icon: MessageSquare },
  { name: 'Contatos', href: '/admin/contacts', icon: UserPlus },
  { name: 'Chatbots', href: '/admin/chatbots', icon: Bot },
  { name: 'Campanhas', href: '/admin/campaigns', icon: Send },
  { name: 'Usuários', href: '/admin/users', icon: Users },
  { name: 'Filas', href: '/admin/queues', icon: Layers },
  { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  { name: 'WhatsApp', href: '/admin/whatsapp', icon: Phone },
  { name: 'Configurações', href: '/admin/settings', icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:flex-shrink-0">
      <div className="flex flex-col w-64">
        <div className="flex flex-col flex-grow bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 pt-5 pb-4 overflow-y-auto">
          {/* Logo */}
          <div className="flex items-center flex-shrink-0 px-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">P</span>
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">PyTake</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="mt-8 flex-1 px-2 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href ||
                              (item.href !== '/admin' && pathname?.startsWith(item.href));
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors
                    ${isActive
                      ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }
                  `}
                >
                  <Icon
                    className={`
                      mr-3 flex-shrink-0 h-5 w-5
                      ${isActive
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-500 dark:group-hover:text-gray-400'
                      }
                    `}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User Role Badge */}
          <div className="flex-shrink-0 px-4 py-3 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-center">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300">
                Administrador
              </span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
