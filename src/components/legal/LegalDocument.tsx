import type { ReactNode } from "react";

export type LegalSection = {
  /** Also the anchor target, so the table of contents can link to it. */
  id: string;
  title: string;
  body: ReactNode;
};

/**
 * A long-form policy page: sticky table of contents beside numbered sections.
 *
 * The body of each section is wrapped in `.article-body`, the same typography
 * the blog uses — gold bullets, gold links, the same measure and leading — so a
 * policy reads like the rest of the site instead of like a pasted document.
 * That class styles *direct* children, which is why each section's body is a
 * flat run of `<p>` / `<ul>` rather than nested wrappers.
 */
export function LegalDocument({ sections }: { sections: LegalSection[] }) {
  return (
    <div className="mt-12 grid gap-10 lg:mt-16 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] lg:gap-14">
      <nav
        aria-label="Daftar isi"
        className="lg:sticky lg:top-28 lg:self-start"
      >
        <h2 className="font-mono text-[.65rem] font-bold tracking-[.2em] text-gold uppercase">
          Daftar isi
        </h2>
        <ol className="mt-4 grid gap-1">
          {sections.map((section, index) => (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                className="flex gap-2.5 rounded-lg py-1.5 text-sm text-mist transition-colors duration-300 hover:text-gold"
              >
                <span aria-hidden className="font-mono text-xs text-fog">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0">{section.title}</span>
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="grid gap-10 sm:gap-12">
        {sections.map((section, index) => (
          <section
            key={section.id}
            id={section.id}
            aria-labelledby={`${section.id}-title`}
            className="scroll-mt-28"
          >
            <h2
              id={`${section.id}-title`}
              className="flex items-baseline gap-3 text-xl leading-snug font-bold text-foam sm:text-2xl"
            >
              <span aria-hidden className="font-mono text-sm text-gold">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="min-w-0">{section.title}</span>
            </h2>

            <div className="article-body mt-4 text-[.95rem] sm:text-base">
              {section.body}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
