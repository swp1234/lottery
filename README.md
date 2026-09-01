# 6/45 Random Number Picker

A small multilingual PWA that selects six unique numbers from 1–45.

## Product contract

- Uses `crypto.getRandomValues()` plus rejection sampling; no `Math.random()` fallback.
- Allows 1, 3, 5, or 10 sets and up to five fixed numbers.
- Does not use past draws, hot/cold numbers, AI analysis, or winning claims.
- Saved sets stay in browser local storage and never enter analytics or shared URLs.
- Does not sell tickets, accept wagers, or link to gambling operators.
- Supports 12 UI languages and respects an allowlisted `?lang=` entry.

## Funnel events

`lottery_random_view`, `lottery_random_generate`, `lottery_random_save`, `lottery_random_share`, and `lottery_random_related_click` are exact-once per page. Generated and saved values are excluded from every event.

## Local check

Run the root workspace verifier:

```bash
npm run verify:id-lottery-random-path
```
