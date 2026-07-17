import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * The PKCE landing point: Supabase sends the browser back here with a `code`,
 * which is traded for a session. The cookies the exchange writes are set by the
 * Route Handler itself (unlike a Server Component, it may set them).
 */

/** Only follow `next` when it is a path on this site — never an absolute URL. */
function safeNextPath(next: string | null): string {
  if (!next) return "/";
  if (!next.startsWith("/") || next.startsWith("//")) return "/";
  return next;
}

function signInWithError(origin: string, message: string): NextResponse {
  const url = new URL("/sign-in", origin);
  url.searchParams.set("error", message);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = new URL(request.url);

  // Supabase reports a refused/expired link by query string, not by omitting `code`.
  const providerError = searchParams.get("error_description") ?? searchParams.get("error");
  if (providerError) {
    return signInWithError(origin, providerError);
  }

  const code = searchParams.get("code");
  if (!code) {
    return signInWithError(origin, "That sign-in link is missing its code. Please try again.");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return signInWithError(origin, error.message);
  }

  return NextResponse.redirect(new URL(safeNextPath(searchParams.get("next")), origin));
}
