create table if not exists public.business_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  device_id text,
  updated_at timestamptz not null default now()
);

alter table public.business_state enable row level security;

drop policy if exists "Users read their business state" on public.business_state;
create policy "Users read their business state"
on public.business_state for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users insert their business state" on public.business_state;
create policy "Users insert their business state"
on public.business_state for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users update their business state" on public.business_state;
create policy "Users update their business state"
on public.business_state for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

grant select, insert, update on public.business_state to authenticated;

alter publication supabase_realtime add table public.business_state;
