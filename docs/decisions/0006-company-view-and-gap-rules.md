# ADR 0006: Company view and gap rules

- **Status:** Accepted
- **Date:** 2026-11-10

## Context

Phase 1 compared legal minimums between countries. Feedback from someone who builds employee benefits platforms was that real users think about **one company's package**: what its staff get in each country, not abstract minimums. A Reward Director's first questions are "Where are we below the legal minimum?" and "Which countries miss out on benefits the others get?"

The role Parity is aimed at builds tools for Reward Directors comparing packages across countries, not the employee-facing portal, so the change should make the comparison concrete without turning Parity into an enrolment site.

## Options

1. **An employee portal** (log in, see your benefits, enrol). Closer to the feedback, but a different product: it needs accounts and enrolment flows, and drifts from the role.
2. **Free-text entry of "your package".** Flexible, but parsing free text is fragile and hard to test.
3. **A configured, fictional company,** with its package stored as structured data and laid over the legal minimums.

## Decision

Option 3.

- **One file per company** in `src/mocks/fixtures/companies/`, served by `GET /api/companies` and validated on the way in like the benefits data. The company is always labelled fictional; no real company's name or data is used.
- **Statutory categories** store the company figure as `amount` + `unit` in the same source units as the legal data, plus the policy in plain words. The same `normaliseAmount` converts both, so they are always compared like for like.
- **Company-only benefits** (private health insurance, wellbeing allowance, employee assistance) are `provided` plus a summary, in their own section, marked as having no legal minimum.
- **Gap rules** (`src/features/company/gap.ts`, unit tested):
  - verified minimum: above, meets or below, allowing for rounding to one decimal place;
  - no legal minimum: "above (no legal minimum)" if the company gives anything, otherwise "no legal minimum", and **never "below"**;
  - minimum not verified: "cannot compare";
  - categories marked `comparable: false` (sick pay): "not compared", with the reason in the row heading.
- **The company view is the default.** A summary above the table counts the gaps per country. Ranking markers (most and least generous) belong to the "Legal minimums only" view, which is the phase 1 table unchanged.
- **Ask** sends the company's figures for the selected countries with the legal rows. Company rows have their own citation IDs (`northwind-IE-notice-period`) and are checked against what was sent, exactly like legal rows.
- **The picker's draft selection moved into Redux,** so "Compare all Northwind Logistics countries" can tick the countries it compares.

## Consequences

- The demo tells a concrete story: Northwind's Irish contract template gives 1 week's notice where the law requires 2, and its German "4 weeks" is shorter than the law's "1 month, to the end of a calendar month". The second is the kind of subtle gap the normalisation in ADR 0003 exists to catch.
- Company figures are invented and say so; legal figures keep their official sources. The two are visually distinct in each cell.
- Adding a company is a data change, not a code change. A second company, with its own branding, is planned (milestone 9).
- "Below" compares length or percentage only. Pay levels (for example enhanced maternity pay) are shown in words, not scored.
