// API Constants
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
export const WS_BASE_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8080';

// App Constants
export const APP_NAME = 'PyTake';
export const APP_DESCRIPTION = 'WhatsApp Business Automation Platform';
export const APP_VERSION = '1.0.0';

// Route Constants
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  AGENT_WORKSPACE: '/agent',
  CONVERSATIONS: '/conversations',
  SETTINGS: '/settings',
  FLOWS: '/flows',
  CAMPAIGNS: '/campaigns',
  USERS: '/users',
  REPORTS: '/reports',
} as const;

// API Endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/v1/auth/login',
    LOGOUT: '/api/v1/auth/logout',
    REGISTER: '/api/v1/auth/register',
    ME: '/api/v1/auth/me',
    REFRESH: '/api/v1/auth/refresh',
    FORGOT_PASSWORD: '/api/v1/auth/forgot-password',
    RESET_PASSWORD: '/api/v1/auth/reset-password',
    CHANGE_PASSWORD: '/api/v1/auth/change-password',
    PROFILE: '/api/v1/auth/profile',
  },
  WHATSAPP: {
    HEALTH: '/api/v1/whatsapp/health',
    SEND: '/api/v1/whatsapp/send',
    WEBHOOK: '/api/v1/whatsapp/webhook',
    MESSAGES: '/api/v1/whatsapp/messages',
    CONVERSATIONS: '/api/v1/whatsapp/conversations',
  },
  DASHBOARD: {
    METRICS: '/api/v1/dashboard/metrics',
    ACTIVITY: '/api/v1/dashboard/activity',
  },
  USERS: {
    LIST: '/api/v1/users',
    CREATE: '/api/v1/users',
    UPDATE: '/api/v1/users',
    DELETE: '/api/v1/users',
  },
  WEBSOCKET: {
    CONNECT: '/ws',
    STATS: '/api/v1/ws/stats',
  },
} as const;

// Local Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER: 'user',
  TOKEN_EXPIRES: 'token_expires',
  THEME: 'theme',
  SIDEBAR_COLLAPSED: 'sidebar_collapsed',
  CONVERSATION_FILTERS: 'conversation_filters',
  AGENT_STATUS: 'agent_status',
} as const;

// Message Types
export const MESSAGE_TYPES = {
  TEXT: 'text',
  IMAGE: 'image',
  AUDIO: 'audio',
  VIDEO: 'video',
  DOCUMENT: 'document',
} as const;

// Message Status
export const MESSAGE_STATUS = {
  SENT: 'sent',
  DELIVERED: 'delivered',
  READ: 'read',
  FAILED: 'failed',
} as const;

// Conversation Status
export const CONVERSATION_STATUS = {
  ACTIVE: 'active',
  CLOSED: 'closed',
  PENDING: 'pending',
} as const;

// User Roles
export const USER_ROLES = {
  ADMIN: 'admin',
  SUPERVISOR: 'supervisor',
  AGENT: 'agent',
} as const;

// User Status
export const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
} as const;

// Agent Status
export const AGENT_STATUS = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  BUSY: 'busy',
} as const;

// Priority Levels
export const PRIORITY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
} as const;

// Notification Types
export const NOTIFICATION_TYPES = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
} as const;

// WebSocket Message Types
export const WS_MESSAGE_TYPES = {
  NEW_MESSAGE: 'new_message',
  CONVERSATION_UPDATE: 'conversation_update',
  AGENT_STATUS: 'agent_status',
  METRICS_UPDATE: 'metrics_update',
  TYPING: 'typing',
  CONVERSATION_ASSIGNED: 'conversation_assigned',
  CONVERSATION_CLOSED: 'conversation_closed',
} as const;

// Theme Constants
export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
} as const;

// Pagination Constants
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  DEFAULT_PAGE: 1,
} as const;

// File Upload Constants
export const UPLOAD = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_DOCUMENT_TYPES: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
  ALLOWED_AUDIO_TYPES: ['audio/mpeg', 'audio/wav', 'audio/ogg'],
  ALLOWED_VIDEO_TYPES: ['video/mp4', 'video/webm', 'video/ogg'],
} as const;

// Date/Time Constants
export const DATE_TIME = {
  DEFAULT_TIMEZONE: 'UTC',
  DEFAULT_DATE_FORMAT: 'yyyy-MM-dd',
  DEFAULT_TIME_FORMAT: 'HH:mm:ss',
  DEFAULT_DATETIME_FORMAT: 'yyyy-MM-dd HH:mm:ss',
  DISPLAY_DATE_FORMAT: 'MMM dd, yyyy',
  DISPLAY_TIME_FORMAT: 'h:mm a',
  DISPLAY_DATETIME_FORMAT: 'MMM dd, yyyy h:mm a',
} as const;

// Chart Colors
export const CHART_COLORS = {
  PRIMARY: '#3B82F6',
  SECONDARY: '#8B5CF6',
  SUCCESS: '#10B981',
  WARNING: '#F59E0B',
  ERROR: '#EF4444',
  INFO: '#06B6D4',
  GRAY: '#6B7280',
  GRADIENT: ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444'],
} as const;

// Animation Durations (in milliseconds)
export const ANIMATION_DURATIONS = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
  EXTRA_SLOW: 1000,
} as const;

// Breakpoints (matching Tailwind CSS)
export const BREAKPOINTS = {
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
  '2XL': 1536,
} as const;

// Z-Index Layers
export const Z_INDEX = {
  DROPDOWN: 1000,
  STICKY: 1020,
  FIXED: 1030,
  MODAL_BACKDROP: 1040,
  MODAL: 1050,
  POPOVER: 1060,
  TOOLTIP: 1070,
  NOTIFICATION: 1080,
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  FORBIDDEN: 'Access denied. You do not have permission.',
  NOT_FOUND: 'The requested resource was not found.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  SERVER_ERROR: 'Internal server error. Please try again later.',
  TIMEOUT_ERROR: 'Request timed out. Please try again.',
  UNKNOWN_ERROR: 'An unexpected error occurred.',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  LOGIN: 'Successfully logged in!',
  LOGOUT: 'Successfully logged out!',
  PROFILE_UPDATED: 'Profile updated successfully!',
  PASSWORD_CHANGED: 'Password changed successfully!',
  MESSAGE_SENT: 'Message sent successfully!',
  CONVERSATION_CLOSED: 'Conversation closed successfully!',
  SETTINGS_SAVED: 'Settings saved successfully!',
} as const;

// Regex Patterns
export const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^[\+]?[1-9][\d]{0,15}$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
  URL: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
} as const;

// WhatsApp Phone Number Format
export const WHATSAPP_PHONE_FORMAT = /^[1-9]\d{1,14}$/;

// Default values
export const DEFAULTS = {
  AVATAR_URL: '/images/default-avatar.png',
  COMPANY_LOGO: '/images/logo.png',
  PAGE_TITLE: 'PyTake - WhatsApp Business Platform',
  META_DESCRIPTION: 'Professional WhatsApp Business API integration platform for customer support and automation.',
  CONVERSATION_REFRESH_INTERVAL: 30000, // 30 seconds
  METRICS_REFRESH_INTERVAL: 60000, // 1 minute
  TYPING_TIMEOUT: 3000, // 3 seconds
  RECONNECT_INTERVAL: 5000, // 5 seconds
  MAX_RECONNECT_ATTEMPTS: 5,
} as const;

// Feature Flags (can be controlled by environment variables)
export const FEATURES = {
  DARK_MODE: true,
  NOTIFICATIONS: true,
  WEBSOCKETS: true,
  FILE_UPLOAD: true,
  VOICE_MESSAGES: true,
  VIDEO_MESSAGES: true,
  FLOW_BUILDER: true,
  CAMPAIGNS: true,
  REPORTS: true,
  MULTI_AGENT: true,
  AGENT_ASSIGNMENT: true,
  CONVERSATION_TAGS: true,
  QUICK_REPLIES: true,
  TEMPLATES: true,
  ANALYTICS: true,
} as const;

// Export all as a single object for easier importing
export const CONSTANTS = {
  API_BASE_URL,
  WS_BASE_URL,
  APP_NAME,
  APP_DESCRIPTION,
  APP_VERSION,
  ROUTES,
  API_ENDPOINTS,
  STORAGE_KEYS,
  MESSAGE_TYPES,
  MESSAGE_STATUS,
  CONVERSATION_STATUS,
  USER_ROLES,
  USER_STATUS,
  AGENT_STATUS,
  PRIORITY_LEVELS,
  NOTIFICATION_TYPES,
  WS_MESSAGE_TYPES,
  THEMES,
  PAGINATION,
  UPLOAD,
  DATE_TIME,
  CHART_COLORS,
  ANIMATION_DURATIONS,
  BREAKPOINTS,
  Z_INDEX,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  REGEX_PATTERNS,
  WHATSAPP_PHONE_FORMAT,
  DEFAULTS,
  FEATURES,
} as const;

export default CONSTANTS;