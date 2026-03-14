-- Live metadata export queries
-- Date: 2026-03-13
--
-- Purpose:
-- - Read-only query pack for exporting the authoritative live schema metadata.
-- - Use this only to inspect and compare the live database.
--
-- Safe usage:
-- - run in Supabase SQL editor or against a privileged read-capable connection
-- - save results to files under supabase/baselines/
--
-- Do not:
-- - treat this as a migration
-- - modify rows based on this file

-- 1. Relevant relations and columns
select
  table_schema,
  table_name,
  ordinal_position,
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'customers',
    'transfers',
    'transfer_payments',
    'transfer_reference_counters',
    'organizations',
    'user_profiles',
    'fx_quotes'
  )
order by table_name, ordinal_position;

-- 2. Public views
select
  schemaname,
  viewname,
  definition
from pg_views
where schemaname = 'public'
  and viewname in (
    'transfer_balances'
  )
order by viewname;

-- 3. Primary keys, unique constraints, checks, and foreign keys
select
  tc.table_schema,
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_schema as foreign_table_schema,
  ccu.table_name as foreign_table_name,
  ccu.column_name as foreign_column_name
from information_schema.table_constraints tc
left join information_schema.key_column_usage kcu
  on tc.constraint_schema = kcu.constraint_schema
 and tc.constraint_name = kcu.constraint_name
 and tc.table_name = kcu.table_name
left join information_schema.constraint_column_usage ccu
  on tc.constraint_schema = ccu.constraint_schema
 and tc.constraint_name = ccu.constraint_name
where tc.table_schema = 'public'
  and tc.table_name in (
    'customers',
    'transfers',
    'transfer_payments',
    'transfer_reference_counters',
    'organizations',
    'user_profiles',
    'fx_quotes'
  )
order by tc.table_name, tc.constraint_type, tc.constraint_name, kcu.ordinal_position;

-- 4. Foreign-key update/delete rules
select
  tc.table_name,
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name as foreign_table_name,
  ccu.column_name as foreign_column_name,
  rc.update_rule,
  rc.delete_rule
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on tc.constraint_schema = kcu.constraint_schema
 and tc.constraint_name = kcu.constraint_name
 and tc.table_name = kcu.table_name
join information_schema.referential_constraints rc
  on tc.constraint_schema = rc.constraint_schema
 and tc.constraint_name = rc.constraint_name
join information_schema.constraint_column_usage ccu
  on rc.unique_constraint_schema = ccu.constraint_schema
 and rc.unique_constraint_name = ccu.constraint_name
where tc.table_schema = 'public'
  and tc.constraint_type = 'FOREIGN KEY'
  and tc.table_name in (
    'customers',
    'transfers',
    'transfer_payments',
    'organizations',
    'user_profiles',
    'fx_quotes'
  )
order by tc.table_name, tc.constraint_name, kcu.ordinal_position;

-- 5. Indexes
select
  schemaname,
  tablename,
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in (
    'customers',
    'transfers',
    'transfer_payments',
    'transfer_reference_counters',
    'organizations',
    'user_profiles',
    'fx_quotes'
  )
order by tablename, indexname;

-- 6. RLS enabled / forced flags
select
  n.nspname as table_schema,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n
  on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname in (
    'customers',
    'transfers',
    'transfer_payments',
    'transfer_reference_counters',
    'organizations',
    'user_profiles',
    'fx_quotes'
  )
order by c.relname;

-- 7. RLS policies
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename in (
    'customers',
    'transfers',
    'transfer_payments',
    'transfer_reference_counters',
    'organizations',
    'user_profiles',
    'fx_quotes'
  )
order by tablename, policyname;

-- 8. Table grants
select
  table_schema,
  table_name,
  grantee,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in (
    'customers',
    'transfers',
    'transfer_payments',
    'transfer_reference_counters',
    'organizations',
    'user_profiles',
    'fx_quotes'
  )
order by table_name, grantee, privilege_type;

-- 9. Public functions relevant to the current app and discovered live RPCs
select
  n.nspname as function_schema,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as identity_arguments,
  pg_get_function_result(p.oid) as result_type,
  p.prosecdef as security_definer,
  pg_get_functiondef(p.oid) as function_def
from pg_proc p
join pg_namespace n
  on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'format_transfer_reference_number',
    'next_transfer_reference_number',
    'assign_transfer_reference_number',
    'prevent_transfer_reference_number_change',
    'lock_transfer_core_fields_after_payment',
    'current_org_id',
    'refresh_transfer_status',
    'rls_auto_enable'
  )
order by p.proname, pg_get_function_identity_arguments(p.oid);

-- 10. Routine grants
select
  routine_schema,
  routine_name,
  grantee,
  privilege_type
from information_schema.routine_privileges
where routine_schema = 'public'
  and routine_name in (
    'format_transfer_reference_number',
    'next_transfer_reference_number',
    'assign_transfer_reference_number',
    'prevent_transfer_reference_number_change',
    'lock_transfer_core_fields_after_payment',
    'current_org_id',
    'refresh_transfer_status',
    'rls_auto_enable'
  )
order by routine_name, grantee, privilege_type;

-- 11. Non-internal triggers
select
  n.nspname as table_schema,
  c.relname as table_name,
  t.tgname as trigger_name,
  pg_get_triggerdef(t.oid, true) as trigger_def
from pg_trigger t
join pg_class c
  on c.oid = t.tgrelid
join pg_namespace n
  on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'customers',
    'transfers',
    'transfer_payments'
  )
  and not t.tgisinternal
order by c.relname, t.tgname;
