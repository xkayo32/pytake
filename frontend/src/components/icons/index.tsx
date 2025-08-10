import React from 'react';

interface IconProps {
  size?: number;
  className?: string;
  color?: string;
  strokeWidth?: number;
}

// Dashboard Icon
export const DashboardIcon: React.FC<IconProps> = ({
  size = 24,
  className = '',
  color = 'currentColor',
  strokeWidth = 2
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M3 12L3 4C3 3.44772 3.44772 3 4 3L10 3C10.5523 3 11 3.44772 11 4L11 12C11 12.5523 10.5523 13 10 13L4 13C3.44772 13 3 12.5523 3 12Z"
      stroke={color}
      strokeWidth={strokeWidth}
    />
    <path
      d="M13 20L13 12C13 11.4477 13.4477 11 14 11L20 11C20.5523 11 21 11.4477 21 12L21 20C21 20.5523 20.5523 21 20 21L14 21C13.4477 21 13 20.5523 13 20Z"
      stroke={color}
      strokeWidth={strokeWidth}
    />
    <path
      d="M13 8L13 4C13 3.44772 13.4477 3 14 3L20 3C20.5523 3 21 3.44772 21 4L21 8C21 8.55228 20.5523 9 20 9L14 9C13.4477 9 13 8.55228 13 8Z"
      stroke={color}
      strokeWidth={strokeWidth}
    />
    <path
      d="M3 20L3 16C3 15.4477 3.44772 15 4 15L10 15C10.5523 15 11 15.4477 11 16L11 20C11 20.5523 10.5523 21 10 21L4 21C3.44772 21 3 20.5523 3 20Z"
      stroke={color}
      strokeWidth={strokeWidth}
    />
  </svg>
);

// Conversations Icon
export const ConversationsIcon: React.FC<IconProps> = ({
  size = 24,
  className = '',
  color = 'currentColor',
  strokeWidth = 2
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M21 6C21 4.89543 20.1046 4 19 4H5C3.89543 4 3 4.89543 3 6V14C3 15.1046 3.89543 16 5 16H8L12 20L16 16H19C20.1046 16 21 15.1046 21 14V6Z"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
    />
    <circle cx="8" cy="10" r="1" fill={color} />
    <circle cx="12" cy="10" r="1" fill={color} />
    <circle cx="16" cy="10" r="1" fill={color} />
  </svg>
);

// Campaigns Icon
export const CampaignsIcon: React.FC<IconProps> = ({
  size = 24,
  className = '',
  color = 'currentColor',
  strokeWidth = 2
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M10 2L14 6H20C20.5523 6 21 6.44772 21 7V19C21 19.5523 20.5523 20 20 20H4C3.44772 20 3 19.5523 3 19V7C3 6.44772 3.44772 6 4 6H10V2Z"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
    />
    <path
      d="M14 2V6"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
    />
    <path
      d="M7 10H17M7 13H13"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
    />
    <circle cx="16" cy="13" r="2" stroke={color} strokeWidth={strokeWidth} />
    <path
      d="M18 15L21 18"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
    />
  </svg>
);

// Flow Builder Icon
export const FlowBuilderIcon: React.FC<IconProps> = ({
  size = 24,
  className = '',
  color = 'currentColor',
  strokeWidth = 2
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <rect x="3" y="3" width="4" height="4" rx="1" stroke={color} strokeWidth={strokeWidth} />
    <rect x="10" y="3" width="4" height="4" rx="1" stroke={color} strokeWidth={strokeWidth} />
    <rect x="17" y="3" width="4" height="4" rx="1" stroke={color} strokeWidth={strokeWidth} />
    <rect x="3" y="10" width="4" height="4" rx="1" stroke={color} strokeWidth={strokeWidth} />
    <rect x="10" y="17" width="4" height="4" rx="1" stroke={color} strokeWidth={strokeWidth} />
    
    <path d="M7 5H10" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <path d="M14 5H17" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <path d="M5 7V10" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <path d="M5 14L12 17" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    
    <circle cx="12" cy="10" r="2" stroke={color} strokeWidth={strokeWidth} />
  </svg>
);

// Agent Workspace Icon
export const AgentWorkspaceIcon: React.FC<IconProps> = ({
  size = 24,
  className = '',
  color = 'currentColor',
  strokeWidth = 2
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <rect x="3" y="4" width="18" height="12" rx="2" stroke={color} strokeWidth={strokeWidth} />
    <path d="M7 20H17" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <path d="M9 16V20" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <path d="M15 16V20" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    
    <circle cx="8" cy="9" r="2" stroke={color} strokeWidth={strokeWidth} />
    <path d="M12 8H17M12 11H15" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <path d="M6 13H18" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
  </svg>
);

// Settings Icon
export const SettingsIcon: React.FC<IconProps> = ({
  size = 24,
  className = '',
  color = 'currentColor',
  strokeWidth = 2
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M12.22 2H11.78C11.2496 2 10.7409 2.21071 10.3674 2.58579C9.99393 2.96086 9.78322 3.46957 9.78322 4V4.18C9.78322 4.47 9.72322 4.75 9.61322 5.02C9.50322 5.29 9.34322 5.53 9.14322 5.73L9.01322 5.86C8.52322 6.35 7.76322 6.35 7.27322 5.86L7.14322 5.73C6.96322 5.55 6.75322 5.41 6.52322 5.32C6.29322 5.23 6.04322 5.18 5.79322 5.18C5.54322 5.18 5.29322 5.23 5.06322 5.32C4.83322 5.41 4.62322 5.55 4.44322 5.73L3.73322 6.44C3.55322 6.62 3.41322 6.83 3.32322 7.06C3.23322 7.29 3.18322 7.54 3.18322 7.79C3.18322 8.04 3.23322 8.29 3.32322 8.52C3.41322 8.75 3.55322 8.96 3.73322 9.14L3.86322 9.27C4.35322 9.76 4.35322 10.52 3.86322 11.01L3.73322 11.14C3.55322 11.32 3.41322 11.53 3.32322 11.76C3.23322 11.99 3.18322 12.24 3.18322 12.49C3.18322 12.74 3.23322 12.99 3.32322 13.22C3.41322 13.45 3.55322 13.66 3.73322 13.84L4.44322 14.55C4.62322 14.73 4.83322 14.87 5.06322 14.96C5.29322 15.05 5.54322 15.1 5.79322 15.1C6.04322 15.1 6.29322 15.05 6.52322 14.96C6.75322 14.87 6.96322 14.73 7.14322 14.55L7.27322 14.42C7.76322 13.93 8.52322 13.93 9.01322 14.42L9.14322 14.55C9.34322 14.75 9.50322 14.99 9.61322 15.26C9.72322 15.53 9.78322 15.81 9.78322 16.1V16.28C9.78322 16.81 9.99393 17.32 10.3674 17.6951C10.7409 18.0701 11.2496 18.2808 11.78 18.2808H12.22C12.7504 18.2808 13.2591 18.0701 13.6326 17.6951C14.0061 17.32 14.2168 16.81 14.2168 16.28V16.1C14.2168 15.81 14.2768 15.53 14.3868 15.26C14.4968 14.99 14.6568 14.75 14.8568 14.55L14.9868 14.42C15.4768 13.93 16.2368 13.93 16.7268 14.42L16.8568 14.55C17.0368 14.73 17.2468 14.87 17.4768 14.96C17.7068 15.05 17.9568 15.1 18.2068 15.1C18.4568 15.1 18.7068 15.05 18.9368 14.96C19.1668 14.87 19.3768 14.73 19.5568 14.55L20.2668 13.84C20.4468 13.66 20.5868 13.45 20.6768 13.22C20.7668 12.99 20.8168 12.74 20.8168 12.49C20.8168 12.24 20.7668 11.99 20.6768 11.76C20.5868 11.53 20.4468 11.32 20.2668 11.14L20.1368 11.01C19.6468 10.52 19.6468 9.76 20.1368 9.27L20.2668 9.14C20.4468 8.96 20.5868 8.75 20.6768 8.52C20.7668 8.29 20.8168 8.04 20.8168 7.79C20.8168 7.54 20.7668 7.29 20.6768 7.06C20.5868 6.83 20.4468 6.62 20.2668 6.44L19.5568 5.73C19.3768 5.55 19.1668 5.41 18.9368 5.32C18.7068 5.23 18.4568 5.18 18.2068 5.18C17.9568 5.18 17.7068 5.23 17.4768 5.32C17.2468 5.41 17.0368 5.55 16.8568 5.73L16.7268 5.86C16.2368 6.35 15.4768 6.35 14.9868 5.86L14.8568 5.73C14.6568 5.53 14.4968 5.29 14.3868 5.02C14.2768 4.75 14.2168 4.47 14.2168 4.18V4C14.2168 3.46957 14.0061 2.96086 13.6326 2.58579C13.2591 2.21071 12.7504 2 12.22 2V2Z"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
    />
    <circle cx="12" cy="12" r="3" stroke={color} strokeWidth={strokeWidth} />
  </svg>
);

// Users Icon
export const UsersIcon: React.FC<IconProps> = ({
  size = 24,
  className = '',
  color = 'currentColor',
  strokeWidth = 2
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <circle cx="9" cy="7" r="4" stroke={color} strokeWidth={strokeWidth} />
    <path d="M1 21V19C1 16.7909 2.79086 15 5 15H13C15.2091 15 17 16.7909 17 19V21" stroke={color} strokeWidth={strokeWidth} />
    <circle cx="17" cy="7" r="3" stroke={color} strokeWidth={strokeWidth} />
    <path d="M23 21V19C22.9986 17.5515 22.2916 16.2109 21.13 15.39" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
  </svg>
);

// Analytics Icon
export const AnalyticsIcon: React.FC<IconProps> = ({
  size = 24,
  className = '',
  color = 'currentColor',
  strokeWidth = 2
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path d="M18 20V10" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 20V4" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M6 20V14" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Automations Icon
export const AutomationsIcon: React.FC<IconProps> = ({
  size = 24,
  className = '',
  color = 'currentColor',
  strokeWidth = 2
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path d="M12 2L15.09 8.26L22 9L17 14L18.18 21L12 17.77L5.82 21L7 14L2 9L8.91 8.26L12 2Z" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
    <path d="M8 12L10 14L16 8" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Templates Icon
export const TemplatesIcon: React.FC<IconProps> = ({
  size = 24,
  className = '',
  color = 'currentColor',
  strokeWidth = 2
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke={color} strokeWidth={strokeWidth} />
    <path d="M9 9H15" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9 13H15" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9 17H12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Contacts Icon
export const ContactsIcon: React.FC<IconProps> = ({
  size = 24,
  className = '',
  color = 'currentColor',
  strokeWidth = 2
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <rect x="3" y="4" width="18" height="16" rx="2" ry="2" stroke={color} strokeWidth={strokeWidth} />
    <circle cx="9" cy="10" r="3" stroke={color} strokeWidth={strokeWidth} />
    <path d="M3 18C4.79086 16.2091 7.20914 15 9 15C10.7909 15 13.2091 16.2091 15 18" stroke={color} strokeWidth={strokeWidth} />
    <path d="M16 8H20" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <path d="M16 12H20" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
  </svg>
);

// Notifications Icon
export const NotificationsIcon: React.FC<IconProps> = ({
  size = 24,
  className = '',
  color = 'currentColor',
  strokeWidth = 2
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path d="M18 8A6 6 0 0 0 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8" stroke={color} strokeWidth={strokeWidth} />
    <path d="M13.73 21A2 2 0 0 1 10.27 21" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Search Icon
export const SearchIcon: React.FC<IconProps> = ({
  size = 24,
  className = '',
  color = 'currentColor',
  strokeWidth = 2
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <circle cx="11" cy="11" r="8" stroke={color} strokeWidth={strokeWidth} />
    <path d="M21 21L16.65 16.65" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Menu Icon
export const MenuIcon: React.FC<IconProps> = ({
  size = 24,
  className = '',
  color = 'currentColor',
  strokeWidth = 2
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <line x1="3" y1="6" x2="21" y2="6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <line x1="3" y1="12" x2="21" y2="12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <line x1="3" y1="18" x2="21" y2="18" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Close Icon
export const CloseIcon: React.FC<IconProps> = ({
  size = 24,
  className = '',
  color = 'currentColor',
  strokeWidth = 2
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <line x1="18" y1="6" x2="6" y2="18" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <line x1="6" y1="6" x2="18" y2="18" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Theme Toggle Icons
export const SunIcon: React.FC<IconProps> = ({
  size = 24,
  className = '',
  color = 'currentColor',
  strokeWidth = 2
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <circle cx="12" cy="12" r="5" stroke={color} strokeWidth={strokeWidth} />
    <line x1="12" y1="1" x2="12" y2="3" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <line x1="12" y1="21" x2="12" y2="23" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <line x1="1" y1="12" x2="3" y2="12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <line x1="21" y1="12" x2="23" y2="12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
  </svg>
);

export const MoonIcon: React.FC<IconProps> = ({
  size = 24,
  className = '',
  color = 'currentColor',
  strokeWidth = 2
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
  </svg>
);

// Arrow Icons
export const ChevronDownIcon: React.FC<IconProps> = ({
  size = 24,
  className = '',
  color = 'currentColor',
  strokeWidth = 2
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path d="M6 9L12 15L18 9" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ChevronRightIcon: React.FC<IconProps> = ({
  size = 24,
  className = '',
  color = 'currentColor',
  strokeWidth = 2
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path d="M9 18L15 12L9 6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// WhatsApp Icon
export const WhatsAppIcon: React.FC<IconProps> = ({
  size = 24,
  className = '',
  color = 'currentColor'
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M17.472 14.382C17.352 14.382 16.874 14.202 16.696 14.122C16.518 14.042 16.298 13.962 16.078 14.202C15.858 14.442 15.418 15.002 15.238 15.242C15.058 15.482 14.798 15.482 14.618 15.382C14.438 15.282 13.798 15.062 13.038 14.382C12.458 13.862 12.078 13.222 11.898 13.022C11.718 12.822 11.878 12.662 11.978 12.562C12.068 12.472 12.178 12.322 12.278 12.142C12.378 11.962 12.418 11.822 12.498 11.602C12.578 11.382 12.538 11.202 12.488 11.102C12.438 11.002 12.078 10.062 11.918 9.622C11.758 9.202 11.598 9.262 11.418 9.262C11.258 9.262 11.038 9.262 10.818 9.262C10.598 9.262 10.238 9.322 10.058 9.542C9.878 9.762 9.358 10.262 9.358 11.202C9.358 12.142 10.078 13.042 10.178 13.262C10.278 13.482 12.078 16.282 14.898 17.062C15.538 17.322 16.038 17.462 16.418 17.562C17.058 17.762 17.638 17.732 18.098 17.662C18.618 17.582 19.358 17.142 19.518 16.662C19.678 16.182 19.678 15.762 19.628 15.682C19.578 15.602 19.378 15.522 19.078 15.362C18.778 15.202 17.692 14.382 17.472 14.382ZM12.078 21.502H12.078C10.238 21.502 8.438 20.962 6.898 19.962L6.518 19.742L2.738 20.782L3.798 17.122L3.558 16.722C2.458 15.122 1.878 13.222 1.878 11.202C1.878 5.622 6.498 1.002 12.078 1.002C14.758 1.002 17.278 2.082 19.178 3.982C21.078 5.882 22.158 8.402 22.158 11.082C22.158 16.662 17.538 21.282 11.958 21.282L12.078 21.502ZM20.478 3.482C18.298 1.302 15.338 0.082 12.078 0.082C5.938 0.082 0.938 5.082 0.938 11.222C0.938 13.402 1.578 15.522 2.778 17.342L0.838 23.922L7.618 22.022C9.358 23.122 11.398 23.722 13.478 23.722H13.478C19.618 23.722 24.618 18.722 24.618 12.582C24.618 9.322 23.398 6.362 21.218 4.182L20.478 3.482Z"
      fill={color}
    />
  </svg>
);

// Additional Icons for Flow Builder and Settings

// Flow Icon (Alias for Flow Builder)
export const FlowIcon: React.FC<IconProps> = FlowBuilderIcon;

// Play Icon
export const PlayIcon: React.FC<IconProps> = ({
  size = 24,
  className = '',
  color = 'currentColor',
  strokeWidth = 2
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <polygon points="5,3 19,12 5,21" fill={color} />
  </svg>
);

// Pause Icon
export const PauseIcon: React.FC<IconProps> = ({
  size = 24,
  className = '',
  color = 'currentColor'
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect x="6" y="4" width="4" height="16" fill={color} />
    <rect x="14" y="4" width="4" height="16" fill={color} />
  </svg>
);

// Stop Icon
export const StopIcon: React.FC<IconProps> = ({
  size = 24,
  className = '',
  color = 'currentColor'
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect x="4" y="4" width="16" height="16" fill={color} />
  </svg>
);

// Trash Icon
export const TrashIcon: React.FC<IconProps> = ({
  size = 24,
  className = '',
  color = 'currentColor',
  strokeWidth = 2
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <polyline points="3,6 5,6 21,6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <line x1="10" y1="11" x2="10" y2="17" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <line x1="14" y1="11" x2="14" y2="17" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Copy Icon
export const CopyIcon: React.FC<IconProps> = ({
  size = 24,
  className = '',
  color = 'currentColor',
  strokeWidth = 2
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Download Icon
export const DownloadIcon: React.FC<IconProps> = ({
  size = 24,
  className = '',
  color = 'currentColor',
  strokeWidth = 2
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <polyline points="7,10 12,15 17,10" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <line x1="12" y1="15" x2="12" y2="3" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Upload Icon
export const UploadIcon: React.FC<IconProps> = ({
  size = 24,
  className = '',
  color = 'currentColor',
  strokeWidth = 2
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <polyline points="17,8 12,3 7,8" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <line x1="12" y1="3" x2="12" y2="15" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Edit Icon
export const EditIcon: React.FC<IconProps> = ({
  size = 24,
  className = '',
  color = 'currentColor',
  strokeWidth = 2
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Save Icon
export const SaveIcon: React.FC<IconProps> = ({
  size = 24,
  className = '',
  color = 'currentColor',
  strokeWidth = 2
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <polyline points="17,21 17,13 7,13 7,21" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <polyline points="7,3 7,8 15,8" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Add Icon
export const AddIcon: React.FC<IconProps> = ({
  size = 24,
  className = '',
  color = 'currentColor',
  strokeWidth = 2
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="12" cy="12" r="10" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <line x1="12" y1="8" x2="12" y2="16" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <line x1="8" y1="12" x2="16" y2="12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Eye Icons
export const EyeIcon: React.FC<IconProps> = ({
  size = 24,
  className = '',
  color = 'currentColor',
  strokeWidth = 2
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="12" cy="12" r="3" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const EyeOffIcon: React.FC<IconProps> = ({
  size = 24,
  className = '',
  color = 'currentColor',
  strokeWidth = 2
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <line x1="1" y1="1" x2="23" y2="23" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Check and X Icons
export const CheckIcon: React.FC<IconProps> = ({
  size = 24,
  className = '',
  color = 'currentColor',
  strokeWidth = 2
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <polyline points="20,6 9,17 4,12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const XIcon: React.FC<IconProps> = ({
  size = 24,
  className = '',
  color = 'currentColor',
  strokeWidth = 2
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <line x1="18" y1="6" x2="6" y2="18" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <line x1="6" y1="6" x2="18" y2="18" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Flow Builder specific icons
export const MessageIcon: React.FC<IconProps> = ({
  size = 24,
  className = '',
  color = 'currentColor',
  strokeWidth = 2
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const QuestionIcon: React.FC<IconProps> = ({
  size = 24,
  className = '',
  color = 'currentColor',
  strokeWidth = 2
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="12" cy="12" r="10" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="12" cy="17" r=".5" fill={color} />
  </svg>
);

export const ConditionIcon: React.FC<IconProps> = ({
  size = 24,
  className = '',
  color = 'currentColor',
  strokeWidth = 2
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <polygon points="12,2 22,8.5 22,15.5 12,22 2,15.5 2,8.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M8 12l2 2 4-4" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ActionIcon: React.FC<IconProps> = ({
  size = 24,
  className = '',
  color = 'currentColor',
  strokeWidth = 2
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <polyline points="9,11 12,14 22,4" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const WaitIcon: React.FC<IconProps> = ({
  size = 24,
  className = '',
  color = 'currentColor',
  strokeWidth = 2
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="12" cy="12" r="10" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <polyline points="12,6 12,12 16,14" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const WebhookIcon: React.FC<IconProps> = ({
  size = 24,
  className = '',
  color = 'currentColor',
  strokeWidth = 2
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <polyline points="15,3 21,3 21,9" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <line x1="10" y1="14" x2="21" y2="3" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const TransferIcon: React.FC<IconProps> = ({
  size = 24,
  className = '',
  color = 'currentColor',
  strokeWidth = 2
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <polyline points="17,1 21,5 17,9" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3 11V9a4 4 0 0 1 4-4h14" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <polyline points="7,23 3,19 7,15" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M21 13v2a4 4 0 0 1-4 4H3" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const EndIcon: React.FC<IconProps> = ({
  size = 24,
  className = '',
  color = 'currentColor',
  strokeWidth = 2
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="12" cy="12" r="10" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <rect x="9" y="9" width="6" height="6" fill={color} />
  </svg>
);

// Utility Icons
export const ConnectIcon: React.FC<IconProps> = ({
  size = 24,
  className = '',
  color = 'currentColor',
  strokeWidth = 2
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const UndoIcon: React.FC<IconProps> = ({
  size = 24,
  className = '',
  color = 'currentColor',
  strokeWidth = 2
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <polyline points="1,4 1,10 7,10" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const RedoIcon: React.FC<IconProps> = ({
  size = 24,
  className = '',
  color = 'currentColor',
  strokeWidth = 2
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <polyline points="23,4 23,10 17,10" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ZoomInIcon: React.FC<IconProps> = ({
  size = 24,
  className = '',
  color = 'currentColor',
  strokeWidth = 2
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="11" cy="11" r="8" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M21 21l-4.35-4.35" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <line x1="11" y1="8" x2="11" y2="14" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <line x1="8" y1="11" x2="14" y2="11" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ZoomOutIcon: React.FC<IconProps> = ({
  size = 24,
  className = '',
  color = 'currentColor',
  strokeWidth = 2
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="11" cy="11" r="8" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M21 21l-4.35-4.35" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <line x1="8" y1="11" x2="14" y2="11" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const GridIcon: React.FC<IconProps> = ({
  size = 24,
  className = '',
  color = 'currentColor',
  strokeWidth = 2
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect x="3" y="3" width="7" height="7" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <rect x="14" y="3" width="7" height="7" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <rect x="14" y="14" width="7" height="7" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <rect x="3" y="14" width="7" height="7" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const TestIcon: React.FC<IconProps> = ({
  size = 24,
  className = '',
  color = 'currentColor',
  strokeWidth = 2
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <polyline points="22,12 18,12 15,21 9,3 6,12 2,12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Settings specific icons
export const SecurityIcon: React.FC<IconProps> = ({
  size = 24,
  className = '',
  color = 'currentColor',
  strokeWidth = 2
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const IntegrationsIcon: React.FC<IconProps> = ({
  size = 24,
  className = '',
  color = 'currentColor',
  strokeWidth = 2
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect x="3" y="8" width="6" height="6" rx="1" stroke={color} strokeWidth={strokeWidth} />
    <rect x="15" y="8" width="6" height="6" rx="1" stroke={color} strokeWidth={strokeWidth} />
    <path d="M9 11h6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <path d="M12 8V5a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v3" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <path d="M12 14v3a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-3" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
  </svg>
);

export const CreditCardIcon: React.FC<IconProps> = ({
  size = 24,
  className = '',
  color = 'currentColor',
  strokeWidth = 2
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <line x1="1" y1="10" x2="23" y2="10" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const KeyIcon: React.FC<IconProps> = ({
  size = 24,
  className = '',
  color = 'currentColor',
  strokeWidth = 2
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="8" cy="8" r="6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M15.477 12.89 17 11.384a1 1 0 0 1 1.414 0L21 14.97a1 1 0 0 1 0 1.414l-4.586 4.586a1 1 0 0 1-1.414 0l-3.586-3.586a1 1 0 0 1 0-1.414l2.05-2.05" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9 7h.01" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const RefreshIcon: React.FC<IconProps> = ({
  size = 24,
  className = '',
  color = 'currentColor',
  strokeWidth = 2
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <polyline points="23,4 23,10 17,10" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <polyline points="1,20 1,14 7,14" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const NotificationIcon: React.FC<IconProps> = NotificationsIcon;

export const BrandingIcon: React.FC<IconProps> = ({
  size = 24,
  className = '',
  color = 'currentColor',
  strokeWidth = 2
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="12" cy="12" r="3" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const DatabaseIcon: React.FC<IconProps> = ({
  size = 24,
  className = '',
  color = 'currentColor',
  strokeWidth = 2
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <ellipse cx="12" cy="5" rx="9" ry="3" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const LogIcon: React.FC<IconProps> = ({
  size = 24,
  className = '',
  color = 'currentColor',
  strokeWidth = 2
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <polyline points="14,2 14,8 20,8" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <line x1="16" y1="13" x2="8" y2="13" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <line x1="16" y1="17" x2="8" y2="17" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <polyline points="10,9 9,9 8,9" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ShieldIcon: React.FC<IconProps> = SecurityIcon;

export const BillingIcon: React.FC<IconProps> = CreditCardIcon;

export const PlanIcon: React.FC<IconProps> = ({
  size = 24,
  className = '',
  color = 'currentColor',
  strokeWidth = 2
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M12 2l3.09 6.26L22 9l-5 4.87L18.18 21 12 17.77 5.82 21 7 13.87 2 9l6.91-1.74L12 2z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const FilterIcon: React.FC<IconProps> = ({
  size = 24,
  className = '',
  color = 'currentColor',
  strokeWidth = 2
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const CalendarIcon: React.FC<IconProps> = ({
  size = 24,
  className = '',
  color = 'currentColor',
  strokeWidth = 2
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <line x1="16" y1="2" x2="16" y2="6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <line x1="8" y1="2" x2="8" y2="6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <line x1="3" y1="10" x2="21" y2="10" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ClockIcon: React.FC<IconProps> = WaitIcon;

export default {
  DashboardIcon,
  ConversationsIcon,
  CampaignsIcon,
  FlowBuilderIcon,
  FlowIcon,
  AgentWorkspaceIcon,
  SettingsIcon,
  UsersIcon,
  AnalyticsIcon,
  AutomationsIcon,
  TemplatesIcon,
  ContactsIcon,
  NotificationsIcon,
  SearchIcon,
  MenuIcon,
  CloseIcon,
  SunIcon,
  MoonIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  WhatsAppIcon,
  PlayIcon,
  PauseIcon,
  StopIcon,
  TrashIcon,
  CopyIcon,
  DownloadIcon,
  UploadIcon,
  EditIcon,
  SaveIcon,
  AddIcon,
  EyeIcon,
  EyeOffIcon,
  CheckIcon,
  XIcon,
  MessageIcon,
  QuestionIcon,
  ConditionIcon,
  ActionIcon,
  WaitIcon,
  WebhookIcon,
  TransferIcon,
  EndIcon,
  ConnectIcon,
  UndoIcon,
  RedoIcon,
  ZoomInIcon,
  ZoomOutIcon,
  GridIcon,
  TestIcon,
  SecurityIcon,
  IntegrationsIcon,
  CreditCardIcon,
  KeyIcon,
  RefreshIcon,
  NotificationIcon,
  BrandingIcon,
  DatabaseIcon,
  LogIcon,
  ShieldIcon,
  BillingIcon,
  PlanIcon,
  FilterIcon,
  CalendarIcon,
  ClockIcon
};