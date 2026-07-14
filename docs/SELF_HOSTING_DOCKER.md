# Docker Self-Hosting

Run OpenSEO locally with Docker.

In Docker mode, OpenSEO uses `AUTH_MODE=local_noauth` (no auth checks, local admin user `admin@localhost`). Only expose it behind your own auth-protected reverse proxy, tunnel, or private network.

The default `compose.yaml` uses the published GHCR image:

- `ghcr.io/every-app/open-seo:latest`

## Prerequisites

- Docker Desktop (or Docker Engine + Docker Compose)

## Quickstart

```bash
cp .env.example .env
docker compose up -d
```

Open `http://localhost:<PORT>` (default `3001`).

Docker Compose passes `.env` values into the container, and `compose.yaml` enables `CLOUDFLARE_INCLUDE_PROCESS_ENV=true` so the Cloudflare Vite runtime can read them as Worker bindings during local self-hosting.

Optional env values:

- `PORT` (defaults to `3001`)
- `ALLOWED_HOST` (single reverse-proxy hostname to allow in Vite preview)
- `AUTH_MODE` (defaults to `local_noauth` — no login; set to `local_auth` to require sign-in, see [Requiring login](#requiring-login) below)
- `OPEN_SEO_IMAGE` (defaults to `ghcr.io/every-app/open-seo:latest`)

If you are putting Docker behind a reverse proxy or a temporary tunnel, remember that Docker self-hosting runs with app auth disabled. Only expose it behind your own auth-protected reverse proxy, tunnel, or private network, and add the public hostname before restarting:

```bash
ALLOWED_HOST=yourdomain.com docker compose up -d
```

You can also persist it in `.env`.

## Requiring login

By default (`AUTH_MODE=local_noauth`) anyone who reaches the URL is signed in
automatically — fine behind your own network/tunnel auth, but if you want an
actual login wall with admin-managed accounts, switch to `AUTH_MODE=local_auth`:

1. Add to `.env`:

   ```bash
   AUTH_MODE=local_auth
   BETTER_AUTH_SECRET=<openssl rand -base64 32>
   # The public URL you'll access the app at — e.g. your Cloudflare Tunnel
   # hostname. Not localhost, or cookies/CORS will reject requests once
   # you're behind a tunnel/reverse proxy.
   BETTER_AUTH_URL=https://yourdomain.example
   INITIAL_ADMIN_EMAIL=you@example.com
   INITIAL_ADMIN_NAME=Your Name
   INITIAL_ADMIN_PASSWORD=<a strong password>
   ```

2. Recreate the container so it picks up the new env:

   ```bash
   docker compose up -d --force-recreate
   ```

3. Bootstrap the first admin account (one-time; safe to re-run — it no-ops if
   an admin already exists):

   ```bash
   docker compose exec open-seo pnpm run seed:admin-user
   ```

4. Sign in at `/sign-in` with the `INITIAL_ADMIN_*` credentials. From there,
   use **User Management** (in the account menu) to add more accounts —
   email, full name, and password; email doubles as the username. Everyone
   added shares the same workspace/projects. There's no self-service sign-up
   and no email-based password reset (no email service is configured) — an
   admin resets a user's password directly from User Management instead.

`INITIAL_ADMIN_*` are only read once by the seed script — the app itself
never reads them, so it's fine to leave them in `.env` afterward.

## Pin to a specific image tag

Set `OPEN_SEO_IMAGE` in `.env` and restart:

```bash
OPEN_SEO_IMAGE=ghcr.io/every-app/open-seo:v1.2.3
docker compose up -d
```

## Build your own image locally

If you are testing local code changes, build and run a local tag with Compose
directly (`--build` forces it to build from `Dockerfile.selfhost` instead of
pulling):

```bash
OPEN_SEO_IMAGE=open-seo:local docker compose up -d --build
```

You can also persist `OPEN_SEO_IMAGE=open-seo:local` in `.env` so future
`docker compose up -d --build` runs don't need it inline.

## Common commands

- Restart service after env changes:

```bash
docker compose up -d open-seo
```

- Pull latest published image and restart:

```bash
docker compose pull && docker compose up -d
```

- Stop:

```bash
docker compose down
```

- Stop and remove volumes:

```bash
docker compose down -v
```

## Troubleshooting environment variables

To confirm Docker Compose is using the expected environment variables:

```bash
docker compose config
```

Check that `AUTH_MODE=local_noauth`.

If you changed `.env`, recreate the container so Compose reapplies it:

```bash
docker compose up -d --force-recreate open-seo
```
