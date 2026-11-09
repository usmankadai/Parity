# ADR 0003: Normalising statutory data

- **Status:** Accepted
- **Date:** 2026-11-09

## Context

Statutory minimums are written differently in each country, and putting the raw numbers side by side would mislead:

- UK annual leave is 28 days on a 5-day week, but employers can count bank holidays within it. German leave is 24 "Werktage", counted on a 6-day week (Monday to Saturday), with public holidays on top. Irish and Dutch leave is stated in weeks or as a multiple of weekly hours.
- Some countries set **no** minimum for a category. The UK and the Netherlands give no legal right to paid public holidays. Germany has no separate paternity leave in law. Germany and the Netherlands require no employer contribution to a workplace pension (the Dutch rules depend on sector funds and collective agreements).
- Some categories cannot be ranked fairly at all. UK sick pay lasts up to 28 weeks at a low flat rate; German sick pay is full pay for 6 weeks; Dutch sick pay is at least 70% for up to 2 years.

A Reward Director reading the table needs numbers they can compare, without losing what the law actually says.

## Options

1. **Show source figures only.** Honest, but leaves the reader to do the conversions, and best/worst markers would be meaningless.
2. **Store normalised figures in the data.** Simple to render, but the conversion is hidden in a JSON file and cannot be tested.
3. **Store figures as stated, with their unit, and normalise in code.** The data stays close to the source; the conversion is a pure, unit-tested function.

## Decision

Option 3.

- Each row stores `amount` and `unit` as the source states them (`working-days-6`, `months`, and so on), plus `sourceValue` in plain English and the `sourceQuote` in the source's own language.
- `normalise()` converts to the category's display unit: leave in **working days on a 5-day week** (a 6-day-week day is 5/6 of one), durations in weeks (a month is 52 ÷ 12 weeks). The 5-day-week assumption is stated in the table caption.
- Every row has a **status**: `verified`, `todo_verify` ("Not yet verified", never a guess) or `no_statutory_minimum` ("No legal minimum", with a required note saying what applies instead). "We have not checked" and "the law sets nothing" are different facts and must look different.
- **Ranking** means "most generous to the employee". `todo_verify` cells are never ranked. `no_statutory_minimum` ranks as zero, but the cell always shows its text and note. A row is ranked only with at least 2 rankable values that are not all equal, and ties are all marked.
- Categories declare `rankable`. Sick pay and pension are not ranked, and the row heading says why. Maternity leave is ranked by length only, and says so, because pay differs a lot.
- Fixture tests check that every row converts, every source is on an official government domain, and every "no legal minimum" row has a note.

## Consequences

- Conversions are visible, tested and explained in the UI, which is the point of the product.
- The 5-day week and 52 ÷ 12 assumptions are simplifications. They are stated where the numbers appear, and `sourceValue` always shows the original.
- Ranking by length can still mislead (52 weeks of UK maternity leave is mostly low pay or unpaid). The ranking notes and cell details carry that nuance; a future version could rank paid weeks separately.
- Adding a country means adding rows with source units, not doing arithmetic by hand.
