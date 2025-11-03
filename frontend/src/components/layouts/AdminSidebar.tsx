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
  ListTodo,
  Key,
  AlertTriangle,
  Building2,
} from 'lucide-react';
import { useUnreadCount } from '@/hooks/useUnreadCount';
import { useAuthStore } from '@/store/authStore';
import { CountBadge } from '@/components/ui';

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
      { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
      { name: 'Conversas', href: '/admin/conversations', icon: MessageSquare, showBadge: true },
      { name: 'SLA & Alertas', href: '/admin/sla-alerts', icon: AlertTriangle },
      { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
    ],
  },
  {
    title: 'Atendimento',
    items: [
      { name: 'Contatos', href: '/admin/contacts', icon: UserPlus },
      { name: 'Chatbots', href: '/admin/chatbots', icon: Bot },
      { name: 'Campanhas', href: '/admin/campaigns', icon: Send },
      { name: 'Filas', href: '/admin/queues', icon: ListTodo },
    ],
  },
  {
    title: 'Gestão',
    items: [
      { name: 'Usuários', href: '/admin/users', icon: Users },
      { name: 'Departamentos', href: '/admin/departments', icon: Building2 },
      { name: 'WhatsApp', href: '/admin/whatsapp', icon: Phone },
      { name: 'Secrets', href: '/admin/secrets', icon: Key },
    ],
  },
  {
    title: 'Configurações',
    items: [
      { name: 'Organização', href: '/admin/settings/organization', icon: Settings },
    ],
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { unreadCount } = useUnreadCount();
  const { user } = useAuthStore();

  const getInitials = (name?: string) => {
    if (!name) return 'AD';
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <aside className="hidden md:flex md:flex-shrink-0">
      <div className="flex flex-col w-64 bg-white dark:bg-dark-bg-primary border-r border-gray-200 dark:border-dark-border">
        {/* Logo Area - Profissional */}
        <div className="px-6 py-5 border-b border-gray-200 dark:border-dark-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-600 to-accent-600 flex items-center justify-center shadow-md">
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="currentColor" opacity="0.5"/>
                <path d="M2 17L12 22L22 17V12L12 17L2 12V17Z" fill="currentColor"/>
                <path d="M12 12V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">PyTake</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Admin Panel</p>
            </div>
          </div>
        </div>

        {/* Navigation - Agrupada */}
        <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto scrollbar-hide">
          {navigationGroups.map((group) => (
            <div key={group.title}>
              <p className="px-3 mb-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {group.title}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const cleanHref = item.href.split('?')[0];
                  const isActive = pathname === cleanHref ||
                                  (cleanHref !== '/admin' && pathname?.startsWith(cleanHref));
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`
                        group flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                        ${isActive
                          ? 'bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-400 shadow-sm'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-bg-tertiary hover:text-gray-900 dark:hover:text-white'
                        }
                      `}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-primary-600 dark:text-primary-400' : ''}`} />
                        <span className="truncate">{item.name}</span>
                      </div>
                      {item.showBadge && unreadCount > 0 && (
                        <CountBadge count={unreadCount} variant="error" className="flex-shrink-0" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer - Info do Usuário */}
        <div className="px-4 py-3 border-t border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-bg-secondary">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center flex-shrink-0 shadow-sm">
              <span className="text-sm font-bold text-white">{getInitials(user?.full_name)}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {user?.full_name || 'Admin'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                Administrador
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
