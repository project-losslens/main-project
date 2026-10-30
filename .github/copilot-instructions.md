# LossLens Copilot Instructions

## Read the project sources first

- Before making product or implementation decisions, read the relevant LossLens documents in the workspace:
  - `LOSSLENS_FEATURE_DOCUMENTATION.tex` is the current consolidated feature plan and intended product direction.
  - `LOSSLENS_M0_AUDIT_ADDENDUM.md` records an audit, provisional conclusions, cited sources, risks, and release gates. It is a planning aid, not legal, tax, clinical, statistical, or security advice.
  - `LOSSLENS_M0_CHECKLIST.md` tracks open M0 questions and decisions. Do not treat blank answers or `OPEN` items as resolved.
  - `losslens_specification.txt` is an extraction of the original 47-page Draft 5 specification. Its wording may contain extraction artifacts; check the corresponding page in `precious_true_cost_build_specification.pdf` when wording or formulas are unclear.
  - `precious_true_cost_build_specification.pdf` is the original Draft 5 source.
- Read only the sections relevant to the task, but review all related conflicts, open decisions, verification markers, and release gates before acting.
- Use the LossLens name for new work. Preserve the source documents' historical names when identifying or quoting them.

## Requirements, conflicts, and assumptions

- Treat `LOSSLENS_FEATURE_DOCUMENTATION.tex` as the current consolidated feature plan. Check the original Draft 5 and audit addendum for additional constraints, risks, and context.
- The current intended architecture is hybrid: personal betting records, calculations, diary entries, mood/trigger data, notes, reflections, and future-self messages remain on the user's device by default. Accounts, community features, shared content, and administration may need a backend. Do not send personal records or reflections to the backend by default.
- Draft 5 assumes no backend in v1; the consolidated feature plan explicitly describes a hybrid architecture. Treat this as a documented change in direction, but flag any resulting scope, data-flow, release, or requirements conflict for the user rather than silently extending either document. A backend for shared features is not permission to move personal records there.
- Do not assume every feature described in the consolidated plan is approved for the first release. In particular, accounts, AI, community, family sharing, CBT modules, and other features with unresolved scope or safety requirements need explicit decisions and readiness checks.
- Identify conflicts, unresolved `[TO DECIDE]` items, `[VERIFY]` facts, extraction uncertainty, and assumptions in plain language. Do not invent answers, silently choose defaults, or present provisional audit conclusions as settled facts.
- Preserve `MUST`, `SHOULD`, and `MAY` distinctions. Do not turn recommendations, examples, working suggestions, or optional features into requirements.
- The M0 checklist is a record of open questions, not evidence that any question has been answered. Do not mark an item resolved without a written answer and source.

## Change safety and beginner-friendly workflow

- Preserve existing files and code. Never delete, overwrite, rename, or restructure existing project content without first explaining the proposed change and obtaining the user's approval.
- Before substantial edits, list every file proposed for creation or modification and briefly state its purpose. Make small, focused changes and explain what changed.
- Work in small, beginner-friendly steps. Explain commands before asking the user to run them and summarize their purpose and result. Do not run setup/scaffolding or install packages unless the user has asked for implementation and approved any necessary dependency changes.
- Keep generated application code out of the workspace until the user explicitly asks to begin implementation. Planning, inspection, and instruction/document tasks do not authorize building the application.
- Prefer practical free options. Do not sign up for, enable, or incur costs for paid services without the user's explicit approval.

## Privacy and data boundaries

- Keep personal betting records and calculations, diary data, mood/trigger entries, notes, reflections, and future-self messages on the user's device by default.
- Never transmit personal records, diary/reflection data, or sensitive details to a backend, analytics service, or AI provider without an explicitly approved design and informed user consent. Explain exactly what data would leave the device, who receives it, why, retention/deletion behavior, and any non-cloud alternative before proposing such a change.
- For any approved shared/backend feature, minimize collected data, separate it from local personal records, explain its server-side handling, and define access, retention, export, and deletion behavior. Do not expose local records to administrators by default.
- Do not add analytics, advertising trackers, third-party scripts, remote fonts/images, or unreviewed telemetry. Keep OCR assets local if OCR is implemented and offline/privacy requirements apply; verify network behavior rather than assuming a library is local.
- Do not claim encryption, anonymity, zero data collection, guaranteed deletion, privacy compliance, or security properties unless the implementation and appropriate review/testing support the claim.

## Evidence, calculations, and supportive content

- Never invent bookmaker margins, actuarial/statistical findings, sample sizes, sources, helpline details, provider credentials, legal conclusions, or claims of clinical effectiveness.
- Use margin data only when its source, sample, method, dates, and sufficiency are documented and approved. Clearly label synthetic/test data and prevent it from appearing as real production findings.
- Keep calculation logic independently testable. Preserve the specification's formulas and test vectors unless a documented conflict is raised and the user approves a change. Obtain actuarial/mathematical review of calculations and user-facing estimates before release.
- Label estimates and projections as estimates/scenarios, not promises or predictions. Clearly disclose assumptions, sample limitations, missing data, and approximate multibet treatment.
- Use supportive, non-judgmental language. Do not encourage betting, provide betting tips, celebrate gambling streaks, shame users, diagnose, or claim the app treats or cures gambling problems.
- Do not publish a helpline, support provider, self-exclusion instruction, legal statement, or crisis path until its details have been checked against an authoritative source and its verification date is recorded. Keep helplines first where the specification requires it.
- Require qualified review of privacy, security, accessibility, calculations, supportive/crisis content, and Kenyan legal/ethical considerations before release or user testing when the specifications require it.

## Delivery and release discipline

- Preserve offline behavior for the features specified as core/offline; label external links that need a connection. Test actual offline operation and network requests, including OCR and shared/backend features where applicable.
- Include focused tests for changed behavior and the relevant calculation, privacy, accessibility, deletion, offline, and release-data gates. Do not claim a test, legal check, or review passed unless it was actually performed and its scope is clear.
- Treat the audit addendum's legal, tax, technical, and resource findings as attributed research notes requiring the stated confirmation; do not convert them into independent advice or current verified facts.
- Do not begin application implementation, broaden scope, or make unresolved product/legal/safety decisions until the user explicitly authorizes that work.

## Visual Design and Product Quality Standards

- LossLens must have an intentional, coherent visual identity based on its existing logo and navy, turquoise, sky-blue, and white palette.
- Avoid generic AI-generated or "vibe-coded" design conventions: unnecessary purple gradients, decorative sparkles, emoji headings, excessive glow effects, gratuitous animation, oversized typography, inconsistent spacing, and arbitrary component styling.
- Establish and reuse design tokens for colour, typography, spacing, border radii, shadows, and interaction states.
- Use consistent accessible components, semantic HTML, keyboard navigation, visible focus indicators, and adequately sized touch targets.
- All visible controls must have meaningful behaviour. Do not present decorative controls as functional.
- Implement appropriate loading, empty, validation, success, and error states wherever the feature requires them.
- Use restrained, purposeful transitions with consistent timing and easing; respect reduced-motion preferences.
- Write precise, user-centred copy. Never invent testimonials, personal data, financial results, statistics, research findings, or claims.
- Keep layouts responsive and test them at narrow mobile and desktop widths.
- Avoid adding dependencies for visual effects or icons when existing CSS, HTML, or project dependencies suffice.
- Do not sacrifice usability, performance, privacy, or accessibility for visual polish.
- Before finishing a feature, run the relevant available checks and report actual results.
