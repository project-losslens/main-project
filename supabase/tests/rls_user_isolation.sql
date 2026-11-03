-- Local non-production Supabase integration test. Uses only synthetic rows and
-- rolls the entire test transaction back. Never pass production account IDs.
-- Run against a local test database after applying the migration:
-- psql "$LOCAL_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 \
--   -v user_a=UUID_A -v user_b=UUID_B \
--   -f supabase/tests/rls_user_isolation.sql
-- Both auth.users rows must have raw_app_meta_data.losslens_test_account=true.
-- The test login must be privileged enough to SET ROLE, inspect catalog
-- privileges, and update rows as the table owner to exercise the owner-change
-- trigger. The supplied IDs must belong to two separate test accounts.

\set ON_ERROR_STOP on

begin;
select set_config('losslens.test_user_a', :'user_a', true);
select set_config('losslens.test_user_b', :'user_b', true);

do $$
declare
  target_table text;
  column_name text;
  existing_rows bigint;
  app_tables text[] := array[
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
  if current_setting('losslens.environment', true) is distinct from 'nonproduction' then
    raise exception 'Refusing to run: the database must be marked losslens.environment=nonproduction';
  end if;
  if current_setting('losslens.test_user_a')::uuid =
     current_setting('losslens.test_user_b')::uuid then
    raise exception 'The two test account IDs must be different';
  end if;
  if not exists (
    select 1
    from auth.users
    where id = current_setting('losslens.test_user_a')::uuid
      and raw_app_meta_data ->> 'losslens_test_account' = 'true'
  ) or not exists (
    select 1
    from auth.users
    where id = current_setting('losslens.test_user_b')::uuid
      and raw_app_meta_data ->> 'losslens_test_account' = 'true'
  ) then
    raise exception 'Both IDs must be dedicated Auth test accounts marked losslens_test_account=true';
  end if;
  if cardinality(app_tables) <> 11 then
    raise exception 'RLS test must cover all 11 personal tables';
  end if;

  foreach target_table in array app_tables loop
    execute format(
      'select count(*) from public.%I where user_id in ($1, $2)',
      target_table
    )
    into existing_rows
    using
      current_setting('losslens.test_user_a')::uuid,
      current_setting('losslens.test_user_b')::uuid;
    if existing_rows <> 0 then
      raise exception 'Synthetic test accounts already have rows in public.%', target_table;
    end if;

    if not exists (
      select 1
      from pg_catalog.pg_class as relation
      join pg_catalog.pg_namespace as schema on schema.oid = relation.relnamespace
      where schema.nspname = 'public'
        and relation.relname = target_table
        and relation.relrowsecurity
    ) then
      raise exception 'RLS is not enabled for public.%', target_table;
    end if;
    if pg_catalog.has_table_privilege('anon', 'public.' || target_table, 'SELECT')
       or pg_catalog.has_table_privilege('anon', 'public.' || target_table, 'INSERT')
       or pg_catalog.has_table_privilege('anon', 'public.' || target_table, 'UPDATE')
       or pg_catalog.has_table_privilege('anon', 'public.' || target_table, 'DELETE')
       or pg_catalog.has_table_privilege('anon', 'public.' || target_table, 'TRUNCATE')
       or pg_catalog.has_table_privilege('anon', 'public.' || target_table, 'REFERENCES')
       or pg_catalog.has_table_privilege('anon', 'public.' || target_table, 'TRIGGER') then
      raise exception 'anon unexpectedly has table privileges on public.%', target_table;
    end if;
    for column_name in
      select c.column_name
      from information_schema.columns as c
      where c.table_schema = 'public'
        and c.table_name = target_table
    loop
      if pg_catalog.has_column_privilege(
           'anon', 'public.' || target_table, column_name, 'SELECT'
         )
         or pg_catalog.has_column_privilege(
           'anon', 'public.' || target_table, column_name, 'INSERT'
         )
         or pg_catalog.has_column_privilege(
           'anon', 'public.' || target_table, column_name, 'UPDATE'
         )
         or pg_catalog.has_column_privilege(
           'anon', 'public.' || target_table, column_name, 'REFERENCES'
         ) then
        raise exception 'anon unexpectedly has column privileges on public.%.%',
          target_table, column_name;
      end if;
    end loop;
    if pg_catalog.has_column_privilege(
         'authenticated', 'public.' || target_table, 'user_id', 'INSERT'
       )
       or pg_catalog.has_column_privilege(
         'authenticated', 'public.' || target_table, 'user_id', 'UPDATE'
       ) then
      raise exception 'Authenticated clients can directly set ownership in public.%', target_table;
    end if;
  end loop;

  if pg_catalog.has_table_privilege('authenticated', 'public.weekly_reviews', 'SELECT')
     or pg_catalog.has_table_privilege('authenticated', 'public.weekly_reviews', 'INSERT')
     or pg_catalog.has_table_privilege('authenticated', 'public.weekly_reviews', 'UPDATE')
     or pg_catalog.has_table_privilege('authenticated', 'public.weekly_reviews', 'DELETE')
  then
    raise exception 'Authenticated clients unexpectedly have access to schema-only feature tables';
  end if;

  foreach target_table in array array[
    'weekly_reviews'
  ] loop
    for column_name in
      select c.column_name
      from information_schema.columns as c
      where c.table_schema = 'public'
        and c.table_name = target_table
    loop
      if pg_catalog.has_column_privilege(
           'authenticated', 'public.' || target_table, column_name, 'SELECT'
         )
         or pg_catalog.has_column_privilege(
           'authenticated', 'public.' || target_table, column_name, 'INSERT'
         )
         or pg_catalog.has_column_privilege(
           'authenticated', 'public.' || target_table, column_name, 'UPDATE'
         )
         or pg_catalog.has_column_privilege(
           'authenticated', 'public.' || target_table, column_name, 'REFERENCES'
         ) then
        raise exception 'Authenticated clients have unintended column access to public.%.%',
          target_table, column_name;
      end if;
    end loop;
  end loop;

  if pg_catalog.has_column_privilege(
       'authenticated', 'public.user_preferences',
       'cloud_storage_consent_version', 'INSERT'
     )
     or pg_catalog.has_column_privilege(
       'authenticated', 'public.user_preferences',
       'cloud_storage_consent_version', 'UPDATE'
     )
     or pg_catalog.has_column_privilege(
       'authenticated', 'public.user_preferences',
       'cloud_storage_consented_at', 'INSERT'
     )
     or pg_catalog.has_column_privilege(
       'authenticated', 'public.user_preferences',
       'cloud_storage_consented_at', 'UPDATE'
     )
     or pg_catalog.has_column_privilege(
       'authenticated', 'public.user_preferences',
       'cloud_storage_consent_revoked_at', 'INSERT'
     )
     or pg_catalog.has_column_privilege(
       'authenticated', 'public.user_preferences',
       'cloud_storage_consent_revoked_at', 'UPDATE'
     ) then
    raise exception 'Authenticated clients can directly alter cloud-storage consent';
  end if;

  if pg_catalog.has_column_privilege(
       'authenticated', 'public.account_deletion_requests', 'status', 'INSERT'
     )
     or pg_catalog.has_column_privilege(
       'authenticated', 'public.account_deletion_requests', 'status', 'UPDATE'
     )
     or pg_catalog.has_column_privilege(
       'authenticated', 'public.account_deletion_requests', 'processed_at', 'INSERT'
     )
     or pg_catalog.has_column_privilege(
       'authenticated', 'public.account_deletion_requests', 'processed_at', 'UPDATE'
     )
     or pg_catalog.has_column_privilege(
       'authenticated', 'public.account_deletion_requests', 'requested_at', 'INSERT'
     ) then
    raise exception 'Authenticated clients can alter deletion-request workflow fields';
  end if;

  if pg_catalog.has_table_privilege(
       'authenticated', 'public.user_preferences', 'DELETE'
     )
     or pg_catalog.has_table_privilege(
       'authenticated', 'public.account_deletion_requests', 'DELETE'
     ) then
    raise exception 'Authenticated clients can delete protected preference/request rows';
  end if;

  if pg_catalog.has_function_privilege(
       'anon', 'public.get_data_setup_status()', 'EXECUTE'
     )
     or pg_catalog.has_function_privilege(
       'anon', 'public.has_active_cloud_storage_consent()', 'EXECUTE'
     )
     or pg_catalog.has_function_privilege(
       'anon', 'public.record_cloud_storage_consent(text)', 'EXECUTE'
     )
     or pg_catalog.has_function_privilege(
       'anon', 'public.revoke_cloud_storage_consent()', 'EXECUTE'
     )
     or not pg_catalog.has_function_privilege(
       'authenticated', 'public.get_data_setup_status()', 'EXECUTE'
     )
     or not pg_catalog.has_function_privilege(
       'authenticated', 'public.has_active_cloud_storage_consent()', 'EXECUTE'
     )
     or not pg_catalog.has_function_privilege(
       'authenticated', 'public.record_cloud_storage_consent(text)', 'EXECUTE'
     )
     or not pg_catalog.has_function_privilege(
       'authenticated', 'public.revoke_cloud_storage_consent()', 'EXECUTE'
     ) then
    raise exception 'Workflow RPC execute grants are not restricted as expected';
  end if;
end;
$$;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  current_setting('losslens.test_user_a'),
  true
);
do $$
declare
  setup_row record;
  no_consent_write_rejected boolean := false;
begin
  select * into setup_row from public.get_data_setup_status();
  if not found
     or setup_row.has_consent is distinct from false
     or setup_row.validated_bet_migration is distinct from false
     or setup_row.validated_personal_migration is distinct from false then
    raise exception 'Initial setup status did not report all three values as false';
  end if;

  begin
    insert into public.financial_entries (
      placed_date, bookmaker, bet_type, legs, odds_taken, stake_paise,
      result, returned_paise, market_family
    ) values (
      current_date, 'Synthetic no-consent test', 'single', 1, 2.10, 100,
      'lost', 0, 'notSure'
    );
  exception when insufficient_privilege then
    no_consent_write_rejected := true;
  end;
  if not no_consent_write_rejected then
    raise exception 'Personal-record insert succeeded without active consent';
  end if;
end;
$$;
select public.record_cloud_storage_consent('cloud-storage-v1');

do $$
declare
  setup_row record;
begin
  select * into setup_row from public.get_data_setup_status();
  if not found
     or setup_row.has_consent is distinct from true
     or setup_row.validated_bet_migration is distinct from false
     or setup_row.validated_personal_migration is distinct from false then
    raise exception 'Initial setup status did not report consent=true and both migrations=false';
  end if;
end;
$$;

insert into public.financial_entries (
  id, placed_date, bookmaker, bet_type, legs, odds_taken, stake_paise,
  result, returned_paise, market_family
) values (
  '00000000-0000-4000-8000-0000000000a1', current_date, 'Synthetic RLS test',
  'single', 1, 2.10, 100, 'lost', 0, 'notSure'
);

insert into public.financial_period_contexts (
  period_start, period_end, income_paise, loss_budget_paise
) values (current_date, current_date, 10000, 500);

insert into public.financial_duplicate_decisions (
  duplicate_key, decision
) values ('synthetic-test-key', 'separate');

insert into public.recovery_check_ins (entry_date, gambled)
values (current_date, 'notRecorded');

insert into public.diary_entries (
  id, occurred_at, mood, triggers, coping_strategies, note
) values (
  '00000000-0000-4000-8000-0000000000a5',
  current_date::timestamp at time zone 'UTC',
  'Synthetic', array[]::text[], array[]::text[], 'Synthetic RLS test row'
);

insert into public.recovery_goals (mode, title, target_days)
values ('stop', 'Synthetic test goal', 7);

insert into public.monthly_reviews (month_start, achievements)
values (date_trunc('month', current_date)::date, 'Synthetic test reflection');

insert into public.tool_reflections (
  reflection_date, trigger, thought, alternative_thought
) values (current_date, 'Synthetic', 'Synthetic', 'Synthetic');

insert into public.account_deletion_requests (user_message)
values ('Synthetic RLS test request');

do $$
declare
  duplicate_rejected boolean := false;
  actual_constraint text;
begin
  begin
    insert into public.account_deletion_requests (user_message)
    values ('Synthetic duplicate-open request');
  exception when unique_violation then
    get stacked diagnostics actual_constraint = constraint_name;
    if actual_constraint <> 'account_deletion_requests_one_open_per_user_idx' then
      raise;
    end if;
    duplicate_rejected := true;
  end;
  if not duplicate_rejected then
    raise exception 'A second open deletion request was accepted';
  end if;
end;
$$;

reset role;
update public.account_deletion_requests
set status = 'processing'
where user_id = current_setting('losslens.test_user_a')::uuid
  and status = 'pending';

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  current_setting('losslens.test_user_a'),
  true
);
do $$
declare
  duplicate_rejected boolean := false;
  actual_constraint text;
begin
  begin
    insert into public.account_deletion_requests (user_message)
    values ('Synthetic duplicate while processing');
  exception when unique_violation then
    get stacked diagnostics actual_constraint = constraint_name;
    if actual_constraint <> 'account_deletion_requests_one_open_per_user_idx' then
      raise;
    end if;
    duplicate_rejected := true;
  end;
  if not duplicate_rejected then
    raise exception 'A second open request was accepted while the first was processing';
  end if;
end;
$$;

reset role;
update public.account_deletion_requests
set status = 'completed', processed_at = pg_catalog.now()
where user_id = current_setting('losslens.test_user_a')::uuid
  and status = 'processing';

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  current_setting('losslens.test_user_a'),
  true
);
insert into public.account_deletion_requests (user_message)
values ('Synthetic request after completion');

reset role;
update public.account_deletion_requests
set status = 'rejected', processed_at = pg_catalog.now()
where user_id = current_setting('losslens.test_user_a')::uuid
  and status = 'pending';

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  current_setting('losslens.test_user_a'),
  true
);
insert into public.account_deletion_requests (user_message)
values ('Synthetic request after rejection');

do $$
declare
  duplicate_rejected boolean := false;
  actual_constraint text;
begin
  begin
    insert into public.account_deletion_requests (user_message)
    values ('Synthetic second open request');
  exception when unique_violation then
    get stacked diagnostics actual_constraint = constraint_name;
    if actual_constraint <> 'account_deletion_requests_one_open_per_user_idx' then
      raise;
    end if;
    duplicate_rejected := true;
  end;
  if not duplicate_rejected then
    raise exception 'A second open request was accepted after completed/rejected requests';
  end if;
end;
$$;

do $$
declare
  table_name text;
  own_count bigint;
  expected_count bigint;
  accessible_tables text[] := array[
    'financial_entries',
    'financial_period_contexts',
    'financial_duplicate_decisions',
    'recovery_check_ins',
    'diary_entries',
    'recovery_goals',
    'monthly_reviews',
    'user_preferences',
    'tool_reflections',
    'account_deletion_requests'
  ];
begin
  foreach table_name in array accessible_tables loop
    execute format(
      'select count(*) from public.%I where user_id = auth.uid()',
      table_name
    ) into own_count;
    expected_count := case
      when table_name = 'account_deletion_requests' then 3
      else 1
    end;
    if own_count <> expected_count then
      raise exception 'User A expected % row(s), found % in public.%',
        expected_count, own_count, table_name;
    end if;
  end loop;
end;
$$;

-- User B has active consent too, so any hidden A rows demonstrate ownership
-- isolation rather than the consent policy alone.
select set_config(
  'request.jwt.claim.sub',
  current_setting('losslens.test_user_b'),
  true
);
do $$
declare
  visible_count bigint;
begin
  select count(*) into visible_count
  from public.financial_entries
  where user_id = current_setting('losslens.test_user_a')::uuid;
  if visible_count <> 0 then
    raise exception 'User B without consent can read User A financial rows';
  end if;
end;
$$;
select public.record_cloud_storage_consent('cloud-storage-v1');

do $$
declare
  table_name text;
  visible_count bigint;
  affected integer;
  delete_allowed boolean;
  test_user_a uuid := current_setting('losslens.test_user_a')::uuid;
  accessible_tables text[] := array[
    'financial_entries',
    'financial_period_contexts',
    'financial_duplicate_decisions',
    'recovery_check_ins',
    'diary_entries',
    'recovery_goals',
    'monthly_reviews',
    'user_preferences',
    'tool_reflections',
    'account_deletion_requests'
  ];
  mutable_tables text[] := array[
    'financial_entries', 'financial_period_contexts',
    'financial_duplicate_decisions', 'recovery_check_ins',
    'diary_entries', 'recovery_goals', 'monthly_reviews',
    'user_preferences', 'tool_reflections'
  ];
  mutable_assignments text[] := array[
    'note = ''Blocked by RLS''',
    'reviewed = false',
    'decision = ''separate''',
    'mood = ''Synthetic''',
    'mood = ''Synthetic''',
    'title = ''Synthetic''',
    'lessons = ''Synthetic''',
    'reasons_to_pause = ''Synthetic''',
    'thought = ''Synthetic'''
  ];
begin
  foreach table_name in array accessible_tables loop
    execute format(
      'select count(*) from public.%I where user_id = $1',
      table_name
    ) into visible_count using test_user_a;
    if visible_count <> 0 then
      raise exception 'User B can read User A rows in public.%', table_name;
    end if;

    delete_allowed := table_name not in (
      'user_preferences',
      'account_deletion_requests'
    );
    if delete_allowed then
      execute format(
        'delete from public.%I where user_id = $1',
        table_name
      ) using test_user_a;
      get diagnostics affected = row_count;
      if affected <> 0 then
        raise exception 'User B deleted User A rows in public.%', table_name;
      end if;
    end if;
  end loop;

  for index in 1..array_length(mutable_tables, 1) loop
    execute format(
      'update public.%I set %s where user_id = $1',
      mutable_tables[index],
      mutable_assignments[index]
    ) using test_user_a;
    get diagnostics affected = row_count;
    if affected <> 0 then
      raise exception 'User B updated User A rows in public.%', mutable_tables[index];
    end if;
  end loop;

  foreach table_name in array array[
    'financial_entries', 'financial_period_contexts',
    'financial_duplicate_decisions', 'recovery_check_ins',
    'diary_entries', 'recovery_goals', 'weekly_reviews',
    'monthly_reviews',
    'user_preferences', 'tool_reflections', 'account_deletion_requests'
  ] loop
    begin
      execute format(
        'insert into public.%I (user_id) values ($1)',
        table_name
      ) using test_user_a;
      raise exception 'Forged owner insert unexpectedly succeeded for public.%', table_name;
    exception when insufficient_privilege then
      null;
    end;

    begin
      execute format(
        'update public.%I set user_id = $1 where false',
        table_name
      ) using test_user_a;
      raise exception 'Ownership update unexpectedly permitted for public.%', table_name;
    exception when insufficient_privilege then
      null;
    end;
  end loop;

  begin
    execute 'update public.account_deletion_requests set status = ''completed''';
    raise exception 'Deletion-request status update unexpectedly succeeded';
  exception when insufficient_privilege then
    null;
  end;
  begin
    execute 'update public.account_deletion_requests set processed_at = pg_catalog.now()';
    raise exception 'Deletion-request completion timestamp update unexpectedly succeeded';
  exception when insufficient_privilege then
    null;
  end;
  begin
    execute 'insert into public.account_deletion_requests (user_message, status) values (''x'', ''completed'')';
    raise exception 'Deletion-request workflow-field insert unexpectedly succeeded';
  exception when insufficient_privilege then
    null;
  end;
  begin
    execute 'update public.user_preferences set cloud_storage_consent_revoked_at = null';
    raise exception 'Direct consent update unexpectedly succeeded';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

-- Anonymous table and RPC access must be denied even if a JWT-like claim is
-- present. The role itself remains anon.
set local role anon;
select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-0000000000ff',
  true
);
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'financial_entries', 'financial_period_contexts',
    'financial_duplicate_decisions', 'recovery_check_ins',
    'diary_entries', 'recovery_goals', 'weekly_reviews',
    'monthly_reviews',
    'user_preferences', 'tool_reflections', 'account_deletion_requests'
  ] loop
    begin
      execute format('select count(*) from public.%I', table_name);
      raise exception 'anon SELECT unexpectedly succeeded for public.%', table_name;
    exception when insufficient_privilege then
      null;
    end;
    begin
      execute format(
        'insert into public.%I (user_id) values (''00000000-0000-4000-8000-0000000000ff'')',
        table_name
      );
      raise exception 'anon INSERT unexpectedly succeeded for public.%', table_name;
    exception when insufficient_privilege then
      null;
    end;
    begin
      execute format(
        'update public.%I set user_id = ''00000000-0000-4000-8000-0000000000ff''',
        table_name
      );
      raise exception 'anon UPDATE unexpectedly succeeded for public.%', table_name;
    exception when insufficient_privilege then
      null;
    end;
    begin
      execute format('delete from public.%I', table_name);
      raise exception 'anon DELETE unexpectedly succeeded for public.%', table_name;
    exception when insufficient_privilege then
      null;
    end;
  end loop;

  begin
    perform public.get_data_setup_status();
    raise exception 'anon setup-status RPC unexpectedly succeeded';
  exception when insufficient_privilege then
    null;
  end;
  begin
    perform public.record_cloud_storage_consent('cloud-storage-v1');
    raise exception 'anon consent RPC unexpectedly succeeded';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

reset role;
select set_config(
  'request.jwt.claim.sub',
  current_setting('losslens.test_user_a'),
  true
);
do $$
declare
  table_name text;
  row_count bigint;
  owner_change_rejected boolean;
  actual_message text;
  all_tables text[] := array[
    'financial_entries', 'financial_period_contexts',
    'financial_duplicate_decisions', 'recovery_check_ins',
    'diary_entries', 'recovery_goals', 'weekly_reviews',
    'monthly_reviews',
    'user_preferences', 'tool_reflections', 'account_deletion_requests'
  ];
begin
  foreach table_name in array all_tables loop
    execute format(
      'select count(*) from public.%I where user_id = $1',
      table_name
    ) into row_count using current_setting('losslens.test_user_a')::uuid;
    if row_count = 0 then
      raise exception 'Missing synthetic owner-change test row in public.%', table_name;
    end if;

    owner_change_rejected := false;
    begin
      execute format(
        'update public.%I set user_id = $1 where user_id = $2',
        table_name
      )
      using
        current_setting('losslens.test_user_b')::uuid,
        current_setting('losslens.test_user_a')::uuid;
    exception when raise_exception then
      get stacked diagnostics actual_message = message_text;
      if actual_message <> 'Record ownership cannot be changed' then
        raise;
      end if;
      owner_change_rejected := true;
    end;
    if not owner_change_rejected then
      raise exception 'Owner-change trigger did not protect public.%', table_name;
    end if;
  end loop;
end;
$$;
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  current_setting('losslens.test_user_a'),
  true
);
select public.revoke_cloud_storage_consent();

do $$
declare
  table_name text;
  visible_count bigint;
  setup_row record;
  consent_required_tables text[] := array[
    'financial_entries', 'financial_period_contexts',
    'financial_duplicate_decisions', 'recovery_check_ins',
    'diary_entries', 'recovery_goals', 'monthly_reviews',
    'user_preferences', 'tool_reflections'
  ];
begin
  foreach table_name in array consent_required_tables loop
    execute format(
      'select count(*) from public.%I where user_id = auth.uid()',
      table_name
    ) into visible_count;
    if visible_count <> 0 then
      raise exception 'Revoked consent did not block reads from public.%', table_name;
    end if;
  end loop;

  select * into setup_row from public.get_data_setup_status();
  if setup_row.has_consent is distinct from false
     or setup_row.validated_bet_migration is distinct from false
     or setup_row.validated_personal_migration is distinct from false then
    raise exception 'Revoked setup status did not report all three values as false';
  end if;

  begin
    insert into public.financial_entries (
      id, placed_date, bookmaker, bet_type, legs, odds_taken, stake_paise,
      result, returned_paise, market_family
    ) values (
      '00000000-0000-4000-8000-0000000000af', current_date,
      'Synthetic revoked-consent test', 'single', 1, 2.10, 100,
      'lost', 0, 'notSure'
    );
    raise exception 'A personal-record insert succeeded after consent revocation';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

-- Deletion requests remain owner-readable after consent revocation so the
-- account holder can check the request; they are not personal-data storage.
do $$
declare
  own_count bigint;
begin
  select count(*) into own_count
  from public.account_deletion_requests
  where user_id = auth.uid();
  if own_count <> 3 then
    raise exception 'The owner cannot read their deletion request after revocation';
  end if;
end;
$$;

rollback;
