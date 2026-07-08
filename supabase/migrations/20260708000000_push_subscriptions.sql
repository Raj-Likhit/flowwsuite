-- Create push subscriptions table
create table if not exists public.push_subscriptions (
    id uuid default gen_random_uuid() primary key,
    profile_id uuid not null references public.profiles(id) on delete cascade,
    subscription jsonb not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.push_subscriptions enable row level security;

-- Create policies
create policy "Users can view their own push subscriptions"
    on public.push_subscriptions for select
    using (auth.uid() = profile_id);

create policy "Users can insert their own push subscriptions"
    on public.push_subscriptions for insert
    with check (auth.uid() = profile_id);

create policy "Users can delete their own push subscriptions"
    on public.push_subscriptions for delete
    using (auth.uid() = profile_id);

-- Admins need read access to all subscriptions to send push notifications from Edge Functions (usually bypasses RLS if service_role key is used, but good to be explicit if invoked via client)
create policy "Admins can view all push subscriptions"
    on public.push_subscriptions for select
    using (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    );
