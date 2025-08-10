import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home as HomeIcon,
  MessageSquare as ChatBubbleLeftRightIcon,
  BarChart as ChartBarIcon,
  Users as UsersIcon,
  Settings as Cog6ToothIcon,
  FileText as DocumentTextIcon,
  Megaphone as MegaphoneIcon,
  Menu as Bars3Icon,
  X as XMarkIcon,
} from 'lucide-react';
import { useAuth } from '../../stores/authStore';
import { ROUTES, APP_NAME } from '../../utils/constants';

interface SidebarProps {
  open: boolean;
  collapsed: boolean;
  onClose: () => void;
  onToggleCollapse: () => void;
}

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string;
  role?: 'admin' | 'supervisor' | 'agent';
  badge?: string | number;
}

const Sidebar: React.FC<SidebarProps> = ({
  open,
  collapsed,
  onClose,
  onToggleCollapse,
}) => {
  const location = useLocation();
  const { user, hasPermission, hasRole } = useAuth();

  const navigation: NavigationItem[] = [
    {
      name: 'Dashboard',
      href: ROUTES.DASHBOARD,
      icon: HomeIcon,
      permission: 'view_dashboard',
    },
    {
      name: 'Agent Workspace',
      href: ROUTES.AGENT_WORKSPACE,
      icon: ChatBubbleLeftRightIcon,
      permission: 'access_agent_workspace',
      badge: 5, // This would come from conversation store
    },
    {
      name: 'Reports',
      href: ROUTES.REPORTS,
      icon: ChartBarIcon,
      permission: 'view_reports',
      role: 'supervisor',
    },
    {
      name: 'Flow Builder',
      href: ROUTES.FLOWS,
      icon: DocumentTextIcon,
      role: 'supervisor',
    },
    {
      name: 'Campaigns',
      href: ROUTES.CAMPAIGNS,
      icon: MegaphoneIcon,
      role: 'supervisor',
    },
    {
      name: 'Users',
      href: ROUTES.USERS,
      icon: UsersIcon,
      permission: 'manage_users',
      role: 'admin',
    },
    {
      name: 'Settings',
      href: ROUTES.SETTINGS,
      icon: Cog6ToothIcon,
    },
  ];

  // Filter navigation items based on permissions
  const allowedNavigation = navigation.filter((item) => {
    if (item.permission && !hasPermission(item.permission)) {
      return false;
    }
    if (item.role && !hasRole(item.role)) {
      return false;
    }
    return true;
  });

  const sidebarClasses = `
    ${collapsed ? 'w-16' : 'w-64'} 
    transition-all duration-300 ease-in-out
    bg-white border-r border-gray-200 
    flex flex-col h-full
  `;

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <>
      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.div
        initial={false}
        animate={{ x: open ? 0 : '-100%' }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className={`
          fixed inset-y-0 left-0 z-50 ${sidebarClasses}
          lg:relative lg:translate-x-0 lg:z-auto
        `}
      >
        {/* Sidebar header */}
        <div className={`flex items-center justify-between px-4 py-4 border-b border-gray-200 ${collapsed ? 'px-2' : ''}`}>
          <div className="flex items-center">
            {!collapsed && (
              <div className="flex items-center">
                <div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center mr-3">
                  <svg
                    className="h-5 w-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{APP_NAME}</h2>
                  <p className="text-xs text-gray-500">Business Platform</p>
                </div>
              </div>
            )}
            {collapsed && (
              <div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <svg
                  className="h-5 w-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
            )}
          </div>

          {/* Mobile close button and desktop collapse button */}
          <div className="flex items-center space-x-2">
            <button
              onClick={onToggleCollapse}
              className="hidden lg:block p-1 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <Bars3Icon className="h-5 w-5" />
            </button>

            <button
              onClick={onClose}
              className="lg:hidden p-1 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {allowedNavigation.map((item) => {
            const active = isActive(item.href);
            
            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={`
                  group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors
                  ${active 
                    ? 'bg-indigo-100 text-indigo-900 border-r-2 border-indigo-600' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }
                  ${collapsed ? 'justify-center' : ''}
                `}
                title={collapsed ? item.name : undefined}
              >
                <item.icon
                  className={`
                    flex-shrink-0 h-5 w-5
                    ${active ? 'text-indigo-500' : 'text-gray-400 group-hover:text-gray-500'}
                    ${collapsed ? '' : 'mr-3'}
                  `}
                />
                {!collapsed && (
                  <>
                    <span className="flex-1">{item.name}</span>
                    {item.badge && (
                      <span className="ml-auto inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* User info at bottom */}
        <div className="border-t border-gray-200 p-4">
          <div className={`flex items-center ${collapsed ? 'justify-center' : ''}`}>
            <div className="h-8 w-8 rounded-full bg-indigo-500 flex items-center justify-center">
              <span className="text-sm font-medium text-white">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
            {!collapsed && (
              <div className="ml-3 flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 truncate">
                  {user?.name || 'Unknown User'}
                </p>
                <p className="text-xs text-gray-500 capitalize">
                  {user?.role || 'user'}
                </p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
};

export default Sidebar;