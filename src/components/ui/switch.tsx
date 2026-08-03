"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";

const Switch = React.forwardRef<
  React.ComponentRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn(
      "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-white/12 transition-colors duration-300",
      "data-[state=unchecked]:bg-white/[.06]",
      "data-[state=checked]:border-gold/60 data-[state=checked]:bg-gold/80 data-[state=checked]:shadow-[0_0_18px_-4px_rgba(255,213,74,.8)]",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb
      className={cn(
        "pointer-events-none block size-4.5 rounded-full bg-foam shadow transition-transform duration-300 ease-[cubic-bezier(.22,1,.36,1)]",
        "data-[state=unchecked]:translate-x-0.5 data-[state=checked]:translate-x-[1.4rem] data-[state=checked]:bg-ink"
      )}
    />
  </SwitchPrimitive.Root>
));
Switch.displayName = "Switch";

/** Switch with a label and one-line explanation, used across admin forms. */
function SwitchRow({
  id,
  label,
  hint,
  checked,
  onCheckedChange,
  disabled,
}: {
  id: string;
  label: string;
  hint?: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-white/8 bg-white/[.02] px-4 py-3">
      <div className="min-w-0">
        <label
          htmlFor={id}
          className="block text-sm font-semibold text-foam select-none"
        >
          {label}
        </label>
        {hint ? <p className="mt-0.5 text-xs text-fog">{hint}</p> : null}
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
    </div>
  );
}

export { Switch, SwitchRow };
