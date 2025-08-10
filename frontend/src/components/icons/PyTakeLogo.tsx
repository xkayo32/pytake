import React from 'react';

interface PyTakeLogoProps {
  size?: number;
  variant?: 'full' | 'icon' | 'text';
  className?: string;
  animated?: boolean;
}

export const PyTakeLogo: React.FC<PyTakeLogoProps> = ({
  size = 40,
  variant = 'full',
  className = '',
  animated = false
}) => {
  const iconComponent = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} ${animated ? 'animate-pulse' : ''}`}
    >
      {/* Background Circle */}
      <circle
        cx="50"
        cy="50"
        r="48"
        fill="url(#gradient1)"
        stroke="currentColor"
        strokeWidth="2"
      />
      
      {/* Main Chat Bubble */}
      <path
        d="M25 30 C25 25, 30 20, 35 20 L65 20 C70 20, 75 25, 75 30 L75 50 C75 55, 70 60, 65 60 L45 60 L35 70 L35 60 C30 60, 25 55, 25 50 Z"
        fill="white"
        fillOpacity="0.9"
      />
      
      {/* Message Lines */}
      <line x1="35" y1="35" x2="55" y2="35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="35" y1="42" x2="65" y2="42" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="35" y1="49" x2="50" y2="49" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      
      {/* Automation Gears */}
      <g className={animated ? 'animate-spin' : ''} style={{ transformOrigin: '65px 75px', animationDuration: '3s' }}>
        <circle cx="65" cy="75" r="8" fill="currentColor" fillOpacity="0.8" />
        <path
          d="M65 67 L67 69 L65 71 L63 69 Z M73 75 L71 73 L69 75 L71 77 Z M65 83 L63 81 L65 79 L67 81 Z M57 75 L59 77 L61 75 L59 73 Z"
          fill="white"
        />
      </g>
      
      <g className={animated ? 'animate-spin' : ''} style={{ transformOrigin: '80px 65px', animationDuration: '2s', animationDirection: 'reverse' }}>
        <circle cx="80" cy="65" r="6" fill="currentColor" fillOpacity="0.6" />
        <path
          d="M80 59 L81 61 L80 63 L79 61 Z M86 65 L84 64 L82 65 L84 66 Z M80 71 L79 69 L80 67 L81 69 Z M74 65 L76 66 L78 65 L76 64 Z"
          fill="white"
        />
      </g>
      
      {/* Lightning Bolt (representing speed/automation) */}
      <path
        d="M85 25 L88 30 L85 35 L82 32 L80 35 L85 25"
        fill="currentColor"
        fillOpacity="0.7"
      />
      
      <defs>
        <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="50%" stopColor="#1D4ED8" />
          <stop offset="100%" stopColor="#1E40AF" />
        </linearGradient>
      </defs>
    </svg>
  );

  const textComponent = (
    <div className="flex items-center space-x-2">
      <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
        PyTake
      </span>
    </div>
  );

  const fullComponent = (
    <div className="flex items-center space-x-3">
      {iconComponent}
      <div className="flex flex-col">
        <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
          PyTake
        </span>
        <span className="text-xs text-gray-500 tracking-wide">
          WhatsApp Automation
        </span>
      </div>
    </div>
  );

  switch (variant) {
    case 'icon':
      return iconComponent;
    case 'text':
      return textComponent;
    case 'full':
    default:
      return fullComponent;
  }
};

export default PyTakeLogo;