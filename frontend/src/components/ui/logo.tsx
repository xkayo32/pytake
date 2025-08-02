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
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-primary"
      >
        {/* WhatsApp-inspired chat bubble with gradient */}
        <defs>
          <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.8" />
          </linearGradient>
        </defs>
        
        {/* Main chat bubble */}
        <path
          d="M24 4C12.954 4 4 12.954 4 24c0 3.528.918 6.84 2.526 9.72L4.08 42.24a1 1 0 001.28 1.28l8.52-2.446A19.893 19.893 0 0024 44c11.046 0 20-8.954 20-20S35.046 4 24 4z"
          fill="url(#logoGradient)"
        />
        
        {/* Inner design - representing multiple messages */}
        <rect x="14" y="16" width="16" height="3" rx="1.5" fill="white" opacity="0.9" />
        <rect x="14" y="22" width="20" height="3" rx="1.5" fill="white" opacity="0.7" />
        <rect x="14" y="28" width="12" height="3" rx="1.5" fill="white" opacity="0.5" />
        
        {/* Small accent dot */}
        <circle cx="38" cy="10" r="4" fill="hsl(var(--secondary))" opacity="0.8" />
      </svg>
      
      {showText && (
        <span className={cn('font-semibold tracking-tight', currentSize.text)}>
          PyTake
        </span>
      )}
    </div>
  )
}