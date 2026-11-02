-- Run AFTER creating the admin user in Supabase Authentication > Users.
-- Replace the UUID below with the Auth user's actual UUID.
insert into public.admin_users (user_id)
values ('3c5411fb-9884-482b-b13c-67b455d0ec59')
on conflict (user_id) do nothing;
