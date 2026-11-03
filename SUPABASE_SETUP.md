# LossLens Supabase data setup

## Status and scope

This schema implements cloud persistence for personal data. It replaces local-first storage with Supabase as the only store for user data. The RLS test has not been run against the current version. Do not deploy or describe cloud persistence as production-ready until the RLS test passes in a local non-production database.

Do not run the migration against the main project until a backup/restore procedure is available and verified, the schema, privacy notice, user consent flow and backup/deletion behavior are approved, and qualified privacy/security review is complete.

At the time of this review, the migration has not been applied, the public schema has no base tables, `supabase_migrations` is absent, only one Auth account is registered, and no backup is available. These are supplied project facts, not facts independently checked against the live database. No database connection or SQL execution was performed for this review. Do not use the registered account as a test account.

The frontend includes account-backed reads/writes for True Cost and implemented My Recovery data, an explicit cloud-storage consent flow, a JSON account export, and a request-only account-deletion form. The deletion form does not delete the account or its records. A dedicated diary route is implemented and included in the cloud data model. A monthly reflection and future-self note map to `monthly_reviews`; weekly reviews are schema-only at this stage.

## Apply order

1. Do not apply this draft to the existing main project. No backup is currently available, so applying it there is blocked.
2. Validate the migration and test against a local Supabase database using two newly created synthetic Auth accounts. Do not create another hosted Supabase project for this work, and do not use the main project or its registered account as test data. The local database must be marked with `losslens.environment=nonproduction`; the SQL test refuses to run without this setting and the account metadata marker described below.
3. Review `supabase/migrations/20261030000000_losslens_personal_data.sql`, including its transaction boundary, policy replacement, grants, unique indexes and security-definer functions.
4. Run the entire migration as one file through the local migration runner. The file contains explicit `BEGIN`/`COMMIT`. The current Supabase CLI migration runner recognizes authored transaction control and does not nest another transaction around such a file; confirm the behavior of the CLI version used in the local test. If using the SQL Editor instead, run the complete file in one execution so the explicit transaction is not split into separate submissions. Never apply selected portions.
5. Run `supabase/tests/rls_user_isolation.sql` locally with two distinct synthetic Auth UUIDs and a privileged test connection. Both synthetic `auth.users` rows must have `raw_app_meta_data.losslens_test_account=true`. The test inserts synthetic rows inside a transaction and ends with `ROLLBACK`; it does not create the Auth accounts. Never pass production account IDs or a production database URL.
6. Configure allowed authentication redirect URLs for `/login` and `/reset-password`, including the production host only after route checks.
7. Deploy frontend changes only after user-facing cloud-storage disclosures and external security/privacy review have been completed.

The SQL is a database migration, not application code. It creates 11 tables, indexes, functions, owner-immutable/update-time triggers, column grants and RLS policies in dependency order: tables and foreign keys, indexes, functions, function grants, triggers, then table grants and policies. It depends on Supabase Auth's `auth.users` and `auth.uid()`. It does not create the migration-history schema.

The complete schema change is enclosed in explicit `BEGIN`/`COMMIT` so a statement failure rolls back the migration's tables, functions, grants, triggers and policies. The reviewed current Supabase CLI runner executes migrations with authored transaction-control statements without nesting a second transaction and attempts rollback on failure. This runner behavior has not been verified with the exact installed CLI version or on this project; verify it in the local database first. For the SQL Editor, submit the whole file in one execution, not statement-by-statement. Do not manually run `COMMIT` after an error.

The main project currently has no `supabase_migrations` schema, per the provided context. Before any future deployment, verify in local testing how the approved CLI version initializes migration history and records this version. Do not create or alter migration-history objects manually. The workspace has not been configured or linked to a Supabase target as part of this review; do not run `db push` until the existing target is explicitly checked by a human.

The migration can be rerun against the exact schema it creates, but it is not a schema-drift repair tool. `CREATE TABLE/INDEX IF NOT EXISTS` may conceal an existing object with a different definition. Each run drops and replaces **all existing RLS policies** on each of the 11 named tables, and recreates only the specifically named owner-change and update-time triggers; unrelated triggers remain. Existing grants on those tables are revoked before the migration's explicit grants are applied. The transaction prevents a failed run from persisting only part of these changes, but a successful rerun can replace existing policies. The partial unique indexes can fail if existing rows contain multiple pending/processing deletion requests. Stop for review if objects or data already exist unexpectedly; do not rerun blindly or drop data.

If a local run fails, first confirm the transaction rolled back and inspect the local schema and migration-history state before retrying. If a failure leaves uncertainty, preserve the database and migration file, stop, and have the migration owner investigate; do not manually drop tables, rewrite migration history, or use a "repair" rerun. A failed or untracked hosted application requires a reviewed recovery plan and a verified backup before any corrective action.

## Environment

The frontend uses only:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Set these in local or hosting configuration without committing their values. Never put a service-role key in the browser or Vite environment.

## Data model

All personal tables use a UUID `user_id` foreign key to `auth.users(id)` with cascade deletion, RLS, and owner-specific policies. The client must not be treated as a security boundary.

| Table | Purpose |
|---|---|
| `financial_entries` | True Cost bet records. UUIDs are retained; paise are exact integer-valued numeric fields. |
| `financial_period_contexts` | Income and loss-budget values for the same selected period, plus review/accounting status. |
| `financial_duplicate_decisions` | User-reviewed duplicate choices and selected entry. |
| `recovery_check_ins` | Daily check-ins with mood, triggers, gambling status, notes, urge level and tool reflection fields. |
| `diary_entries` | Dated diary entries with optional mood, triggers, coping strategies and notes. |
| `recovery_goals` | Current and future goals. |
| `weekly_reviews` | User-authored weekly reflections; schema-only at this stage. |
| `monthly_reviews` | User-authored monthly reflection and optional future-self note. |
| `user_preferences` | Alternative activities and reasons-to-pause preferences. |
| `tool_reflections` | Dated reflection records where a separate record is needed. |
| `account_deletion_requests` | User-submitted request record. It does not itself delete the Supabase Auth account. |

No `profiles` table is added because the current scope does not require user profile fields beyond Supabase Auth. The database intentionally has no supporter-sharing grants, community tables, AI processing, expected-loss tables, or public administrative routes.

### Frontend-to-schema reconciliation

The following describes the current client mapping, not proof that the migration has been applied:

| SQL table | Frontend mapping and known unused columns |
|---|---|
| `financial_entries` | `BetRecord` maps IDs, date, bookmaker, type, legs, decimal odds, integer paise amounts, result, market, note, input route and timestamps. `user_id` uses the database default and authenticated owner. |
| `financial_period_contexts` | `PersonalData.financialSettings` maps date-range key, income/budget paise strings, review status, accounting status and update time. |
| `financial_duplicate_decisions` | `duplicateDecisions` maps the serialized duplicate key, `single`/`separate` decision and selected entry ID. |
| `recovery_check_ins` | `DailyCheckIn` maps date, gambling status, duration, urge, mood, triggers, note and update time. Optional coping, money and embedded-reflection columns are not currently represented and retain database defaults/nulls; financial amounts remain in `financial_entries`. |
| `diary_entries` | `DiaryEntry` maps stable UUID, date (stored at UTC noon to preserve the calendar date), mood, triggers, coping strategies, note and update time. Gambling status defaults to `notRecorded`; money columns remain null because read-only daily totals are derived from True Cost. |
| `monthly_reviews` | `MonthlyReflection` maps month start, achievements, difficulties, lessons, future-self intention and update time. |
| `recovery_goals` | The current single local reduce/stop goal maps to the user's first goal row, mode, goal type, title, target days and update time. Extended goal-planning columns are not implemented and use defaults. |
| `user_preferences` | Alternative activities and reasons-to-pause map from `PersonalData`; consent version/timestamps are separate setup fields. Locale currently uses the SQL default. |
| `tool_reflections` | Dated trigger, thought, alternative thought and update time map from `toolReflections`. |
| `account_deletion_requests` | Settings can create and read owner-scoped requests. There is no client update/delete operation or automated account deletion. |

Amounts are represented as `bigint` paise in financial calculations and decimal integer strings at the Supabase/JSON boundary. The diary does not write financial amounts. Duplicate decisions retain source entry IDs; database composite ownership constraints are drafted but still require non-production validation.

## Access control, consent and workflow boundaries

RLS is enabled on all 11 tables. The migration revokes table-wide and column-level privileges from `PUBLIC`, `anon`, and `authenticated` before granting specific client columns. No `anon` access is intended. The ten implemented personal-data tables are `financial_entries`, `financial_period_contexts`, `financial_duplicate_decisions`, `recovery_check_ins`, `diary_entries`, `recovery_goals`, `monthly_reviews`, `user_preferences`, `tool_reflections`, and `account_deletion_requests`. The first nine require both `user_id = auth.uid()` and active cloud-storage consent for personal-data reads/writes; the policy checks are enforced by PostgreSQL, not just the UI. The `account_deletion_requests` exception allows an authenticated owner to submit and read their own request even after consent is revoked. The client cannot update or delete requests.

`weekly_reviews` is schema-only and receives no authenticated table grants or policies.

The only client access to consent workflow is through these narrow `SECURITY DEFINER` RPCs, granted to `authenticated` and revoked from `PUBLIC` and `anon`:

- `has_active_cloud_storage_consent()` checks the current authenticated identity only.
- `record_cloud_storage_consent(text)` accepts only the current fixed consent version and records a timestamp for `auth.uid()`.
- `revoke_cloud_storage_consent()` revokes only the caller's active consent.
- `get_data_setup_status()` returns only the caller's own setup state.

All security-definer routines use an empty search path and qualified object references. Their effective owner, ability to access the tables under RLS, and execute grants must still be verified in the local database and then in the existing project only after deployment is approved. A database RPC cannot prove that a person actually read the consent screen: calling the consent RPC is a user attestation from the application.

The client uses explicit select lists and cannot access schema-only tables directly. `user_id` is not an insert/update-granted column; ownership defaults to `auth.uid()`, is checked in RLS, and has an additional immutable-owner trigger. `updated_at` is maintained by a trigger on updates. Deletion-request status, request/completion timestamps, and consent fields are not client-writable. The migration test inspects column privileges and exercises these boundaries.

There is no account-deletion processing endpoint or trusted operator workflow in this migration. A separate, reviewed server-side process is required to change request status, actually delete an Auth account, and report completion. Do not grant end users or the frontend a service-role credential to accomplish this.

The authenticated column grants for the ten implemented tables are:

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `financial_entries` | `id`, `user_id`, `placed_date`, `bookmaker`, `bet_type`, `legs`, `odds_taken`, `stake_paise`, `result`, `returned_paise`, `market_family`, `note`, `input_route`, `created_at`, `updated_at` | `id`, `placed_date`, `bookmaker`, `bet_type`, `legs`, `odds_taken`, `stake_paise`, `result`, `returned_paise`, `market_family`, `note`, `input_route`, `created_at`, `updated_at` (`user_id` is not insertable) | `placed_date`, `bookmaker`, `bet_type`, `legs`, `odds_taken`, `stake_paise`, `result`, `returned_paise`, `market_family`, `note`, `input_route` | Yes |
| `financial_period_contexts` | `id`, `user_id`, `period_start`, `period_end`, `income_paise`, `loss_budget_paise`, `reviewed`, `accounting_status`, `updated_at` | `period_start`, `period_end`, `income_paise`, `loss_budget_paise`, `reviewed`, `accounting_status`, `updated_at` | Same as INSERT except `updated_at` | Yes |
| `financial_duplicate_decisions` | `id`, `user_id`, `duplicate_key`, `decision`, `selected_entry_id`, `updated_at` | `duplicate_key`, `decision`, `selected_entry_id`, `updated_at` | `duplicate_key`, `decision`, `selected_entry_id` | Yes |
| `recovery_check_ins` | `id`, `user_id`, `entry_date`, `gambled`, `duration_minutes`, `urge_level`, `mood`, `triggers`, `note`, `updated_at` | `entry_date`, `gambled`, `duration_minutes`, `urge_level`, `mood`, `triggers`, `note`, `updated_at` | Same as INSERT except `updated_at` | Yes |
| `diary_entries` | `id`, `user_id`, `occurred_at`, `mood`, `triggers`, `coping_strategies`, `note`, `updated_at` | `id`, `occurred_at`, `mood`, `triggers`, `coping_strategies`, `note`, `updated_at` | `occurred_at`, `mood`, `triggers`, `coping_strategies`, `note` | Yes |
| `recovery_goals` | `id`, `user_id`, `mode`, `target_days`, `updated_at` | `goal_type`, `mode`, `title`, `target_days`, `updated_at` | `goal_type`, `mode`, `title`, `target_days` | Yes |
| `monthly_reviews` | `id`, `user_id`, `month_start`, `achievements`, `difficulties`, `lessons`, `future_intentions`, `updated_at` | `month_start`, `achievements`, `difficulties`, `lessons`, `future_intentions`, `updated_at` | `month_start`, `achievements`, `difficulties`, `lessons`, `future_intentions` | Yes |
| `user_preferences` | `id`, `user_id`, `alternative_activities`, `reasons_to_pause` | `alternative_activities`, `reasons_to_pause` | `alternative_activities`, `reasons_to_pause` | No |
| `tool_reflections` | `id`, `user_id`, `reflection_date`, `trigger`, `thought`, `alternative_thought`, `updated_at` | `reflection_date`, `trigger`, `thought`, `alternative_thought`, `updated_at` | `reflection_date`, `trigger`, `thought`, `alternative_thought` | Yes |
| `account_deletion_requests` | `id`, `user_id`, `status`, `requested_at` | `user_message` | (none) | No |

## Operational notes

- Keep personal data in Supabase, not in browser storage.
- Keep the app's consent flow and RLS checks aligned with the SQL that is actually in the repo.
- Review the migration and test files in a local non-production database before any deployment or schema change.
- Do not treat browser persistence or migration helpers as a source of truth for user records.
