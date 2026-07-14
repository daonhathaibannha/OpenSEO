/**
 * Bootstraps the first admin account for `AUTH_MODE=local_auth` self-hosted
 * deployments. Idempotent — safe to re-run; no-ops if the email already
 * exists or an admin already exists.
 *
 * Writes directly to the `user`/`account` tables (bypassing the app's
 * `getAuth()` Better Auth instance, which needs Cloudflare Workers-bound env
 * that isn't available to a standalone script) using the same password
 * hashing Better Auth itself uses (`better-auth/crypto`), so the seeded
 * account logs in normally through the regular email/password flow. The
 * shared organization isn't created here — it's created lazily on this
 * user's first real login (see src/server/auth/shared-local-organization.ts).
 *
 * Usage:
 *   Set INITIAL_ADMIN_EMAIL / INITIAL_ADMIN_NAME / INITIAL_ADMIN_PASSWORD in
 *   .env (or the environment), then:
 *     pnpm run seed:admin-user
 */

import process from "node:process";
import { randomUUID } from "node:crypto";
import { getPlatformProxy } from "wrangler";
import { drizzle as drizzleD1 } from "drizzle-orm/d1";
import { drizzle as drizzlePg } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import * as d1Schema from "../src/db/d1/schema";
import * as pgSchema from "../src/db/pg/schema";
import { loadLocalEnv } from "./cli-utils";

function exit(message: string): never {
  console.error(message);
  process.exit(1);
}

async function main() {
  loadLocalEnv();

  const email = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();
  const name = process.env.INITIAL_ADMIN_NAME?.trim();
  const password = process.env.INITIAL_ADMIN_PASSWORD;

  if (!email || !name || !password) {
    exit(
      "Set INITIAL_ADMIN_EMAIL, INITIAL_ADMIN_NAME, and INITIAL_ADMIN_PASSWORD " +
        "(in .env or the environment) before running this script.",
    );
  }
  if (password.length < 8) {
    exit("INITIAL_ADMIN_PASSWORD must be at least 8 characters.");
  }

  console.log("Connecting to the database...");
  const { env, dispose } = await getPlatformProxy<{
    DB?: D1Database;
    HYPERDRIVE?: { connectionString?: string };
    DATABASE_PROVIDER?: string;
  }>();

  try {
    if (env.DATABASE_PROVIDER === "postgres") {
      const connectionString = env.HYPERDRIVE?.connectionString;
      if (!connectionString) {
        exit(
          "DATABASE_PROVIDER=postgres requires a HYPERDRIVE binding (see wrangler.jsonc).",
        );
      }
      const sql = postgres(connectionString, { max: 1, fetch_types: false });
      try {
        // Structurally different query-builder types across dialects (same
        // trick src/db/index.ts uses, guarded there by schema-parity.test.ts)
        // — the D1 and Postgres schemas are asserted identical, so this is
        // safe for the plain select/insert calls seedAdmin makes.
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion
        const db = drizzlePg(sql, { schema: pgSchema }) as unknown as SeedDb;
        await seedAdmin(db, { email, name, password });
      } finally {
        await sql.end();
      }
    } else {
      if (!env.DB) {
        exit('D1 binding "DB" is not available (check wrangler.jsonc).');
      }
      await seedAdmin(drizzleD1(env.DB, { schema: d1Schema }), {
        email,
        name,
        password,
      });
    }
  } finally {
    await dispose();
  }
}

type SeedDb = ReturnType<typeof drizzleD1<typeof d1Schema>>;

async function seedAdmin(
  db: SeedDb,
  input: { email: string; name: string; password: string },
) {
  const existingByEmail = await db.query.user.findFirst({
    where: eq(d1Schema.user.email, input.email),
  });
  if (existingByEmail) {
    console.log(`User ${input.email} already exists — nothing to do.`);
    return;
  }

  const existingAdmin = await db.query.user.findFirst({
    where: eq(d1Schema.user.role, "admin"),
  });
  if (existingAdmin) {
    console.log(
      `An admin account already exists (${existingAdmin.email}) — nothing to do.`,
    );
    return;
  }

  const userId = randomUUID();
  const now = new Date();
  const hashedPassword = await hashPassword(input.password);

  await db.insert(d1Schema.user).values({
    id: userId,
    name: input.name,
    email: input.email,
    emailVerified: true,
    role: "admin",
    createdAt: now,
    updatedAt: now,
  });

  await db.insert(d1Schema.account).values({
    id: randomUUID(),
    accountId: userId,
    providerId: "credential",
    userId,
    password: hashedPassword,
    createdAt: now,
    updatedAt: now,
  });

  console.log(`Created admin account for ${input.email}.`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
