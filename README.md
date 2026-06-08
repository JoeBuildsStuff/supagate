# Supagate

Supagate is a small Next.js authentication gateway built on Supabase Auth. It
provides hosted sign-in, sign-up, password reset, session handling, and a
Traefik-compatible forward-auth endpoint for protecting personal homelab
services behind one shared Supabase login.

The app is designed to run as a single container. Public browser-facing values
are baked into the Next.js bundle at build time, while secrets such as Resend
and health-check tokens are injected at runtime.

## What It Provides

- Supabase email/password auth flows
- Cross-subdomain session cookies for homelab services
- `/api/auth/verify` for Traefik forward-auth with host-level app policy
- `/workspace/admin` for app, member, group, and audit management
- `/api/health` for authenticated health checks
- Optional Resend email integration
- Docker image publishing through GitHub Actions

## Documentation

- [Self-hosting guide](./docs/self-hosting.md): recommended generic Docker
  deployment strategy.
- [Production deployment guide](./docs/production-deployment.md): a reusable
  Compose, reverse-proxy, and image-update pattern.

## Local Development

```bash
corepack pnpm install --frozen-lockfile
cp .env.example .env.local
corepack pnpm dev
```

Open `http://localhost:3000`.

For local auth testing, configure Supabase Auth redirect URLs to include:

```text
http://localhost:3000/auth/callback
```

## Environment

Start from [.env.example](./.env.example). The required values are:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `RESEND_API_KEY`
- `HEALTH_CHECK_TOKEN`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPAGATE_ADMIN_EMAILS`

For production use, Supagate can infer the parent cookie domain from
`NEXT_PUBLIC_SITE_URL`. Set `COOKIE_DOMAIN=.example.com` only if you want to
override that inference.

Apply the SQL migrations in `supabase/migrations` before using the admin UI or
forward-auth policy layer. Supagate stores access policy in the `supagate`
schema and uses a server-only Supabase service role key to read/write it.

## Deployment Summary

Pushes to `main` publish a Docker image to:

```text
ghcr.io/<owner>/<repo>:latest
```

The image is built by [.github/workflows/publish-image.yml](./.github/workflows/publish-image.yml).
For self-hosting, run that image from Docker Compose and use Watchtower or an
equivalent updater if you want unattended container updates.

## Current TODOs

- Finish password reset verification.
- Finish custom email templates with Resend React Email.
