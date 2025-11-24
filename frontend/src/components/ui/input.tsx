import { InputHTMLAttributes } from 'react'
import { clsx } from 'clsx'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={clsx(
        'w-full px-3 py-2 border border-slate-300 rounded-lg',
        'focus:outline-none focus:ring-2 focus:ring-blue-500',
        'disabled:bg-slate-100 disabled:cursor-not-allowed',
        className
      )}
      {...props}
    />
  )
}
