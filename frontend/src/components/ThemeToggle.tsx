'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { motion } from 'framer-motion';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="relative w-14 h-7 bg-gray-300 dark:bg-gray-600 rounded-full p-1 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
      aria-label="Toggle theme"
    >
      <motion.div
        className="w-5 h-5 bg-white dark:bg-gray-800 rounded-full shadow-md flex items-center justify-center"
        animate={{
          x: theme === 'dark' ? 24 : 0,
        }}
        transition={{
          type: 'spring',
          stiffness: 500,
          damping: 30,
        }}
      >
        {theme === 'light' ? (
          <Sun className="w-3 h-3 text-yellow-500" />
        ) : (
          <Moon className="w-3 h-3 text-indigo-400" />
        )}
      </motion.div>
    </button>
  );
}
