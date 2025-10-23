import { Crown } from 'lucide-react'

interface VipBadgeProps {
  isVip?: boolean
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
}

export function VipBadge({ isVip = false, size = 'md', showLabel = true, className = '' }: VipBadgeProps) {
  if (!isVip) return null

  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2 py-1 text-sm',
    lg: 'px-2.5 py-1.5 text-base'
  }

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16
  }

  return (
    <span 
      className={`inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-yellow-400 via-yellow-500 to-amber-500 text-white font-medium shadow-sm ${sizeClasses[size]} ${className}`}
      title="Contato VIP"
    >
      <Crown size={iconSizes[size]} className="fill-white" />
      {showLabel && <span>VIP</span>}
    </span>
  )
}

export function VipIcon({ size = 16, className = '' }: { size?: number, className?: string }) {
  return (
    <span title="Contato VIP" aria-label="Contato VIP" className="inline-flex">
      <Crown 
        size={size} 
        className={`text-yellow-500 fill-yellow-500 ${className}`}
      />
    </span>
  )
}
