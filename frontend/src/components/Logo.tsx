interface LogoProps {
  className?: string;
  size?: number;
}

export function Logo({ className = '', size = 40 }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4F46E5" />
          <stop offset="50%" stopColor="#7C3AED" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
        <linearGradient id="whatsappGreen" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#25D366" />
          <stop offset="100%" stopColor="#128C7E" />
        </linearGradient>
      </defs>

      {/* Main Circle Background */}
      <circle cx="50" cy="50" r="48" fill="url(#logoGradient)" />

      {/* WhatsApp Phone Icon */}
      <g transform="translate(28, 28)">
        {/* Phone Handset */}
        <path
          d="M 35 8 C 35 5 32 2 29 2 L 15 2 C 12 2 9 5 9 8 L 9 36 C 9 39 12 42 15 42 L 29 42 C 32 42 35 39 35 36 Z"
          fill="white"
          opacity="0.95"
        />

        {/* WhatsApp Bubble */}
        <circle cx="22" cy="20" r="11" fill="url(#whatsappGreen)" opacity="0.2" />
        <path
          d="M 22 12 C 17.5 12 14 15.5 14 20 C 14 21.5 14.5 23 15.2 24.2 L 14 28 L 18 26.8 C 19.2 27.5 20.5 28 22 28 C 26.5 28 30 24.5 30 20 C 30 15.5 26.5 12 22 12 Z"
          fill="url(#whatsappGreen)"
        />

        {/* Chat Icon Inside */}
        <path
          d="M 19 18 L 25 18 M 19 21 L 23 21"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
        />

        {/* Screen bar */}
        <rect x="18" y="5" width="8" height="2" rx="1" fill="url(#logoGradient)" opacity="0.3" />
        <circle cx="22" cy="38" r="2" fill="url(#logoGradient)" opacity="0.3" />
      </g>

      {/* Automation Gear/Cog (top right) */}
      <g transform="translate(62, 18)">
        <circle cx="8" cy="8" r="7" fill="#FFB800" opacity="0.9" />
        <circle cx="8" cy="8" r="4" fill="white" />
        {/* Gear teeth */}
        <rect x="7" y="1" width="2" height="3" fill="#FFB800" rx="0.5" />
        <rect x="7" y="12" width="2" height="3" fill="#FFB800" rx="0.5" />
        <rect x="1" y="7" width="3" height="2" fill="#FFB800" rx="0.5" />
        <rect x="12" y="7" width="3" height="2" fill="#FFB800" rx="0.5" />
      </g>

      {/* Lightning Bolt (automation symbol - bottom right) */}
      <g transform="translate(70, 70)">
        <path
          d="M 8 2 L 4 10 L 8 10 L 6 18 L 14 8 L 10 8 L 12 2 Z"
          fill="#FFB800"
        />
      </g>

      {/* Notification Dots */}
      <circle cx="75" cy="25" r="4" fill="#EF4444" />
      <circle cx="75" cy="25" r="4" fill="#EF4444" opacity="0.5">
        <animate attributeName="r" values="4;6;4" dur="2s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

interface LogoWithTextProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
}

export function LogoWithText({ size = 'md', className = '', onClick }: LogoWithTextProps) {
  const sizes = {
    sm: { logo: 32, text: 'text-lg' },
    md: { logo: 48, text: 'text-2xl' },
    lg: { logo: 64, text: 'text-3xl' },
  };

  const config = sizes[size];

  return (
    <div
      className={`flex items-center gap-3 ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      <div className="transition-transform hover:scale-110">
        <Logo size={config.logo} />
      </div>
      <span
        className={`${config.text} font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent`}
      >
        PyTake
      </span>
    </div>
  );
}
