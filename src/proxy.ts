import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Do not insert code between createServerClient and getUser(): it refreshes
  // the auth token, and skipping it logs users out at random.
  await supabase.auth.getUser();

  return supabaseResponse;
}

export const config = {
  matcher: [
    // `api/uploads` is excluded deliberately, not for speed. Proxy buffers request bodies up
    // to `experimental.proxyClientMaxBodySize` (10MB) and **silently truncates** anything
    // larger — no error, just a corrupted file and a console warning. Evidence uploads can be
    // far bigger than that, so they must not pass through here. The upload route authenticates
    // itself, which is required anyway: Proxy is never the authorisation boundary.
    "/((?!api/uploads|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
