// PyTake Design System - Main Export File

// Theme and Hooks
export { useTheme, ThemeProvider } from './hooks/useTheme';
export { default as theme } from './styles/theme';

// Icons
export * from './components/icons';
export { PyTakeLogo } from './components/icons/PyTakeLogo';

// Layout Components
export { default as Layout } from './components/layout/Layout';
export { default as Sidebar } from './components/layout/Sidebar';
export { default as Header } from './components/layout/Header';

// Authentication Components
export { default as AuthPage } from './pages/AuthPage';
export { default as LoginForm } from './components/auth/LoginForm';
export { default as RegisterForm } from './components/auth/RegisterForm';

// Dashboard Components
export { default as Dashboard } from './pages/Dashboard';
export { default as MetricsCard } from './components/dashboard/MetricsCard';
export { default as ChartCard } from './components/dashboard/ChartCard';

// Page Components
export { default as AgentWorkspace } from './pages/AgentWorkspace';
export { default as CampaignManager } from './pages/CampaignManager';

// Main App
export { default as App } from './App';

// Type Definitions
export interface PyTakeTheme {
  colors: typeof theme.colors;
  typography: typeof theme.typography;
  spacing: typeof theme.spacing;
  borderRadius: typeof theme.borderRadius;
  shadows: typeof theme.shadows;
  animations: typeof theme.animations;
  breakpoints: typeof theme.breakpoints;
  components: typeof theme.components;
}

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  company: string;
}

export interface Contact {
  id: string;
  name: string;
  phone: string;
  avatar?: string;
  status: 'online' | 'offline' | 'away';
  lastSeen: string;
  unreadCount: number;
}

export interface Message {
  id: string;
  text: string;
  timestamp: string;
  sender: 'user' | 'agent' | 'system';
  status: 'sent' | 'delivered' | 'read' | 'failed';
  type: 'text' | 'image' | 'document' | 'audio';
  metadata?: any;
}

export interface Campaign {
  id: string;
  name: string;
  status: 'draft' | 'scheduled' | 'running' | 'completed' | 'paused';
  type: 'broadcast' | 'sequence' | 'promotional' | 'transactional';
  audience: number;
  sent: number;
  delivered: number;
  read: number;
  clicked: number;
  scheduledDate: string;
  createdAt: string;
  template: {
    name: string;
    preview: string;
  };
}