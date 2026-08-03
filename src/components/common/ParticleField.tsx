/**
 * Ambient particle layer for the hero.
 * Positions are a fixed table (never Math.random) so server and client
 * markup match exactly and nothing shifts on hydration.
 */

const particles = [
  { left: "8%", top: "18%", size: 4, delay: 0, dur: 13, gold: true },
  { left: "18%", top: "72%", size: 3, delay: 1.4, dur: 16, gold: false },
  { left: "27%", top: "34%", size: 2, delay: 2.6, dur: 11, gold: true },
  { left: "38%", top: "84%", size: 5, delay: 0.7, dur: 18, gold: false },
  { left: "46%", top: "12%", size: 3, delay: 3.1, dur: 14, gold: true },
  { left: "58%", top: "62%", size: 2, delay: 1.9, dur: 12, gold: false },
  { left: "66%", top: "26%", size: 4, delay: 0.4, dur: 17, gold: true },
  { left: "74%", top: "88%", size: 3, delay: 2.2, dur: 15, gold: false },
  { left: "83%", top: "44%", size: 5, delay: 1.1, dur: 19, gold: true },
  { left: "91%", top: "16%", size: 2, delay: 3.6, dur: 13, gold: false },
  { left: "95%", top: "70%", size: 3, delay: 2.9, dur: 16, gold: true },
  { left: "12%", top: "50%", size: 2, delay: 4.2, dur: 14, gold: false },
];

export function ParticleField({ className }: { className?: string }) {
  return (
    <div aria-hidden className={className}>
      {particles.map((p, i) => (
        <span
          key={i}
          className="absolute rounded-full will-change-transform"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            background: p.gold ? "#FFD54A" : "#7FB0FF",
            boxShadow: `0 0 ${p.size * 4}px ${p.gold ? "rgba(255,213,74,.9)" : "rgba(127,176,255,.9)"}`,
            animation: `drift ${p.dur}s ease-in-out ${p.delay}s infinite, pulse-glow ${p.dur / 2}s ease-in-out ${p.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}
