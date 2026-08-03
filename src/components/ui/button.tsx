import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold tracking-tight transition-all duration-300 ease-[cubic-bezier(.22,1,.36,1)] disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0 active:scale-[.97]",
  {
    variants: {
      variant: {
        /* Gold — reserved for the single most important action on screen */
        gold: "bg-[linear-gradient(100deg,#FFF0B8,#FFD54A_45%,#D9A81F)] text-ink shadow-[0_10px_30px_-10px_rgba(255,213,74,.7)] hover:shadow-[0_16px_44px_-12px_rgba(255,213,74,.85)] hover:brightness-110",
        /* Volt — standard actions */
        volt: "bg-[linear-gradient(100deg,#4B92FF,#2E7CF6_55%,#1B57B8)] text-white shadow-[0_10px_30px_-10px_rgba(46,124,246,.8)] hover:shadow-[0_16px_44px_-12px_rgba(46,124,246,.95)] hover:brightness-110",
        /* Glass — secondary */
        glass:
          "glass-soft text-foam hover:border-gold/45 hover:text-gold hover:bg-white/[.06]",
        /* Outline — tertiary */
        outline:
          "border border-white/12 text-mist hover:border-volt/60 hover:text-foam hover:bg-volt/10",
        ghost: "text-mist hover:text-foam hover:bg-white/[.06]",
      },
      size: {
        sm: "h-9 px-4 text-xs [&_svg]:size-4",
        md: "h-11 px-5 text-sm [&_svg]:size-4",
        lg: "h-13 px-7 text-[.95rem] [&_svg]:size-5",
        icon: "size-11 [&_svg]:size-5",
      },
    },
    defaultVariants: { variant: "volt", size: "md" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
