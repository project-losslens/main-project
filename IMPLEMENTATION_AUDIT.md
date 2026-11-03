# LossLens implementation audit

## Scope and evidence

This audit describes the current worktree implementation and local checks. It
does not certify production services, legal compliance, security, clinical
effectiveness, or release readiness. The current product plan is
[LOSSLENS_FEATURE_DOCUMENTATION.tex](./LOSSLENS_FEATURE_DOCUMENTATION.tex);
open verification and approval questions remain in
[LOSSLENS_M0_CHECKLIST.md](./LOSSLENS_M0_CHECKLIST.md) and
[LOSSLENS_M0_AUDIT_ADDENDUM.md](./LOSSLENS_M0_AUDIT_ADDENDUM.md).

Status meanings:

- **Implemented / unit-tested** — relevant logic or mapping has focused local
  tests; this does not imply the complete browser or live-service flow was
  tested.
- **Implemented / integration unverified** — the feature is present, but
  browser, device, or live-service behavior has not been demonstrated.
- **Partial / gated** — some functionality exists, while a required review,
  verification, or product decision remains open.
- **Not implemented** — no working application feature is present.

## Feature-by-feature status

| Feature | Status | Implementation surfaces | Evidence and remaining work |
|---|---|---|---|
| Public homepage, About, public navigation | Implemented / integration unverified | `app/src/components/PublicHomePage.tsx`, `app/src/pages/AboutPage.tsx`, `app/src/components/layouts/PublicLayout.tsx`, `app/src/App.tsx`, `app/src/App.css` | The homepage explains the product, its three areas, data handling, FAQs, and project contact details. Build passes; responsive and visual behavior still needs browser/device review. |
| Authentication and protected routes | Implemented / integration unverified | `app/src/auth/AuthProvider.tsx`, `app/src/auth/ProtectedRoute.tsx`, `app/src/components/AuthModule.tsx`, `app/src/App.tsx` | Registration/login, recovery routes, session restoration, and protected routing are present. No live Supabase authentication test was performed. |
| True Cost calculations and reporting | Implemented / unit-tested | `app/src/lib/trueCost.ts`, `app/src/lib/financialMetrics.ts`, `app/src/components/TrueCostModule.tsx`, `app/src/components/FinancialInsights.tsx` | Pure calculation and form-bound tests pass. Values use integer paise; unsupported expected-loss estimates remain deferred. IndexedDB CRUD has not been exercised in a real browser during this audit. |
| Dashboard | Implemented / integration unverified | `app/src/components/HomeDashboard.tsx`, `app/src/pages/DashboardPage.tsx` | Displays recorded financial and recovery summaries with loading/error states. No browser-level dashboard test was run. |
| My Recovery check-ins, goals, progress, and tools | Implemented / partial | `app/src/components/PersonalSupportModule.tsx`, `app/src/lib/personalData.ts`, `app/src/lib/recoveryProgress.ts`, `app/src/pages/RecoveryOverviewPage.tsx` | Check-ins, goals, explicitly recorded progress, reflections, and self-guided pause/breathing/grounding tools exist. Recovery progress and personal-data behavior have unit tests; the complete UI flow has not been browser-tested. |
| Diary | Implemented / unit-tested mapping | `app/src/components/DiaryModule.tsx`, `app/src/pages/DiaryPage.tsx`, `app/src/lib/diaryData.ts`, `app/src/lib/personalData.ts` | A dedicated protected route supports diary entries. Mapping/date validation tests pass. The UI CRUD flow and browser storage behavior still need integration testing. |
| Monthly reflection and future-self note | Implemented / unit-tested mapping | `app/src/pages/MonthlyReflectionPage.tsx`, `app/src/lib/monthlyReflectionData.ts`, `app/src/lib/personalData.ts` | A dedicated protected route and cloud-row mapping exist; mapping and validation tests pass. Browser behavior and account synchronization are unverified. |
| Formal learning modules and module progress | Partial / gated | `app/src/components/GetSupportPage.tsx`; `module_progress` in `supabase/migrations/20261030000000_losslens_personal_data.sql` | Get Support has three short original educational prompts. The planned eight structured modules, reviewed content, and progress flow are not implemented. Qualified content review is required; the schema table alone is not a feature. |
| Human support directory | Partial / externally blocked | `app/src/components/GetSupportPage.tsx` | The page intentionally withholds phone numbers, providers, and self-exclusion instructions pending authoritative verification. It is not a verified crisis directory. |
| Settings, privacy, terms, export, and deletion request | Partial / integration unverified | `app/src/pages/SettingsPage.tsx`, `app/src/pages/PrivacyPage.tsx`, `app/src/pages/TermsPage.tsx`, `app/src/lib/cloudData.ts` | Export and a request-only deletion flow exist. The request does not delete an account or records. Retention/deletion behavior and privacy/legal wording require external review. |
| Local-to-cloud migration and schema mapping | Implemented / local tests pass; live service unverified | `app/src/lib/cloudData.ts`, `app/src/lib/migrationValidation.ts`, `app/src/lib/diaryData.ts`, `app/src/lib/monthlyReflectionData.ts`, `supabase/migrations/20261030000000_losslens_personal_data.sql`, `SUPABASE_SETUP.md` | Backup and explicit migration confirmations are present; retries compare source/cloud data; preflight reports incompatible bet records, aggregate totals, financial settings, and missing duplicate references before writes. Pure mapping and retry tests pass. Migration has not been run against Supabase. |
| Supabase RLS and account isolation | Externally blocked / unverified | `supabase/migrations/20261030000000_losslens_personal_data.sql`, `supabase/tests/rls_user_isolation.sql`, `app/src/components/CloudDataProvider.tsx` | The migration drafts owner-scoped policies and the client resets its in-memory data provider on account changes. Neither RLS nor cross-account behavior has been tested against a Supabase instance. Browser-local data is shared within a browser profile and the setup flow warns users not to migrate another person's records. |
| PWA, offline shell, and caching | Implemented / service-worker unit-tested | `app/public/manifest.webmanifest`, `app/public/sw.js`, `app/public/offline.html`, `app/src/main.tsx` | The worker precaches static shell assets and uses an offline navigation fallback; it does not intercept API, cross-origin, or non-GET requests. Three service-worker tests pass. Actual browser offline reload and device behavior remain unverified; cloud-backed records require a connection. |
| Weekly personal reviews, urge-session history, OCR/import, PDF reports, community, family sharing, AI, and administration | Not implemented or schema/planning only | Planning documents and selected draft tables | No complete working feature is present. These require explicit scope decisions and, as applicable, privacy, safety, content, legal, or server-side authorization review. Do not treat schema tables or roadmap descriptions as implemented functionality. |

## Data consistency findings

- True Cost uses `bigint` paise internally and decimal integer strings at the
  Supabase/JSON boundary. Individual paise fields are checked against the
  `numeric(20,0)` range; aggregate migration totals are checked before writes.
- Odds are represented as JavaScript `number` values. Inputs are limited to at
  most six decimal places and below `1,000,000,000,000` to avoid a JavaScript
  rounding boundary beyond the SQL `numeric(18,6)` range. This is intentionally
  narrower than the SQL column's final fractional boundary.
- Form validation matches the current SQL bookmaker, note, and integer-leg
  limits. Migration preflight does not silently truncate or round legacy
  records; it identifies the record key and incompatible field while retaining
  the original browser data.
- Selected duplicate decisions must reference a local True Cost record before
  migration. Deleting a selected local bet also removes its stale local
  duplicate decision. The database draft separately uses `ON DELETE CASCADE`.
- Account migration retains local records and validates after upload. Real
  retry behavior, server-side numeric serialization, RLS, backup retention, and
  cross-account behavior remain untested against Supabase.
- Account-backed personal records require an explicit setup/backup/migration
  flow. After migration, subsequent private-section changes are saved to the
  configured Supabase account; they are not synchronized back to browser-local
  storage. This hybrid behavior is documented, but the project's local-first
  direction and its privacy/release gates still require qualified review.

## Local verification performed

At this checkpoint:

- `npm test` — 38 passed, 0 failed.
- `npm run lint` — passed.
- `npm run build` — passed, including TypeScript project build.
- `git diff --check` — passed; Git reported only line-ending conversion
  warnings for existing working files.

These results do not replace browser/device accessibility and offline testing,
live authentication and migration testing, or the required legal, privacy,
security, calculation, support-resource, and qualified content reviews.
