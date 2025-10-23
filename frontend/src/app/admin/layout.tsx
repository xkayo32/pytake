'use client';

import { RoleGuard } from '@/lib/auth/roleGuard';
import { AdminSidebar } from '@/components/layouts/AdminSidebar';
import { useAuthStore } from '@/store/authStore';
import { useRouter, usePathname } from 'next/navigation';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Bell, LogOut, MessageSquare, Users as UsersIcon, UserCircle, Bot, Send, BarChart3, ListTodo, PhoneCall, Settings, LayoutDashboard, AlertTriangle, Building2 } from 'lucide-react';
import { useMemo } from 'react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  // Map routes to page info
  const pageInfo = useMemo(() => {
  const routes: Record<string, { title: string; description: string; icon: any; badge?: { text: string; variant: 'green' | 'blue' | 'indigo' | 'purple' | 'yellow' | 'red' } }> = {
      '/admin': { title: 'Dashboard', description: 'Visão geral das métricas da sua organização', icon: LayoutDashboard, badge: { text: 'Ao Vivo', variant: 'green' } },
      '/admin/conversations': { title: 'Conversas', description: 'Gerencie todas as conversas com clientes', icon: MessageSquare, badge: { text: 'Tempo Real', variant: 'green' } },
      '/admin/contacts': { title: 'Contatos', description: 'Gerencie todos os contatos da organização', icon: UserCircle },
      '/admin/users': { title: 'Usuários & Agentes', description: 'Gerencie os membros da sua equipe', icon: UsersIcon },
      '/admin/chatbots': { title: 'Chatbots', description: 'Configure fluxos automatizados', icon: Bot },
      '/admin/campaigns': { title: 'Campanhas', description: 'Crie e gerencie campanhas de mensagens', icon: Send },
  '/admin/analytics': { title: 'Analytics', description: 'Análise de métricas e relatórios', icon: BarChart3 },
  '/admin/sla-alerts': { title: 'Alertas de SLA', description: 'Conversas críticas e próximas do SLA', icon: AlertTriangle, badge: { text: 'Monitoramento', variant: 'red' } },
      '/admin/queues': { title: 'Filas', description: 'Gerencie filas de atendimento', icon: ListTodo },
      '/admin/whatsapp': { title: 'WhatsApp', description: 'Configure números WhatsApp', icon: PhoneCall },
  '/admin/settings': { title: 'Configurações', description: 'Configurações da organização', icon: Settings },
  // Subpáginas de Configurações (mapeadas explicitamente para evitar título genérico "Configurações")
  '/admin/settings/organization': { title: 'Organização', description: 'Departamentos e filas da organização', icon: Building2 },
  '/admin/settings/notifications': { title: 'Notificações', description: 'Alertas e notificações do sistema', icon: Settings },
  '/admin/settings/security': { title: 'Segurança', description: 'Autenticação, permissões e auditoria', icon: Settings },
  '/admin/settings/appearance': { title: 'Aparência', description: 'Tema, idioma e personalização', icon: Settings },
      '/admin/settings/ai-assistant': { title: 'AI Assistant', description: 'Configure modelos de IA para respostas automáticas', icon: Settings, badge: { text: 'Novo', variant: 'purple' } },
    };

    // Try exact match first
    if (routes[pathname]) {
      return routes[pathname];
    }

    // Try base path match (for detail pages)
    const basePath = '/' + pathname.split('/').slice(1, 3).join('/');
    if (routes[basePath]) {
      return routes[basePath];
    }

    // Default
    return { title: 'Painel Administrativo', description: `Bem-vindo, ${user?.full_name}`, icon: LayoutDashboard };
  }, [pathname, user]);

  return (
    <RoleGuard allowedRoles={['admin', 'org_admin', 'super_admin']} fallbackPath="/agent">
      <div className="min-h-screen bg-gray-50 dark:bg-black">
        <div className="flex h-screen overflow-hidden">
          {/* Sidebar */}
          <AdminSidebar />

          {/* Main Content */}
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Header - Dark/Modern Theme */}
            <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 z-10">
              <div className="flex items-center justify-between px-6 py-3">
                <div className="flex items-center gap-3 flex-1">
                  {/* Page Icon - Minimal */}
                  <pageInfo.icon className="w-5 h-5 text-gray-600 dark:text-gray-400" />

                  {/* Page Title & Badge */}
                  <div className="flex items-center gap-2 flex-1">
                    <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {pageInfo.title}
                    </h1>
                    {pageInfo.badge && (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                        {pageInfo.badge.text}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Notifications */}
                  <button className="relative p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                    <Bell className="h-5 w-5" />
                    <span className="absolute top-1.5 right-1.5 block h-2 w-2 rounded-full bg-red-500" />
                  </button>

                  {/* Theme Toggle */}
                  <ThemeToggle />

                  {/* Logout */}
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Sair
                  </button>
                </div>
              </div>
            </header>

            {/* Page Content */}
            <main className="flex-1 overflow-y-auto">
              <div className="px-6 py-8">
                {children}
              </div>
            </main>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}
