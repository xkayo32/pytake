'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, User, Settings, LogOut, HelpCircle, Shield } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface UserInfo {
  name: string;
  email: string;
  role: string;
  avatar?: string;
  initials: string;
}

export interface UserMenuProps {
  user?: UserInfo;
  className?: string;
  onLogout?: () => void;
}

// Mock de usuário (em produção viria do contexto/API)
const mockUser: UserInfo = {
  name: 'Admin User',
  email: 'admin@pytake.com',
  role: 'Administrador',
  initials: 'AU',
};

export function UserMenu({ user = mockUser, className = '', onLogout }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !buttonRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleLogout() {
    if (onLogout) {
      onLogout();
    } else {
      // Logout padrão
      try {
        const response = await fetch('/api/v1/auth/logout', {
          method: 'POST',
          credentials: 'include',
        });

        if (response.ok) {
          router.push('/login');
        }
      } catch (error) {
        console.error('Erro ao fazer logout:', error);
      }
    }
    setIsOpen(false);
  }

  return (
    <div className={`relative ${className}`}>
      {/* User Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="
          flex items-center gap-2 px-3 py-2
          rounded-lg
          hover:bg-gray-100 dark:hover:bg-dark-bg-tertiary
          transition-colors
        "
        aria-label="Menu do usuário"
        aria-expanded={isOpen}
      >
        {/* Avatar */}
        {user.avatar ? (
          <img
            src={user.avatar}
            alt={user.name}
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
            <span className="text-sm font-bold text-white">{user.initials}</span>
          </div>
        )}

        {/* User info (hidden on mobile) */}
        <div className="hidden md:block text-left">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[120px]">
            {user.name}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[120px]">
            {user.role}
          </p>
        </div>

        <ChevronDown
          className={`
            w-4 h-4 text-gray-500 dark:text-gray-400
            transition-transform
            ${isOpen ? 'rotate-180' : ''}
          `}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="
            absolute top-full right-0 mt-2
            w-64
            bg-white dark:bg-dark-bg-secondary
            border border-gray-200 dark:border-dark-border
            rounded-xl shadow-lg
            overflow-hidden
            z-50
          "
        >
          {/* User Info Header */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-dark-border">
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {user.name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {user.email}
            </p>
            <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-400 text-xs font-medium">
              {user.role}
            </span>
          </div>

          {/* Menu Items */}
          <div className="py-2">
            <Link
              href="/admin/profile"
              onClick={() => setIsOpen(false)}
              className="
                flex items-center gap-3 px-4 py-2
                text-sm text-gray-700 dark:text-gray-300
                hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary
                transition-colors
              "
            >
              <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span>Meu Perfil</span>
            </Link>

            <Link
              href="/admin/settings"
              onClick={() => setIsOpen(false)}
              className="
                flex items-center gap-3 px-4 py-2
                text-sm text-gray-700 dark:text-gray-300
                hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary
                transition-colors
              "
            >
              <Settings className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span>Configurações</span>
            </Link>

            <Link
              href="/admin/help"
              onClick={() => setIsOpen(false)}
              className="
                flex items-center gap-3 px-4 py-2
                text-sm text-gray-700 dark:text-gray-300
                hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary
                transition-colors
              "
            >
              <HelpCircle className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span>Central de Ajuda</span>
            </Link>

            <Link
              href="/admin/security"
              onClick={() => setIsOpen(false)}
              className="
                flex items-center gap-3 px-4 py-2
                text-sm text-gray-700 dark:text-gray-300
                hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary
                transition-colors
              "
            >
              <Shield className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span>Segurança</span>
            </Link>
          </div>

          {/* Logout */}
          <div className="py-2 border-t border-gray-200 dark:border-dark-border">
            <button
              onClick={handleLogout}
              className="
                flex items-center gap-3 px-4 py-2 w-full
                text-sm text-error
                hover:bg-error-light dark:hover:bg-red-950
                transition-colors
              "
            >
              <LogOut className="w-4 h-4" />
              <span>Sair</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
