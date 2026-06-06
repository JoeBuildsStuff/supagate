Supabase + NextJS Authentication

## Deployment

The homelab deployment runs the published container image:

```text
ghcr.io/joebuildsstuff/supagate:latest
```

Pushes to `main` run `.github/workflows/publish-image.yml`, which builds the
Docker image and publishes both `latest` and `sha-<commit>` tags to GHCR.
The Dell OptiPlex runs this image from `homelab-dynamic/docker-compose.yml`;
Watchtower is label-enabled for the `supagate` container and pulls a new
`latest` image on its normal polling interval.

Set these GitHub repository variables or secrets before relying on the image
publish workflow:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL`

TODO: Get the password reset to work

TODO: get custom email templates to work with resend react email
