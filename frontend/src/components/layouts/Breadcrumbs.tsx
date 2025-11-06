'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href: string;
}

export interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
  className?: string;
}

// Mapa de rotas para labels legíveis
const routeLabels: Record<string, string> = {
  admin: 'Admin',
  agent: 'Agente',
  chatbots: 'Chatbots',
  builder: 'Builder',
  conversations: 'Conversas',
  contacts: 'Contatos',
  departments: 'Departamentos',
  queues: 'Filas',
  templates: 'Templates',
  reports: 'Relatórios',
  settings: 'Configurações',
  organization: 'Organização',
  users: 'Usuários',
  agents: 'Agentes',
  integrations: 'Integrações',
  'api-keys': 'API Keys',
  webhooks: 'Webhooks',
  secrets: 'Secrets',
  'flow-automations': 'Automações',
  'sla-alerts': 'Alertas SLA',
  dashboard: 'Dashboard',
  inbox: 'Caixa de Entrada',
  history: 'Histórico',
  profile: 'Perfil',
  preferences: 'Preferências',
  new: 'Novo',
};

// Função para gerar breadcrumbs automaticamente a partir da URL
function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbs: BreadcrumbItem[] = [];

  let accumulatedPath = '';
  segments.forEach((segment, index) => {
    // Pula IDs (UUIDs ou números)
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment) || /^\d+$/.test(segment)) {
      accumulatedPath += `/${segment}`;
      return;
    }

    accumulatedPath += `/${segment}`;
    const label = routeLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);

    breadcrumbs.push({
      label,
      href: accumulatedPath,
    });
  });

  return breadcrumbs;
}

export function Breadcrumbs({ items, className = '' }: BreadcrumbsProps) {
  const pathname = usePathname();
  const breadcrumbs = items || generateBreadcrumbs(pathname);

  // Se estiver na home, não mostra breadcrumbs
  if (breadcrumbs.length === 0) {
    return null;
  }

  return (
    <nav className={`flex items-center gap-2 text-sm ${className}`} aria-label="Breadcrumb">
      {/* Home Link */}
      <Link
        href="/"
        className="text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
        aria-label="Ir para home"
      >
        <Home className="w-4 h-4" />
      </Link>

      {breadcrumbs.map((item, index) => {
        const isLast = index === breadcrumbs.length - 1;

        return (
          <div key={item.href} className="flex items-center gap-2">
            <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-600" />

            {isLast ? (
              <span
                className="text-gray-900 dark:text-white font-medium truncate max-w-[200px]"
                aria-current="page"
              >
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors truncate max-w-[150px]"
              >
                {item.label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
