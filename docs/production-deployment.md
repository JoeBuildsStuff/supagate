# Production Deployment

This guide describes a reusable production pattern for running Supagate on a
self-managed server. It intentionally uses placeholder hostnames, paths, and
repository names so it can be adapted without publishing private infrastructure
details.

## Recommended Flow

```text
Developer pushes to Git
  -> CI builds ghcr.io/<owner>/<repo>:latest
  -> server pulls the image
  -> Docker Compose recreates the supagate container
  -> reverse proxy routes https://auth.example.com to the container
```

For unattended updates, run Watchtower or another image updater in label-enable
mode. For stricter change control, skip Watchtower and update manually with
`docker compose pull && docker compose up -d`.

## Example Compose Stack

```yaml
services:
  supagate:
    image: ghcr.io/<owner>/<repo>:latest
    restart: unless-stopped
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
    labels:
      - "com.centurylinklabs.watchtower.enable=true"
      - "com.centurylinklabs.watchtower.scope=supagate"
    networks:
      - proxy

  watchtower-supagate:
    image: containrrr/watchtower:latest
    restart: unless-stopped
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    command: --interval 300 --label-enable --scope supagate
    environment:
      - WATCHTOWER_CLEANUP=true
      - WATCHTOWER_LABEL_ENABLE=true
    networks:
      - proxy

networks:
  proxy:
    external: true
```

## Environment

Use `.env.example` as the template:

```bash
cp .env.example .env
```

For production, set:

```text
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase-anon-key>
NEXT_PUBLIC_SITE_URL=https://auth.example.com
RESEND_API_KEY=<resend-api-key>
HEALTH_CHECK_TOKEN=<long-random-token>
SUPABASE_SERVICE_ROLE_KEY=<server-only-service-role-key>
SUPAGATE_ADMIN_EMAILS=<admin@example.com>
```

If Supagate protects multiple sibling subdomains, either let the app infer the
parent cookie domain from `NEXT_PUBLIC_SITE_URL` or set it explicitly:

```text
COOKIE_DOMAIN=.example.com
```

Apply the SQL migrations in `supabase/migrations` before deploying this access
policy layer. The server-side Supabase client reads and writes the `supagate`
schema with the service role key; do not expose that key to browser code. In
Supabase API settings, include `supagate` in the exposed schemas list so
server-side PostgREST calls can reach it; the migrations revoke `anon` and
`authenticated` access and grant only `service_role`.

If the Data API returns `PGRST106` and lists exposed schemas without
`supagate`, but the dashboard shows `supagate` selected, check for a stale
`authenticator` role override:

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

The reset is included in
`supabase/migrations/20260607233000_reset_stale_pgrst_schema_override.sql`.

## Admin UI

After deployment, sign in with an email in `SUPAGATE_ADMIN_EMAILS` and open:

```text
https://auth.example.com/workspace/admin
```

Use Apps to register protected hosts and choose `universal` or `restricted`.
Use Members and Groups to grant restricted-app access. Unknown hosts are denied
by default.

## Reverse Proxy

Route the public auth hostname to Supagate:

```text
https://auth.example.com -> http://supagate:3000
```

For Traefik forward-auth, point protected services at:

```text
http://supagate:3000/api/auth/verify
```

Users who need to sign in should be sent to:

```text
https://auth.example.com/login
```

## Supabase Configuration

Configure Supabase Auth redirect URLs for each environment:

```text
https://auth.example.com/auth/callback
http://localhost:3000/auth/callback
```

If you protect multiple apps behind the same parent domain, confirm that cookie
domain behavior matches your routing model before exposing private services.

## Manual Update

```bash
docker compose pull supagate
docker compose up -d supagate
```

## Verification

```bash
docker ps --format '{{.Names}}\t{{.Image}}\t{{.Status}}' | grep supagate
docker logs supagate --tail 80
curl -I https://auth.example.com/login
```

Expected public check:

```text
HTTP/2 200
```

## Rollback

Pin a known-good immutable tag:

```yaml
image: ghcr.io/<owner>/<repo>:sha-<commit>
```

Then redeploy:

```bash
docker compose pull supagate
docker compose up -d supagate
```
