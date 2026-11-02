# N.S. Tomar Portfolio + Supabase CMS

This project keeps the existing Projects, Certificates, Skills, Resumes, Supabase Auth, and Storage CMS. New profile, education, experience, contact settings, and private message inbox features are additive.

## Setup

1. Extract the ZIP and serve the folder through a local web server (for example, VS Code Live Server). Do not open pages with `file://`.
2. In `js/config.js`, set the Supabase Project URL and publishable anon key. Never put a `service_role` or secret key in browser code.
3. In Supabase SQL Editor, confirm the original schema and admin allowlist are already present. This project does not remove or reset them.
4. Run the migrations in `supabase/migrations/` in filename order. `20261031_add_portfolio_sections.sql` supports older integrated versions; `20261101_profile_education_experience_contact.sql` adds the requested CMS tables and policies. Both are additive and safe to rerun.
5. Ensure your existing admin user is in `public.admin_users`. Sign in at `admin.html`.
6. Use Home / About and Contact to create their single records. Add Education and Experience records; choose Published to show them publicly. The existing four CMS sections remain available.

## Contact form security

The public site can insert visitor messages into `contact_messages`. RLS does not grant anonymous reads. Only users listed in `admin_users` can read, mark messages read/unread, or delete them. Email delivery is not included; submissions appear in the Admin Contact inbox.

## Storage

The original project, certificate, and resume buckets remain. The new migration adds public-read/admin-write buckets for profile photos and company logos. Existing upload code and records are preserved.

## New data fields

- Profile social links: JSON array such as `[{"label":"GitHub","url":"https://github.com/example"}]`.
- Education: degree, institution, location, dates, current-study flag, description, draft/published status.
- Experience responsibilities and technologies are entered one per line.

Only verified personal and employment details should be entered. The sample portfolio does not seed an employer or internship record.
