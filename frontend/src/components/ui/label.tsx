import { LabelHTMLAttributes } from 'react'

interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {}

export function Label({ className = '', ...props }: LabelProps) {
  return (
    <label
      className={`block text-sm font-medium text-slate-700 mb-1 ${className}`}
      {...props}
    />
  )
}
