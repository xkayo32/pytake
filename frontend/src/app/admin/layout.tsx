'use client';

import { RoleGuard } from '@/lib/auth/roleGuard';
import { AdminSidebar } from '@/components/layouts/AdminSidebar';
import { Header } from '@/components/layouts/Header';
import { MobileSidebar } from '@/components/layouts/MobileSidebar';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  // Formata os dados do usuário para o Header
  const userInfo = user ? {
    name: user.full_name || user.email,
    email: user.email,
    role: user.role === 'org_admin' ? 'Administrador' :
          user.role === 'super_admin' ? 'Super Admin' : 'Admin',
    initials: (user.full_name || user.email)
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2),
  } : undefined;

  return (
    <RoleGuard allowedRoles={['admin', 'org_admin', 'super_admin']} fallbackPath="/agent">
      <div className="min-h-screen bg-gray-50 dark:bg-black">
        <div className="flex h-screen overflow-hidden">
          {/* Sidebar - Desktop */}
          <div className="hidden md:block">
            <AdminSidebar />
          </div>

          {/* Mobile Sidebar with smooth animations */}
          <MobileSidebar
            isOpen={mobileMenuOpen}
            onClose={() => setMobileMenuOpen(false)}
            side="left"
          >
            <AdminSidebar />
          </MobileSidebar>

          {/* Main Content */}
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* New Header with Breadcrumbs, Search, Notifications */}
            <Header
              showBreadcrumbs={true}
              showSearch={true}
              searchPlaceholder="Buscar conversas, contatos, chatbots..."
              user={userInfo}
              onLogout={handleLogout}
              onMenuClick={() => setMobileMenuOpen(true)}
            />

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
