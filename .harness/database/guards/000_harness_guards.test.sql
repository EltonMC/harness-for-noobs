-- Harness database guardrails (Harness-owned; do not weaken or delete).
-- They run with `supabase test db .harness/database/guards` in `verify`, the
-- Database gate, and the production deploy. Each assertion lists the offending
-- objects so the agent can explain the fix in plain language.
--
-- Explicit, reviewable exceptions are object comments that start with a marker:
--   comment on policy "..." on public.x is 'harness:allow-public <reason>';
--   comment on function public.f() is 'harness:allow-security-definer <reason>';
--   comment on constraint x_user_id_fkey on public.x is 'harness:allow-restrict-user-delete <reason>';
begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

create temporary view harness_user_relations as
select c.oid, c.relname, c.relkind, n.nspname
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and not exists (select 1 from pg_depend d where d.objid = c.oid and d.deptype = 'e');

create temporary view harness_user_functions as
select p.oid, n.nspname, p.proname, p.prosecdef, p.proconfig,
  format('%I.%I(%s)', n.nspname, p.proname, pg_get_function_identity_arguments(p.oid)) as signature
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname in ('public', 'private')
  and p.prokind in ('f', 'p')
  and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e');

-- 1. Row level security: every public table decides who sees each row.
select is_empty(
  $$ select format('public.%I', relname) from harness_user_relations
     where relkind in ('r', 'p')
       and not (select relrowsecurity from pg_class where oid = harness_user_relations.oid) $$,
  'every table in the public schema has row level security enabled'
);

-- 2. Views run as their owner by default and silently bypass RLS.
select is_empty(
  $$ select format('public.%I', relname) from harness_user_relations r
     where relkind = 'v'
       and not exists (
         select 1 from unnest((select reloptions from pg_class where oid = r.oid)) option
         where lower(option) in ('security_invoker=true', 'security_invoker=on', 'security_invoker=1')
       ) $$,
  'every view in the public schema uses security_invoker = true'
);

-- 3. Materialized views cannot have RLS, so API roles must not read them.
select is_empty(
  $$ select format('public.%I', relname) from harness_user_relations
     where relkind = 'm'
       and (has_table_privilege('anon', oid, 'select') or has_table_privilege('authenticated', oid, 'select')) $$,
  'no materialized view in the public schema is readable by anon or authenticated'
);

-- 4. A policy of `true` gives the row to everyone the policy targets.
select is_empty(
  $$ select format('%I on public.%I', pol.polname, c.relname)
     from pg_policy pol
     join harness_user_relations c on c.oid = pol.polrelid
     where (pg_get_expr(pol.polqual, pol.polrelid) = 'true' or pg_get_expr(pol.polwithcheck, pol.polrelid) = 'true')
       and coalesce(obj_description(pol.oid, 'pg_policy'), '') not like 'harness:allow-public%' $$,
  'no public policy uses a bare true expression without a harness:allow-public comment'
);

-- 5. user_metadata is editable by the signed-in user and must not authorize access.
select is_empty(
  $$ select format('%I on public.%I', pol.polname, c.relname)
     from pg_policy pol
     join harness_user_relations c on c.oid = pol.polrelid
     where coalesce(pg_get_expr(pol.polqual, pol.polrelid), '') || coalesce(pg_get_expr(pol.polwithcheck, pol.polrelid), '') ilike '%user_metadata%' $$,
  'no public policy authorizes access with user_metadata'
);

-- 6. Security definer functions in public are callable through the API with elevated rights.
select is_empty(
  $$ select signature from harness_user_functions
     where nspname = 'public' and prosecdef
       and coalesce(obj_description(oid, 'pg_proc'), '') not like 'harness:allow-security-definer%' $$,
  'no security definer function lives in public without a harness:allow-security-definer comment'
);

-- 7. A mutable search_path lets a caller hijack the objects a function resolves.
select is_empty(
  $$ select signature from harness_user_functions
     where not exists (select 1 from unnest(proconfig) setting where setting like 'search_path=%') $$,
  'every function in public and private sets search_path'
);

-- 8. Exposing auth.users through a public view leaks every account's e-mail and metadata.
select is_empty(
  $$ select distinct format('public.%I', v.relname)
     from pg_rewrite rw
     join pg_depend d on d.classid = 'pg_rewrite'::regclass and d.objid = rw.oid
     join harness_user_relations v on v.oid = rw.ev_class
     where d.refobjid = 'auth.users'::regclass and v.relkind in ('v', 'm') $$,
  'no public view or materialized view reads auth.users'
);

-- 9. Every durable public relation documents its purpose.
select is_empty(
  $$ select format('public.%I', relname) from harness_user_relations
     where relkind in ('r', 'p', 'v', 'm')
       and coalesce(btrim(obj_description(oid, 'pg_class')), '') = '' $$,
  'every public table and view has a comment describing its purpose'
);

-- 10. Personal-data classification (LGPD): pii:none, pii:personal, or pii:sensitive.
select is_empty(
  $$ select format('public.%I.%I', c.relname, a.attname)
     from harness_user_relations c
     join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
     where c.relkind in ('r', 'p')
       and coalesce(col_description(c.oid, a.attnum), '') !~ '^pii:(none|personal|sensitive)(\s|$)' $$,
  'every public table column has a pii:none, pii:personal, or pii:sensitive comment'
);

-- 11. Deleting an account must not be blocked by rows that reference it.
select is_empty(
  $$ select format('%I on public.%I', con.conname, c.relname)
     from pg_constraint con
     join harness_user_relations c on c.oid = con.conrelid
     where con.contype = 'f'
       and con.confrelid = 'auth.users'::regclass
       and con.confdeltype not in ('c', 'n', 'd')
       and coalesce(obj_description(con.oid, 'pg_constraint'), '') not like 'harness:allow-restrict-user-delete%' $$,
  'every public foreign key to auth.users cascades or nulls on account deletion'
);

select * from finish();
rollback;
