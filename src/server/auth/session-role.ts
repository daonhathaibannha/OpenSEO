// The Better Auth `admin` plugin adds `role` to the `user` schema and to
// auth.api.createUser/setRole's input/output types, but doesn't propagate it
// through auth.api.getSession()'s inferred return type here — so this reads
// it defensively off whatever session.user actually is at runtime (the
// column exists post-migration; see src/db/better-auth-schema.ts).
export function getUserRole(user: unknown): string | undefined {
  if (!user || typeof user !== "object" || !("role" in user)) {
    return undefined;
  }
  const role = (user as { role?: unknown }).role;
  return typeof role === "string" ? role : undefined;
}
