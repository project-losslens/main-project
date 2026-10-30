# LossLens M0 Decision Checklist (Draft)

**Purpose:** Record open M0 checks and decisions from the LossLens specification, Draft 5 (28 October 2026), and implementation decisions arising from the current consolidated feature plan. This checklist does not answer, research, or resolve them. The descriptive formulas in the feature plan are documented project direction, not evidence of actuarial, statistical, clinical, or Kenyan-user validation. M0 requires written answers with named sources for its first-priority checks before later milestones begin.

**Status key:** Every item is `OPEN` until an answer and its source are recorded. The specification distinguishes `MUST` (required), `SHOULD` (recommended), and `MAY` (optional). A value described as a working suggestion or example remains undecided; this checklist does not promote it to a requirement.

## 1. Kenyan legal minimum betting age and approved age wording

### 1.1 Legal minimum age and app age statement
- **Question:** What is the current legal minimum age for sports betting in Kenya, and what exact age statement or wording should LossLens use?
- **Why the specification requires it:** The intended primary user is described as an adult (18 or over), but the specification explicitly marks the legal minimum age and app age statement for verification. The welcome flow also requires an age statement; its exact wording is unverified.
- **Specification page(s):** 9, 14, 38.
- **Authoritative source / qualified reviewer needed:** Current official Kenyan gambling legislation and regulator guidance; a qualified Kenyan legal reviewer or the regulator for any ambiguity.
- **Specification strength:** The welcome flow includes an age statement; the legal minimum and exact required wording are `[VERIFY]`, not established facts.
- **Status:** `OPEN`
- **Answer:** 
- **Source (title, issuing body, URL or citation, date checked):** 

## 2. Tax treatment of stakes, winnings and deductions

### 2.1 Taxes and effect on expected-loss calculations
- **Question:** Do taxes on stakes (including any excise) or winnings currently apply, at what rates and how are they deducted from returns? Should any verified tax treatment change the expected-loss calculation?
- **Why the specification requires it:** Taxes may affect returned amounts and expected loss. Until checked, the specification says the app should state: “Taxes and bookmaker fees are not modelled separately.” User-entered returns already reflect deductions made by the bookmaker.
- **Specification page(s):** 26, 38, 40, 47.
- **Authoritative source / qualified reviewer needed:** Current official tax-authority publications, the relevant bookmaker terms, and a tax-literate qualified reviewer.
- **Specification strength:** Verification is an open M0 check. Do not state tax rates or alter the calculation without a source and decision.
- **Status:** `OPEN`
- **Answer:** 
- **Source (title, issuing body, URL or citation, date checked):** 

## 3. Legal and bookmaker-term considerations for collecting, recording and publishing odds data

### 3.1 Permission to record and publish odds summaries
- **Question:** For each bookmaker considered, do its current terms allow the team to record displayed odds by hand and publish a summary derived from those observations?
- **Why the specification requires it:** The margin estimates depend on collected odds. The specification requires checking terms before collection/publication and says to collect by hand only; it prohibits scripts that scrape a site.
- **Specification page(s):** 31, 37–38.
- **Authoritative source / qualified reviewer needed:** Each supported bookmaker’s current terms of use; ask the regulator or a qualified lawyer if the terms are unclear.
- **Specification strength:** Checking permission is an M0 verification item. Hand collection and no scripted scraping are stated requirements; do not treat permission to publish as established.
- **Status:** `OPEN`
- **Answer:** 
- **Source (title, issuing body, URL or citation, date checked):** 

### 3.2 Scope and method for a permitted margin sample
- **Question:** Which bookmakers, sports and leagues should be included, and what observation timing rule should be used consistently, subject to the permission check above?
- **Why the specification requires it:** The lookup table must describe a measured sample, not a universal or “Kenyan market” margin. The specification leaves bookmaker and league/sport selection open and says to choose one consistent pre-match timing rule within its stated 20–28-hour window.
- **Specification page(s):** 31–33.
- **Authoritative source / qualified reviewer needed:** Pilot-user evidence about commonly used bookmakers/sports/leagues; the project’s data/margin-method reviewer. Resolve legal permission under section 3.1 separately before collection.
- **Specification strength:** The actual list and exact timing rule are open decisions. Collecting by hand only is required. The specification’s working suggestion of two or three bookmakers is not mandatory.
- **Status:** `OPEN`
- **Answer:** 
- **Source (title, issuing body, URL or citation, date checked):** 

### 3.3 Margin sample sufficiency and maintenance
- **Question:** What minimum sample size per table row is defensible, how long must collection span, and how often should the table be refreshed?
- **Why the specification requires it:** A row below the chosen minimum must have `sufficient` set to false; estimates must fall back only to a sufficient “all” row or to no estimate. The table must document its sample and collection dates.
- **Specification page(s):** 31–33.
- **Authoritative source / qualified reviewer needed:** Maths/statistics reviewer and data-collection lead, using the observed sample and a documented method.
- **Specification strength:** The minimum, collection duration, and refresh interval are `[TO DECIDE]`. Thirty markets and eight weeks are suggestions/examples in the specification, not confirmed statistical requirements.
- **Status:** `OPEN`
- **Answer:** 
- **Source (title, issuing body, URL or citation, date checked):** 

## 4. Data Protection Act obligations and privacy considerations for a device-local app

### 4.1 Legal obligations, notice/registration and consent
- **Question:** What obligations under Kenya’s Data Protection Act apply to a device-local app handling potentially sensitive or health-related betting data? Is registration or a notice required, and what must consent look like?
- **Why the specification requires it:** Local-only storage does not itself settle legal obligations. The specification marks these questions for verification and prohibits claiming compliance until a qualified person confirms it.
- **Specification page(s):** 30, 38.
- **Authoritative source / qualified reviewer needed:** Current Data Protection Act and data commissioner guidance; a qualified Kenyan data-protection/legal reviewer.
- **Specification strength:** This is a first-priority M0 verification. No compliance claim is authorized until confirmed by a qualified person.
- **Status:** `OPEN`
- **Answer:** 
- **Source (title, issuing body, URL or citation, date checked):** 

### 4.2 User-controlled sharing of a protected report
- **Question:** What Data Protection Act obligations apply when a user chooses to share their own report containing potentially sensitive data?
- **Why the specification requires it:** The report is built on-device and shared at the user’s direction, but the specification explicitly leaves the legal position for user-shared sensitive data unverified.
- **Specification page(s):** 21, 30, 38.
- **Authoritative source / qualified reviewer needed:** Current Act and commissioner guidance; a qualified Kenyan data-protection/legal reviewer.
- **Specification strength:** `[VERIFY]`; do not infer that local generation or user choice removes legal obligations.
- **Status:** `OPEN`
- **Answer:** 
- **Source (title, issuing body, URL or citation, date checked):** 

### 4.3 Privacy design constraints to carry into implementation
- **Question:** Does the proposed implementation preserve the specification’s privacy boundaries and accurate privacy wording, including no user-data network requests, no tracking, local storage, import-data deletion, and immediate delete-all?
- **Why the specification requires it:** These are explicit build rules for a private-by-default local-only app. The specification says not to claim stored-data encryption unless it is implemented and tested; v1’s stated privacy wording is limited to “Your data stays on this phone.”
- **Specification page(s):** 8, 11, 29–30.
- **Authoritative source / qualified reviewer needed:** Privacy/security reviewer for the implementation and network-capture evidence; legal review is covered separately above.
- **Specification strength:** These privacy rules are requirements (`MUST`); they are not open permission to add accounts, cloud sync, analytics, tracking, or human review.
- **Status:** `OPEN`
- **Answer:** 
- **Source (title, issuing body, URL or citation, date checked):** 

## 5. University ethics approval and pilot-testing requirements

### 5.1 Ethics approval and pilot safeguards
- **Question:** Does the university require ethics approval for research with people who bet, and what approvals or safeguards must be completed before recruitment or testing?
- **Why the specification requires it:** The pilot is a usability/attitude study, not a clinical trial. The specification says to obtain ethics approval before recruiting if required, have a qualified person review materials and the distress plan, and not recruit anyone who says they are in crisis.
- **Specification page(s):** 33–35, 38.
- **Authoritative source / qualified reviewer needed:** University research/ethics office; qualified person reviewing the participant materials and distress plan.
- **Specification strength:** Ethics approval is conditional on the university’s determination; do not represent it as either required or unnecessary before the check. The stated participant safety and consent requirements remain.
- **Status:** `OPEN`
- **Answer:** 
- **Source (title, issuing body, URL or citation, date checked):** 

### 5.2 Consent, distress response and pilot logistics
- **Question:** Who is the trained person reachable during every session, and what consent, data-handling and distress-response details must the approved pilot protocol specify?
- **Why the specification requires it:** A trained person must be reachable during each session; the identity is undecided. Consent must explain voluntariness, stopping, recorded information, access, deletion and help. The pilot uses coded data and separates consent forms from study data.
- **Specification page(s):** 34–35.
- **Authoritative source / qualified reviewer needed:** University research/ethics office and a qualified safeguarding/counselling reviewer; the named trained person must be confirmed by the pilot lead.
- **Specification strength:** These are pilot protocol requirements. The participant count of 5–15 is an example marked for decision, not a mandatory target.
- **Status:** `OPEN`
- **Answer:** 
- **Source (title, issuing body, URL or citation, date checked):** 

## 6. Helplines, self-exclusion resources and professional-registration verification

### 6.1 Verify every helpline and self-exclusion instruction
- **Question:** For each proposed resource, are the number, operating hours, cost, website and self-exclusion instructions current and accurate, and who checked each item and when?
- **Why the specification requires it:** The specification warns that earlier project numbers were placeholders and none had been confirmed. Resource entries must have a name, contact method, `verifiedBy`, `verifiedOn` and source; placeholders are prohibited and the build must fail if required content is missing.
- **Specification page(s):** 20, 30, 38.
- **Authoritative source / qualified reviewer needed:** Direct verification with each service/provider and official bookmaker help pages for self-exclusion; record the verifier, date and source.
- **Specification strength:** Verification and required resource fields are `MUST` requirements. No contact details or resource claims are supplied or approved by this checklist.
- **Status:** `OPEN`
- **Answer:** 
- **Source (title, issuing body, URL or citation, date checked):** 

### 6.2 Verify professional registration and provider listing criteria
- **Question:** Which body registers counsellors and psychologists in Kenya, and how can a provider’s registration be checked reliably?
- **Why the specification requires it:** Provider listings require proof of professional registration. Listings also need verified contact details and must state whether gambling-related problems are treated, or clearly say that the list is not specialised.
- **Specification page(s):** 22, 38.
- **Authoritative source / qualified reviewer needed:** Official registration body/register and a qualified counselling or psychology reviewer.
- **Specification strength:** Registration verification is `[VERIFY]`. No provider may be invented or listed without the specified verification information.
- **Status:** `OPEN`
- **Answer:** 
- **Source (title, issuing body, URL or citation, date checked):** 

### 6.3 Resource/provider freshness intervals
- **Question:** What age of a resource check should trigger “Not recently verified,” and how frequently must provider contact details and links be rechecked?
- **Why the specification requires it:** The interface must show check dates and identify stale resources; the exact intervals are undecided.
- **Specification page(s):** 20, 22.
- **Authoritative source / qualified reviewer needed:** Content/safety lead with a qualified resource reviewer; confirm a practical verification process and record it.
- **Specification strength:** The 90-day intervals are `[TO DECIDE]` examples, not settled requirements.
- **Status:** `OPEN`
- **Answer:** 
- **Source (title, issuing body, URL or citation, date checked):** 

## 7. Technical and product decisions not requiring legal advice

These are included as open implementation/product questions, not legal determinations. Legal or safety questions remain in their sections above. Candidate technologies in the specification are recommendations, not requirements.

### 7.1 Supported devices, performance and download budget
- **Question:** Which device/browser versions will be supported; what measurable first-load/interaction target will be used; and what initial-download budget is acceptable?
- **Why the specification requires it:** The app should work on current Android Chrome and other phone browsers, be tested on a low-end Android device, respond quickly on a slow connection and keep its first download small. The exact support list, speed target and kilobyte budget are open.
- **Specification page(s):** 11.
- **Authoritative source / qualified reviewer needed:** Product/engineering decision informed by pilot target phones and measured device/network testing.
- **Specification strength:** Low-end Android testing and the stated usability/accessibility requirements are requirements; numeric support, speed and size targets are `[TO DECIDE]`.
- **Status:** `OPEN`
- **Answer:** 
- **Source (test plan, device/browser matrix, or other decision record):** 

### 7.2 Data-entry limits and discrepancy warning
- **Question:** Should the five-year date limit be kept; what upper bounds apply to multibet legs, stake and odds; and should the soft warning threshold remain 5%?
- **Why the specification requires it:** These bounds affect validation and protect calculations from implausible inputs; the specification leaves their values undecided. The 5% return discrepancy warning is explicitly soft: the user may continue.
- **Specification page(s):** 11–12, 15.
- **Authoritative source / qualified reviewer needed:** Product and engineering decision, checked against expected user records and validation tests.
- **Specification strength:** Basic validation rules (date not future, stake greater than zero, odds greater than 1.00, multibet at least two legs) are requirements. Suggested upper limits and whether to keep 5% are open decisions, not requirements.
- **Status:** `OPEN`
- **Answer:** 
- **Source (decision record and tests):** 

### 7.3 Projection minimum data
- **Question:** What minimum number of individual bets or weekly totals, and what minimum covered period, should be required before showing a projection?
- **Why the specification requires it:** Projections must not appear below a minimum-data threshold; otherwise the app shows the specified “Not enough data yet” message. The values are undecided in both feature and calculation sections.
- **Specification page(s):** 18, 24.
- **Authoritative source / qualified reviewer needed:** Product and maths reviewer; validate against representative sample histories and the specified projection test vector.
- **Specification strength:** A minimum-data gate is required; the values 10 bets, 2 weekly totals and 14 days are proposed examples marked `[TO DECIDE]`, not settled requirements.
- **Status:** `OPEN`
- **Answer:** 
- **Source (decision record and tests):** 

### 7.4 Weekly-limit nudge trigger
- **Question:** How many consecutive weeks over the user’s limit should trigger the corresponding nudge?
- **Why the specification requires it:** The nudge has defined triggers and a once-per-24-hour cap, but the consecutive-week threshold is open.
- **Specification page(s):** 19.
- **Authoritative source / qualified reviewer needed:** Product decision reviewed by the qualified safety reviewer; verify every trigger and dismissal behavior in tests.
- **Specification strength:** Nudges must not encourage betting, celebrate streaks or block the user. The example of 3 weeks is `[TO DECIDE]`, not mandatory.
- **Status:** `OPEN`
- **Answer:** 
- **Source (decision record and tests):** 

### 7.5 Urge timer length and support for any evidence-based claim
- **Question:** What timer duration, if any, should be used, and what published source would support describing that duration as evidence-based?
- **Why the specification requires it:** The duration is undecided; the specification separately says to confirm a source before calling it evidence-based. The timer must use an end timestamp so it remains correct in the background.
- **Specification page(s):** 20, 38, 47.
- **Authoritative source / qualified reviewer needed:** Published source for any evidence-based statement and qualified safety/counselling reviewer for the wording.
- **Specification strength:** The 15-minute duration is an example marked `[TO DECIDE]`; do not claim evidence support without verification. The no-medical-claims rule remains.
- **Status:** `OPEN`
- **Answer:** 
- **Source (decision record, publication, and reviewer):** 

### 7.6 Report password minimum
- **Question:** What minimum password length should the report require?
- **Why the specification requires it:** The report feature needs a stated password-strength rule and message, but the minimum is undecided.
- **Specification page(s):** 21, 47.
- **Authoritative source / qualified reviewer needed:** Product/security reviewer; validate the chosen rule in password and report tests.
- **Specification strength:** On-device encryption, not storing the password, and the no-recovery warning are specified requirements if the report feature is built. Eight characters is `[TO DECIDE]`, not a settled minimum.
- **Status:** `OPEN`
- **Answer:** 
- **Source (decision record and tests):** 

### 7.7 Optional JSON export
- **Question:** Should “Export my data (JSON)” be included in version 1?
- **Why the specification requires it:** The feature is listed in settings, but inclusion in v1 is explicitly undecided.
- **Specification page(s):** 23.
- **Authoritative source / qualified reviewer needed:** Product decision with privacy review of any export contents and user flow.
- **Specification strength:** `MAY` / optional pending decision; do not treat export as required or add it without deciding.
- **Status:** `OPEN`
- **Answer:** 
- **Source (decision record):** 

### 7.8 Import compatibility and OCR parameters
- **Question:** Can target installed web apps receive shared files/text on the intended phones; what file-size limit should apply; what OCR confidence threshold should flag a field; and can bookmaker apps take screenshots?
- **Why the specification requires it:** Sharing support and screenshot availability are device/app-specific verification items. Import file size and OCR confidence threshold are open. Reads must remain on-device, uncertain fields must be flagged, and unreadable values must never be guessed.
- **Specification page(s):** 16, 28–29, 38.
- **Authoritative source / qualified reviewer needed:** Prototype and test on target phones and bookmaker apps; use real, properly obtained sample files/screenshots and document measured OCR accuracy.
- **Specification strength:** On-device processing, no cloud vision, review, and no invented values are requirements. 5 MB and 80% are `[TO DECIDE]` examples, not defaults approved here.
- **Status:** `OPEN`
- **Answer:** 
- **Source (device matrix, test results, and decision record):** 

### 7.9 Storage wrapper and screenshot OCR performance
- **Question:** Which IndexedDB wrapper/version, if any, should be used, and what OCR accuracy has been measured on real bookmaker screenshots?
- **Why the specification requires it:** The specification marks the current wrapper choice/version and screenshot OCR accuracy for verification. The named libraries are candidate technologies only.
- **Specification page(s):** 10, 29.
- **Authoritative source / qualified reviewer needed:** Engineering evaluation and tests on real, representative samples; document library version and accuracy results.
- **Specification strength:** IndexedDB storage and on-device OCR are part of the described architecture/features; a particular wrapper or OCR library is not mandated. Do not describe accuracy without measurements.
- **Status:** `OPEN`
- **Answer:** 
- **Source (library documentation and test results):** 

### 7.10 Margin-table sample design and update cadence
- **Question:** What minimum markets per row and collection duration should be used, what pre-match observation time should be fixed, and how often should margins be recollected?
- **Why the specification requires it:** The margin table must be repeatable, documented, date-bounded and honest about sample limits. The sample minimum, collection period and refresh interval are undecided; an exact time rule must be chosen consistently.
- **Specification page(s):** 31–33.
- **Authoritative source / qualified reviewer needed:** Maths/statistics and data-collection leads; base decisions on the actual collection method and sample, after section 3.1 permission is resolved.
- **Specification strength:** Use full markets and documented sample dates; the specification’s “at least” collection period and refresh cadence are open. Thirty observations, eight weeks and quarterly refresh are not finalized.
- **Status:** `OPEN`
- **Answer:** 
- **Source (method record and decision):** 

### 7.11 Pilot sample size and trained session support
- **Question:** What pilot participant count is appropriate, and who will be the trained person reachable during every session?
- **Why the specification requires it:** The pilot needs an identified distress-response contact; the identity is undecided. The participant-count range is shown only as an example.
- **Specification page(s):** 34.
- **Authoritative source / qualified reviewer needed:** Pilot lead and qualified safety reviewer; follow university ethics determination and approval under section 5.
- **Specification strength:** A trained person reachable during every session is required. “5 to 15” is `[TO DECIDE]` example guidance, not a mandated count.
- **Status:** `OPEN`
- **Answer:** 
- **Source (pilot protocol and decision record):** 

### 7.12 PDF encryption compatibility
- **Question:** Can a browser-side PDF library encrypt a report strongly enough to open in common readers, including two-reader testing with the correct and incorrect password?
- **Why the specification requires it:** The report is intended to be encrypted on-device, but the library and compatibility are unverified. The roadmap says to test before treating the protected-report milestone as complete.
- **Specification page(s):** 10, 21, 37–38.
- **Authoritative source / qualified reviewer needed:** Library documentation and hands-on compatibility/security tests using multiple PDF readers; legal implications are covered in section 4.2.
- **Specification strength:** If a protected report is implemented, encryption and no upload are specified requirements. The library choice is open. If no suitable library works, the risk register says to state plainly that the report is not encrypted or drop the password feature; do not imply protection that is absent.
- **Status:** `OPEN`
- **Answer:** 
- **Source (library documentation and test results):** 

### 7.13 Margin-table test-data release guard
- **Question:** What build/content check will ensure test margin data is visibly labeled during development and that a release build fails whenever `isTestData` is true?
- **Why the specification requires it:** The specification permits clearly marked test data in the relevant milestone but forbids shipping it as real margins.
- **Specification page(s):** 13, 33, 36, 45.
- **Authoritative source / qualified reviewer needed:** Engineering/build reviewer; automated release-build test.
- **Specification strength:** The test-data banner and release failure are `MUST` requirements. This checklist does not approve any illustrative margin as real bookmaker data.
- **Status:** `OPEN`
- **Answer:** 
- **Source (build rule and automated test):** 

## 8. Descriptive financial metrics, reporting periods, and accounting decisions

The consolidated feature plan documents the formulas for actual net result, wagering intensity, income-relative net-loss exposure, and loss-budget-relative exposure. These are descriptive financial measures, not validated gambling-harm scores. Items below concern implementation details, accounting choices, evidence, and safeguards; they do not reopen or independently validate the documented arithmetic.

### 8.1 User-reported income and reporting-period alignment
- **Question:** How should a user enter and update income remaining after essential expenses, and how should its exact covered dates and any partial-period status be recorded alongside bet records?
- **Why the feature plan requires it:** Income-relative ratios are unavailable unless the user-reported amount covers the same period as the records. The app must not infer income or silently convert monthly values to weekly values.
- **Authoritative source / qualified reviewer needed:** Product owner for input and period behavior; privacy reviewer for data minimization and notice.
- **Specification strength:** Same-period matching and unavailable ratios for zero, missing, invalid, or mismatched denominators are documented requirements. Input workflow and completeness representation remain undecided.
- **Status:** `OPEN`
- **Answer:**
- **Source (decision and privacy review):**

### 8.2 Personal net-loss budget settings
- **Question:** How should users set and revise a maximum tolerable net gambling loss, associate it with an exact reporting period, and handle zero, missing, invalid, or mismatched values?
- **Why the feature plan requires it:** The budget is a personal loss limit, not a staking budget. Budget exposure is unavailable for zero or missing denominators; the remaining amount is budget minus recorded loss.
- **Authoritative source / qualified reviewer needed:** Product owner; privacy reviewer for collection, local storage, retention, and deletion behavior.
- **Specification strength:** The formula and the distinction from a staking budget are documented. Input workflow, edit history, and period-selection behavior remain undecided.
- **Status:** `OPEN`
- **Answer:**
- **Source (decision and privacy review):**

### 8.3 Period completeness and comparisons
- **Question:** How will the app identify missing transactions and user-reported incomplete periods, and what completeness and alignment criteria must be met before comparing periods?
- **Why the feature plan requires it:** A manual record total does not prove that all transactions were entered. Partial weeks/months must not be presented as complete periods; comparisons require aligned duration and coverage.
- **Authoritative source / qualified reviewer needed:** Product owner and calculation/test reviewer.
- **Specification strength:** Incomplete periods must be identified, and unsupported comparisons withheld. The completeness input and comparison eligibility rules remain undecided.
- **Status:** `OPEN`
- **Answer:**
- **Source (decision and test cases):**

### 8.4 Voids, cash-outs, refunds, and partial settlements
- **Question:** What final accounting rules apply to voids, full and partial refunds, cash-outs, and partially settled bets, including how returned amounts already represented in a transaction are prevented from being counted twice?
- **Why the feature plan requires it:** Draft 5 excludes void bets from stake/return performance totals and includes cash-outs in actual records, but the consolidated plan leaves final approval open. Refund and partial-settlement behavior also needs explicit treatment.
- **Authoritative source / qualified reviewer needed:** Product owner and qualified calculation reviewer; retain the Draft 5 citation and document the approved rule.
- **Specification strength:** Draft 5's void and cash-out rules are source requirements, but final consolidated accounting approval remains open. Do not silently select a conflicting interpretation.
- **Status:** `OPEN`
- **Answer:**
- **Source (approved accounting decision and test cases):**

### 8.5 Promotional credits, fees, and taxes in recorded totals
- **Question:** How should bonus bets, promotional credits, fees, taxes, and missing returns be represented in confirmed stakes and returns without treating promotional value as cash or double-counting deductions?
- **Why the feature plan requires it:** The descriptive formulas depend on consistently defined confirmed stake and return values; the existing plan leaves these treatments unresolved.
- **Authoritative source / qualified reviewer needed:** Product owner and qualified calculation reviewer; tax reviewer for any separately stated tax treatment.
- **Specification strength:** Explicit recording and test rules are required before implementation. Do not publish unverified tax claims or infer missing amounts.
- **Status:** `OPEN`
- **Answer:**
- **Source (accounting decision and test cases):**

### 8.6 Possible duplicate transactions
- **Question:** How should possible duplicates be surfaced for review, and what user action resolves them without silently merging or deleting either transaction?
- **Why the feature plan requires it:** Duplicate entries can distort totals, while automatic merging or deletion can lose real records. The plan requires review and no silent resolution.
- **Authoritative source / qualified reviewer needed:** Product owner and engineering/test reviewer.
- **Specification strength:** No silent merge or deletion is permitted. Detection criteria and the explicit resolution workflow remain undecided.
- **Status:** `OPEN`
- **Answer:**
- **Source (decision and test cases):**

### 8.7 Earlier odds/margin expected-loss proposal
- **Question:** If the earlier Draft 5/consolidated odds- and margin-based expected-loss proposal is reconsidered for a future release, what defensible expected-return basis, qualified review, and separate approval would be required?
- **Why the feature plan requires it:** The current v1 direction is descriptive actual results and personal-period ratios; expected-loss formulas are not current v1 scope. Earlier formulas are retained for traceability, not as approved v1 requirements.
- **Authoritative source / qualified reviewer needed:** Product owner and qualified actuarial/statistical reviewer; legal/terms review for any bookmaker-specific observations.
- **Specification strength:** Do not calculate expected losses from stakes alone or claim validation. Any future predictive model additionally requires a suitable consented dataset, defined outcomes, justified methodology, validation, and calibration.
- **Status:** `OPEN`
- **Answer:**
- **Source (scope decision, methodology, and review):**

### 8.8 Future AI companion naming, explanations, and personal-data safeguards
- **Question:** What name, if any, will be explicitly approved for a future AI companion? Until then, the interface and documentation use only “AI companion.” Before it can receive personal financial data, which provider, consent flow, exact data fields, purpose, minimization controls, retention/deletion rules, and non-cloud alternative will be approved?
- **Why the feature plan requires it:** Personalized AI explanations are future scope only. Recorded facts must be separated from interpretations/suggestions; AI must not invent data, probabilities, research, or diagnoses. Basic calculations and explanations must work offline without AI.
- **Authoritative source / qualified reviewer needed:** Product owner, qualified privacy/legal reviewer, and safety/content reviewer.
- **Specification strength:** No personal financial data may be sent to an AI service before informed consent and documented privacy safeguards. Provider and operational details remain undecided.
- **Status:** `OPEN`
- **Answer:**
- **Source (approved data-flow, consent, privacy, and safety review):**
