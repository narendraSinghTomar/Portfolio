-- Additive migration for integrated public portfolio sections.
-- Existing CMS tables, records, policies, and storage buckets are preserved.
create table if not exists public.portfolio_sections (
  id uuid primary key default gen_random_uuid(),
  section_key text not null check (section_key in ('home','about','experience','education','contact')),
  title text not null default '',
  content jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  status text not null default 'published' check (status in ('draft','published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists portfolio_sections_public_order_idx
  on public.portfolio_sections(section_key, status, sort_order);
alter table public.portfolio_sections enable row level security;
drop policy if exists "public reads published portfolio sections" on public.portfolio_sections;
create policy "public reads published portfolio sections"
  on public.portfolio_sections for select to anon, authenticated
  using (status = 'published');
drop policy if exists "admins manage portfolio sections" on public.portfolio_sections;
create policy "admins manage portfolio sections"
  on public.portfolio_sections for all to authenticated
  using (public.is_portfolio_admin()) with check (public.is_portfolio_admin());
