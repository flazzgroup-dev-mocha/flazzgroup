"use client";

import * as React from "react";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { Plus } from "lucide-react";

import { cn } from "@/lib/utils";

const Accordion = AccordionPrimitive.Root;

const AccordionItem = React.forwardRef<
  React.ComponentRef<typeof AccordionPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(({ className, ...props }, ref) => (
  <AccordionPrimitive.Item
    ref={ref}
    className={cn(
      "glass seam group overflow-hidden rounded-2xl transition-colors duration-300",
      "data-[state=open]:border-gold/35 data-[state=open]:bg-white/[.05]",
      className
    )}
    {...props}
  />
));
AccordionItem.displayName = "AccordionItem";

const AccordionTrigger = React.forwardRef<
  React.ComponentRef<typeof AccordionPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Header className="flex">
    <AccordionPrimitive.Trigger
      ref={ref}
      className={cn(
        "flex flex-1 items-center justify-between gap-4 px-5 py-5 text-left text-[.95rem] font-semibold text-foam transition-colors sm:px-6 sm:text-base",
        "hover:text-gold data-[state=open]:text-gold",
        className
      )}
      {...props}
    >
      <span className="relative z-10">{children}</span>
      <span
        aria-hidden
        className="relative z-10 grid size-9 shrink-0 place-items-center rounded-full border border-white/12 bg-white/[.04] text-mist transition-all duration-300 group-hover:border-gold/45 group-hover:text-gold group-data-[state=open]:rotate-45 group-data-[state=open]:border-gold/60 group-data-[state=open]:bg-gold/12 group-data-[state=open]:text-gold"
      >
        <Plus className="size-4" />
      </span>
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
));
AccordionTrigger.displayName = "AccordionTrigger";

const AccordionContent = React.forwardRef<
  React.ComponentRef<typeof AccordionPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    className="overflow-hidden data-[state=closed]:animate-[acc-up_.28s_cubic-bezier(.22,1,.36,1)] data-[state=open]:animate-[acc-down_.32s_cubic-bezier(.22,1,.36,1)]"
    {...props}
  >
    <div
      className={cn(
        "relative z-10 px-5 pb-6 text-sm leading-relaxed text-mist sm:px-6",
        className
      )}
    >
      <div className="rule-gold mb-4 opacity-60" />
      {children}
    </div>
  </AccordionPrimitive.Content>
));
AccordionContent.displayName = "AccordionContent";

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
