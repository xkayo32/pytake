import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../hooks/useTheme';
import Sidebar from './Sidebar';
import Header from './Header';

interface LayoutProps {
  children: React.ReactNode;
  currentPath?: string;
}

const Layout: React.FC<LayoutProps> = ({ children, currentPath = '/dashboard' }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeItem, setActiveItem] = useState(currentPath);
  const { actualTheme } = useTheme();

  // Handle responsive behavior
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarCollapsed(true);
      } else if (window.innerWidth > 1024) {
        setSidebarCollapsed(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleToggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const handleItemSelect = (path: string) => {
    setActiveItem(path);
    // Here you would typically handle routing
    console.log('Navigate to:', path);
    
    // On mobile, collapse sidebar after selection
    if (window.innerWidth < 768) {
      setSidebarCollapsed(true);
    }
  };

  const contentVariants = {
    collapsed: {
      marginLeft: 80,
      transition: { type: "spring", stiffness: 300, damping: 30 }
    },
    expanded: {
      marginLeft: 280,
      transition: { type: "spring", stiffness: 300, damping: 30 }
    }
  };

  const overlayVariants = {
    visible: { opacity: 1, pointerEvents: 'auto' as const },
    hidden: { opacity: 0, pointerEvents: 'none' as const }
  };

  return (
    <div className={`min-h-screen ${actualTheme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Sidebar */}
      <Sidebar
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
        activeItem={activeItem}
        onItemSelect={handleItemSelect}
      />

      {/* Mobile Overlay */}
      <AnimatePresence>
        {!sidebarCollapsed && window.innerWidth < 768 && (
          <motion.div
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            onClick={handleToggleSidebar}
            className="fixed inset-0 bg-black/50 z-30 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Main Content */}
      <motion.div
        variants={contentVariants}
        animate={sidebarCollapsed ? "collapsed" : "expanded"}
        className="min-h-screen flex flex-col"
      >
        {/* Header */}
        <Header
          onToggleSidebar={handleToggleSidebar}
          sidebarCollapsed={sidebarCollapsed}
        />

        {/* Main Content Area */}
        <main className="flex-1 pt-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="p-6"
          >
            {children}
          </motion.div>
        </main>

        {/* Real-time Notifications Area */}
        <motion.div
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          className="fixed bottom-4 right-4 z-50"
        >
          <RealtimeNotifications />
        </motion.div>
      </motion.div>
    </div>
  );
};

// Real-time notifications component
const RealtimeNotifications: React.FC = () => {
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
    timestamp: number;
  }>>([]);
  const { actualTheme } = useTheme();

  useEffect(() => {
    // Simulate real-time notifications
    const interval = setInterval(() => {
      const messages = [
        'Nova mensagem recebida de João Santos',
        'Campanha "Promoção" foi enviada com sucesso',
        'Conexão WebSocket estabelecida',
        '5 novas conversas iniciadas',
        'Backup do sistema concluído'
      ];

      const types: Array<'success' | 'info' | 'warning'> = ['success', 'info', 'warning'];
      const randomMessage = messages[Math.floor(Math.random() * messages.length)];
      const randomType = types[Math.floor(Math.random() * types.length)];

      const newNotification = {
        id: Date.now().toString(),
        message: randomMessage,
        type: randomType,
        timestamp: Date.now()
      };

      setNotifications(prev => [newNotification, ...prev.slice(0, 4)]);

      // Auto remove after 5 seconds
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== newNotification.id));
      }, 5000);
    }, 10000); // Show new notification every 10 seconds

    return () => clearInterval(interval);
  }, []);

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      case 'warning':
        return 'bg-yellow-500';
      default:
        return 'bg-blue-500';
    }
  };

  return (
    <div className="space-y-2">
      <AnimatePresence>
        {notifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            className={`
              max-w-sm p-4 rounded-lg shadow-lg border
              ${actualTheme === 'dark'
                ? 'bg-gray-800 border-gray-700 text-white'
                : 'bg-white border-gray-200 text-gray-900'
              }
            `}
          >
            <div className="flex items-start space-x-3">
              <div className={`w-2 h-2 rounded-full mt-2 ${getNotificationColor(notification.type)}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{notification.message}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {new Date(notification.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default Layout;