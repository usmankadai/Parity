# ADR 0005: Workspace layout and visual identity

- **Status:** Accepted
- **Date:** 2026-11-09

## Context

Phase 1 shipped with a single-column page: a dark header bar, then the country form, the table and the Ask panel stacked one after another, with GOV.UK-style form styling. That layout came from an earlier consumer signup project, where a step-by-step journey is the right shape.

Parity is a different kind of product: an analysis tool for a Reward Director, who compares countries and asks questions about what they see. Stacking the Ask panel below a long table meant scrolling away from the data to ask about it, and the original spec described Ask as a side panel. The page also had no favicon or link-preview image, so shared links showed a blank card.

## Decision

**Layout: a workspace, not a form page.**

- A light top bar with the logo, a "Statutory benefits workspace" tagline, the date the sources were checked, and (in the demo) the "Demo data" badge and the scenario switcher, which opens as a dropdown instead of floating over the page.
- A short intro, then a toolbar card holding the country choices (pills with a visible checkbox) and the Compare button.
- On wide screens (70rem and up), a two-column grid: the table on the left, and Ask on the right, sticky, so it stays in view while the table scrolls. On narrower screens the columns stack, and a "Jump to Ask" link appears near the top.
- Before anything is compared, an empty state lists the 7 categories the table covers.

**Table:** the figure is the hero of each cell (large, tabular numbers), with the rank marker, the source's wording, a tinted note and the source link below. The benefit column is sticky while the table scrolls sideways. The visible title sits outside the scroll area so it is never cut off on a phone; a visually hidden `<caption>` still names the table.

**Identity:**

- Type: IBM Plex Sans (variable), self-hosted through `@fontsource-variable/ibm-plex-sans`, so the Content Security Policy stays at `font-src 'self'`. Designed for data-heavy interfaces, with tabular figures.
- Colour: cobalt (`#2340cc`) as the brand colour, a warm amber (`#ffd37a`) only for demo affordances, and green and red-orange washes for most and least generous, always with an icon and text. Tokens are named for their role (`--ink`, `--panel`, `--brand`, `--good`), not reused from another project.
- Mark: an equals sign in a rounded square. Parity means equality, and the product lines countries up on equal terms.
- Contrast was checked for every text pair (at least 4.5:1) and for control borders (at least 3:1). Playwright's axe scans check it again in a real browser.

**Icons and link previews:** `scripts/brand-images.ts` renders the favicon (SVG and ICO), the Apple touch icon and a 1200×630 preview image from HTML with Playwright's Chromium, so they can be regenerated (`npm run brand:images`) when the design changes. `index.html` carries the Open Graph and Twitter tags.

## Consequences

- The data and the assistant are visible together on a laptop screen, which is how the product is meant to be used.
- The design no longer looks like a sibling of the signup project it grew out of.
- Behaviour did not change, so the unit, integration and end-to-end tests stayed the same apart from one Playwright locator for the switcher. They, including the axe and no-sideways-scroll checks at phone size, passed after the redesign.
- The font adds about 46 KB (Latin subset) to the first visit. Other subsets load only if the page needs them.
