import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * Next.js 16: middleware.ts diganti proxy.ts (nama & pola sama).
 * - /admin/* : wajib login + role ADMIN
 * - /checkout, /orders, /account : wajib login
 * API (/api/*) dijaga di masing-masing route handler (balikan 401/403 JSON).
 */
export default auth((req) => {
  const { pathname } = req.nextUrl;
  const user = req.auth?.user as { role?: string } | undefined;

  if (pathname.startsWith("/admin")) {
    if (!user) {
      const url = new URL("/login", req.url);
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }
    if (user.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/?error=forbidden", req.url));
    }
    return;
  }

  if (!user) {
    const url = new URL("/login", req.url);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }
});

export const config = {
  matcher: ["/admin/:path*", "/checkout/:path*", "/orders/:path*", "/account/:path*"],
};
