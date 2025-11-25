'use client';

import { RoleGuard } from '@/lib/auth/roleGuard';
import { AgentSidebar } from '@/components/layouts/AgentSidebar';
import { MobileSidebar } from '@/components/layouts/MobileSidebar';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Bell, LogOut, Circle, Menu } from 'lucide-react';
import { useState } from 'react';

type AgentStatus = 'available' | 'busy' | 'away' | 'offline';

export default function AgentLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [agentStatus, setAgentStatus] = useState<AgentStatus>('available');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const statusColors = {
    available: 'bg-green-500',
    busy: 'bg-red-500',
    away: 'bg-yellow-500',
    offline: 'bg-gray-500',
  };

  const statusLabels = {
    available: 'Disponível',
    busy: 'Ocupado',
    away: 'Ausente',
    offline: 'Offline',
  };

  return (
    <RoleGuard allowedRoles={['agent', 'viewer']} fallbackPath="/admin">
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="flex h-screen overflow-hidden">
          {/* Sidebar - Desktop */}
          <div className="hidden md:block">
            <AgentSidebar />
          </div>

          {/* Mobile Sidebar with smooth animations */}
          <MobileSidebar
            isOpen={mobileMenuOpen}
            onClose={() => setMobileMenuOpen(false)}
            side="left"
          >
            <AgentSidebar />
          </MobileSidebar>

          {/* Main Content */}
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Header */}
            <header className="bg-white dark:bg-gray-800 shadow-sm dark:border-b dark:border-gray-700 z-10">
              <div className="flex items-center justify-between px-4 md:px-6 py-4">
                <div className="flex items-center gap-3 flex-1">
                  {/* Mobile Menu Button */}
                  <button
                    onClick={() => setMobileMenuOpen(true)}
                    className="md:hidden p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    aria-label="Abrir menu"
                  >
                    <Menu className="w-5 h-5" />
                  </button>

                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Central de Atendimento
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 hidden sm:block">
                      Olá, {user?.full_name}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 md:gap-4">
                  {/* Agent Status Selector */}
                  <div className="relative hidden sm:block">
                    <select
                      value={agentStatus}
                      onChange={(e) => setAgentStatus(e.target.value as AgentStatus)}
                      className="appearance-none pl-8 pr-10 py-2 text-sm font-medium bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 dark:text-white cursor-pointer"
                    >
                      <option value="available">Disponível</option>
                      <option value="busy">Ocupado</option>
                      <option value="away">Ausente</option>
                      <option value="offline">Offline</option>
                    </select>
                    <Circle
                      className={`absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 ${statusColors[agentStatus]} rounded-full`}
                      fill="currentColor"
                    />
                  </div>

                  {/* Mobile Status Indicator */}
                  <div className="sm:hidden p-2 rounded-lg bg-gray-100 dark:bg-gray-700">
                    <Circle
                      className={`h-4 w-4 ${statusColors[agentStatus]} rounded-full`}
                      fill="currentColor"
                    />
                  </div>

                  {/* Notifications */}
                  <button className="relative p-2 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                    <Bell className="h-5 w-5" />
                    <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-gray-800" />
                  </button>

                  {/* Theme Toggle */}
                  <div className="hidden sm:block">
                    <ThemeToggle />
                  </div>

                  {/* Logout */}
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-3 md:px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="hidden md:inline">Sair</span>
                  </button>
                </div>
              </div>
            </header>

            {/* Page Content */}
            <main className="flex-1 overflow-y-auto">
              <div className="px-4 md:px-6 py-6 md:py-8">
                {children}
              </div>
            </main>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}
