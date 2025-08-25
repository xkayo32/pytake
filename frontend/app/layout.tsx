import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600", "700"],
});

const geistMono = Inter({
  variable: "--font-inter-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "PyTake - Automação WhatsApp Business",
  description: "Plataforma completa para automatizar seu WhatsApp Business com IA, fluxos visuais e integrações ERP",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${geistMono.variable} antialiased font-sans`}
      >
        <Script src="https://cdn.tailwindcss.com" strategy="beforeInteractive" />
        <Script id="tailwind-config" strategy="beforeInteractive">
          {`
            tailwind.config = {
              darkMode: 'class',
              theme: {
                extend: {
                  colors: {
                    // Cores principais do WhatsApp
                    primary: '#25D366',
                    'primary-dark': '#128C7E',
                    'primary-foreground': '#FFFFFF',
                    
                    // Cores do sistema usando CSS Variables
                    background: 'hsl(var(--background))',
                    foreground: 'hsl(var(--foreground))',
                    'foreground-secondary': 'hsl(var(--foreground-secondary))',
                    'foreground-tertiary': 'hsl(var(--foreground-tertiary))',
                    
                    // Superfícies
                    surface: 'hsl(var(--surface))',
                    'surface-secondary': 'hsl(var(--surface-secondary))',
                    
                    // Componentes
                    border: 'hsl(var(--border))',
                    input: 'hsl(var(--input))',
                    ring: 'hsl(var(--ring))',
                    
                    // Estados
                    muted: 'hsl(var(--muted))',
                    'muted-foreground': 'hsl(var(--muted-foreground))',
                    accent: 'hsl(var(--accent))',
                    'accent-foreground': 'hsl(var(--accent-foreground))',
                    
                    // Cards
                    card: 'hsl(var(--card))',
                    'card-foreground': 'hsl(var(--card-foreground))',
                    
                    // Feedback
                    destructive: 'hsl(var(--destructive))',
                    'destructive-foreground': 'hsl(var(--destructive-foreground))',
                    warning: 'hsl(var(--warning))',
                    'warning-foreground': 'hsl(var(--warning-foreground))',
                    success: 'hsl(var(--success))',
                    'success-foreground': 'hsl(var(--success-foreground))',
                    info: 'hsl(var(--info))',
                    'info-foreground': 'hsl(var(--info-foreground))',
                  },
                  fontFamily: {
                    sans: ['Inter', 'system-ui', 'sans-serif'],
                    mono: ['JetBrains Mono', 'monospace'],
                  },
                  animation: {
                    'fade-in': 'fadeIn 0.5s ease-in-out',
                    'slide-up': 'slideUp 0.3s ease-out',
                    'slide-down': 'slideDown 0.3s ease-out',
                  },
                }
              }
            }
          `}
        </Script>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ToastProvider>
            {children}
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
