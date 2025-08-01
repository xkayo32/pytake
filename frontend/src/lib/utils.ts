import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleDateString('pt-BR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function formatTime(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

export function getPlatformColor(platform: string): string {
  const colors: Record<string, string> = {
    whatsapp: 'bg-green-500',
    instagram: 'bg-gradient-to-r from-purple-500 to-pink-500',
    facebook: 'bg-blue-600',
    telegram: 'bg-blue-400',
    webchat: 'bg-gray-600',
    sms: 'bg-orange-500',
    email: 'bg-red-500',
    discord: 'bg-indigo-600',
    slack: 'bg-purple-600',
    linkedin: 'bg-blue-700',
    teams: 'bg-blue-800',
    default: 'bg-gray-500'
  }
  
  return colors[platform.toLowerCase()] || colors.default
}

export function getPlatformIcon(platform: string): string {
  const icons: Record<string, string> = {
    whatsapp: '💬',
    instagram: '📷',
    facebook: '👍',
    telegram: '✈️',
    webchat: '💻',
    sms: '📱',
    email: '📧',
    discord: '🎮',
    slack: '💼',
    linkedin: '🔗',
    teams: '👥',
    default: '💬'
  }
  
  return icons[platform.toLowerCase()] || icons.default
}