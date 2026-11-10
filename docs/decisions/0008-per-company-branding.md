# ADR 0008: Per-company branding from config

- **Status:** Accepted
- **Date:** 2026-11-10

## Context

Benefits platforms give every client company its own branded site, configured to its own benefits and rules. Parity's company view (ADR 0006) was built around one fictional company. To show that the same product can serve several clients without code changes, a second company needs to plug in with its own countries, package and colours.

Letting configuration change colours is a risk for accessibility: a client's brand colour can easily fail contrast against white text or a pale background.

## Decision

- **A second fictional company, Harbourside Retail,** with a different shape: 2 countries instead of 4, a leaner package, and one gap (Dutch annual leave written for a 4.5-day week). Adding it was a data change: one JSON file and one line in the company index.
- **A company switcher** (a labelled native `<select>`) sits in the top bar. On phones it gets its own row, so it is never hidden. Switching clears the comparison and the last answer, because the new company may operate in other countries.
- **Theming from config.** Each company sets `brand` and `brandWash`. A hook sets `--brand`, `--brand-wash` and `--focus` on the root element, so every button, link, focus ring, selected pill and section heading follows the company. These are CSSOM changes, which the Content Security Policy allows (inline `style` attributes would not be); a Playwright test confirms it in a real browser.
- **Contrast is a test, not a review step.** Every company's colours must reach 4.5:1 for white text on the brand colour and for brand text on white, on the page background and on the wash. A company that fails cannot ship. Playwright's axe scan also checks contrast with the new theme applied.
- Parity's own mark stays cobalt: it is the product's brand, not the client's.

## Consequences

- A new client is a data change plus a passing test run.
- What-if edits are stored per company, so switching does not mix them up.
- Only the brand colours are themeable. Meaning colours (above, below, errors) stay fixed, so "Below minimum" looks the same for every client.
