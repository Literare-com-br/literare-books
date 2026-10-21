begin;
set local lock_timeout='10s';
do $$ begin
  if to_regprocedure('public.dashboard_allowed(text,boolean)') is null then raise exception 'Apply the reviewed administrative dashboard migration first'; end if;
  if not exists(select 1 from pg_catalog.pg_roles where rolname='service_role') then raise exception 'Supabase service_role is required for the verified backend RPC'; end if;
end $$;
alter table public.contact_submissions add column if not exists area_of_activity text,
  add column if not exists area_of_activity_other text;
do $$ begin
  if not exists(select 1 from pg_catalog.pg_constraint where conrelid='public.contact_submissions'::regclass and conname='literare_contact_area') then
    alter table public.contact_submissions add constraint literare_contact_area check (
      (area_of_activity is null and area_of_activity_other is null)
      or (area_of_activity is not null and area_of_activity in ('Psicologia','Educação','Saúde','Administração','Direito','Tecnologia','Empreendedorismo','Recursos Humanos','Literatura','Outros')
        and ((area_of_activity='Outros' and area_of_activity_other is not null and char_length(btrim(area_of_activity_other)) between 3 and 100)
          or (area_of_activity<>'Outros' and area_of_activity_other is null)))
    ) not valid;
  end if;
end $$;
alter table public.contact_submissions validate constraint literare_contact_area;
create index if not exists contact_submissions_area_received_idx on public.contact_submissions(area_of_activity,created_at desc,id desc);
create index if not exists contact_submissions_export_idx on public.contact_submissions(created_at desc,id desc);

-- After deployment, visitors submit ONLY through the verified Edge Function.
-- Restrictive policy prevents any old permissive INSERT policy from bypassing it.
revoke insert on public.contact_submissions from public,anon,authenticated;
revoke insert(name,email,phone,message) on public.contact_submissions from public,anon,authenticated;
revoke insert(area_of_activity,area_of_activity_other) on public.contact_submissions from public,anon,authenticated;
drop policy if exists "Literare insert restrictive" on public.contact_submissions;
create policy "Literare insert restrictive" on public.contact_submissions as restrictive for insert to anon,authenticated with check(false);
-- Separate name also survives reapplication of an older dashboard migration.
drop policy if exists "Verified contacts backend insert boundary" on public.contact_submissions;
create policy "Verified contacts backend insert boundary" on public.contact_submissions as restrictive for insert to anon,authenticated with check(false);
create table if not exists literare_private.contact_limits (
  key text primary key,used integer not null check(used>0),expires_at timestamptz not null
);
create index if not exists contact_limits_expiration_idx on literare_private.contact_limits(expires_at);
create table if not exists literare_private.contact_tokens (
  hash text primary key check(hash ~ '^[a-f0-9]{64}$'),expires_at timestamptz not null
);
create index if not exists contact_tokens_expiration_idx on literare_private.contact_tokens(expires_at);
revoke all on literare_private.contact_limits,literare_private.contact_tokens from public,anon,authenticated,service_role;

create or replace function public.submit_verified_contact(
  p_name text,p_email text,p_phone text,p_message text,p_area text,p_other text,p_identity_hash text,p_token_hash text
) returns void language plpgsql security definer set search_path='' as $$
declare counter integer; v_now timestamptz:=clock_timestamp(); global_key text; identity_key text;
begin
  if p_area is null or p_identity_hash is null or p_token_hash is null
    or p_identity_hash !~ '^[a-f0-9]{64}$' or p_token_hash !~ '^[a-f0-9]{64}$'
    then raise exception 'Invalid verified submission' using errcode='22023'; end if;
  delete from literare_private.contact_tokens where expires_at<v_now;
  delete from literare_private.contact_limits where expires_at<v_now;
  insert into literare_private.contact_tokens(hash,expires_at) values(p_token_hash,v_now+interval '10 minutes');
  global_key:='global:'||floor(extract(epoch from v_now)/600)::text;
  identity_key:='email:'||p_identity_hash||':'||floor(extract(epoch from v_now)/3600)::text;
  insert into literare_private.contact_limits as limits(key,used,expires_at) values(global_key,1,v_now+interval '20 minutes')
    on conflict(key) do update set used=limits.used+1 where limits.used<100 returning used into counter;
  if counter is null then raise exception 'contact_rate_limit' using errcode='P0001'; end if;
  counter:=null;
  insert into literare_private.contact_limits as limits(key,used,expires_at) values(identity_key,1,v_now+interval '2 hours')
    on conflict(key) do update set used=limits.used+1 where limits.used<3 returning used into counter;
  if counter is null then raise exception 'contact_rate_limit' using errcode='P0001'; end if;
  insert into public.contact_submissions(name,email,phone,message,area_of_activity,area_of_activity_other)
    values(btrim(p_name),lower(btrim(p_email)),btrim(p_phone),btrim(p_message),p_area,nullif(btrim(p_other),''));
end $$;
revoke all on function public.submit_verified_contact(text,text,text,text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.submit_verified_contact(text,text,text,text,text,text,text,text) to service_role;

-- A bounded, keyset-paginated export. Each call checks permission and runs under
-- the caller's RLS. Snapshot upper bound excludes submissions arriving mid-export.
create or replace function public.export_contacts_page(
  p_search text default '',p_status text default '',p_area text default '',
  p_from date default null,p_to date default null,p_ascending boolean default false,
  p_snapshot timestamptz default now(),p_cursor_at timestamptz default null,p_cursor_id uuid default null
) returns table(id uuid,name text,email text,phone text,message text,status text,created_at timestamptz,updated_at timestamptz,area_of_activity text,area_of_activity_other text)
language plpgsql stable security invoker set search_path='' as $$
begin
  if not public.dashboard_allowed('contatos',false) then raise exception 'Access denied' using errcode='42501'; end if;
  if p_search is null or char_length(p_search)>180 or p_status is null or p_area is null or char_length(p_area)>100
    or p_status not in ('','pending','in_progress','completed') or p_snapshot is null or not isfinite(p_snapshot)
    or p_ascending is null or ((p_cursor_at is null)<>(p_cursor_id is null))
    or (p_from is not null and p_to is not null and p_from>p_to)
    then raise exception 'Invalid export filters' using errcode='22023'; end if;
  return query select c.id,c.name,c.email,c.phone,c.message,c.status,c.created_at,c.updated_at,c.area_of_activity,c.area_of_activity_other
    from public.contact_submissions c where c.created_at<=p_snapshot
    and (p_search='' or strpos(lower(c.name),lower(p_search))>0 or strpos(lower(c.email),lower(p_search))>0)
    and (p_status='' or c.status=p_status)
    and (p_area='' or (p_area='__unknown__' and c.area_of_activity is null) or c.area_of_activity=p_area)
    and (p_from is null or c.created_at>=(p_from::timestamp at time zone 'America/Sao_Paulo'))
    and (p_to is null or c.created_at<((p_to+1)::timestamp at time zone 'America/Sao_Paulo'))
    and (p_cursor_at is null or (p_ascending and (c.created_at,c.id)>(p_cursor_at,p_cursor_id)) or (not p_ascending and (c.created_at,c.id)<(p_cursor_at,p_cursor_id)))
    order by case when p_ascending then c.created_at end asc,case when p_ascending then c.id end asc,
      case when not p_ascending then c.created_at end desc,case when not p_ascending then c.id end desc limit 500;
end $$;
revoke all on function public.export_contacts_page(text,text,text,date,date,boolean,timestamptz,timestamptz,uuid) from public,anon;
grant execute on function public.export_contacts_page(text,text,text,date,date,boolean,timestamptz,timestamptz,uuid) to authenticated;
commit;

