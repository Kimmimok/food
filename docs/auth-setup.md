Supabase Auth & Roles setup

1) user_profile table
```
create table if not exists public.user_profile (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  role text check (role in ('member','manager','admin')) default 'member',
  created_at timestamptz default now()
);
```

2) RLS
```
alter table public.user_profile enable row level security;
create policy "owner can read own profile" on public.user_profile
  for select using (auth.uid() = id);
create policy "owner can update own profile" on public.user_profile
  for update using (auth.uid() = id);
-- Admin management can be manual via SQL or an admin interface.
```

3) Benefit for member
- You can store coupons/points in e.g. `member_benefit` and join via user_profile.id.
