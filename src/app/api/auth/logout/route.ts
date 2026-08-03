import { NextResponse } from "next/server";

import { isSameOrigin } from "@/lib/api";
import { endSession, getSession } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";

export async function POST(request: Request) {
  // Cheap, but it stops a third-party page from signing an admin out mid-edit.
  if (!isSameOrigin(request)) {
    return NextResponse.json(
      { error: "Cross-origin requests are not allowed." },
      { status: 403 }
    );
  }

  // Read before clearing: afterwards there is nobody to attribute this to.
  const session = await getSession();

  await endSession();

  if (session) {
    await recordAudit({
      action: "LOGOUT",
      request,
      actor: { id: session.sub, email: session.email },
    });
  }

  return NextResponse.json({ data: { ok: true } });
}
