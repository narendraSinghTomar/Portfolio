-- N.S. Tomar portfolio schema
create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

-- SECURITY DEFINER avoids recursive RLS evaluation on admin_users.
create or replace function public.is_portfolio_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_users au
    where au.user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_portfolio_admin() from public;
grant execute on function public.is_portfolio_admin() to anon, authenticated;

drop policy if exists "admins can read own admin record" on public.admin_users;
create policy "admins can read own admin record"
on public.admin_users for select
to authenticated
using (user_id = (select auth.uid()));

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text not null default '',
  category text not null default 'Other',
  technologies text[] not null default '{}',
  thumbnail_url text,
  gallery_urls text[] not null default '{}',
  github_url text,
  live_demo_url text,
  start_date date,
  featured boolean not null default false,
  status text not null default 'draft' check (status in ('draft','published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  issuer text not null default '',
  issue_date date,
  credential_url text,
  file_url text,
  description text not null default '',
  status text not null default 'published' check (status in ('draft','published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default 'Other',
  proficiency text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.resumes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  role text not null default '',
  file_url text not null,
  description text not null default '',
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Automatically maintain updated_at.
create or replace function public.set_updated_at()
returns trigger language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['projects','certificates','skills','resumes'] loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- RLS
alter table public.projects enable row level security;
alter table public.certificates enable row level security;
alter table public.skills enable row level security;
alter table public.resumes enable row level security;

create policy "public reads published projects" on public.projects
for select to anon, authenticated using (status = 'published');
create policy "admins manage projects" on public.projects
for all to authenticated using (public.is_portfolio_admin())
with check (public.is_portfolio_admin());

create policy "public reads published certificates" on public.certificates
for select to anon, authenticated using (status = 'published');
create policy "admins manage certificates" on public.certificates
for all to authenticated using (public.is_portfolio_admin())
with check (public.is_portfolio_admin());

create policy "public reads skills" on public.skills
for select to anon, authenticated using (true);
create policy "admins manage skills" on public.skills
for all to authenticated using (public.is_portfolio_admin())
with check (public.is_portfolio_admin());

create policy "public reads resumes" on public.resumes
for select to anon, authenticated using (true);
create policy "admins manage resumes" on public.resumes
for all to authenticated using (public.is_portfolio_admin())
with check (public.is_portfolio_admin());

-- Storage buckets. Public read; admin-only writes.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
 ('project-media', 'project-media', true, 10485760, array['image/jpeg','image/png','image/webp']),
 ('certificate-media', 'certificate-media', true, 15728640, array['image/jpeg','image/png','image/webp','application/pdf']),
 ('resume-files', 'resume-files', true, 15728640, array['application/pdf'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public can view portfolio files" on storage.objects;
create policy "public can view portfolio files"
on storage.objects for select to anon, authenticated
using (bucket_id in ('project-media','certificate-media','resume-files'));

drop policy if exists "admins upload portfolio files" on storage.objects;
create policy "admins upload portfolio files"
on storage.objects for insert to authenticated
with check (
  bucket_id in ('project-media','certificate-media','resume-files')
  and public.is_portfolio_admin()
);

drop policy if exists "admins update portfolio files" on storage.objects;
create policy "admins update portfolio files"
on storage.objects for update to authenticated
using (bucket_id in ('project-media','certificate-media','resume-files') and public.is_portfolio_admin())
with check (bucket_id in ('project-media','certificate-media','resume-files') and public.is_portfolio_admin());

drop policy if exists "admins delete portfolio files" on storage.objects;
create policy "admins delete portfolio files"
on storage.objects for delete to authenticated
using (bucket_id in ('project-media','certificate-media','resume-files') and public.is_portfolio_admin());

-- Helpful indexes
create index if not exists projects_status_created_idx on public.projects(status, created_at desc);
create index if not exists certificates_status_created_idx on public.certificates(status, created_at desc);
create index if not exists skills_category_sort_idx on public.skills(category, sort_order);
