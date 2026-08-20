/**
 * Where a game lives, and what its page is.
 *
 * Deliberately free of `server-only`, Prisma and `next/headers`: the public
 * cards render on the server and the admin form previews the same route in the
 * browser, and a resolver that disagrees with itself between those two is a
 * link that works in the panel and 404s on the site.
 *
 * The routing rule is one line — a game's page is its slug under `/top-up` —
 * and that is the whole point of this release. It used to be a stored
 * destination per row, which meant every card was a second opinion about where
 * its game lived, and three of the four live rows were wrong.
 */

/** The section every game page sits under. */
export const TOP_UP_ROOT = "/top-up";

/**
 * The slug the site launched with, and the only one that has ever been
 * advertised.
 *
 * Used in exactly two places — the fallback below, and the seed — because a
 * URL that has been in ads and bookmarks has to keep answering even if its row
 * is renamed or deleted. It is not a licence to special-case Royal Dream
 * anywhere else: everything on the site reads the game with `topUpEnabled`.
 */
export const ROYAL_DREAM_SLUG = "royal-dream";

/** A game's own page. */
export function topUpPath(slug: string) {
  return `${TOP_UP_ROOT}/${slug}`;
}

/**
 * The historical top-up URL, kept as the last resort for links that must
 * resolve before any game row has been read.
 */
export const TOP_UP_PATH = topUpPath(ROYAL_DREAM_SLUG);

/**
 * Where "start a top up" should go.
 *
 * Takes whichever game currently owns the catalogue, so moving the top-up to
 * another game moves every call to action with it. Falls back to the launch
 * URL rather than to `/`, so a site with no game switched on still sends
 * people somewhere that answers.
 */
export function topUpHref(game: { slug: string } | null | undefined) {
  return game ? topUpPath(game.slug) : TOP_UP_PATH;
}

/** The href for a game card. */
export function gameHref(game: { slug: string }) {
  return topUpPath(game.slug);
}
