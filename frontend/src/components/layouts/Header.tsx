'use client';

import { Menu } from 'lucide-react';
import { Breadcrumbs, type BreadcrumbsProps } from './Breadcrumbs';
import { SearchBar, type SearchBarProps } from './SearchBar';
import { NotificationBell } from './NotificationBell';
import { UserMenu, type UserMenuProps } from './UserMenu';

export interface HeaderProps {
  title?: string;
  showBreadcrumbs?: boolean;
  breadcrumbs?: BreadcrumbsProps['items'];
  showSearch?: boolean;
  searchPlaceholder?: SearchBarProps['placeholder'];
  onSearch?: SearchBarProps['onSearch'];
  user?: UserMenuProps['user'];
  onLogout?: UserMenuProps['onLogout'];
  onMenuClick?: () => void; // Para mobile sidebar toggle
  className?: string;
}

export function Header({
  title,
  showBreadcrumbs = true,
  breadcrumbs,
  showSearch = true,
  searchPlaceholder,
  onSearch,
  user,
  onLogout,
  onMenuClick,
  className = '',
}: HeaderProps) {
  return (
    <header
      className={`
        sticky top-0 z-30
        bg-white dark:bg-dark-bg-primary
        border-b border-gray-200 dark:border-dark-border
        backdrop-blur-sm bg-opacity-90 dark:bg-opacity-90
        ${className}
      `}
    >
      <div className="px-4 md:px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Left Section: Mobile Menu + Breadcrumbs/Title */}
          <div className="flex items-center gap-4 flex-1 min-w-0">
            {/* Mobile Menu Button */}
            {onMenuClick && (
              <button
                onClick={onMenuClick}
                className="
                  md:hidden p-2
                  text-gray-600 dark:text-gray-400
                  hover:bg-gray-100 dark:hover:bg-dark-bg-tertiary
                  rounded-lg transition-colors
                "
                aria-label="Abrir menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}

            {/* Breadcrumbs or Title */}
            <div className="flex-1 min-w-0">
              {showBreadcrumbs && <Breadcrumbs items={breadcrumbs} />}
              {title && !showBreadcrumbs && (
                <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate">
                  {title}
                </h1>
              )}
            </div>
          </div>

          {/* Right Section: Search + Notifications + User Menu */}
          <div className="flex items-center gap-2 md:gap-3">
            {/* Search Bar (hidden on small mobile) */}
            {showSearch && (
              <SearchBar
                placeholder={searchPlaceholder}
                onSearch={onSearch}
                className="hidden sm:block w-64 lg:w-80"
              />
            )}

            {/* Notifications */}
            <NotificationBell />

            {/* User Menu */}
            <UserMenu user={user} onLogout={onLogout} />
          </div>
        </div>

        {/* Mobile Search (full width below header) */}
        {showSearch && (
          <div className="sm:hidden mt-3">
            <SearchBar placeholder={searchPlaceholder} onSearch={onSearch} />
          </div>
        )}
      </div>
    </header>
  );
}
