-- The dashboard-managed Data API exposed-schema list can be overridden by a
-- stale database-level authenticator role setting. Reset only that override so
-- Supabase's project-level Data API settings control PostgREST schemas again.
alter role authenticator reset pgrst.db_schemas;

notify pgrst, 'reload config';
notify pgrst, 'reload schema';

