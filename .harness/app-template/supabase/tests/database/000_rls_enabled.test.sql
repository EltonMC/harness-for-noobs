-- Guardrail: every table exposed through the public schema must enable row
-- level security. A new table without RLS fails `pnpm db:test` and CI.
begin;
create extension if not exists pgtap with schema extensions;
select plan(1);

select is_empty(
  $$
    select format('%I.%I', n.nspname, c.relname)
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
      and not c.relrowsecurity
  $$,
  'every table in the public schema has row level security enabled'
);

select * from finish();
rollback;
