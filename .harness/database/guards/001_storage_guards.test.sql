-- Harness Storage guardrails (Harness-owned; do not weaken or delete). ADR 0015.
-- Buckets and file policies are an authorization surface separate from tables.
-- Exceptions: comment on policy "..." on storage.objects is 'harness:allow-public <reason>';
begin;
create extension if not exists pgtap with schema extensions;
select plan(3);

-- The Storage schema exists only after the Storage service migrated; skip the checks otherwise.
create temporary table harness_storage_findings (check_id int, finding text);

do $$
begin
  if to_regclass('storage.buckets') is null then
    return;
  end if;
  -- 1. Every bucket limits file size and file types.
  insert into harness_storage_findings
  select 1, id::text from storage.buckets where file_size_limit is null or allowed_mime_types is null;
  -- 2. A public bucket serves files to anyone with the link; it needs an explicit exception policy comment.
  insert into harness_storage_findings
  select 2, b.id::text from storage.buckets b
  where b.public
    and not exists (
      select 1 from pg_policy pol
      where pol.polrelid = 'storage.objects'::regclass
        and pol.polcmd = 'r'
        and coalesce(obj_description(pol.oid, 'pg_policy'), '') like 'harness:allow-public%'
        and strpos(pg_get_expr(pol.polqual, pol.polrelid), format('bucket_id = %L', b.id)) > 0
    );
  -- 3. File policies are never always-true (true, 1 = 1, or ... OR true). Only read
  --    policies may carry the harness:allow-public exception; uploads always need an owner.
  insert into harness_storage_findings
  select 3, pol.polname::text from pg_policy pol
  cross join lateral (
    select coalesce(pg_get_expr(pol.polqual, pol.polrelid), '') as qual,
           coalesce(pg_get_expr(pol.polwithcheck, pol.polrelid), '') as check_expression
  ) expressions
  where pol.polrelid = 'storage.objects'::regclass
    and (
      expressions.qual ~* '^\(*\s*(true|(\d+)\s*=\s*\2)\s*\)*$' or expressions.qual ~* '\mor\s+true\M|\mtrue\s+or\M'
      or expressions.check_expression ~* '^\(*\s*(true|(\d+)\s*=\s*\2)\s*\)*$' or expressions.check_expression ~* '\mor\s+true\M|\mtrue\s+or\M'
    )
    and not (pol.polcmd = 'r' and coalesce(obj_description(pol.oid, 'pg_policy'), '') like 'harness:allow-public%');
end;
$$;

select is_empty(
  $$ select finding from harness_storage_findings where check_id = 1 $$,
  'every storage bucket sets file_size_limit and allowed_mime_types'
);
select is_empty(
  $$ select finding from harness_storage_findings where check_id = 2 $$,
  'every public storage bucket has a harness:allow-public read policy naming it'
);
select is_empty(
  $$ select finding from harness_storage_findings where check_id = 3 $$,
  'no storage.objects policy is always true, except read policies with a harness:allow-public comment'
);

select * from finish();
rollback;
