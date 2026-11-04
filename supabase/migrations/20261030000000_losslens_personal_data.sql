-- Apply this complete file as one migration. The explicit transaction makes
-- the schema, grants, triggers, and policies all-or-nothing.
begin;

create table if not exists public.financial_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  placed_date date not null,
  bookmaker text not null check (length(btrim(bookmaker)) between 1 and 200),
  bet_type text not null check (bet_type in ('single', 'multi')),
  legs integer not null check (legs >= 1),
  odds_taken numeric(18, 6) not null check (odds_taken > 1),
  stake_paise numeric(20, 0) not null check (stake_paise > 0),
  result text not null check (result in ('won', 'lost', 'cashout', 'void')),
  returned_paise numeric(20, 0) not null check (returned_paise >= 0),
  market_family text not null check (market_family in ('threeWay', 'twoWay', 'notSure')),
  note text not null default '' check (length(note) <= 280),
  input_route text not null default 'manual' check (input_route = 'manual'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  check ((bet_type = 'single' and legs = 1) or (bet_type = 'multi' and legs >= 2))
);

create index if not exists financial_entries_user_date_idx
  on public.financial_entries (user_id, placed_date desc);

create table if not exists public.financial_period_contexts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  income_paise numeric(20, 0) check (income_paise is null or income_paise >= 0),
  loss_budget_paise numeric(20, 0) check (loss_budget_paise is null or loss_budget_paise >= 0),
  reviewed boolean not null default false,
  accounting_status text not null default 'notReviewed'
    check (accounting_status in ('notReviewed', 'noKnownUnsupportedItems', 'hasUnsupportedItems')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, period_start, period_end),
  unique (id, user_id),
  check (period_end >= period_start)
);

create index if not exists financial_period_contexts_user_period_idx
  on public.financial_period_contexts (user_id, period_start desc, period_end desc);

create table if not exists public.financial_duplicate_decisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  duplicate_key text not null,
  decision text not null check (decision in ('separate', 'single')),
  selected_entry_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, duplicate_key),
  unique (id, user_id),
  check (
    (decision = 'single' and selected_entry_id is not null)
    or (decision = 'separate' and selected_entry_id is null)
  ),
  foreign key (selected_entry_id, user_id)
    references public.financial_entries (id, user_id)
    on delete cascade
);

create table if not exists public.recovery_check_ins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  entry_date date not null,
  gambled text not null default 'notRecorded'
    check (gambled in ('yes', 'no', 'notRecorded')),
  duration_minutes integer check (duration_minutes is null or duration_minutes between 0 and 1440),
  urge_level integer check (urge_level is null or urge_level between 0 and 4),
  mood text not null default '' check (length(mood) <= 120),
  triggers text[] not null default '{}',
  coping_strategies text[] not null default '{}',
  stake_paise numeric(20, 0) check (stake_paise is null or stake_paise >= 0),
  returned_paise numeric(20, 0) check (returned_paise is null or returned_paise >= 0),
  note text not null default '' check (length(note) <= 10000),
  wants_reflection boolean not null default false,
  reflection_trigger text not null default '' check (length(reflection_trigger) <= 300),
  reflection_thought text not null default '' check (length(reflection_thought) <= 300),
  reflection_alternative text not null default '' check (length(reflection_alternative) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, entry_date),
  unique (id, user_id)
);

create index if not exists recovery_check_ins_user_date_idx
  on public.recovery_check_ins (user_id, entry_date desc);

create table if not exists public.diary_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  occurred_at timestamptz not null default now(),
  mood text not null default '' check (length(mood) <= 120),
  gambled text not null default 'notRecorded'
    check (gambled in ('yes', 'no', 'notRecorded')),
  stake_paise numeric(20, 0) check (stake_paise is null or stake_paise >= 0),
  returned_paise numeric(20, 0) check (returned_paise is null or returned_paise >= 0),
  triggers text[] not null default '{}',
  coping_strategies text[] not null default '{}',
  note text not null default '' check (length(note) <= 20000),
  wants_reflection boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create index if not exists diary_entries_user_occurred_idx
  on public.diary_entries (user_id, occurred_at desc);

create table if not exists public.recovery_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  goal_type text not null default 'harm_reduction'
    check (goal_type in ('harm_reduction', 'abstinence', 'maintenance')),
  mode text not null check (mode in ('reduce', 'stop', 'maintain')),
  title text not null check (length(btrim(title)) between 1 and 240),
  specific text not null default '' check (length(specific) <= 2000),
  measurable text not null default '' check (length(measurable) <= 2000),
  achievable text not null default '' check (length(achievable) <= 2000),
  relevant text not null default '' check (length(relevant) <= 2000),
  target_days integer check (target_days is null or target_days between 1 and 365),
  target_date date,
  obstacles text not null default '' check (length(obstacles) <= 4000),
  coping_plan text not null default '' check (length(coping_plan) <= 4000),
  status text not null default 'active' check (status in ('active', 'paused', 'completed', 'archived')),
  progress_note text not null default '' check (length(progress_note) <= 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create index if not exists recovery_goals_user_status_idx
  on public.recovery_goals (user_id, status, updated_at desc);

create table if not exists public.weekly_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  week_start date not null,
  week_end date not null,
  achievements text not null default '' check (length(achievements) <= 5000),
  difficulties text not null default '' check (length(difficulties) <= 5000),
  lessons text not null default '' check (length(lessons) <= 5000),
  next_steps text not null default '' check (length(next_steps) <= 5000),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, week_start),
  unique (id, user_id),
  check (week_end >= week_start)
);

create table if not exists public.monthly_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  month_start date not null,
  achievements text not null default '' check (length(achievements) <= 5000),
  difficulties text not null default '' check (length(difficulties) <= 5000),
  lessons text not null default '' check (length(lessons) <= 5000),
  future_intentions text not null default '' check (length(future_intentions) <= 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, month_start),
  unique (id, user_id)
);

create table if not exists public.user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() unique references auth.users(id) on delete cascade,
  cloud_storage_consent_version text,
  cloud_storage_consented_at timestamptz,
  cloud_storage_consent_revoked_at timestamptz,
  alternative_activities text[] not null default '{}',
  reasons_to_pause text not null default '' check (length(reasons_to_pause) <= 5000),
  locale text not null default 'en-KE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create table if not exists public.tool_reflections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  reflection_date date not null,
  trigger text not null default '' check (length(trigger) <= 300),
  thought text not null default '' check (length(thought) <= 300),
  alternative_thought text not null default '' check (length(alternative_thought) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, reflection_date),
  unique (id, user_id)
);

create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'rejected')),
  requested_at timestamptz not null default now(),
  processed_at timestamptz,
  user_message text not null default '' check (length(user_message) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create index if not exists account_deletion_requests_user_requested_idx
  on public.account_deletion_requests (user_id, requested_at desc);

create unique index if not exists account_deletion_requests_one_open_per_user_idx
  on public.account_deletion_requests (user_id)
  where status in ('pending', 'processing');

create or replace function public.prevent_user_id_change()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.user_id is distinct from old.user_id then
    raise exception 'Record ownership cannot be changed';
  end if;
  return new;
end;
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;

revoke all on function public.prevent_user_id_change() from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;

create or replace function public.has_active_cloud_storage_consent()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_preferences as preferences
    where preferences.user_id = (select auth.uid())
      and preferences.cloud_storage_consent_version = 'cloud-storage-v1'
      and preferences.cloud_storage_consented_at is not null
      and preferences.cloud_storage_consent_revoked_at is null
  );
$$;

create or replace function public.get_data_setup_status()
returns table (has_consent boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_active_cloud_storage_consent()
  where (select auth.uid()) is not null;
$$;

create or replace function public.record_cloud_storage_consent(
  p_consent_version text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'An authenticated user is required';
  end if;
  if p_consent_version is distinct from 'cloud-storage-v1' then
    raise exception 'The requested cloud-storage consent version is unsupported';
  end if;

  insert into public.user_preferences (
    user_id,
    cloud_storage_consent_version,
    cloud_storage_consented_at,
    cloud_storage_consent_revoked_at
  ) values (
    v_user_id,
    p_consent_version,
    pg_catalog.now(),
    null
  )
  on conflict (user_id) do update
    set cloud_storage_consent_version = excluded.cloud_storage_consent_version,
        cloud_storage_consented_at = excluded.cloud_storage_consented_at,
        cloud_storage_consent_revoked_at = null,
        updated_at = pg_catalog.now();
end;
$$;

create or replace function public.revoke_cloud_storage_consent()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'An authenticated user is required';
  end if;

  update public.user_preferences
  set cloud_storage_consent_revoked_at = pg_catalog.now(),
      updated_at = pg_catalog.now()
  where user_id = v_user_id
    and cloud_storage_consent_version = 'cloud-storage-v1'
    and cloud_storage_consented_at is not null
    and cloud_storage_consent_revoked_at is null;

  if not found then
    raise exception 'No active cloud-storage consent was found';
  end if;
end;
$$;

revoke all on function public.record_cloud_storage_consent(text) from public, anon, authenticated;
revoke all on function public.revoke_cloud_storage_consent() from public, anon, authenticated;
revoke all on function public.get_data_setup_status() from public, anon, authenticated;
revoke all on function public.has_active_cloud_storage_consent() from public, anon, authenticated;

grant execute on function public.get_data_setup_status() to authenticated;
grant execute on function public.has_active_cloud_storage_consent() to authenticated;
grant execute on function public.record_cloud_storage_consent(text) to authenticated;
grant execute on function public.revoke_cloud_storage_consent() to authenticated;

do $$
declare
  target_table text;
  policy_name text;
  column_names text;
  select_columns text;
  insert_columns text;
  update_columns text;
  delete_allowed boolean;
  user_tables text[] := array[
    'financial_entries',
    'financial_period_contexts',
    'financial_duplicate_decisions',
    'recovery_check_ins',
    'diary_entries',
    'recovery_goals',
    'weekly_reviews',
    'monthly_reviews',
    'user_preferences',
    'tool_reflections',
    'account_deletion_requests'
  ];
begin
  foreach target_table in array user_tables loop
    execute format('alter table public.%I enable row level security', target_table);
    execute format('revoke all privileges on table public.%I from public, anon, authenticated', target_table);
    select string_agg(format('%I', column_name), ', ' order by ordinal_position)
      into column_names
      from information_schema.columns as c
      where c.table_schema = 'public'
        and c.table_name = target_table;
    execute format(
      'revoke all privileges (%s) on table public.%I from public, anon, authenticated',
      column_names,
      target_table
    );

    for policy_name in
      select policies.policyname
      from pg_catalog.pg_policies as policies
      where policies.schemaname = 'public'
        and policies.tablename = target_table
    loop
      execute format('drop policy %I on public.%I', policy_name, target_table);
    end loop;

    execute format(
      'drop trigger if exists %I on public.%I',
      target_table || '_prevent_owner_change',
      target_table
    );
    execute format(
      'drop trigger if exists %I on public.%I',
      target_table || '_set_updated_at',
      target_table
    );
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.prevent_user_id_change()',
      target_table || '_prevent_owner_change',
      target_table
    );
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
      target_table || '_set_updated_at',
      target_table
    );
  end loop;

  foreach target_table in array user_tables loop
    select null, null, null, false
      into select_columns, insert_columns, update_columns, delete_allowed;

    case target_table
      when 'financial_entries' then
        select_columns := 'id, user_id, placed_date, bookmaker, bet_type, legs, odds_taken, stake_paise, result, returned_paise, market_family, note, input_route, created_at, updated_at';
        insert_columns := 'id, placed_date, bookmaker, bet_type, legs, odds_taken, stake_paise, result, returned_paise, market_family, note, input_route, created_at, updated_at';
        update_columns := 'placed_date, bookmaker, bet_type, legs, odds_taken, stake_paise, result, returned_paise, market_family, note, input_route';
        delete_allowed := true;
      when 'financial_period_contexts' then
        select_columns := 'id, user_id, period_start, period_end, income_paise, loss_budget_paise, reviewed, accounting_status, created_at, updated_at';
        insert_columns := 'period_start, period_end, income_paise, loss_budget_paise, reviewed, accounting_status, updated_at';
        update_columns := 'period_start, period_end, income_paise, loss_budget_paise, reviewed, accounting_status';
        delete_allowed := true;
      when 'financial_duplicate_decisions' then
        select_columns := 'id, user_id, duplicate_key, decision, selected_entry_id, created_at, updated_at';
        insert_columns := 'duplicate_key, decision, selected_entry_id, updated_at';
        update_columns := 'duplicate_key, decision, selected_entry_id';
        delete_allowed := true;
      when 'recovery_check_ins' then
        select_columns := 'id, user_id, entry_date, gambled, duration_minutes, urge_level, mood, triggers, coping_strategies, stake_paise, returned_paise, note, wants_reflection, reflection_trigger, reflection_thought, reflection_alternative, created_at, updated_at';
        insert_columns := 'entry_date, gambled, duration_minutes, urge_level, mood, triggers, coping_strategies, stake_paise, returned_paise, note, wants_reflection, reflection_trigger, reflection_thought, reflection_alternative, updated_at';
        update_columns := 'entry_date, gambled, duration_minutes, urge_level, mood, triggers, coping_strategies, stake_paise, returned_paise, note, wants_reflection, reflection_trigger, reflection_thought, reflection_alternative';
        delete_allowed := true;
      when 'diary_entries' then
        select_columns := 'id, user_id, occurred_at, mood, gambled, stake_paise, returned_paise, triggers, coping_strategies, note, wants_reflection, created_at, updated_at';
        insert_columns := 'id, occurred_at, mood, gambled, stake_paise, returned_paise, triggers, coping_strategies, note, wants_reflection, updated_at';
        update_columns := 'occurred_at, mood, gambled, stake_paise, returned_paise, triggers, coping_strategies, note, wants_reflection';
        delete_allowed := true;
      when 'recovery_goals' then
        select_columns := 'id, user_id, goal_type, mode, title, specific, measurable, achievable, relevant, target_days, target_date, obstacles, coping_plan, status, progress_note, created_at, updated_at';
        insert_columns := 'goal_type, mode, title, specific, measurable, achievable, relevant, target_days, target_date, obstacles, coping_plan, status, progress_note, updated_at';
        update_columns := 'goal_type, mode, title, specific, measurable, achievable, relevant, target_days, target_date, obstacles, coping_plan, status, progress_note';
        delete_allowed := true;
      when 'weekly_reviews' then
        select_columns := 'id, user_id, week_start, week_end, achievements, difficulties, lessons, next_steps, completed_at, created_at, updated_at';
        insert_columns := 'week_start, week_end, achievements, difficulties, lessons, next_steps, completed_at, updated_at';
        update_columns := 'week_start, week_end, achievements, difficulties, lessons, next_steps, completed_at';
        delete_allowed := true;
      when 'monthly_reviews' then
        select_columns := 'id, user_id, month_start, achievements, difficulties, lessons, future_intentions, created_at, updated_at';
        insert_columns := 'month_start, achievements, difficulties, lessons, future_intentions, updated_at';
        update_columns := 'month_start, achievements, difficulties, lessons, future_intentions';
        delete_allowed := true;
      when 'user_preferences' then
        select_columns := 'id, user_id, alternative_activities, reasons_to_pause, locale, created_at, updated_at';
        insert_columns := 'alternative_activities, reasons_to_pause, locale, updated_at';
        update_columns := 'alternative_activities, reasons_to_pause, locale';
      when 'tool_reflections' then
        select_columns := 'id, user_id, reflection_date, trigger, thought, alternative_thought, created_at, updated_at';
        insert_columns := 'reflection_date, trigger, thought, alternative_thought, updated_at';
        update_columns := 'reflection_date, trigger, thought, alternative_thought';
        delete_allowed := true;
      when 'account_deletion_requests' then
        select_columns := 'id, user_id, status, requested_at, processed_at, user_message, created_at, updated_at';
        insert_columns := 'user_message';
      else
        select_columns := null;
        insert_columns := null;
        update_columns := null;
        delete_allowed := false;
    end case;

    if select_columns is not null then
      execute format(
        'grant select (%s) on table public.%I to authenticated',
        select_columns,
        target_table
      );
      execute format(
        'grant insert (%s) on table public.%I to authenticated',
        insert_columns,
        target_table
      );
      if update_columns is not null then
        execute format(
          'grant update (%s) on table public.%I to authenticated',
          update_columns,
          target_table
        );
      end if;
      if delete_allowed then
        execute format('grant delete on table public.%I to authenticated', target_table);
      end if;
    end if;

    if target_table = 'account_deletion_requests' then
      execute format(
        'create policy %I on public.%I for select to authenticated using (user_id = (select auth.uid()))',
        target_table || '_select_own',
        target_table
      );
      execute format(
        'create policy %I on public.%I for insert to authenticated with check (user_id = (select auth.uid()))',
        target_table || '_insert_own',
        target_table
      );
    elsif target_table = 'user_preferences' then
      execute format(
        'create policy %I on public.%I for select to authenticated using (user_id = (select auth.uid()))',
        target_table || '_select_own',
        target_table
      );
      execute format(
        'create policy %I on public.%I for insert to authenticated with check (user_id = (select auth.uid()) and public.has_active_cloud_storage_consent())',
        target_table || '_insert_own',
        target_table
      );
      execute format(
        'create policy %I on public.%I for update to authenticated using (user_id = (select auth.uid()) and public.has_active_cloud_storage_consent()) with check (user_id = (select auth.uid()) and public.has_active_cloud_storage_consent())',
        target_table || '_update_own',
        target_table
      );
    else
      execute format(
        'create policy %I on public.%I for select to authenticated using (user_id = (select auth.uid()) and public.has_active_cloud_storage_consent())',
        target_table || '_select_own',
        target_table
      );
      execute format(
        'create policy %I on public.%I for insert to authenticated with check (user_id = (select auth.uid()) and public.has_active_cloud_storage_consent())',
        target_table || '_insert_own',
        target_table
      );
      execute format(
        'create policy %I on public.%I for update to authenticated using (user_id = (select auth.uid()) and public.has_active_cloud_storage_consent()) with check (user_id = (select auth.uid()) and public.has_active_cloud_storage_consent())',
        target_table || '_update_own',
        target_table
      );
      if delete_allowed then
        execute format(
          'create policy %I on public.%I for delete to authenticated using (user_id = (select auth.uid()) and public.has_active_cloud_storage_consent())',
          target_table || '_delete_own',
          target_table
        );
      end if;
    end if;
  end loop;
end;
$$;

-- Account contact profile used by email/password authentication. Phone number
-- is contact metadata only and is never used as a Supabase login identity.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  phone_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.prevent_profile_id_change()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.id is distinct from old.id then
    raise exception 'Profile ownership cannot be changed';
  end if;
  return new;
end;
$$;

create or replace function public.handle_new_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, phone_number)
  values (
    new.id,
    new.raw_user_meta_data ->> 'phone_number'
  )
  on conflict (id) do update
  set phone_number = coalesce(public.profiles.phone_number, excluded.phone_number);
  return new;
end;
$$;

revoke all on function public.prevent_profile_id_change() from public, anon, authenticated;
revoke all on function public.handle_new_auth_user_profile() from public, anon, authenticated;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute function public.handle_new_auth_user_profile();

drop trigger if exists profiles_prevent_id_change on public.profiles;
create trigger profiles_prevent_id_change
before update on public.profiles
for each row execute function public.prevent_profile_id_change();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
revoke all privileges on table public.profiles from public, anon, authenticated;
grant select (id, phone_number, created_at, updated_at) on table public.profiles to authenticated;
grant insert (id, phone_number, created_at, updated_at) on table public.profiles to authenticated;
grant update (phone_number) on table public.profiles to authenticated;

drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_select_own on public.profiles
for select to authenticated
using (id = (select auth.uid()));
create policy profiles_insert_own on public.profiles
for insert to authenticated
with check (id = (select auth.uid()));
create policy profiles_update_own on public.profiles
for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

insert into public.profiles (id, phone_number)
select users.id, users.raw_user_meta_data ->> 'phone_number'
from auth.users as users
where users.id is not null
on conflict (id) do update
set phone_number = coalesce(public.profiles.phone_number, excluded.phone_number);

commit;
