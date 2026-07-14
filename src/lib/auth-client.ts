import { createAuthClient } from "better-auth/react";
import {
  adminClient,
  genericOAuthClient,
  inferAdditionalFields,
  organizationClient,
} from "better-auth/client/plugins";
import { captureClientEvent, resetAnalyticsUser } from "@/client/lib/posthog";
import { userAdditionalFields } from "@/lib/auth-options";
import { getSignInHrefForLocation } from "@/lib/auth-redirect";

export const authClient = createAuthClient({
  baseURL: typeof window !== "undefined" ? window.location.origin : "",
  plugins: [
    organizationClient(),
    genericOAuthClient(),
    inferAdditionalFields({ user: userAdditionalFields }),
    // Only used for session.user.role typing here (User Management gating in
    // Sidebar) — the actual admin actions go through our own server
    // functions (src/serverFunctions/userManagement.ts), not authClient.admin.*.
    adminClient(),
  ],
});

export const { useSession } = authClient;

export function signOutAndRedirect() {
  const signInHref = getSignInHrefForLocation(window.location);
  captureClientEvent("auth:sign_out");
  resetAnalyticsUser();
  void authClient.signOut({
    fetchOptions: {
      onSuccess: () => {
        window.location.assign(signInHref);
      },
    },
  });
}
