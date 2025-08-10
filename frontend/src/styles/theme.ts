// PyTake Design System Theme Configuration

export const colors = {
  // Primary Brand Colors
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6', // Main brand color
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
    950: '#172554'
  },
  
  // Secondary Colors (WhatsApp Green Accent)
  secondary: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e', // WhatsApp inspired green
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
    950: '#052e16'
  },
  
  // Semantic Colors
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d'
  },
  
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f'
  },
  
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d'
  },
  
  info: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9',
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e'
  },
  
  // Neutral Colors
  gray: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    950: '#020617'
  },
  
  // Dark Theme Colors
  dark: {
    bg: {
      primary: '#0f172a',
      secondary: '#1e293b',
      tertiary: '#334155'
    },
    text: {
      primary: '#f8fafc',
      secondary: '#e2e8f0',
      tertiary: '#cbd5e1'
    },
    border: '#374151'
  },
  
  // Light Theme Colors
  light: {
    bg: {
      primary: '#ffffff',
      secondary: '#f8fafc',
      tertiary: '#f1f5f9'
    },
    text: {
      primary: '#0f172a',
      secondary: '#334155',
      tertiary: '#64748b'
    },
    border: '#e2e8f0'
  }
};

export const typography = {
  fontFamily: {
    sans: ['Inter', 'system-ui', 'sans-serif'],
    mono: ['JetBrains Mono', 'Monaco', 'Consolas', 'monospace']
  },
  
  fontSize: {
    xs: ['12px', { lineHeight: '16px' }],
    sm: ['14px', { lineHeight: '20px' }],
    base: ['16px', { lineHeight: '24px' }],
    lg: ['18px', { lineHeight: '28px' }],
    xl: ['20px', { lineHeight: '28px' }],
    '2xl': ['24px', { lineHeight: '32px' }],
    '3xl': ['30px', { lineHeight: '36px' }],
    '4xl': ['36px', { lineHeight: '40px' }],
    '5xl': ['48px', { lineHeight: '1' }],
    '6xl': ['60px', { lineHeight: '1' }]
  },
  
  fontWeight: {
    thin: '100',
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900'
  }
};

export const spacing = {
  0: '0px',
  0.5: '2px',
  1: '4px',
  1.5: '6px',
  2: '8px',
  2.5: '10px',
  3: '12px',
  3.5: '14px',
  4: '16px',
  5: '20px',
  6: '24px',
  7: '28px',
  8: '32px',
  9: '36px',
  10: '40px',
  11: '44px',
  12: '48px',
  14: '56px',
  16: '64px',
  20: '80px',
  24: '96px',
  28: '112px',
  32: '128px',
  36: '144px',
  40: '160px',
  44: '176px',
  48: '192px',
  52: '208px',
  56: '224px',
  60: '240px',
  64: '256px',
  72: '288px',
  80: '320px',
  96: '384px'
};

export const borderRadius = {
  none: '0px',
  sm: '2px',
  base: '4px',
  md: '6px',
  lg: '8px',
  xl: '12px',
  '2xl': '16px',
  '3xl': '24px',
  full: '9999px'
};

export const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)'
};

export const animations = {
  transitions: {
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    normal: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '500ms cubic-bezier(0.4, 0, 0.2, 1)'
  },
  
  keyframes: {
    fadeIn: {
      from: { opacity: '0' },
      to: { opacity: '1' }
    },
    slideInRight: {
      from: { transform: 'translateX(100%)' },
      to: { transform: 'translateX(0)' }
    },
    slideInLeft: {
      from: { transform: 'translateX(-100%)' },
      to: { transform: 'translateX(0)' }
    },
    slideInDown: {
      from: { transform: 'translateY(-100%)' },
      to: { transform: 'translateY(0)' }
    },
    slideInUp: {
      from: { transform: 'translateY(100%)' },
      to: { transform: 'translateY(0)' }
    },
    scaleIn: {
      from: { transform: 'scale(0.9)', opacity: '0' },
      to: { transform: 'scale(1)', opacity: '1' }
    },
    pulse: {
      '0%, 100%': { opacity: '1' },
      '50%': { opacity: '0.5' }
    },
    spin: {
      from: { transform: 'rotate(0deg)' },
      to: { transform: 'rotate(360deg)' }
    }
  }
};

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px'
};

// Component variants
export const components = {
  button: {
    variants: {
      primary: {
        bg: colors.primary[500],
        hoverBg: colors.primary[600],
        activeBg: colors.primary[700],
        text: '#ffffff',
        border: 'transparent'
      },
      secondary: {
        bg: colors.gray[100],
        hoverBg: colors.gray[200],
        activeBg: colors.gray[300],
        text: colors.gray[900],
        border: colors.gray[300]
      },
      success: {
        bg: colors.success[500],
        hoverBg: colors.success[600],
        activeBg: colors.success[700],
        text: '#ffffff',
        border: 'transparent'
      },
      danger: {
        bg: colors.error[500],
        hoverBg: colors.error[600],
        activeBg: colors.error[700],
        text: '#ffffff',
        border: 'transparent'
      },
      ghost: {
        bg: 'transparent',
        hoverBg: colors.gray[100],
        activeBg: colors.gray[200],
        text: colors.gray[700],
        border: 'transparent'
      },
      outline: {
        bg: 'transparent',
        hoverBg: colors.primary[50],
        activeBg: colors.primary[100],
        text: colors.primary[600],
        border: colors.primary[300]
      }
    },
    sizes: {
      sm: {
        padding: '6px 12px',
        fontSize: typography.fontSize.sm[0],
        borderRadius: borderRadius.md
      },
      md: {
        padding: '8px 16px',
        fontSize: typography.fontSize.base[0],
        borderRadius: borderRadius.lg
      },
      lg: {
        padding: '12px 24px',
        fontSize: typography.fontSize.lg[0],
        borderRadius: borderRadius.xl
      },
      xl: {
        padding: '16px 32px',
        fontSize: typography.fontSize.xl[0],
        borderRadius: borderRadius.xl
      }
    }
  },
  
  input: {
    base: {
      bg: colors.light.bg.primary,
      border: colors.gray[300],
      focusBorder: colors.primary[500],
      text: colors.light.text.primary,
      placeholder: colors.gray[400],
      borderRadius: borderRadius.lg,
      padding: '12px 16px',
      fontSize: typography.fontSize.base[0]
    },
    dark: {
      bg: colors.dark.bg.secondary,
      border: colors.gray[600],
      focusBorder: colors.primary[400],
      text: colors.dark.text.primary,
      placeholder: colors.gray[500]
    }
  },
  
  card: {
    base: {
      bg: colors.light.bg.primary,
      border: colors.gray[200],
      borderRadius: borderRadius.xl,
      shadow: shadows.base,
      padding: spacing[6]
    },
    dark: {
      bg: colors.dark.bg.secondary,
      border: colors.gray[700],
      shadow: '0 4px 6px -1px rgb(0 0 0 / 0.3)'
    }
  }
};

export const theme = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  animations,
  breakpoints,
  components
} as const;

export type Theme = typeof theme;
export default theme;