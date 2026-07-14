import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import {
  isEmailVerificationBypassed,
  isHostedClientAuthMode,
  isLoginRequiredClientMode,
} from "@/lib/auth-mode";
import {
  getCurrentAuthRedirectFromHref,
  getSignInSearch,
  getVerifyEmailSearch,
} from "@/lib/auth-redirect";

// Named for its original hosted-only scope; the redirect/render gating below
// now also covers `local_auth` (isLoginRequiredClientMode) since both modes
// require a real Better Auth session before rendering app routes. The
// returned `isHostedMode` stays narrowly `hosted`-only — callers use it for
// billing-specific UI (e.g. FreePlanBanner) that must never show in
// local_auth, which has no billing concept at all.
export function useHostedAuthRouteGuard() {
  const navigate = useNavigate();
  const { data: session, isPending } = useSession();
  const loginRequired = isLoginRequiredClientMode();
  const isHostedMode = isHostedClientAuthMode();
  const emailVerified =
    session?.user?.emailVerified === true || isEmailVerificationBypassed();

  useEffect(() => {
    if (isPending || !loginRequired) {
      return;
    }

    const redirectTo = getCurrentAuthRedirectFromHref(window.location.href);

    if (!session?.user?.id) {
      void navigate({
        to: "/sign-in",
        search: getSignInSearch(redirectTo),
        replace: true,
      });
      return;
    }

    if (!emailVerified) {
      void navigate({
        to: "/verify-email",
        search: getVerifyEmailSearch(session.user.email, redirectTo),
        replace: true,
      });
    }
  }, [
    isPending,
    loginRequired,
    emailVerified,
    session?.user?.email,
    session?.user?.id,
    navigate,
  ]);

  const hasVerifiedSession =
    !isPending && Boolean(session?.user?.id) && emailVerified;

  return {
    isHostedMode,
    canRenderAuthenticatedContent: !loginRequired || hasVerifiedSession,
  };
}
