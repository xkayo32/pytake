import { cn } from '@/lib/utils'

interface LogoProps {
  className?: string
  showText?: boolean
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export function Logo({ className, showText = true, size = 'md' }: LogoProps) {
  const sizes = {
    sm: { icon: 24, text: 'text-lg' },
    md: { icon: 32, text: 'text-2xl' },
    lg: { icon: 40, text: 'text-3xl' },
    xl: { icon: 48, text: 'text-4xl' }
  }

  const currentSize = sizes[size]

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <svg
        width={currentSize.icon}
        height={currentSize.icon}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-primary"
      >
        <defs>
          {/* Main gradient */}
          <linearGradient id="pyTakeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#25D366" />
            <stop offset="50%" stopColor="#128C7E" />
            <stop offset="100%" stopColor="#075E54" />
          </linearGradient>
          
          {/* Secondary gradient for accents */}
          <linearGradient id="pyTakeAccent" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34E789" />
            <stop offset="100%" stopColor="#25D366" />
          </linearGradient>
          
          {/* Shadow filter */}
          <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.1"/>
          </filter>
        </defs>
        
        {/* Background circle */}
        <circle cx="32" cy="32" r="28" fill="url(#pyTakeGradient)" filter="url(#shadow)" />
        
        {/* Chat bubble shape */}
        <path
          d="M32 8C18.745 8 8 18.745 8 32c0 4.23 1.095 8.2 3.01 11.64L8.2 53.6a1.5 1.5 0 001.92 1.92l9.96-2.81C23.8 54.905 27.77 56 32 56c13.255 0 24-10.745 24-24S45.255 8 32 8z"
          fill="white"
          opacity="0.95"
        />
        
        {/* Python snake inspired shape integrated with chat */}
        <path
          d="M28 20c0-2.21 1.79-4 4-4h8c2.21 0 4 1.79 4 4v4c0 2.21-1.79 4-4 4h-8c-2.21 0-4 1.79-4 4v4c0 2.21 1.79 4 4 4h8c2.21 0 4 1.79 4 4v4c0 2.21-1.79 4-4 4h-8c-2.21 0-4-1.79-4-4"
          fill="none"
          stroke="url(#pyTakeGradient)"
          strokeWidth="3"
          strokeLinecap="round"
        />
        
        {/* Python dots (snake eyes) */}
        <circle cx="36" cy="24" r="2" fill="#075E54" />
        <circle cx="28" cy="40" r="2" fill="#075E54" />
        
        {/* Multiple message lines inside */}
        <rect x="20" y="26" width="14" height="2" rx="1" fill="url(#pyTakeGradient)" opacity="0.6" />
        <rect x="30" y="32" width="14" height="2" rx="1" fill="url(#pyTakeGradient)" opacity="0.5" />
        <rect x="20" y="38" width="10" height="2" rx="1" fill="url(#pyTakeGradient)" opacity="0.4" />
        
        {/* Notification badge */}
        <circle cx="48" cy="16" r="6" fill="url(#pyTakeAccent)" />
        <text x="48" y="20" textAnchor="middle" fontSize="8" fill="white" fontWeight="bold">Py</text>
        
        {/* Connection dots */}
        <circle cx="12" cy="32" r="1.5" fill="url(#pyTakeGradient)" opacity="0.5" />
        <circle cx="52" cy="32" r="1.5" fill="url(#pyTakeGradient)" opacity="0.5" />
        <circle cx="32" cy="12" r="1.5" fill="url(#pyTakeGradient)" opacity="0.5" />
      </svg>
      
      {showText && (
        <div className="flex flex-col">
          <span className={cn('font-bold tracking-tight leading-none', currentSize.text)}>
            PyChat
          </span>
          <span className="text-xs text-muted-foreground mt-0.5">
            Intelligent Business Messaging
          </span>
        </div>
      )}
    </div>
  )
}