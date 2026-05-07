import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/teacher(.*)",
  "/admin(.*)",
  "/teacher/behaviour(.*)",
  "/admin/behaviour(.*)",
  "/apply(.*)",
  "/courses(.*)",
  "/progress(.*)",
  "/study-sessions(.*)",
  "/bookings(.*)",
  "/payments(.*)",
  "/assignments(.*)",
  "/calendar(.*)",
  "/attendance(.*)",
  "/sports(.*)",
  "/parent(.*)",
  "/profile(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
