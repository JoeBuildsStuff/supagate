create schema if not exists supagate;

-- The app uses supabase-js from server code against this schema. Add
-- `supagate` to Supabase's exposed schemas, but keep browser roles revoked.

create table if not exists supagate.members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'member' check (role in ('admin', 'member')),
  status text not null default 'active' check (status in ('active', 'disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists supagate.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists supagate.group_members (
  group_id uuid not null references supagate.groups(id) on delete cascade,
  user_id uuid not null references supagate.members(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table if not exists supagate.apps (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  host text not null unique,
  description text,
  access_mode text not null default 'universal' check (access_mode in ('universal', 'restricted')),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists supagate.app_user_access (
  app_id uuid not null references supagate.apps(id) on delete cascade,
  user_id uuid not null references supagate.members(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (app_id, user_id)
);

create table if not exists supagate.app_group_access (
  app_id uuid not null references supagate.apps(id) on delete cascade,
  group_id uuid not null references supagate.groups(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (app_id, group_id)
);

create table if not exists supagate.audit_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  actor_user_id uuid references supagate.members(user_id) on delete set null,
  target_user_id uuid references supagate.members(user_id) on delete set null,
  app_id uuid references supagate.apps(id) on delete set null,
  host text,
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists members_email_idx on supagate.members (lower(email));
create index if not exists apps_host_idx on supagate.apps (lower(host));
create index if not exists audit_events_created_at_idx on supagate.audit_events (created_at desc);
create index if not exists audit_events_event_type_idx on supagate.audit_events (event_type);

create or replace function supagate.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists members_set_updated_at on supagate.members;
create trigger members_set_updated_at
before update on supagate.members
for each row execute function supagate.set_updated_at();

drop trigger if exists groups_set_updated_at on supagate.groups;
create trigger groups_set_updated_at
before update on supagate.groups
for each row execute function supagate.set_updated_at();

drop trigger if exists apps_set_updated_at on supagate.apps;
create trigger apps_set_updated_at
before update on supagate.apps
for each row execute function supagate.set_updated_at();

alter table supagate.members enable row level security;
alter table supagate.groups enable row level security;
alter table supagate.group_members enable row level security;
alter table supagate.apps enable row level security;
alter table supagate.app_user_access enable row level security;
alter table supagate.app_group_access enable row level security;
alter table supagate.audit_events enable row level security;

revoke all on schema supagate from anon, authenticated;
revoke all on all tables in schema supagate from anon, authenticated;
grant usage on schema supagate to service_role;
grant all on all tables in schema supagate to service_role;
grant all on all routines in schema supagate to service_role;
