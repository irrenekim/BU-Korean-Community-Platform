import { clerkMiddleware } from "@clerk/nextjs/server";

// Clerk checks who is logged in on every request.
// (Next.js 16 calls this file proxy.ts — older versions called it middleware.ts.)
export default clerkMiddleware();

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
