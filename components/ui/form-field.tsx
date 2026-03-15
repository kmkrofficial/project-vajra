"use client";

import * as React from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface FormFieldProps {
  /** Field label text */
  label: string;
  /** Links the label to an input via `for` attribute */
  htmlFor?: string;
  /** Short description shown below the label, above the control */
  description?: string;
  /** Tooltip shown on hover of the info icon next to the label */
  tooltip?: string;
  /** Shows a red asterisk after the label */
  required?: boolean;
  /** Shows a muted "(optional)" after the label */
  optional?: boolean;
  /** Constraint hint shown below the control (hidden when error is present) */
  constraint?: string;
  /** Validation error message shown below the control */
  error?: string;
  /** The form control (Input, Select, Textarea, etc.) */
  children: React.ReactNode;
  className?: string;
}

/**
 * Standard form field wrapper that provides consistent layout for
 * Label + tooltip + description + control + constraint/error.
 *
 * Usage:
 * ```tsx
 * <FormField label="Plan Name" tooltip="Displayed to members" required constraint="Min 2 characters">
 *   <Input ... />
 * </FormField>
 * ```
 */
export function FormField({
  label,
  htmlFor,
  description,
  tooltip,
  required,
  optional,
  constraint,
  error,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center gap-1.5">
        <label
          htmlFor={htmlFor}
          data-slot="label"
          className="flex items-center gap-1 text-sm leading-none font-medium select-none"
        >
          {label}
          {required && (
            <span className="text-destructive" aria-hidden="true">
              *
            </span>
          )}
          {optional && (
            <span className="text-muted-foreground text-xs font-normal">
              (optional)
            </span>
          )}
        </label>
        {tooltip && (
          <span className="group/tip relative inline-flex">
            <Info className="size-3.5 text-muted-foreground cursor-help" />
            <span
              role="tooltip"
              className="invisible opacity-0 group-hover/tip:visible group-hover/tip:opacity-100 transition-opacity absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[220px] rounded-md bg-popover px-3 py-1.5 text-xs text-popover-foreground shadow-md border border-border"
            >
              {tooltip}
            </span>
          </span>
        )}
      </div>
      {description && (
        <p className="text-xs text-muted-foreground leading-relaxed">
          {description}
        </p>
      )}
      {children}
      {constraint && !error && (
        <p className="text-[11px] text-muted-foreground">{constraint}</p>
      )}
      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
