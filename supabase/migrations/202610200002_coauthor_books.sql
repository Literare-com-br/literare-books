begin;

-- Membership is managed exclusively by the project owner through SQL/backend.
create table public.coauthor_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.coauthor_admins enable row level security;
revoke all on public.coauthor_admins from anon, authenticated;

create function public.is_coauthor_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.coauthor_admins where user_id = auth.uid());
$$;
revoke all on function public.is_coauthor_admin() from public;
grant execute on function public.is_coauthor_admin() to anon, authenticated;

create table public.coauthor_books (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 180),
  description text not null check (char_length(btrim(description)) between 1 and 12000),
  category text not null check (char_length(btrim(category)) between 1 and 100),
  editorial_coordinator text not null check (char_length(btrim(editorial_coordinator)) between 1 and 180),
  cover_path text check (cover_path ~ '^[a-f0-9-]{36}/[a-f0-9-]{36}/[a-f0-9-]{36}\.(jpg|png|webp)$'),
  registration_status text not null default 'closed' check (registration_status in ('open', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  constraint open_requires_cover check (registration_status <> 'open' or cover_path is not null)
);
create index coauthor_books_open_created_idx on public.coauthor_books(created_at desc) where registration_status = 'open';
create index coauthor_books_cover_idx on public.coauthor_books(cover_path);

create function public.touch_coauthor_book() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger coauthor_books_updated_at before update on public.coauthor_books
for each row execute function public.touch_coauthor_book();

alter table public.coauthor_books enable row level security;
revoke all on public.coauthor_books from anon, authenticated;
grant select on public.coauthor_books to anon, authenticated;
grant insert (id,title,description,category,editorial_coordinator,cover_path,registration_status) on public.coauthor_books to authenticated;
grant update (title,description,category,editorial_coordinator,cover_path,registration_status) on public.coauthor_books to authenticated;
grant delete on public.coauthor_books to authenticated;
create policy "Read open books or administer" on public.coauthor_books for select to anon, authenticated
  using (registration_status = 'open' or (select public.is_coauthor_admin()));
create policy "Administrators insert books" on public.coauthor_books for insert to authenticated
  with check ((select public.is_coauthor_admin()) and created_by = auth.uid());
create policy "Administrators update books" on public.coauthor_books for update to authenticated
  using ((select public.is_coauthor_admin())) with check ((select public.is_coauthor_admin()));
create policy "Administrators delete books" on public.coauthor_books for delete to authenticated
  using ((select public.is_coauthor_admin()));

-- Cover assets are public; closed book metadata remains protected by RLS.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('coauthor-book-covers','coauthor-book-covers',true,5242880,array['image/jpeg','image/png','image/webp']);
create policy "Administrators read cover objects" on storage.objects for select to authenticated
  using (bucket_id = 'coauthor-book-covers' and (select public.is_coauthor_admin()));
create policy "Administrators upload unique covers" on storage.objects for insert to authenticated
  with check (bucket_id = 'coauthor-book-covers' and (select public.is_coauthor_admin())
    and (storage.foldername(name))[1] = auth.uid()::text
    and name ~ '^[a-f0-9-]{36}/[a-f0-9-]{36}/[a-f0-9-]{36}\.(jpg|png|webp)$');
-- Replacements always use new names. Referenced files cannot be deleted.
create policy "Administrators remove unused covers" on storage.objects for delete to authenticated
  using (bucket_id = 'coauthor-book-covers' and (select public.is_coauthor_admin())
    and not exists (select 1 from public.coauthor_books where cover_path = name));
commit;
