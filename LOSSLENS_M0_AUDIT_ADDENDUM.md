# LossLens M0 --- Audit Addendum

**Audit date:** 29 October 2026\
**Purpose:** Audit of the Perplexity M0 Research and Decision Report
against official public sources and technical documentation. This is a
working decision record, not legal, tax, clinical, statistical, or
security advice.

## Executive result

The Perplexity report is useful but should not be treated as fully
verified. Some recommendations are reasonable product hypotheses rather
than established requirements. Several items require direct
confirmation, legal review, or repeatable technical tests.

### Important corrections and additions

1.  **Tax:** KRA's Finance Act 2026 guidance says a 5% excise duty is
    charged on the amount deposited for betting purposes, effective 1
    July 2026. Older KRA FAQ pages still contain legacy descriptions.
    The report's no-separate-tax-calculation recommendation remains
    prudent for v1, but its tax explanation must be updated and the
    operative legislation checked before any public tax claim.
2.  **JOOUST ethics:** JOOUST's Ethics Review Committee website
    publishes student/project submission requirements. These include a
    proposal, work plan, budget, informed consent, and other documents
    depending on the category. The report should say that the current
    process and whether this specific pilot requires review must be
    confirmed directly, rather than saying no JOOUST requirements were
    verified.
3.  **Data protection:** ODPC guidance and the 2021 registration
    regulations identify gambling/betting-related processing as excluded
    from the small-entity registration exemption. This is a serious
    legal-review gate. It does not, by itself, conclusively determine
    LossLens's legal role or every obligation; get advice based on the
    actual operating model.
4.  **PWA sharing:** Web Share Target has limited browser support. File
    sharing must be an optional convenience, not the only import path.
5.  **OCR/offline privacy:** Tesseract.js may load worker code and
    language data from external CDNs unless configured locally. A
    browser-based OCR library is not automatically offline or
    network-isolated.
6.  **Self-exclusion:** The Gambling Control Act provides a statutory
    framework and the Gambling Regulatory Authority publishes a process.
    Verify the exact current contact details and instructions
    immediately before publication.
7.  **Unvalidated parameters:** Sample sizes, 20--28-hour odds
    observation window, 30-observation threshold, quarterly refresh,
    projection thresholds, OCR confidence threshold, password length,
    performance budgets, and nudge rules are provisional choices---not
    proven standards.

## Current calculation direction (project requirements, not audit findings)

The consolidated feature plan now records the requested v1 direction as
transparent descriptive measures of confirmed user-entered records:
actual net result, wagering intensity relative to user-reported available
income, net-loss exposure relative to that income, and net-loss exposure
relative to a user-chosen loss limit. The limit is a maximum tolerable net
loss, not a staking budget. Ratios require positive denominators for the
same reporting period; otherwise the ratio is unavailable with an
explanation, while any valid actual net result remains visible. The plan
also requires nearby plain-language explanations and a detailed
``Know more about your numbers'' report.

This is a product-direction record supplied for the consolidated plan,
not independent evidence that the measures are statistically,
actuarially, clinically, or locally validated. These measures must not be
given risk bands or combined into a gambling-harm score, and the project
must not claim validation for Kenyan users. The earlier Draft 5 and
consolidated odds/margin expected-loss proposals are retained for
traceability but are explicitly deferred and outside current v1 scope.
Reconsidering them requires a separate decision and a defensible,
documented expected-return basis with qualified review; stakes alone do
not establish expected loss.

The plan records unresolved accounting and data-quality decisions,
including final void, refund, partial-settlement, cash-out, promotional
credit, duplicate, and period-completeness handling. It also requires
aligned reporting periods, local-first handling of personal records and
financial settings, and no silent double-counting or duplicate merging.
Any future AI companion explanation using personal financial data requires
documented informed consent, data minimization, recipient/purpose and
retention/deletion safeguards. Basic calculations and explanations must
work offline without AI.

The AI companion has no approved name. Use only the generic term ``AI
companion'' in current planning and user-facing placeholders until the
product owner explicitly chooses a name. No AI API or chatbot is part of
the current implementation scope.

The specified calculation and data-handling tests check arithmetic,
unavailable denominators, accounting consistency, and incomplete-period
labels. Passing those tests would not validate a predictive model. Any
future predictive model needs an appropriate consented dataset, defined
outcomes, justified methodology, validation, and calibration. PGSI must
not be reproduced, modified, or embedded until applicable licensing or
permission and language/version questions have been resolved. These are
requirements and limitations recorded in the feature plan, not new
findings from the public-source audit.

## Audited decision register

Status definitions: - **Supported:** supported by an official source or
current technical documentation, within the stated scope. -
**Provisional decision:** reasonable to adopt for a prototype, but not
an externally established requirement. - **Needs qualified review:**
requires advice/confirmation from a lawyer, tax adviser, university
ethics office, or qualified wellbeing/security professional. - **Needs
practical test:** cannot be resolved through desk research alone.

  -----------------------------------------------------------------------------------------------------
  ID                Topic                         Audited conclusion         Status / next action
  ----------------- ----------------------------- -------------------------- --------------------------
  A1                Minimum age                   Use an 18+ age             **Supported in principle;
                                                  affirmation. Do not claim  legal review** of final
                                                  self-attestation is        wording and whether any
                                                  identity or legal age      duty applies to this
                                                  verification.              non-operator app.

  B1                Betting taxes                 Do not separately model    **Needs qualified tax
                                                  tax in v1. Record          review.** Update report
                                                  user-entered returns as    and do not publish tax
                                                  entered and explain that   rates or detailed tax
                                                  taxes/fees are not         explanations until
                                                  separately calculated.     reconciled against
                                                  KRA's 2026 guidance says   operative law.
                                                  5% excise on deposits from 
                                                  1 July 2026; older KRA     
                                                  pages are                  
                                                  stale/inconsistent.        

  C1                Bookmaker terms / odds        Manual observation avoids  **Needs legal review per
                    publication                   scraping but does not      bookmaker.** No scraping;
                                                  establish permission to    no brand/logos or implied
                                                  publish derived data or    endorsement; don't publish
                                                  use names/logos.           bookmaker-specific results
                                                                             until terms/permission
                                                                             reviewed.

  C2                Observation scope/time        A football pilot and fixed **Provisional decision.**
                                                  24-hour observation target Document the method and
                                                  (20--28-hour tolerance)    label the sample
                                                  are methodological         non-representative.
                                                  choices, not sourced       
                                                  requirements.              

  C3                Sample sufficiency            30 observations, eight     **Provisional;
                                                  weeks, and quarterly       statistician review.**
                                                  refresh are not universal  Show n/date range/method;
                                                  statistical standards.     withhold stale or sparse
                                                                             rows.

  C4                Test-data release gate        `isTestData` plus a        **Needs practical test.**
                                                  production build failure   Put test fixtures outside
                                                  is a sound software        production data and prove
                                                  control.                   build fails when test data
                                                                             is included.

  D1                Data protection / ODPC        Local-only storage does    **Needs qualified legal
                                                  not automatically exempt   review before public
                                                  the developer. ODPC        launch.** Determine
                                                  guidance and the           controller/processor role,
                                                  regulations identify       registration, lawful
                                                  gambling/betting-related   basis, notices, retention,
                                                  processing as not exempt   security, DPIA and other
                                                  from registration.         obligations.

  D2                Sharing reports               Reports can disclose       **Provisional decision +
                                                  sensitive                  privacy review.**
                                                  financial/wellbeing        Pre-share warning,
                                                  details once users share   selectable sections, omit
                                                  them.                      notes/OCR/contact details
                                                                             by default.

  D3                Local-only claims             "We do not collect it" is  **Needs practical security
                                                  only defensible after      test.** Prefer qualified
                                                  code/configuration and     wording until
                                                  network testing. External  packet-capture testing
                                                  fonts, images, scripts,    passes. Do not claim
                                                  OCR assets, telemetry and  encryption unless
                                                  crash reporting can        implemented and tested.
                                                  violate the intended       
                                                  boundary.                  

  E1                JOOUST ethics                 JOOUST has a published     **Needs direct university
                                                  Ethics Review Committee    confirmation.** Ask
                                                  page with student/project  whether approval,
                                                  requirements. The report   exemption or
                                                  did not verify the current administrative clearance
                                                  pathway for this           is required before
                                                  particular pilot.          recruitment.

  E2                Consent/distress response     Voluntary consent, right   **Needs ethics and
                                                  to stop, minimized coded   qualified wellbeing
                                                  data, and a distress       review.** Do not recruit
                                                  pathway are sensible       until the protocol and
                                                  safeguards.                named support role are
                                                                             approved/available.

  E3                Pilot size                    8--12 participants is a    **Provisional decision.**
                                                  formative usability        Qualitative findings only;
                                                  proposal, not evidence of  no population, causal, or
                                                  statistical or clinical    clinical claims.
                                                  effectiveness.             

  F1                Helplines                     Befrienders Kenya's        **Needs practical
                                                  official site is a primary verification before
                                                  verification source; other publication.** Record
                                                  contacts in the report     provider, number, hours,
                                                  were not fully confirmed   cost, scope, official URL,
                                                  from provider-owned        verifier and date.
                                                  sources.                   

  F2                Self-exclusion                Act establishes a          **Framework supported;
                                                  statutory framework; GRA   process needs fresh
                                                  publishes an operational   verification.** LossLens
                                                  page.                      must not claim it can
                                                                             activate exclusion or
                                                                             guarantee all access
                                                                             stops.

  F3                Professional registers        No official register was   **Needs qualified
                                                  verified in the report.    review.** Do not list
                                                                             individual professionals
                                                                             until registration/status
                                                                             and scope are checked with
                                                                             the proper regulator.

  F4                Resource freshness            90-day review is an        **Provisional decision.**
                                                  operational suggestion,    Store `lastVerifiedAt`,
                                                  not a legal requirement.   `verifiedBy`, `sourceUrl`,
                                                                             and notes; remove
                                                                             unverifiable contacts.

  G1                Device/performance/download   Android-first and under    **Provisional + practical
                                                  1.5 MB are design targets, test.** Measure on a
                                                  not sourced standards.     low-RAM Android device and
                                                                             throttled network; don't
                                                                             promise iOS parity without
                                                                             tests.

  G2                Input limits/5% warning       Proposed five-year         **Provisional decision.**
                                                  history, 20 legs, KES 1m   Validate against realistic
                                                  stake cap, odds cap and 5% records; warning must not
                                                  soft warning are design    silently change or block
                                                  assumptions.               the user's data.

  G3                Projection minimum            10 bets, two weekly totals **Provisional +
                                                  and 14 days is an          statistical review.**
                                                  illustrative display       Clearly label projections
                                                  threshold, not proof of    as illustrative, display
                                                  forecast reliability.      sample size and range,
                                                                             never call them
                                                                             predictions.

  G4                Weekly nudge                  Three consecutive weeks is **Provisional + wellbeing
                                                  not clinically validated.  review.** Neutral,
                                                                             user-controlled,
                                                                             dismissible, non-blocking;
                                                                             no diagnosis or shame.

  G5                Urge timer                    No evidence in the report  **Provisional + wellbeing
                                                  establishes 5/10/15        review.** Offer as a pause
                                                  minutes as therapeutically tool only, with no
                                                  effective.                 efficacy claim; test
                                                                             timestamp-based timing.

  G6                PDF password                  12 characters is a         **Needs security review
                                                  reasonable starting        and practical test.**
                                                  recommendation but cannot  Verify algorithm/library,
                                                  establish encryption       key derivation,
                                                  strength.                  correct/wrong password
                                                                             behavior, offline
                                                                             generation, integrity and
                                                                             compatibility. Never store
                                                                             password.

  G7                JSON export                   Optional export improves   **Provisional decision.**
                                                  portability but increases  Optional for v1; explicit
                                                  disclosure risk.           confirmation and clear
                                                                             export preview if
                                                                             implemented.

  G8                Share import/OCR              5 MB and 80% OCR           **Needs practical test.**
                                                  confidence are untested    Manual import fallback,
                                                  hypotheses; PWA            field-level benchmark,
                                                  share-target support is    uncertainty review, user
                                                  limited.                   confirmation, temp-data
                                                                             deletion.

  G9                IndexedDB/OCR library         Dexie has official         **Provisional Dexie
                                                  TypeScript documentation   choice; OCR needs
                                                  and is a plausible         benchmark.** Check
                                                  prototype choice.          versions/licences/bundle
                                                  Tesseract.js can load      size and prove all OCR
                                                  assets externally unless   assets work offline
                                                  locally configured.        without third-party
                                                                             requests.

  G10               Margin collection             Manual documented SOP is   **Provisional decision +
                                                  sensible; exact            legal/statistical
                                                  sample/refresh thresholds  review.** Do not publish a
                                                  remain unvalidated.        row as "sufficient" until
                                                                             method and evidence
                                                                             support that label.

  G11               Pilot logistics               No recruitment before      **Needs qualified
                                                  university pathway,        review.**
                                                  consent, privacy plan and  
                                                  trained support            
                                                  arrangements are settled.  

  G12               PDF encryption                Browser-side encryption    **Needs practical/security
                                                  capability depends on      test.** Do not label a PDF
                                                  chosen implementation; no  encrypted until all tests
                                                  proof was provided.        pass.
  -----------------------------------------------------------------------------------------------------

## Source checks performed

-   **KRA --- Finance Act 2026 guidance:**
    https://www.kra.go.ke/finance-act-2026-what-it-means-for-you\
    States 5% excise duty on betting/gaming deposits, effective 1 July
    2026.
-   **KRA --- Betting, Gaming and Lottery Tax FAQ:**
    https://www.kra.go.ke/helping-tax-payers/faqs/betting,-gaming-and-lottery-tax\
    Still contains older betting/winnings explanations; don't rely on
    this page alone for the current full tax position.
-   **Kenya Law --- Gambling Control Act, 2025:**
    https://new.kenyalaw.org/akn/ke/act/2025/14/eng@2025-08-12\
    Statutory framework including self-exclusion and operator duties.
-   **ODPC --- FAQs:** https://www.odpc.go.ke/faqs/\
    Identifies gambling/betting operators among categories not exempt
    from mandatory registration.
-   **Kenya --- Data Protection (Registration of Data Controllers and
    Data Processors) Regulations, 2021:**
    https://www.odpc.go.ke/wp-content/uploads/2024/03/THE-DATA-PROTECTION-REGISTRATION-OF-DATA-CONTROLLERS-AND-DATA-PROCESSORS-REGULATIONS-2021.pdf\
    See regulation 13 and Third Schedule.
-   **JOOUST Ethics Review Committee:**
    https://drie.jooust.ac.ke/our-services/ethics-review/\
    Published student/project review requirements; confirm current
    details directly.
-   **Gambling Regulatory Authority --- Self-exclusion process:**
    https://gra.go.ke/self-exclusion-process/\
    Operational instructions/contact details should be rechecked before
    publication.
-   **MDN --- Web App Manifest `share_target`:**
    https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/share_target\
    Marks support as limited and documents file/text share-target
    behavior.
-   **MDN --- Making PWAs installable:**
    https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable\
    Platform/browser support varies.
-   **Dexie --- TypeScript docs:** https://dexie.org/docs/Typescript\
    Documents Dexie 4 TypeScript support.
-   **Tesseract.js --- local installation:**
    https://github.com/naptha/tesseract.js/blob/master/docs/local-installation.md\
    Explains worker/core/language assets and how to configure local
    paths.
-   **GRA, Befrienders and other support contacts:** verify direct with
    the provider at the time of release; do not treat directory listings
    alone as final verification.

## Release gates before a public launch

1.  Written legal/privacy review of LossLens's exact role and ODPC
    obligations.
2.  Tax wording reviewed against the operative 2026 legislation.
3.  JOOUST ethics office confirms whether a pilot needs review and what
    documents are required.
4.  No bookmaker-specific margin data published until terms/permissions
    are reviewed and the method is documented; no odds/margin
    expected-loss estimate is part of current v1 scope.
5.  No support resource published without a primary-source check and
    recorded verification date.
6.  Network-capture test confirms no user data or third-party requests
    leave the device under expected use.
7.  OCR assets are local/offline if strict offline privacy remains a
    requirement.
8.  Automated tests cover the approved descriptive calculations,
    unavailable denominators, accounting/data handling, and incomplete
    periods; any applicable future margin test-data release gate,
    import/delete tests, performance tests, and PDF-encryption tests
    also pass.
9.  All estimates and projections are described as approximations, not
    predictions or clinical interventions.

## Suggested prototype decisions that can be made now

-   Keep v1 English-only and Android-first, with manual entry always
    available.
-   Use a modular storage layer and provisionally select Dexie for
    IndexedDB.
-   Keep calculations pure and independent from UI/storage.
-   Keep v1 calculations descriptive and local-first; do not treat these
    formulas or their tests as a validated gambling-harm or predictive
    model.
-   Use clearly labelled synthetic test data only; block it from release
    builds.
-   Exclude cloud sync, accounts, analytics, ads, remote AI/OCR, and
    bookmaker scraping.
-   Keep tax modeling, public bookmaker-specific margin claims,
    odds/margin expected-loss estimates, unverified helplines, and
    password-protected PDF export out of the public release until the
    relevant scope decisions and gates pass.

**Important:** This addendum is a source audit and project-planning aid.
It is not a determination of legal compliance, tax liability, clinical
effectiveness, statistical validity, or cryptographic security.
