# Self-Hosting Supagate

Supagate is intended to be self-hosted as one Docker container behind a reverse
proxy. The recommended setup is:

```text
Git push
  -> GitHub Actions builds a Docker image
  -> GHCR stores immutable and latest tags
  -> Docker Compose runs the image
  -> Watchtower or an equivalent updater pulls new images
  -> Traefik, Caddy, or nginx routes HTTPS traffic
```

This keeps app code, runtime config, and host operations separated.

## Recommended Architecture

Use a registry-published image rather than building source code directly on the
server:

- CI has a repeatable build environment.
- The server only needs Docker and Compose.
- Rollback can use an immutable `sha-<commit>` image tag.
- The running host does not need a checked-out application repository.

The published image name follows the GitHub repository path:

```text
ghcr.io/<owner>/<repo>:latest
```

Each push to `main` also publishes:

```text
ghcr.io/<owner>/<repo>:sha-<commit>
```

## Minimal Docker Compose

```yaml
services:
  supagate:
    image: ghcr.io/<owner>/<repo>:latest
    restart: unless-stopped
    ports:
      - "3000:3000"
    env_file:
      - .env
    environment:
      - HOSTNAME=0.0.0.0
      - NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
      - NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
      - RESEND_API_KEY=${RESEND_API_KEY}
      - HEALTH_CHECK_TOKEN=${HEALTH_CHECK_TOKEN}
```

For a public deployment, put this behind HTTPS and do not expose unauthenticated
admin-only services directly.

## Required Runtime Variables

Use `.env.example` as the template.

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL. Baked into the browser bundle when building the image. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/publishable key. Baked into the browser bundle when building the image. |
| `NEXT_PUBLIC_SITE_URL` | Public origin, for redirects and URL validation. |
| `COOKIE_DOMAIN` | Optional parent cookie domain, e.g. `.example.com`, for cross-subdomain sessions. |
| `RESEND_API_KEY` | Server-side Resend key for email sending. |
| `HEALTH_CHECK_TOKEN` | Bearer token for protected health-check requests. |

`NEXT_PUBLIC_*` values are not secret. They are intentionally visible to
browsers and must be supplied at image build time. Runtime values should match
the values used to build the image.

## GitHub Actions Setup

The image publish workflow needs these repository variables or secrets:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL`

Repository variables are preferred for these three values because they are
public client configuration. Secrets also work if you prefer keeping all
deployment settings in the secrets UI.

## Reverse Proxy

Supagate works behind any proxy that forwards ordinary HTTP traffic to port
`3000`. For Traefik forward-auth, route protected services through:

```text
http://supagate:3000/api/auth/verify
```

Use the public Supagate app URL for login:

```text
https://<your-supagate-host>/login
```

Supagate uses `NEXT_PUBLIC_SITE_URL` and safe redirect handling to return users
to the originally requested service after login.

## Updates

For unattended updates, use Watchtower in label-enable mode or a similar image
updater. Scope labels are recommended so a fast poller only watches the service
that needs it:

```yaml
labels:
  - "com.centurylinklabs.watchtower.enable=true"
  - "com.centurylinklabs.watchtower.scope=supagate"
```

If you do not use Watchtower, update manually:

```bash
docker compose pull supagate
docker compose up -d supagate
```

## Rollback

Use the immutable image tag from a known-good commit:

```yaml
image: ghcr.io/<owner>/<repo>:sha-<commit>
```

Then run:

```bash
docker compose pull supagate
docker compose up -d supagate
```
