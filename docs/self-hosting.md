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
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
      - SUPAGATE_ADMIN_EMAILS=${SUPAGATE_ADMIN_EMAILS}
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
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only Supabase key used by Supagate admin/policy code. Never expose this in browser code. |
| `SUPAGATE_ADMIN_EMAILS` | Comma-separated email allowlist for bootstrapping Supagate admins on login. |

`NEXT_PUBLIC_*` values are not secret. They are intentionally visible to
browsers and must be supplied at image build time. Runtime values should match
the values used to build the image.

Apply the Supabase migrations in `supabase/migrations` before enabling
forward-auth enforcement. The server-side Supabase client reads and writes the
`supagate` schema with the service role key; browser clients must not receive
service role credentials. In Supabase API settings, include `supagate` in the
exposed schemas list so server-side PostgREST calls can reach it; the migrations
revoke `anon` and `authenticated` access and grant only `service_role`.

If Supabase still returns `PGRST106` and says `supagate` is not one of the
allowed schemas even after the dashboard shows it as exposed, check for a stale
PostgREST role override:

```sql
select r.rolname, s.setconfig
from pg_db_role_setting s
left join pg_roles r on r.oid = s.setrole
where array_to_string(s.setconfig, ',') ilike '%pgrst.db_schemas%';
```

Reset the stale override and reload PostgREST:

```sql
alter role authenticator reset pgrst.db_schemas;
notify pgrst, 'reload config';
notify pgrst, 'reload schema';
```

This is captured in migration
`20260607233000_reset_stale_pgrst_schema_override.sql`.

## Admin UI

After migrations and env vars are in place, sign in with an email listed in
`SUPAGATE_ADMIN_EMAILS` and open:

```text
/workspace/admin
```

Supagate auto-creates a member row for signed-in users. Emails in
`SUPAGATE_ADMIN_EMAILS` are bootstrapped as `admin`; all other new users are
created as active `member` users and can access only apps marked `universal`
until they receive direct or group access to restricted apps.

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
