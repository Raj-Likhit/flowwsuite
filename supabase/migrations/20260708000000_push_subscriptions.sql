-- Create push subscriptions table
create table if not exists public.push_subscriptions (
    id uuid default gen_random_uuid() primary key,
    profile_id uuid not null references public.profiles(id) on delete cascade,
    subscription jsonb not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.push_subscriptions enable row level security;

-- Drop previous policies to avoid conflicts
drop policy if exists "Users can view their own push subscriptions" on public.push_subscriptions;
drop policy if exists "Users can insert their own push subscriptions" on public.push_subscriptions;
drop policy if exists "Users can delete their own push subscriptions" on public.push_subscriptions;
drop policy if exists "Admins can view all push subscriptions" on public.push_subscriptions;
drop policy if exists "Allow profile holders or auth users to insert push subscriptions" on public.push_subscriptions;
drop policy if exists "Allow profile holders or auth users to view push subscriptions" on public.push_subscriptions;
drop policy if exists "Allow profile holders or auth users to delete push subscriptions" on public.push_subscriptions;

-- Create policies aligned with both Auth users and active profile holders
create policy "Allow profile holders or auth users to view push subscriptions"
    on public.push_subscriptions for select
    using (
        (auth.uid() is not null and auth.uid() = profile_id)
        or exists (select 1 from public.profiles where id = profile_id)
        or ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
    );

create policy "Allow profile holders or auth users to insert push subscriptions"
    on public.push_subscriptions for insert
    with check (
        (auth.uid() is not null and auth.uid() = profile_id)
        or exists (select 1 from public.profiles where id = profile_id and is_suspended = false)
        or ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
    );

create policy "Allow profile holders or auth users to delete push subscriptions"
    on public.push_subscriptions for delete
    using (
        (auth.uid() is not null and auth.uid() = profile_id)
        or exists (select 1 from public.profiles where id = profile_id)
        or ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
    );
