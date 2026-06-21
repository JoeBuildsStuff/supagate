-- Access requests: a denied member can request access to a restricted app;
-- admins approve (granting direct app_user_access) or deny in the admin UI.
-- The request row is never itself a grant — authorization is always re-derived
-- from app_user_access / app_group_access on the next forward-auth request.

create table if not exists supagate.access_requests (
  id uuid primary key default gen_random_uuid(),
  app_id uuid not null references supagate.apps(id) on delete cascade,
  user_id uuid not null references supagate.members(user_id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'denied', 'cancelled')),
  note text,
  decided_by uuid references supagate.members(user_id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- At most one active pending request per member + app.
create unique index if not exists access_requests_one_pending_idx
  on supagate.access_requests (app_id, user_id)
  where status = 'pending';

create index if not exists access_requests_status_idx
  on supagate.access_requests (status, created_at desc);

drop trigger if exists access_requests_set_updated_at on supagate.access_requests;
create trigger access_requests_set_updated_at
before update on supagate.access_requests
for each row execute function supagate.set_updated_at();

alter table supagate.access_requests enable row level security;

revoke all on supagate.access_requests from anon, authenticated;
grant all on supagate.access_requests to service_role;
