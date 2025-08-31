"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface SliderProps {
  className?: string
  value?: number[]
  defaultValue?: number[]
  min?: number
  max?: number
  step?: number
  onValueChange?: (values: number[]) => void
  disabled?: boolean
}

const Slider = React.forwardRef<HTMLDivElement, SliderProps>(
  ({ className, value, defaultValue = [50], min = 0, max = 100, step = 1, onValueChange, disabled, ...props }, ref) => {
    const [internalValue, setInternalValue] = React.useState(value || defaultValue)
    const currentValue = value || internalValue
    const currentValuePercent = ((currentValue[0] - min) / (max - min)) * 100

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = [Number(event.target.value)]
      setInternalValue(newValue)
      onValueChange?.(newValue)
    }

    return (
      <div
        ref={ref}
        className={cn(
          "relative flex w-full touch-none select-none items-center",
          className
        )}
        {...props}
      >
        <div className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary">
          <div 
            className="absolute h-full bg-primary transition-all duration-150" 
            style={{ width: `${currentValuePercent}%` }}
          />
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={currentValue[0]}
          onChange={handleChange}
          disabled={disabled}
          className="absolute w-full h-5 opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />
        <div 
          className="absolute block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
          style={{ 
            left: `calc(${currentValuePercent}% - 10px)`,
            top: '50%',
            transform: 'translateY(-50%)'
          }}
        />
      </div>
    )
  }
)
Slider.displayName = "Slider"

export { Slider }