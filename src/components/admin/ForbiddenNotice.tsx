import Link from "next/link";
import { ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/surface";

/**
 * What an ADMIN sees when they reach a page reserved for the owner.
 *
 * Deliberately explicit — "this exists and you may not open it" — rather than a
 * 404. Pretending the page is missing would send a colleague hunting for a
 * broken link, and it hides nothing: the address is in the product's own
 * documentation. The refusal is enforced in the middleware, again in the page,
 * and again in every route handler behind it; the screen is only how it is
 * explained.
 */
export function ForbiddenNotice({
  title = "You do not have access to this page",
  description = "This section is limited to Super Admins. If you need it, ask the site owner to change your role.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <Card>
      <div className="grid place-items-center gap-4 px-6 py-16 text-center">
        <span className="grid size-14 place-items-center rounded-2xl border border-amber-400/25 bg-amber-400/10 text-amber-300">
          <ShieldAlert className="size-6" aria-hidden />
        </span>

        <div className="grid gap-2">
          <h1 className="text-lg font-bold text-foam">{title}</h1>
          <p className="mx-auto max-w-md text-sm text-mist">{description}</p>
        </div>

        <Button variant="glass" size="sm" asChild className="mt-1">
          <Link href="/admin">Back to dashboard</Link>
        </Button>
      </div>
    </Card>
  );
}
