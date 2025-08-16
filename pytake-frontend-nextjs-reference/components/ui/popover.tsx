'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface PopoverContextValue {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const PopoverContext = React.createContext<PopoverContextValue | undefined>(undefined)

interface PopoverProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

const Popover = ({ open: controlledOpen, onOpenChange, children }: PopoverProps) => {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false)
  
  const open = controlledOpen !== undefined ? controlledOpen : uncontrolledOpen
  const setOpen = onOpenChange || setUncontrolledOpen
  
  return (
    <PopoverContext.Provider value={{ open, onOpenChange: setOpen }}>
      {children}
    </PopoverContext.Provider>
  )
}

interface PopoverTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
}

const PopoverTrigger = React.forwardRef<HTMLButtonElement, PopoverTriggerProps>(
  ({ asChild, children, onClick, ...props }, ref) => {
    const context = React.useContext(PopoverContext)
    
    if (!context) {
      throw new Error('PopoverTrigger must be used within a Popover')
    }
    
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(e)
      context.onOpenChange(!context.open)
    }
    
    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children as any, {
        ...props,
        onClick: handleClick,
        ref,
      })
    }
    
    return (
      <button {...props} ref={ref} onClick={handleClick}>
        {children}
      </button>
    )
  }
)
PopoverTrigger.displayName = 'PopoverTrigger'

interface PopoverContentProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: 'start' | 'center' | 'end'
  sideOffset?: number
}

const PopoverContent = React.forwardRef<HTMLDivElement, PopoverContentProps>(
  ({ className, align = 'center', sideOffset = 4, children, ...props }, ref) => {
    const context = React.useContext(PopoverContext)
    const [position, setPosition] = React.useState({ top: 0, left: 0 })
    const contentRef = React.useRef<HTMLDivElement>(null)
    
    if (!context) {
      throw new Error('PopoverContent must be used within a Popover')
    }
    
    React.useEffect(() => {
      if (context.open && contentRef.current) {
        const trigger = contentRef.current.parentElement?.querySelector('button')
        if (trigger) {
          const rect = trigger.getBoundingClientRect()
          const contentRect = contentRef.current.getBoundingClientRect()
          
          let left = rect.left
          if (align === 'center') {
            left = rect.left + rect.width / 2 - contentRect.width / 2
          } else if (align === 'end') {
            left = rect.right - contentRect.width
          }
          
          // Keep within viewport
          left = Math.max(10, Math.min(left, window.innerWidth - contentRect.width - 10))
          
          setPosition({
            top: rect.bottom + sideOffset,
            left,
          })
        }
      }
    }, [context.open, align, sideOffset])
    
    if (!context.open) return null
    
    return (
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 z-40"
          onClick={() => context.onOpenChange(false)}
        />
        {/* Content */}
        <div
          ref={(node) => {
            contentRef.current = node
            if (typeof ref === 'function') ref(node)
            else if (ref) ref.current = node
          }}
          className={cn(
            'fixed z-50 w-72 rounded-md border bg-white dark:bg-slate-900 p-4 shadow-md outline-none',
            'animate-in fade-in-0 zoom-in-95',
            className
          )}
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
          }}
          {...props}
        >
          {children}
        </div>
      </>
    )
  }
)
PopoverContent.displayName = 'PopoverContent'

export { Popover, PopoverTrigger, PopoverContent }