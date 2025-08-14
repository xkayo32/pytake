'use client'

import { useTheme } from 'next-themes'
import Image from 'next/image'
import { useEffect, useState } from 'react'

interface LogoProps {
  variant?: 'full' | 'icon'
  className?: string
  width?: number
  height?: number
}

export function Logo({ variant = 'full', className = '', width, height }: LogoProps) {
  const { theme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    // Return a placeholder with the same dimensions to avoid layout shift
    return (
      <div 
        className={className}
        style={{ 
          width: width || (variant === 'icon' ? 60 : 180), 
          height: height || 60 
        }}
      />
    )
  }

  const currentTheme = theme === 'system' ? resolvedTheme : theme
  const isDark = currentTheme === 'dark'

  if (variant === 'icon') {
    return (
      <Image
        src="/pytake-icon.svg"
        alt="PyTake"
        width={width || 60}
        height={height || 60}
        className={className}
        priority
      />
    )
  }

  return (
    <Image
      src={isDark ? '/pytake-logo-dark.svg' : '/pytake-logo.svg'}
      alt="PyTake - Automação WhatsApp Business"
      width={width || 180}
      height={height || 60}
      className={className}
      priority
    />
  )
}

// Inline SVG version for maximum performance
export function LogoInline({ variant = 'full', className = '' }: Omit<LogoProps, 'width' | 'height'>) {
  const { theme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const currentTheme = mounted ? (theme === 'system' ? resolvedTheme : theme) : 'light'
  const isDark = currentTheme === 'dark'

  if (variant === 'icon') {
    return (
      <svg 
        width="60" 
        height="60" 
        viewBox="0 0 60 60" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        <defs>
          <linearGradient id="iconGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#25D366', stopOpacity: 1 }} />
            <stop offset="50%" style={{ stopColor: '#20BD5C', stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: '#128C7E', stopOpacity: 1 }} />
          </linearGradient>
        </defs>
        
        <circle cx="30" cy="30" r="28" fill="url(#iconGradient)" opacity="0.15"/>
        
        <g transform="translate(30, 30)">
          <path 
            d="M0 -18C-9.94 -18 -18 -9.94 -18 0C-18 4.5 -16.5 8.5 -14 11.5L-16 19L-8 17C-5 18.5 -2.5 19 0 19C9.94 19 18 10.94 18 1C18 -8.94 9.94 -17 0 -17Z" 
            fill="url(#iconGradient)"
          />
          
          <path 
            d="M-4 -8C-4 -10 -3 -11 -1 -11C1 -11 2 -10 2 -8V-3C2 -1 1 0 -1 0H-3" 
            stroke="white" 
            strokeWidth="2.5" 
            strokeLinecap="round" 
            fill="none"
          />
          
          <circle cx="-1" cy="-8" r="1.5" fill="white"/>
          
          <rect x="4" y="-2" width="8" height="2" rx="1" fill="white" opacity="0.9"/>
          <rect x="4" y="2" width="6" height="2" rx="1" fill="white" opacity="0.7"/>
        </g>
      </svg>
    )
  }

  return (
    <svg 
      width="180" 
      height="60" 
      viewBox="0 0 180 60" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id={isDark ? "greenGradientDark" : "greenGradient"} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#25D366', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#128C7E', stopOpacity: 1 }} />
        </linearGradient>
      </defs>
      
      <g id="icon">
        <circle cx="30" cy="30" r="25" fill={`url(#${isDark ? 'greenGradientDark' : 'greenGradient'})`} opacity={isDark ? "0.2" : "0.1"}/>
        
        <path 
          d="M30 12C19.5 12 11 20.5 11 31C11 35.5 12.5 39.5 15 42.5L13 50L21 48C24 49.5 27.5 50.5 31 50.5C41.5 50.5 50 42 50 31.5C50 21 41.5 12.5 31 12.5C30.5 12.5 30 12.5 30 12Z" 
          fill={`url(#${isDark ? 'greenGradientDark' : 'greenGradient'})`}
        />
        
        <path 
          d="M28 20C28 18 29 17 31 17C33 17 34 18 34 20V25C34 27 33 28 31 28H29C27 28 26 29 26 31V36C26 38 27 39 29 39C31 39 32 38 32 36V31" 
          stroke="white" 
          strokeWidth="2" 
          strokeLinecap="round" 
          fill="none"
        />
        
        <circle cx="38" cy="31" r="1.5" fill="white"/>
        <circle cx="38" cy="25" r="1.5" fill="white"/>
      </g>
      
      <g id="text">
        <text x="65" y="35" fontFamily="Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" fontSize="28" fontWeight="800">
          <tspan fill="#25D366">Py</tspan>
          <tspan fill={isDark ? "#20BD5C" : "#128C7E"}>Take</tspan>
        </text>
        
        <text 
          x="65" 
          y="48" 
          fontFamily="Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" 
          fontSize="10" 
          fontWeight="500" 
          fill={isDark ? "#8696A0" : "#667781"}
          opacity={isDark ? "1" : "0.9"}
        >
          Automação Inteligente
        </text>
      </g>
    </svg>
  )
}