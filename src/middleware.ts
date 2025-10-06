import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

const isByPassRoutes = ["/api(.*)", "/convex(.*)"];

const isPublicRoutes = ["/auth(.*)", "/"];

const isProtectedRoutes = [
  "/dashboard",
  "/admin-panel",
  "/campaign(.*)",
  "/client-view",
  "/collaboration",
  "/notifications",
  "/profile",
];

const PublicMatcher = createRouteMatcher(isPublicRoutes);
const ByPassMatcher = createRouteMatcher(isByPassRoutes);
const ProtectedMatcher = createRouteMatcher(isProtectedRoutes);

export default convexAuthNextjsMiddleware(
  async (request, { convexAuth }) => {
    if (ByPassMatcher(request)) return;

    const authed = await convexAuth.isAuthenticated();

    if (PublicMatcher(request) && authed) return

    if (ProtectedMatcher(request) && !authed) {
      return nextjsMiddlewareRedirect(request, "/auth/sign-in");
    }

    return;
  },
  {
    cookieConfig: { maxAge: 60 * 60 * 24 * 30 },
  }
);

export const config = {
  // The following matcher runs middleware on all routes
  // except static assets and API routes.
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
    "/",
  ],
};
