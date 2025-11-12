import * as React from "react"
import { cn } from "@/lib/utils"
import { Label } from "./label"

interface FormFieldProps {
  label?: string
  error?: string
  success?: string
  required?: boolean
  helpText?: string
  className?: string
  children: React.ReactNode
  id?: string
}

function FormField({
  label,
  error,
  success,
  required,
  helpText,
  className,
  children,
  id
}: FormFieldProps) {
  const generatedId = React.useId()
  const fieldId = id ?? generatedId
  const helpId = helpText ? `${fieldId}-help` : undefined
  const errorId = error ? `${fieldId}-error` : undefined

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label
          htmlFor={fieldId}
          className={cn(
            "text-sm font-medium",
            error && "text-destructive",
            success && "text-green-700"
          )}
        >
          {label}
          {required && (
            <span className="text-destructive ml-1" aria-label="obrigatório">
              *
            </span>
          )}
        </Label>
      )}

      <div className="relative">
        {React.isValidElement(children)
          ? React.cloneElement(children as React.ReactElement<any>, {
              id: fieldId,
              'aria-describedby': [helpId, errorId].filter(Boolean).join(' ') || undefined,
              'aria-invalid': error ? 'true' : undefined,
            })
          : children}
      </div>

      {helpText && (
        <p
          id={helpId}
          className="text-sm text-muted-foreground"
        >
          {helpText}
        </p>
      )}

      {error && (
        <p
          id={errorId}
          className="text-sm text-destructive"
          role="alert"
          aria-live="polite"
        >
          {error}
        </p>
      )}

      {success && !error && (
        <p
          className="text-sm text-green-700"
          aria-live="polite"
        >
          {success}
        </p>
      )}
    </div>
  )
}

export { FormField }