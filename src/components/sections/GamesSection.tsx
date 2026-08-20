import Image from "next/image";

import { gameHref } from "@/lib/games";
import type { GameCard } from "@/lib/queries";
import { TrackedLink } from "@/components/analytics/TrackedLink";
import { SectionHeading } from "@/components/common/SectionHeading";
import { Reveal, RevealItem } from "@/components/common/Reveal";

/**
 * The game picker: choose a game, then go to its page.
 *
 * What this section does *not* show is deliberate. There is no price, no
 * amount and no currency anywhere in it — a visitor who has not chosen a game
 * has not asked about any of that, and everything transactional lives one
 * click away, on the page belonging to the game they picked.
 *
 * Nothing is hardcoded. The cards are rows from the `games` table and every
 * one of them links to `/top-up/<slug>`, so adding a game in the panel adds a
 * card and a page together, and neither can point somewhere the other does not.
 *
 * ---------------------------------------------------------------- the grid
 *
 * A fixed five across on desktop, three on tablet, two on phones, rather than
 * the "fit the row count to the card count" rule the brand strip uses. A
 * catalogue is a list that grows: the cards should stay the same size as games
 * are added, so a visitor scanning for a title finds it at the size they
 * learned it at, and adding a sixth game should extend the grid rather than
 * resize the first five.
 *
 * Square artwork, because that is the shape every game's key art is published
 * in — the previous 16:10 crop cut the top and bottom off every logo it was
 * given.
 */
export function GamesSection({ games }: { games: GameCard[] }) {
  if (games.length === 0) return null;

  return (
    <section
      id="games"
      aria-labelledby="games-title"
      className="relative scroll-mt-28 py-12 sm:py-16"
    >
      {/* Section lighting, matching the rest of the page. */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/4 left-1/2 -z-10 h-96 w-[46rem] max-w-[92vw] -translate-x-1/2 rounded-full bg-volt/10 blur-[130px]"
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Pilih game"
          title={
            <span id="games-title">
              Top Up <span className="text-royal">Game Favoritmu</span>
            </span>
          }
          note="Pilih game yang ingin kamu isi, lalu lanjutkan ke halaman game tersebut."
        />

        <Reveal
          stagger={0.05}
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5"
        >
          {games.map((game) => (
            <RevealItem key={game.id}>
              <TrackedLink
                href={gameHref(game)}
                aria-label={
                  game.topUpEnabled
                    ? `Top up ${game.name}`
                    : `Informasi ${game.name}`
                }
                event="game_click"
                params={{
                  item_id: game.id,
                  item_name: game.name,
                  destination: gameHref(game),
                }}
                className="glass seam lift group flex h-full flex-col overflow-hidden rounded-[1.15rem]"
              >
                {/*
                  1:1, and the card's whole height budget above the label.
                  `object-cover` on a square box means art that is already
                  square is untouched and art that is not is centre-cropped
                  rather than letterboxed.
                */}
                <div className="relative aspect-square overflow-hidden">
                  <Image
                    src={game.imageUrl}
                    alt=""
                    aria-hidden
                    fill
                    sizes="(max-width: 640px) 46vw, (max-width: 1024px) 30vw, 18vw"
                    unoptimized={game.imageUrl.endsWith(".svg")}
                    className="object-cover transition-transform duration-700 ease-[cubic-bezier(.22,1,.36,1)] group-hover:scale-105"
                  />
                </div>

                {/*
                  Compact by design: a title, one line of description, and the
                  action. The description is clamped rather than wrapped so a
                  long one cannot make its card taller than its neighbours —
                  every card in a row stays the same height whatever the copy.
                */}
                <div className="flex flex-1 flex-col gap-1 p-3 sm:p-3.5">
                  <h3 className="truncate text-sm font-bold text-foam transition-colors duration-300 group-hover:text-gold sm:text-base">
                    {game.name}
                  </h3>
                  {game.description ? (
                    <p className="line-clamp-2 text-[.72rem] leading-snug text-mist sm:text-xs">
                      {game.description}
                    </p>
                  ) : null}

                  {/*
                    The label states what the next page actually is. A game
                    with no top-up must not be advertised with the same words
                    as one that has it — that is the difference between a
                    catalogue and a promise the site cannot keep.
                  */}
                  <span className="mt-auto pt-2 text-[.68rem] font-semibold text-mist transition-colors duration-300 group-hover:text-gold sm:text-xs">
                    {game.topUpEnabled ? "Top up sekarang" : "Lihat info"}
                  </span>
                </div>
              </TrackedLink>
            </RevealItem>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
