-- Additive CMS expansion. Safe to run alongside existing CMS tables.
-- Does not drop or reset any existing table, policy, bucket, or record.
create table if not exists public.portfolio_profile (
  id boolean primary key default true check (id),
  full_name text not null default '', professional_title text not null default '',
  photo_url text, about_description text not null default '', short_introduction text not null default '',
  learning_focus text not null default '', location text not null default '',
  social_links jsonb not null default '[]'::jsonb, highlights text[] not null default '{}',
  status text not null default 'published' check(status in ('draft','published')),
  updated_at timestamptz not null default now()
);
create table if not exists public.portfolio_contact (
  id boolean primary key default true check (id), email text not null default '', phone text not null default '',
  location text not null default '', social_links jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);
create table if not exists public.education (
  id uuid primary key default gen_random_uuid(), degree text not null, institution text not null,
  location text not null default '', start_date date, end_date date, currently_studying boolean not null default false,
  description text not null default '', status text not null default 'draft' check(status in ('draft','published')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.experience (
  id uuid primary key default gen_random_uuid(), company_name text not null, designation text not null,
  employment_type text not null default '', location text not null default '', start_date date, end_date date,
  currently_working boolean not null default false, responsibilities text[] not null default '{}',
  technologies text[] not null default '{}', company_logo_url text,
  status text not null default 'draft' check(status in ('draft','published')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(), name text not null, email text not null,
  subject text not null, message text not null,
  status text not null default 'unread' check(status in ('read','unread')),
  created_at timestamptz not null default now()
);

alter table public.portfolio_profile enable row level security;
alter table public.portfolio_contact enable row level security;
alter table public.education enable row level security;
alter table public.experience enable row level security;
alter table public.contact_messages enable row level security;

drop policy if exists "public reads published profile" on public.portfolio_profile;
create policy "public reads published profile" on public.portfolio_profile for select to anon, authenticated using(status='published');
drop policy if exists "admins manage profile" on public.portfolio_profile;
create policy "admins manage profile" on public.portfolio_profile for all to authenticated using(public.is_portfolio_admin()) with check(public.is_portfolio_admin());
drop policy if exists "public reads contact details" on public.portfolio_contact;
create policy "public reads contact details" on public.portfolio_contact for select to anon, authenticated using(true);
drop policy if exists "admins manage contact details" on public.portfolio_contact;
create policy "admins manage contact details" on public.portfolio_contact for all to authenticated using(public.is_portfolio_admin()) with check(public.is_portfolio_admin());
drop policy if exists "public reads published education" on public.education;
create policy "public reads published education" on public.education for select to anon, authenticated using(status='published');
drop policy if exists "admins manage education" on public.education;
create policy "admins manage education" on public.education for all to authenticated using(public.is_portfolio_admin()) with check(public.is_portfolio_admin());
drop policy if exists "public reads published experience" on public.experience;
create policy "public reads published experience" on public.experience for select to anon, authenticated using(status='published');
drop policy if exists "admins manage experience" on public.experience;
create policy "admins manage experience" on public.experience for all to authenticated using(public.is_portfolio_admin()) with check(public.is_portfolio_admin());
-- Anonymous visitors may submit a message. Only allowlisted admins can read or change inbox rows.
drop policy if exists "visitors submit contact messages" on public.contact_messages;
create policy "visitors submit contact messages" on public.contact_messages for insert to anon, authenticated with check(status='unread');
drop policy if exists "admins read contact messages" on public.contact_messages;
create policy "admins read contact messages" on public.contact_messages for select to authenticated using(public.is_portfolio_admin());
drop policy if exists "admins update contact messages" on public.contact_messages;
create policy "admins update contact messages" on public.contact_messages for update to authenticated using(public.is_portfolio_admin()) with check(public.is_portfolio_admin());
drop policy if exists "admins delete contact messages" on public.contact_messages;
create policy "admins delete contact messages" on public.contact_messages for delete to authenticated using(public.is_portfolio_admin());

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('profile-photos','profile-photos',true,10485760,array['image/jpeg','image/png','image/webp']),
 ('company-logos','company-logos',true,10485760,array['image/jpeg','image/png','image/webp'])
on conflict(id) do nothing;
drop policy if exists "public reads profile and company images" on storage.objects;
create policy "public reads profile and company images" on storage.objects for select to anon,authenticated using(bucket_id in ('profile-photos','company-logos'));
drop policy if exists "admins upload profile and company images" on storage.objects;
create policy "admins upload profile and company images" on storage.objects for insert to authenticated with check(bucket_id in ('profile-photos','company-logos') and public.is_portfolio_admin());
drop policy if exists "admins update profile and company images" on storage.objects;
create policy "admins update profile and company images" on storage.objects for update to authenticated using(bucket_id in ('profile-photos','company-logos') and public.is_portfolio_admin()) with check(bucket_id in ('profile-photos','company-logos') and public.is_portfolio_admin());
drop policy if exists "admins delete profile and company images" on storage.objects;
create policy "admins delete profile and company images" on storage.objects for delete to authenticated using(bucket_id in ('profile-photos','company-logos') and public.is_portfolio_admin());
create index if not exists education_public_idx on public.education(status,start_date desc);
create index if not exists experience_public_idx on public.experience(status,start_date desc);
create index if not exists contact_messages_inbox_idx on public.contact_messages(status,created_at desc);
