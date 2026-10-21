begin;
create table public.contact_submissions (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 3 and 120),
  email text not null check (char_length(email) <= 254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  phone text not null check (phone ~ '^[+0-9[:space:]().-]{10,22}$'),
  message text not null check (char_length(btrim(message)) between 15 and 3000),
  created_at timestamptz not null default now()
);
alter table public.contact_submissions enable row level security;
revoke all on public.contact_submissions from anon, authenticated;
grant insert (name, email, phone, message) on public.contact_submissions to anon, authenticated;
create policy "Visitors may submit valid contacts"
  on public.contact_submissions for insert to anon, authenticated
  with check (
    char_length(btrim(name)) between 3 and 120
    and char_length(email) <= 254
    and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    and phone ~ '^[+0-9[:space:]().-]{10,22}$'
    and char_length(btrim(message)) between 15 and 3000
  );
-- No SELECT, UPDATE or DELETE grants/policies for frontend roles.
commit;
