/**
 * Brand glyphs that Lucide does not ship (chat platforms + socials).
 * Drawn in-house so nothing depends on a remote icon font.
 */
import type { SVGProps } from "react";

export function TelegramIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M21.9 4.3 18.7 19c-.24 1.06-.87 1.32-1.76.82l-4.87-3.6-2.35 2.27c-.26.26-.48.48-.98.48l.35-4.96 9.03-8.16c.4-.35-.08-.54-.6-.2L6.35 12.68l-4.8-1.5c-1.05-.33-1.07-1.05.22-1.55l18.78-7.24c.87-.32 1.63.2 1.35 1.9Z" />
    </svg>
  );
}

export function WhatsappIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M12.04 2C6.6 2 2.17 6.43 2.17 11.87c0 1.74.46 3.44 1.32 4.94L2 22.5l5.85-1.53a9.83 9.83 0 0 0 4.19.94h.01c5.43 0 9.86-4.43 9.86-9.87 0-2.64-1.03-5.12-2.9-6.98A9.8 9.8 0 0 0 12.04 2Zm0 18.05a8.2 8.2 0 0 1-4.18-1.14l-.3-.18-3.1.81.83-3.02-.2-.31a8.16 8.16 0 0 1-1.25-4.34c0-4.52 3.68-8.2 8.2-8.2 2.2 0 4.26.85 5.8 2.4a8.15 8.15 0 0 1 2.4 5.8c0 4.53-3.68 8.18-8.2 8.18Zm4.5-6.13c-.25-.13-1.46-.72-1.68-.8-.23-.09-.39-.13-.55.12s-.64.8-.78.97c-.14.16-.29.18-.53.06a6.7 6.7 0 0 1-1.98-1.22 7.42 7.42 0 0 1-1.37-1.7c-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.44.13-.14.17-.25.25-.41.09-.17.05-.31-.02-.44-.06-.12-.55-1.33-.76-1.82-.2-.48-.4-.42-.55-.42l-.47-.01a.9.9 0 0 0-.65.3c-.22.25-.86.84-.86 2.04s.88 2.37 1 2.53c.13.17 1.73 2.64 4.19 3.7.59.26 1.04.4 1.4.52.59.19 1.12.16 1.55.1.47-.07 1.46-.6 1.66-1.18.21-.58.21-1.07.15-1.17-.06-.11-.22-.17-.47-.29Z" />
    </svg>
  );
}

export function InstagramIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5.5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function TiktokIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M16.5 2h-2.9v13.2a2.5 2.5 0 1 1-2.1-2.47V9.78a5.6 5.6 0 1 0 5.06 5.57V8.9a6.7 6.7 0 0 0 3.9 1.25V7.2a3.86 3.86 0 0 1-3.96-3.9V2Z" />
    </svg>
  );
}

export function YoutubeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M22.2 7.4a2.7 2.7 0 0 0-1.9-1.9C18.6 5 12 5 12 5s-6.6 0-8.3.5A2.7 2.7 0 0 0 1.8 7.4 28.3 28.3 0 0 0 1.3 12c0 1.55.14 3.1.5 4.6a2.7 2.7 0 0 0 1.9 1.9c1.7.5 8.3.5 8.3.5s6.6 0 8.3-.5a2.7 2.7 0 0 0 1.9-1.9c.36-1.5.5-3.05.5-4.6s-.14-3.1-.5-4.6ZM9.9 15.2V8.8l5.6 3.2-5.6 3.2Z" />
    </svg>
  );
}

/** Logo lockup mark — reused in navbar, footer and og image. */
export function FlazzMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden {...props}>
      <defs>
        <linearGradient id="fm-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2E7CF6" />
          <stop offset="1" stopColor="#0D1B3D" />
        </linearGradient>
        <linearGradient id="fm-bolt" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFF6D4" />
          <stop offset="0.55" stopColor="#FFD54A" />
          <stop offset="1" stopColor="#D9A81F" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="14" fill="url(#fm-body)" />
      <rect
        x="0.75"
        y="0.75"
        width="46.5"
        height="46.5"
        rx="13.5"
        fill="none"
        stroke="#FFD54A"
        strokeOpacity="0.45"
        strokeWidth="1.5"
      />
      <path d="M27 8 14 27h8l-3 13 17-21h-9z" fill="url(#fm-bolt)" />
    </svg>
  );
}
