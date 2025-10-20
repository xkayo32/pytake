'use client';

import Link from 'next/link';
import {
  Settings,
  Sparkles,
  Building2,
  Bell,
  Shield,
  Palette,
  ArrowRight,
} from 'lucide-react';

interface SettingsCard {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeColor?: string;
}

const settingsCards: SettingsCard[] = [
  {
    title: 'AI Assistant',
    description: 'Configure modelos de IA para respostas automáticas inteligentes',
    href: '/admin/settings/ai-assistant',
    icon: Sparkles,
    badge: 'Novo',
    badgeColor: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  },
  {
    title: 'Organização',
    description: 'Dados da empresa, departamentos, filas e plano',
    href: '/admin/settings/organization',
    icon: Building2,
  },
  {
    title: 'Notificações',
    description: 'Configure alertas e notificações do sistema',
    href: '/admin/settings/notifications',
    icon: Bell,
  },
  {
    title: 'Segurança',
    description: 'Autenticação, permissões e auditoria',
    href: '/admin/settings/security',
    icon: Shield,
  },
  {
    title: 'Aparência',
    description: 'Tema, idioma e personalização da interface',
    href: '/admin/settings/appearance',
    icon: Palette,
  },
];

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Configurações
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Gerencie as configurações da sua organização
        </p>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {settingsCards.map((card) => {
          const Icon = card.icon;

          return (
            <Link
              key={card.href}
              href={card.href}
              className="group relative bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 hover:border-purple-600 dark:hover:border-purple-500 hover:shadow-lg transition-all"
            >
              {/* Badge */}
              {card.badge && (
                <div className="absolute top-4 right-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${card.badgeColor}`}>
                    {card.badge}
                  </span>
                </div>
              )}

              {/* Icon */}
              <div className="mb-4 inline-flex p-3 bg-gray-100 dark:bg-gray-800 rounded-xl group-hover:bg-purple-100 dark:group-hover:bg-purple-900/30 transition-colors">
                <Icon className="w-6 h-6 text-gray-600 dark:text-gray-400 group-hover:text-purple-600 dark:group-hover:text-purple-400" />
              </div>

              {/* Content */}
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                {card.title}
                <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {card.description}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
