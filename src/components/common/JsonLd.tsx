/**
 * A `<script type="application/ld+json">` that cannot be broken out of.
 *
 * `JSON.stringify` is not an HTML escaper, which is the assumption this
 * replaces. It escapes quotes and backslashes for *JavaScript* and leaves `<`
 * exactly as it found it — so a settings field, an FAQ answer or an article
 * title containing the literal text `</script>` ends the block early, and
 * everything after it is parsed as markup rather than as data. The site CSP
 * allows inline script, so an injected `<script>` would run.
 *
 * Only an authenticated admin can write those fields today, which makes this a
 * privilege-escalation path rather than an open door — but the escaping costs
 * one replace and removes the class of bug entirely.
 *
 * U+2028 and U+2029 are unrelated to HTML: both are valid inside a JSON string
 * and were illegal inside a JavaScript string literal before ES2019, so older
 * parsers — some crawlers among them — reject the whole block.
 */
// `String.raw` because the replacement has to be the six *characters*
// backslash-u-0-0-3-c, not the character they denote. A plain "<" would
// substitute "<" for "<" and quietly do nothing at all.
const ESCAPES: Record<string, string> = {
  "<": String.raw`\u003c`,
  ">": String.raw`\u003e`,
  "&": String.raw`\u0026`,
  "\u2028": String.raw`\u2028`,
  "\u2029": String.raw`\u2029`,
};

export function serializeJsonLd(data: unknown) {
  return JSON.stringify(data).replace(
    /[<>&\u2028\u2029]/g,
    (character) => ESCAPES[character]
  );
}

export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      // Escaped above: no character in the payload can close this tag.
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
