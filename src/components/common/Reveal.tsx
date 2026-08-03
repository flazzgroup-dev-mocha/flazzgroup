"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { useMemo, type ElementType, type ReactNode } from "react";

const EASE = [0.22, 1, 0.36, 1] as const;

type Direction = "up" | "left" | "right" | "scale";

const offsets: Record<Direction, { x?: number; y?: number; scale?: number }> = {
  up: { y: 28 },
  left: { x: -32 },
  right: { x: 32 },
  scale: { scale: 0.94 },
};

type RevealProps = {
  children: ReactNode;
  className?: string;
  as?: ElementType;
  direction?: Direction;
  delay?: number;
  duration?: number;
  /** Stagger children that are wrapped in <RevealItem>. */
  stagger?: number;
  once?: boolean;
  amount?: number;
};

/**
 * Scroll-triggered entrance. When `stagger` is set it becomes the parent of a
 * staggered group — wrap each child in <RevealItem>.
 */
export function Reveal({
  children,
  className,
  as = "div",
  direction = "up",
  delay = 0,
  duration = 0.6,
  stagger,
  once = true,
  amount = 0.25,
}: RevealProps) {
  const reduced = useReducedMotion();
  // motion.create() is the current API, and memoising it keeps the component
  // identity stable — rebuilding it each render would remount the subtree.
  const MotionTag = useMemo(() => motion.create(as as ElementType), [as]);

  if (reduced) {
    const Tag = as;
    return <Tag className={className}>{children}</Tag>;
  }

  const variants: Variants = stagger
    ? {
        hidden: {},
        show: { transition: { staggerChildren: stagger, delayChildren: delay } },
      }
    : {
        hidden: { opacity: 0, ...offsets[direction] },
        show: {
          opacity: 1,
          x: 0,
          y: 0,
          scale: 1,
          transition: { duration, delay, ease: EASE },
        },
      };

  return (
    <MotionTag
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="show"
      viewport={{ once, amount }}
    >
      {children}
    </MotionTag>
  );
}

type RevealItemProps = {
  children: ReactNode;
  className?: string;
  as?: ElementType;
  direction?: Direction;
};

/** A single member of a staggered <Reveal stagger={…}> group. */
export function RevealItem({
  children,
  className,
  as = "div",
  direction = "up",
}: RevealItemProps) {
  const reduced = useReducedMotion();
  // motion.create() is the current API, and memoising it keeps the component
  // identity stable — rebuilding it each render would remount the subtree.
  const MotionTag = useMemo(() => motion.create(as as ElementType), [as]);

  if (reduced) {
    const Tag = as;
    return <Tag className={className}>{children}</Tag>;
  }

  return (
    <MotionTag
      className={className}
      variants={{
        hidden: { opacity: 0, ...offsets[direction] },
        show: {
          opacity: 1,
          x: 0,
          y: 0,
          scale: 1,
          transition: { duration: 0.55, ease: EASE },
        },
      }}
    >
      {children}
    </MotionTag>
  );
}
