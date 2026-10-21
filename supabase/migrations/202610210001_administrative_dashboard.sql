begin;
set local lock_timeout = '10s';
set local statement_timeout = '120s';

-- Review only. Private buckets keep IDs/paths; getPublicUrl requires a separate
-- frontend adaptation to downloads or short-lived signed URLs before deployment.
do $preconditions$
begin
  if to_regclass('public.contact_submissions') is null or to_regclass('public.coauthor_admins') is null
    or to_regclass('public.coauthor_books') is null or to_regclass('auth.users') is null
    or to_regclass('storage.objects') is null or to_regclass('storage.buckets') is null
    or to_regprocedure('auth.uid()') is null or to_regprocedure('public.touch_coauthor_book()') is null then
    raise exception 'Missing prerequisites: apply both 20261020 migrations in a Supabase-compatible database first';
  end if;
  if not exists(select 1 from pg_catalog.pg_roles where rolname='anon')
    or not exists(select 1 from pg_catalog.pg_roles where rolname='authenticated') then
    raise exception 'Missing Supabase API roles';
  end if;
  if not exists(select 1 from storage.buckets where id='coauthor-book-covers') then
    raise exception 'Missing existing coauthor-book-covers bucket';
  end if;
end;
$preconditions$;
create schema if not exists literare_private;
revoke all on schema literare_private from public,anon,authenticated;
create table if not exists literare_private.admin_guard (
  singleton boolean primary key default true check(singleton), revision bigint not null default 0
);
revoke all on literare_private.admin_guard from public,anon,authenticated;
insert into literare_private.admin_guard(singleton) values(true) on conflict do nothing;

-- Import ONLY on first creation. Reapplication cannot resurrect removed access.
do $bootstrap$
begin
  if to_regclass('public.dashboard_members') is null then
    create table public.dashboard_members (
      user_id uuid primary key references auth.users(id) on delete cascade,
      role text not null, modules text[] not null default '{}',active boolean not null default true,
      created_at timestamptz not null default now(),updated_at timestamptz not null default now()
    );
    insert into public.dashboard_members(user_id,role,created_at)
      select user_id,'admin',created_at from public.coauthor_admins;
  end if;
end;
$bootstrap$;

-- Empty string means omitted. NULL/separators-only/invalid characters deny.
-- Checksum validation cannot verify whether an ISBN was actually assigned.
create or replace function public.valid_isbn(value text) returns boolean
language plpgsql immutable security invoker set search_path='' as $isbn$
declare normalized text; checksum integer:=0; position integer;
begin
  if value is null or char_length(value)>30 then return false; end if;
  if value='' then return true; end if;
  if value !~ '^[0-9Xx -]+$' then return false; end if;
  normalized:=upper(translate(value,' -',''));
  if normalized ~ '^[0-9]{9}[0-9X]$' then
    if substr(normalized,1,9)='000000000' then return false; end if;
    for position in 1..10 loop
      checksum:=checksum+(11-position)*case when substr(normalized,position,1)='X' then 10 else substr(normalized,position,1)::integer end;
    end loop;
    return checksum%11=0;
  elsif normalized ~ '^97[89][0-9]{10}$' then
    for position in 1..13 loop
      checksum:=checksum+substr(normalized,position,1)::integer*case when position%2=0 then 3 else 1 end;
    end loop;
    return checksum%10=0;
  end if;
  return false;
end;
$isbn$;
create or replace function public.valid_editorial_items(items text[], minimum integer, maximum integer, max_chars integer) returns boolean
language sql immutable security invoker set search_path='' as $items$
  select coalesce(minimum>=1 and maximum>=minimum and max_chars>=1
    and array_ndims(items)=1 and cardinality(items) between minimum and maximum
    and not exists(select 1 from unnest(items) item where item is null or char_length(btrim(item)) not between 1 and max_chars),false);
$items$;
create table if not exists public.catalog_books (
  id uuid primary key default gen_random_uuid(),title text not null,authors text[] not null,
  isbn text not null default '',synopsis text not null default '',category text not null,
  cover_path text,purchase_url text not null default '',publication_status text not null default 'draft',
  created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table if not exists public.site_content (
  key text not null,state text not null,title text not null default '',body text not null default '',
  image_url text not null default '',items text[] not null default '{}',updated_at timestamptz not null default now(),primary key(key,state)
);
alter table public.contact_submissions add column if not exists status text not null default 'pending',
  add column if not exists updated_at timestamptz not null default now();

-- Fail closed on schema drift; never silently rewrite incompatible rows.
do $shape$
declare required record; actual text;
begin
  for required in select * from (values
    ('contact_submissions','id','uuid'),('contact_submissions','name','text'),('contact_submissions','email','text'),
    ('contact_submissions','phone','text'),('contact_submissions','message','text'),('contact_submissions','status','text'),
    ('contact_submissions','created_at','timestamp with time zone'),('contact_submissions','updated_at','timestamp with time zone'),
    ('coauthor_admins','user_id','uuid'),('coauthor_admins','created_at','timestamp with time zone'),
    ('coauthor_books','id','uuid'),('coauthor_books','title','text'),('coauthor_books','description','text'),
    ('coauthor_books','category','text'),('coauthor_books','editorial_coordinator','text'),('coauthor_books','cover_path','text'),
    ('coauthor_books','registration_status','text'),('coauthor_books','created_by','uuid'),
    ('coauthor_books','created_at','timestamp with time zone'),('coauthor_books','updated_at','timestamp with time zone'),
    ('dashboard_members','user_id','uuid'),('dashboard_members','role','text'),('dashboard_members','modules','text[]'),
    ('dashboard_members','active','boolean'),('dashboard_members','created_at','timestamp with time zone'),('dashboard_members','updated_at','timestamp with time zone'),
    ('catalog_books','id','uuid'),('catalog_books','title','text'),('catalog_books','authors','text[]'),('catalog_books','isbn','text'),
    ('catalog_books','synopsis','text'),('catalog_books','category','text'),('catalog_books','cover_path','text'),('catalog_books','purchase_url','text'),
    ('catalog_books','publication_status','text'),('catalog_books','created_at','timestamp with time zone'),('catalog_books','updated_at','timestamp with time zone'),
    ('site_content','key','text'),('site_content','state','text'),('site_content','title','text'),('site_content','body','text'),
    ('site_content','image_url','text'),('site_content','items','text[]'),('site_content','updated_at','timestamp with time zone')
  ) as expected(table_name,column_name,type_name)
  loop
    select pg_catalog.format_type(a.atttypid,a.atttypmod) into actual from pg_catalog.pg_attribute a
      where a.attrelid=('public.'||required.table_name)::regclass and a.attname=required.column_name and not a.attisdropped;
    if actual is distinct from required.type_name then
      raise exception 'Incompatible column %.%: expected %, found %',required.table_name,required.column_name,required.type_name,actual;
    end if;
    if required.column_name not in ('cover_path','created_by') and exists(
      select 1 from pg_catalog.pg_attribute where attrelid=('public.'||required.table_name)::regclass
        and attname=required.column_name and not attnotnull
    ) then
      raise exception 'Expected NOT NULL on %.%',required.table_name,required.column_name;
    end if;
  end loop;
end;
$shape$;

-- Validate named checks on new installation AND upgrade of the earlier draft.
-- Existing checks are retained. Invalid existing data aborts the transaction.
do $constraints$
declare item record;
begin
  for item in select * from (values
    ('dashboard_members','literare_members_role', $$role in ('admin','editorial','support','viewer')$$),
    ('dashboard_members','literare_members_modules', $$array_position(modules,null) is null and coalesce(array_ndims(modules),1)=1 and modules <@ array['coautorias','contatos','catalogo','conteudo','relatorios']::text[] and ((role='admin' and cardinality(modules)=0) or (role='editorial' and modules <@ array['coautorias','catalogo','conteudo','relatorios']::text[]) or (role='support' and modules <@ array['contatos','relatorios']::text[]) or role='viewer')$$),
    ('contact_submissions','literare_contact_status', $$status in ('pending','in_progress','completed')$$),
    ('catalog_books','literare_catalog_values', $$char_length(btrim(title)) between 1 and 180 and public.valid_editorial_items(authors,1,30,100) and public.valid_isbn(isbn) and char_length(synopsis)<=12000 and char_length(btrim(category)) between 1 and 100 and publication_status in ('draft','published') and (purchase_url='' or (purchase_url ~ '^https?://[^[:space:]]+$' and char_length(purchase_url)<=2000))$$),
    ('catalog_books','literare_catalog_cover', $$cover_path is null or cover_path ~ '^[a-f0-9-]{36}/[a-f0-9-]{36}/[a-f0-9-]{36}[.](jpg|png|webp)$'$$),
    ('site_content','literare_content_values', $$key in ('hero','about_intro','about_1','about_2','about_3','banner','categories','contact') and state in ('draft','published') and char_length(btrim(title)) between 1 and 100 and char_length(body)<=600 and ((key='categories' and public.valid_editorial_items(items,1,12,48)) or (key<>'categories' and cardinality(items)=0)) and (key in ('about_1','about_2','about_3','banner') or image_url='') and (image_url='' or (image_url ~ '^https://[^[:space:]]+$' and char_length(image_url)<=2000) or (image_url ~ '^/images/[a-zA-Z0-9/_.-]+$' and strpos(image_url,'..')=0))$$)
  ) as checks(table_name,constraint_name,expression)
  loop
    if not exists(select 1 from pg_catalog.pg_constraint where conrelid=('public.'||item.table_name)::regclass and conname=item.constraint_name) then
      execute format('alter table public.%I add constraint %I check (%s) not valid',item.table_name,item.constraint_name,item.expression);
    end if;
    execute format('alter table public.%I validate constraint %I',item.table_name,item.constraint_name);
  end loop;
end;
$constraints$;

create or replace function public.dashboard_allowed(resource text, writing boolean default false) returns boolean
language sql stable security definer set search_path='' as $allowed$
  select coalesce(auth.uid() is not null and writing is not null
    and resource in ('coautorias','contatos','catalogo','conteudo','relatorios','usuarios')
    and not(writing and resource='relatorios')
    and exists(select 1 from public.dashboard_members m where m.user_id=auth.uid() and m.active
      and (m.role='admin' or (resource=any(m.modules) and (
        (m.role='editorial' and resource in ('coautorias','catalogo','conteudo','relatorios'))
        or (m.role='support' and resource in ('contatos','relatorios')) or (m.role='viewer' and not writing)
      )))),false);
$allowed$;
-- Legacy predicate is administrator-only. Resource policies grant editorial
-- access explicitly, without extending an administrator-named predicate.
create or replace function public.is_coauthor_admin() returns boolean
language sql stable security definer set search_path='' as $legacy$
  select public.dashboard_allowed('usuarios',true);
$legacy$;
create or replace function public.dashboard_access() returns jsonb
language sql stable security invoker set search_path='' as $access$
  select jsonb_build_object('version',1,
    'role',(select role from public.dashboard_members where user_id=auth.uid() and active),
    'read',coalesce((select jsonb_agg(r) from unnest(array['coautorias','contatos','catalogo','conteudo','relatorios','usuarios']) r where public.dashboard_allowed(r,false)),'[]'::jsonb),
    'write',coalesce((select jsonb_agg(r) from unnest(array['coautorias','contatos','catalogo','conteudo','relatorios','usuarios']) r where public.dashboard_allowed(r,true)),'[]'::jsonb));
$access$;
create or replace function public.dashboard_touch_updated_at() returns trigger
language plpgsql security invoker set search_path='' as $touch$
begin new.updated_at:=clock_timestamp(); return new; end;
$touch$;

-- Written mutex serializes membership changes, including trusted direct DML.
-- At stricter isolation, competing writers fail rather than use stale counts.
create or replace function literare_private.lock_membership() returns trigger
language plpgsql security definer set search_path='' as $lock$
begin
  if tg_op='TRUNCATE' then raise exception 'Membership TRUNCATE is forbidden' using errcode='42501'; end if;
  update literare_private.admin_guard set revision=revision+1 where singleton;
  return null;
end;
$lock$;
create or replace function literare_private.guard_membership() returns trigger
language plpgsql security definer set search_path='' as $guard$
begin
  if tg_op='UPDATE' and new.user_id is distinct from old.user_id then
    raise exception 'Membership user_id is immutable' using errcode='42501';
  end if;
  if old.user_id=auth.uid() then raise exception 'Cannot change own permissions' using errcode='42501'; end if;
  if old.role='admin' and old.active and (tg_op='DELETE' or new.role is distinct from 'admin' or new.active is distinct from true)
    and (select count(*) from public.dashboard_members where role='admin' and active)<=1 then
    raise exception 'Cannot remove, deactivate or demote the last active administrator' using errcode='23514';
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end;
$guard$;
drop trigger if exists literare_membership_lock on public.dashboard_members;
create trigger literare_membership_lock before insert or update or delete or truncate on public.dashboard_members
  for each statement execute function literare_private.lock_membership();
drop trigger if exists literare_membership_guard on public.dashboard_members;
create trigger literare_membership_guard before update or delete on public.dashboard_members
  for each row execute function literare_private.guard_membership();
do $triggers$
declare item record;
begin
  for item in select * from (values
    ('dashboard_members','dashboard_members_updated_at'),('contact_submissions','contact_submissions_updated_at'),
    ('coauthor_books','coauthor_books_updated_at'),('catalog_books','catalog_books_updated_at'),('site_content','site_content_updated_at')
  ) as triggers(table_name,trigger_name)
  loop
    execute format('drop trigger if exists %I on public.%I',item.trigger_name,item.table_name);
    execute format('create trigger %I before update on public.%I for each row execute function public.dashboard_touch_updated_at()',item.trigger_name,item.table_name);
  end loop;
end;
$triggers$;
create index if not exists contact_submissions_received_idx on public.contact_submissions(created_at desc);
create index if not exists contact_submissions_status_idx on public.contact_submissions(status,created_at desc);
create index if not exists catalog_books_created_idx on public.catalog_books(created_at desc);
create index if not exists catalog_books_cover_idx on public.catalog_books(cover_path);
create index if not exists coauthor_books_cover_idx on public.coauthor_books(cover_path);
create index if not exists literare_coauthors_created_idx on public.coauthor_books(created_at desc);
create index if not exists literare_members_active_admin_idx on public.dashboard_members(user_id) where role='admin' and active;

-- Table REVOKE alone does not revoke pre-existing column grants.
do $privileges$
declare table_name text; columns text;
begin
  foreach table_name in array array['dashboard_members','contact_submissions','coauthor_books','catalog_books','site_content','coauthor_admins'] loop
    execute format('alter table public.%I enable row level security',table_name);
    execute format('revoke all on public.%I from public,anon,authenticated',table_name);
    select string_agg(format('%I',attname),',') into columns from pg_catalog.pg_attribute
      where attrelid=('public.'||table_name)::regclass and attnum>0 and not attisdropped;
    execute format('revoke all (%s) on public.%I from public,anon,authenticated',columns,table_name);
  end loop;
end;
$privileges$;
grant select on public.dashboard_members to authenticated;
grant insert(name,email,phone,message) on public.contact_submissions to anon,authenticated;
grant select on public.contact_submissions to authenticated;
grant update(status) on public.contact_submissions to authenticated;
grant select on public.coauthor_books,public.catalog_books,public.site_content to anon,authenticated;
grant insert(id,title,description,category,editorial_coordinator,cover_path,registration_status),
 update(title,description,category,editorial_coordinator,cover_path,registration_status),delete on public.coauthor_books to authenticated;
grant insert(id,title,authors,isbn,synopsis,category,cover_path,purchase_url,publication_status),
 update(title,authors,isbn,synopsis,category,cover_path,purchase_url,publication_status),delete on public.catalog_books to authenticated;
grant insert(key,state,title,body,image_url,items),update(title,body,image_url,items),delete on public.site_content to authenticated;

-- Only known repository policies are replaced. Restrictive boundaries below
-- cap access even in the presence of additional permissive policies.
drop policy if exists "Literare membership self read" on public.dashboard_members;
create policy "Literare membership self read" on public.dashboard_members for select to authenticated using(user_id=auth.uid());
drop policy if exists "Literare membership read boundary" on public.dashboard_members;
create policy "Literare membership read boundary" on public.dashboard_members as restrictive for select to authenticated using(user_id=auth.uid());
drop policy if exists "Read open books or administer" on public.coauthor_books;
drop policy if exists "Read open books or authorized dashboard" on public.coauthor_books;
drop policy if exists "Administrators insert books" on public.coauthor_books;
drop policy if exists "Administrators update books" on public.coauthor_books;
drop policy if exists "Administrators delete books" on public.coauthor_books;
drop policy if exists "Visitors may submit valid contacts" on public.contact_submissions;
drop policy if exists "Authorized contact readers" on public.contact_submissions;
drop policy if exists "Authorized contact agents" on public.contact_submissions;
drop policy if exists "Read published catalog or authorized" on public.catalog_books;
drop policy if exists "Catalog writers insert" on public.catalog_books;
drop policy if exists "Catalog writers update" on public.catalog_books;
drop policy if exists "Catalog writers delete" on public.catalog_books;
drop policy if exists "Read published content or authorized" on public.site_content;
drop policy if exists "Content writers insert" on public.site_content;
drop policy if exists "Content writers update" on public.site_content;
drop policy if exists "Content writers delete" on public.site_content;
do $policies$
declare item record; kind text; policy_name text;
begin
  for item in select * from (values
    ('contact_submissions','select', $$public.dashboard_allowed('contatos',false)$$,null),
    ('contact_submissions','insert',null,$$status='pending' and char_length(btrim(name)) between 3 and 120 and char_length(email)<=254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' and phone ~ '^[+0-9[:space:]().-]{10,22}$' and char_length(btrim(message)) between 15 and 3000$$),
    ('contact_submissions','update',$$public.dashboard_allowed('contatos',true)$$,$$public.dashboard_allowed('contatos',true)$$),
    ('contact_submissions','delete','false',null),
    ('coauthor_books','select',$$registration_status='open' or public.dashboard_allowed('coautorias',false)$$,null),
    ('coauthor_books','insert',null,$$public.dashboard_allowed('coautorias',true) and created_by=auth.uid()$$),
    ('coauthor_books','update',$$public.dashboard_allowed('coautorias',true)$$,$$public.dashboard_allowed('coautorias',true)$$),
    ('coauthor_books','delete',$$public.dashboard_allowed('coautorias',true)$$,null),
    ('catalog_books','select',$$publication_status='published' or public.dashboard_allowed('catalogo',false)$$,null),
    ('catalog_books','insert',null,$$public.dashboard_allowed('catalogo',true)$$),
    ('catalog_books','update',$$public.dashboard_allowed('catalogo',true)$$,$$public.dashboard_allowed('catalogo',true)$$),
    ('catalog_books','delete',$$public.dashboard_allowed('catalogo',true)$$,null),
    ('site_content','select',$$state='published' or public.dashboard_allowed('conteudo',false)$$,null),
    ('site_content','insert',null,$$public.dashboard_allowed('conteudo',true)$$),
    ('site_content','update',$$public.dashboard_allowed('conteudo',true)$$,$$public.dashboard_allowed('conteudo',true)$$),
    ('site_content','delete',$$public.dashboard_allowed('conteudo',true)$$,null)
  ) as rules(table_name,operation,using_expression,check_expression)
  loop
    foreach kind in array array['permissive','restrictive'] loop
      policy_name:='Literare '||item.operation||' '||kind;
      execute format('drop policy if exists %I on public.%I',policy_name,item.table_name);
      execute format('create policy %I on public.%I as %s for %s to anon,authenticated%s%s',policy_name,item.table_name,kind,item.operation,
        case when item.using_expression is null then '' else ' using ('||item.using_expression||')' end,
        case when item.check_expression is null then '' else ' with check ('||item.check_expression||')' end);
    end loop;
  end loop;
end;
$policies$;

create or replace function public.dashboard_users(member_offset integer default 0,member_search text default '')
returns table(user_id uuid,email text,role text,modules text[],active boolean,created_at timestamptz,total_count bigint)
language plpgsql stable security definer set search_path='' as $directory$
begin
  if not public.dashboard_allowed('usuarios',false) then raise exception 'Access denied' using errcode='42501'; end if;
  if member_offset is null or member_offset<0 or member_search is null or char_length(member_search)>254 then
    raise exception 'Invalid directory parameters' using errcode='22023';
  end if;
  return query select m.user_id,u.email::text,m.role,m.modules,m.active,m.created_at,count(*) over()
    from public.dashboard_members m join auth.users u on u.id=m.user_id
    where strpos(lower(u.email),lower(member_search))>0
    order by m.created_at desc,m.user_id offset member_offset limit 12;
end;
$directory$;
create or replace function public.dashboard_set_member(member_email text,member_role text,member_modules text[],member_active boolean) returns void
language plpgsql security definer set search_path='' as $member$
declare target_id uuid;
begin
  -- Lock before checking again: a concurrent revocation takes precedence.
  update literare_private.admin_guard set revision=revision+1 where singleton;
  if not public.dashboard_allowed('usuarios',true) then raise exception 'Access denied' using errcode='42501'; end if;
  if member_email is null or char_length(member_email)>254 or member_active is null
    or member_role is null or member_modules is null then
    raise exception 'Invalid member parameters' using errcode='22023';
  end if;
  begin
    select id into strict target_id from auth.users where lower(email)=lower(btrim(member_email));
  exception when no_data_found or too_many_rows then
    raise exception 'Account not found or email ambiguous' using errcode='22023';
  end;
  if target_id=auth.uid() then raise exception 'Cannot change own permissions' using errcode='42501'; end if;
  if exists(select 1 from public.dashboard_members where user_id=target_id and role='admin' and active)
    and (member_role<>'admin' or not member_active)
    and (select count(*) from public.dashboard_members where role='admin' and active)<=1 then
    raise exception 'Cannot remove the last active administrator' using errcode='23514';
  end if;
  insert into public.dashboard_members(user_id,role,modules,active) values(target_id,member_role,member_modules,member_active)
    on conflict(user_id) do update set role=excluded.role,modules=excluded.modules,active=excluded.active;
end;
$member$;

-- Definer reference checks include rows hidden from callers by RLS.
create or replace function public.dashboard_asset_read(bucket text,object_name text) returns boolean
language sql stable security definer set search_path='' as $read_asset$
  select coalesce(case bucket
    when 'coauthor-book-covers' then public.dashboard_allowed('coautorias',false)
      or exists(select 1 from public.coauthor_books where cover_path=object_name and registration_status='open')
    when 'catalog-book-covers' then public.dashboard_allowed('catalogo',false)
      or exists(select 1 from public.catalog_books where cover_path=object_name and publication_status='published')
    when 'institutional-images' then public.dashboard_allowed('conteudo',false)
      or exists(select 1 from public.site_content where state='published' and
        right(image_url,char_length('/institutional-images/'||object_name))='/institutional-images/'||object_name)
    else false end,false);
$read_asset$;
create or replace function public.dashboard_asset_delete(bucket text,object_name text) returns boolean
language sql stable security definer set search_path='' as $delete_asset$
  select coalesce(case bucket
    when 'coauthor-book-covers' then public.dashboard_allowed('coautorias',true)
      and not exists(select 1 from public.coauthor_books where cover_path=object_name)
    when 'catalog-book-covers' then public.dashboard_allowed('catalogo',true)
      and not exists(select 1 from public.catalog_books where cover_path=object_name)
    when 'institutional-images' then public.dashboard_allowed('conteudo',true)
      and not exists(select 1 from public.site_content where
        right(image_url,char_length('/institutional-images/'||object_name))='/institutional-images/'||object_name)
    else false end,false);
$delete_asset$;

-- Visibility changes do not move/delete objects. Existing bucket limits are
-- tightened for the two new buckets; existing coauthor upload limits stay intact.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('catalog-book-covers','catalog-book-covers',false,5242880,array['image/jpeg','image/png','image/webp']),
       ('institutional-images','institutional-images',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,
  file_size_limit=least(coalesce(storage.buckets.file_size_limit,5242880),5242880),
  allowed_mime_types=array['image/jpeg','image/png','image/webp'];
update storage.buckets set public=false where id='coauthor-book-covers';
drop policy if exists "Administrators read cover objects" on storage.objects;
drop policy if exists "Administrators upload unique covers" on storage.objects;
drop policy if exists "Administrators remove unused covers" on storage.objects;
drop policy if exists "Editorial asset readers" on storage.objects;
drop policy if exists "Editorial asset upload" on storage.objects;
drop policy if exists "Remove unused editorial assets" on storage.objects;
do $storage_policies$
declare item record; kind text; condition text; using_clause text; check_clause text; policy_name text;
begin
  for item in select * from (values
    ('select',$$public.dashboard_asset_read(bucket_id,name)$$),
    ('insert',$$((bucket_id='coauthor-book-covers' and public.dashboard_allowed('coautorias',true)) or (bucket_id='catalog-book-covers' and public.dashboard_allowed('catalogo',true)) or (bucket_id='institutional-images' and public.dashboard_allowed('conteudo',true))) and split_part(name,'/',1)=auth.uid()::text and name ~ '^[a-f0-9-]{36}/[a-f0-9-]{36}/[a-f0-9-]{36}[.](jpg|png|webp)$'$$),
    ('delete',$$public.dashboard_asset_delete(bucket_id,name)$$),('update','false')
  ) as rules(operation,expression)
  loop
    foreach kind in array array['permissive','restrictive'] loop
      policy_name:='Literare assets '||item.operation||' '||kind;
      condition:=case when kind='restrictive' then
        'bucket_id not in (''coauthor-book-covers'',''catalog-book-covers'',''institutional-images'') or ('||item.expression||')'
        else 'bucket_id in (''coauthor-book-covers'',''catalog-book-covers'',''institutional-images'') and ('||item.expression||')' end;
      using_clause:=case when item.operation='insert' then '' else ' using ('||condition||')' end;
      check_clause:=case when item.operation in ('insert','update') then ' with check ('||condition||')' else '' end;
      execute format('drop policy if exists %I on storage.objects',policy_name);
      execute format('create policy %I on storage.objects as %s for %s to anon,authenticated%s%s',policy_name,kind,item.operation,using_clause,check_clause);
    end loop;
  end loop;
  foreach kind in array array['insert','update','delete'] loop
    policy_name:='Literare buckets '||kind||' boundary';
    condition:='id not in (''coauthor-book-covers'',''catalog-book-covers'',''institutional-images'')';
    execute format('drop policy if exists %I on storage.buckets',policy_name);
    execute format('create policy %I on storage.buckets as restrictive for %s to anon,authenticated%s%s',policy_name,kind,
      case when kind='insert' then '' else ' using ('||condition||')' end,
      case when kind='delete' then '' else ' with check ('||condition||')' end);
  end loop;
end;
$storage_policies$;
-- Only available events are represented; no synthetic historical audit entries.
create or replace function public.dashboard_summary() returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare result jsonb := '{}'::jsonb;
begin
  if public.dashboard_allowed('coautorias',false) then
    result := result || jsonb_build_object('books',(select count(*) from public.coauthor_books),'open',(select count(*) from public.coauthor_books where registration_status='open'),
    'recent_books',(select coalesce(jsonb_agg(x),'[]') from (select id,title,created_at from public.coauthor_books order by created_at desc limit 5) x));
  end if;
  if public.dashboard_allowed('contatos',false) then
    result := result || jsonb_build_object('contacts',(select count(*) from public.contact_submissions),'pending',(select count(*) from public.contact_submissions where status='pending'),
    'recent_contacts',(select coalesce(jsonb_agg(x),'[]') from (select id,name,created_at from public.contact_submissions order by created_at desc limit 5) x));
  end if;
  return result;
end; $$;
revoke all on function public.dashboard_summary() from public;
grant execute on function public.dashboard_summary() to authenticated;

create or replace function public.dashboard_report(date_from timestamptz,date_to timestamptz) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare result jsonb := '{}'::jsonb;
begin
  if not public.dashboard_allowed('relatorios',false) then raise exception 'Access denied' using errcode='42501'; end if;
  if date_from is null or date_to is null or not isfinite(date_from) or not isfinite(date_to) or date_to<=date_from then raise exception 'Invalid date range' using errcode='22023'; end if;
  if public.dashboard_allowed('contatos',false) then
    result := result || jsonb_build_object(
    'contacts_monthly',(select coalesce(jsonb_agg(x),'[]') from (select to_char(created_at at time zone 'America/Sao_Paulo','YYYY-MM') label,count(*) value from public.contact_submissions where created_at>=date_from and created_at<date_to group by 1 order by 1) x),
    'contacts_status',(select coalesce(jsonb_agg(x),'[]') from (select status label,count(*) value from public.contact_submissions where created_at>=date_from and created_at<date_to group by 1) x));
  end if;
  if public.dashboard_allowed('coautorias',false) then
    result := result || jsonb_build_object(
    'coauthors_status',(select coalesce(jsonb_agg(x),'[]') from (select registration_status label,count(*) value from public.coauthor_books where created_at>=date_from and created_at<date_to group by 1) x),
    'books_monthly',(select coalesce(jsonb_agg(x),'[]') from (select to_char(created_at at time zone 'America/Sao_Paulo','YYYY-MM') label,count(*) value from public.coauthor_books where created_at>=date_from and created_at<date_to group by 1 order by 1) x),
    'books_categories',(select coalesce(jsonb_agg(x),'[]') from (select category label,count(*) value from public.coauthor_books where created_at>=date_from and created_at<date_to group by 1) x));
  end if;
  if public.dashboard_allowed('catalogo',false) then
    result := result || jsonb_build_object(
    'catalog_monthly',(select coalesce(jsonb_agg(x),'[]') from (select to_char(created_at at time zone 'America/Sao_Paulo','YYYY-MM') label,count(*) value from public.catalog_books where created_at>=date_from and created_at<date_to group by 1 order by 1) x),
    'catalog_categories',(select coalesce(jsonb_agg(x),'[]') from (select category label,count(*) value from public.catalog_books where created_at>=date_from and created_at<date_to group by 1) x));
  end if;
  return result;
end; $$;
revoke all on function public.dashboard_report(timestamptz,timestamptz) from public;
grant execute on function public.dashboard_report(timestamptz,timestamptz) to authenticated;

-- Repair old ACLs as well as removing default PUBLIC EXECUTE.
revoke all on function public.valid_isbn(text),public.valid_editorial_items(text[],integer,integer,integer),
  public.dashboard_allowed(text,boolean),public.is_coauthor_admin(),public.dashboard_access(),public.dashboard_touch_updated_at(),
  public.dashboard_users(integer,text),public.dashboard_set_member(text,text,text[],boolean),
  public.dashboard_summary(),public.dashboard_report(timestamptz,timestamptz),
  public.dashboard_asset_read(text,text),public.dashboard_asset_delete(text,text) from public,anon,authenticated;
revoke all on function literare_private.lock_membership(),literare_private.guard_membership() from public,anon,authenticated;
revoke all on function public.touch_coauthor_book() from public,anon,authenticated;
grant execute on function public.valid_isbn(text),public.valid_editorial_items(text[],integer,integer,integer),
  public.dashboard_allowed(text,boolean),public.dashboard_asset_read(text,text) to anon,authenticated;
grant execute on function public.is_coauthor_admin(),public.dashboard_access(),public.dashboard_users(integer,text),
  public.dashboard_set_member(text,text,text[],boolean),public.dashboard_summary(),
  public.dashboard_report(timestamptz,timestamptz),public.dashboard_asset_delete(text,text) to authenticated;
do $postconditions$
begin
  if exists(select 1 from pg_catalog.pg_class where oid in (
    'public.contact_submissions'::regclass,'public.coauthor_admins'::regclass,'public.coauthor_books'::regclass,
    'public.dashboard_members'::regclass,'public.catalog_books'::regclass,'public.site_content'::regclass,
    'storage.objects'::regclass,'storage.buckets'::regclass
  ) and not relrowsecurity) then raise exception 'RLS must be enabled on managed application and Storage tables'; end if;
  if exists(select 1 from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace
    where (n.nspname='literare_private' or (n.nspname='public' and p.proname in
      ('dashboard_allowed','is_coauthor_admin','dashboard_users','dashboard_set_member','dashboard_asset_read','dashboard_asset_delete')))
    and p.proowner in (select oid from pg_catalog.pg_roles where rolname in ('anon','authenticated'))
  ) then raise exception 'API roles cannot own privileged dashboard functions'; end if;
  if exists(select 1 from storage.buckets where id in ('coauthor-book-covers','catalog-book-covers','institutional-images') and public)
    then raise exception 'Managed asset buckets must remain private'; end if;
  if exists(select 1 from pg_catalog.pg_class where oid in (
    'public.contact_submissions'::regclass,'public.coauthor_admins'::regclass,'public.coauthor_books'::regclass,
    'public.dashboard_members'::regclass,'public.catalog_books'::regclass,'public.site_content'::regclass,
    'literare_private.admin_guard'::regclass,'storage.objects'::regclass,'storage.buckets'::regclass
  ) and relowner in (select oid from pg_catalog.pg_roles where rolname in ('anon','authenticated')))
    or exists(select 1 from pg_catalog.pg_namespace where nspname='literare_private'
      and nspowner in (select oid from pg_catalog.pg_roles where rolname in ('anon','authenticated')))
    then raise exception 'API roles cannot own managed tables or the private schema'; end if;
end;
$postconditions$;
commit;
