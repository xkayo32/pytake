'use client';

import { RoleGuard } from '@/lib/auth/roleGuard';
import { AdminSidebar } from '@/components/layouts/AdminSidebar';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Bell, LogOut } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <RoleGuard allowedRoles={['org_admin', 'super_admin']} fallbackPath="/agent">
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="flex h-screen overflow-hidden">
          {/* Sidebar */}
          <AdminSidebar />

          {/* Main Content */}
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Header */}
            <header className="bg-white dark:bg-gray-800 shadow-sm dark:border-b dark:border-gray-700 z-10">
              <div className="flex items-center justify-between px-6 py-4">
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Painel Administrativo
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Bem-vindo, {user?.full_name}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  {/* Notifications */}
                  <button className="relative p-2 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                    <Bell className="h-5 w-5" />
                    <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-gray-800" />
                  </button>

                  {/* Theme Toggle */}
                  <ThemeToggle />

                  {/* Logout */}
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
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
