import { cn } from "@/lib/utils";

/**
 * Site name in the two-tone lockup: everything but the final word in the
 * foreground colour, the final word in gold. Keeps the brand's identity
 * intact while the name itself stays editable from the admin panel.
 */
export function Wordmark({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const words = name.trim().split(/\s+/);
  const last = words.length > 1 ? words.pop() : null;

  return (
    <span className={cn("tracking-tight", className)}>
      {words.join(" ")}
      {last ? <span className="text-gold">{words.length ? " " : ""}{last}</span> : null}
    </span>
  );
}
