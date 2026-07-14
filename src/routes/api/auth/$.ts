import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";
import { getAuth, hasHostedAuthConfig, hasLocalAuthConfig } from "@/lib/auth";
import { getAuthMode } from "@/lib/auth-mode";

async function handleAuthRequest(request: Request) {
  const authMode = getAuthMode(env.AUTH_MODE);
  if (authMode !== "hosted" && authMode !== "local_auth") {
    return new Response("Not found", {
      status: 404,
    });
  }

  const isConfigured =
    authMode === "hosted" ? hasHostedAuthConfig() : hasLocalAuthConfig();
  if (!isConfigured) {
    return new Response("Missing Better Auth configuration", {
      status: 500,
    });
  }

  const auth = getAuth();
  return auth.handler(request);
}

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        return handleAuthRequest(request);
      },
      POST: async ({ request }: { request: Request }) => {
        return handleAuthRequest(request);
      },
    },
  },
});
