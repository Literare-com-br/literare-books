-- TEST FIXTURE ONLY: previous insecure dashboard revision; never deploy this file.
begin;

-- Existing administrators are preserved. All other accounts start without access.
create table public.dashboard_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','editorial','support','viewer')),
  modules text[] not null default '{}' check (modules <@ array['coautorias','contatos','catalogo','conteudo','relatorios']::text[]),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
insert into public.dashboard_members(user_id,role,created_at)
select user_id,'admin',created_at from public.coauthor_admins on conflict do nothing;
alter table public.dashboard_members enable row level security;
revoke all on public.dashboard_members from anon, authenticated;

create function public.dashboard_allowed(resource text, writing boolean default false) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.dashboard_members m where m.user_id = auth.uid() and m.active
    and (m.role = 'admin' or (resource = any(m.modules) and
      ((m.role = 'editorial' and resource in ('coautorias','catalogo','conteudo','relatorios'))
       or (m.role = 'support' and resource in ('contatos','relatorios'))
       or (m.role = 'viewer' and not writing))))
  ) or (not exists (select 1 from public.dashboard_members where user_id = auth.uid())
    and exists (select 1 from public.coauthor_admins where user_id = auth.uid()));
$$;
revoke all on function public.dashboard_allowed(text,boolean) from public;
grant execute on function public.dashboard_allowed(text,boolean) to anon,authenticated;

-- Existing Storage policies and legacy clients now share the same authorization.
create or replace function public.is_coauthor_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.dashboard_allowed('coautorias',true);
$$;

create function public.dashboard_access() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('version',1,'role',coalesce(
    (select role from public.dashboard_members where user_id=auth.uid() and active),
    case when public.dashboard_allowed('usuarios',true) then 'admin' end),
    'read',coalesce((select jsonb_agg(r) from unnest(array['coautorias','contatos','catalogo','conteudo','relatorios','usuarios']) r where public.dashboard_allowed(r,false)), '[]'::jsonb),
    'write',coalesce((select jsonb_agg(r) from unnest(array['coautorias','contatos','catalogo','conteudo','relatorios','usuarios']) r where public.dashboard_allowed(r,true)), '[]'::jsonb));
$$;
revoke all on function public.dashboard_access() from public;
grant execute on function public.dashboard_access() to authenticated;

-- Replace only the old coauthor policies: editorial writers and explicit readers
-- need access, while public visibility remains restricted to open registrations.
drop policy "Read open books or administer" on public.coauthor_books;
create policy "Read open books or authorized dashboard" on public.coauthor_books for select to anon,authenticated
using (registration_status='open' or (select public.dashboard_allowed('coautorias',false)));
-- Existing insert/update/delete policies call is_coauthor_admin and stay intact.

alter table public.contact_submissions
  add column status text not null default 'pending' check (status in ('pending','in_progress','completed')),
  add column updated_at timestamptz not null default now();
create trigger contact_submissions_updated_at before update on public.contact_submissions
for each row execute function public.touch_coauthor_book();
grant select on public.contact_submissions to authenticated;
grant update(status) on public.contact_submissions to authenticated;
create policy "Authorized contact readers" on public.contact_submissions for select to authenticated
using ((select public.dashboard_allowed('contatos',false)));
create policy "Authorized contact agents" on public.contact_submissions for update to authenticated
using ((select public.dashboard_allowed('contatos',true))) with check ((select public.dashboard_allowed('contatos',true)));
create index contact_submissions_received_idx on public.contact_submissions(created_at desc);
create index contact_submissions_status_idx on public.contact_submissions(status,created_at desc);

create function public.valid_isbn(value text) returns boolean
language plpgsql immutable set search_path='' as $$
declare v text := upper(regexp_replace(value,'[ -]','','g')); total integer:=0; i integer;
begin
  if v='' then return true; end if;
  if v ~ '^[0-9]{9}[0-9X]$' then
    for i in 1..10 loop total:=total+(11-i)*(case when substr(v,i,1)='X' then 10 else substr(v,i,1)::integer end); end loop;
    return total%11=0;
  elsif v ~ '^97[89][0-9]{10}$' then
    for i in 1..13 loop total:=total+substr(v,i,1)::integer*(case when i%2=0 then 3 else 1 end); end loop;
    return total%10=0;
  end if;
  return false;
end; $$;
create function public.valid_editorial_items(items text[], minimum integer, maximum integer, max_chars integer) returns boolean
language sql immutable set search_path='' as $$
  select coalesce(array_ndims(items)=1 and cardinality(items) between minimum and maximum
    and not exists(select 1 from unnest(items) item where item is null or char_length(btrim(item)) not between 1 and max_chars),false);
$$;
create table public.catalog_books (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 180),
  authors text[] not null check (public.valid_editorial_items(authors,1,30,100)),
  isbn text not null default '' check (public.valid_isbn(isbn)),
  synopsis text not null default '' check (char_length(synopsis)<=12000),
  category text not null check (char_length(btrim(category)) between 1 and 100),
  cover_path text check (cover_path ~ '^[a-f0-9-]{36}/[a-f0-9-]{36}/[a-f0-9-]{36}\.(jpg|png|webp)$'),
  purchase_url text not null default '' check (purchase_url='' or (purchase_url ~ '^https?://[^[:space:]]+$' and char_length(purchase_url)<=2000)),
  publication_status text not null default 'draft' check (publication_status in ('draft','published')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create trigger catalog_books_updated_at before update on public.catalog_books for each row execute function public.touch_coauthor_book();
create index catalog_books_created_idx on public.catalog_books(created_at desc);
create index catalog_books_cover_idx on public.catalog_books(cover_path);
alter table public.catalog_books enable row level security;
revoke all on public.catalog_books from anon,authenticated;
grant select on public.catalog_books to anon,authenticated;
grant insert(id,title,authors,isbn,synopsis,category,cover_path,purchase_url,publication_status),
 update(title,authors,isbn,synopsis,category,cover_path,purchase_url,publication_status),delete on public.catalog_books to authenticated;
create policy "Read published catalog or authorized" on public.catalog_books for select to anon,authenticated using (publication_status='published' or (select public.dashboard_allowed('catalogo',false)));
create policy "Catalog writers insert" on public.catalog_books for insert to authenticated with check ((select public.dashboard_allowed('catalogo',true)));
create policy "Catalog writers update" on public.catalog_books for update to authenticated using ((select public.dashboard_allowed('catalogo',true))) with check ((select public.dashboard_allowed('catalogo',true)));
create policy "Catalog writers delete" on public.catalog_books for delete to authenticated using ((select public.dashboard_allowed('catalogo',true)));

create table public.site_content (
  key text not null check (key in ('hero','about_intro','about_1','about_2','about_3','banner','categories','contact')),
  state text not null check (state in ('draft','published')),
  title text not null default '' check (char_length(btrim(title)) between 1 and 100),
  body text not null default '' check (char_length(body)<=600),
  image_url text not null default '' check (image_url='' or (image_url ~ '^https://[^[:space:]]+$' and char_length(image_url)<=2000) or image_url ~ '^/images/[a-zA-Z0-9/_.-]+$'),
  items text[] not null default '{}',
  updated_at timestamptz not null default now(),
  primary key(key,state),
  check ((key='categories' and public.valid_editorial_items(items,1,12,48)) or (key<>'categories' and cardinality(items)=0)),
  check (key in ('about_1','about_2','about_3','banner') or image_url='')
);
create trigger site_content_updated_at before update on public.site_content for each row execute function public.touch_coauthor_book();
alter table public.site_content enable row level security;
revoke all on public.site_content from anon,authenticated;
grant select on public.site_content to anon,authenticated;
grant insert(key,state,title,body,image_url,items),update(title,body,image_url,items),delete on public.site_content to authenticated;
create policy "Read published content or authorized" on public.site_content for select to anon,authenticated using (state='published' or (select public.dashboard_allowed('conteudo',false)));
create policy "Content writers insert" on public.site_content for insert to authenticated with check ((select public.dashboard_allowed('conteudo',true)));
create policy "Content writers update" on public.site_content for update to authenticated using ((select public.dashboard_allowed('conteudo',true))) with check ((select public.dashboard_allowed('conteudo',true)));
create policy "Content writers delete" on public.site_content for delete to authenticated using ((select public.dashboard_allowed('conteudo',true)));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('catalog-book-covers','catalog-book-covers',true,5242880,array['image/jpeg','image/png','image/webp']),
 ('institutional-images','institutional-images',true,5242880,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
create policy "Editorial asset readers" on storage.objects for select to authenticated using
 ((bucket_id='catalog-book-covers' and public.dashboard_allowed('catalogo',false)) or (bucket_id='institutional-images' and public.dashboard_allowed('conteudo',false)));
create policy "Editorial asset upload" on storage.objects for insert to authenticated with check
 (((bucket_id='catalog-book-covers' and public.dashboard_allowed('catalogo',true)) or (bucket_id='institutional-images' and public.dashboard_allowed('conteudo',true)))
 and (storage.foldername(name))[1]=auth.uid()::text and name ~ '^[a-f0-9-]{36}/[a-f0-9-]{36}/[a-f0-9-]{36}\.(jpg|png|webp)$');
create policy "Remove unused editorial assets" on storage.objects for delete to authenticated using
 ((bucket_id='catalog-book-covers' and public.dashboard_allowed('catalogo',true) and not exists(select 1 from public.catalog_books where cover_path=name))
 or (bucket_id='institutional-images' and public.dashboard_allowed('conteudo',true) and not exists(select 1 from public.site_content where image_url like '%/institutional-images/' || name)));

-- Directory is returned only to administrators; auth.users is never exposed.
create function public.dashboard_users(member_offset integer default 0,member_search text default '') returns table(user_id uuid,email text,role text,modules text[],active boolean,created_at timestamptz,total_count bigint)
language plpgsql stable security definer set search_path='' as $$
begin
  if not public.dashboard_allowed('usuarios',true) then raise exception 'Access denied' using errcode='42501'; end if;
  return query select m.user_id,u.email::text,m.role,m.modules,m.active,m.created_at,count(*) over() from public.dashboard_members m join auth.users u on u.id=m.user_id
  where strpos(lower(u.email),lower(left(member_search,254)))>0 order by m.created_at desc,m.user_id offset greatest(member_offset,0) limit 12;
end; $$;
create function public.dashboard_set_member(member_email text,member_role text,member_modules text[],member_active boolean) returns void
language plpgsql security definer set search_path='' as $$
declare target_id uuid;
begin
  if not public.dashboard_allowed('usuarios',true) then raise exception 'Access denied' using errcode='42501'; end if;
  select id into target_id from auth.users where lower(email)=lower(btrim(member_email));
  if target_id is null then raise exception 'Account not found' using errcode='22023'; end if;
  if target_id=auth.uid() then raise exception 'Cannot change own permissions' using errcode='42501'; end if;
  insert into public.dashboard_members(user_id,role,modules,active) values(target_id,member_role,member_modules,member_active)
  on conflict(user_id) do update set role=excluded.role, modules=excluded.modules,active=excluded.active,updated_at=now();
end; $$;
revoke all on function public.dashboard_users(integer,text), public.dashboard_set_member(text,text,text[],boolean) from public;
grant execute on function public.dashboard_users(integer,text), public.dashboard_set_member(text,text,text[],boolean) to authenticated;

-- Only available events are represented; no synthetic historical audit entries.
create function public.dashboard_summary() returns jsonb
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

create function public.dashboard_report(date_from timestamptz,date_to timestamptz) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare result jsonb := '{}'::jsonb;
begin
  if not public.dashboard_allowed('relatorios',false) then raise exception 'Access denied' using errcode='42501'; end if;
  if date_to<=date_from then raise exception 'Invalid date range'; end if;
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
commit;

