# Life

A local overview of days, weeks, and money. It runs in the browser, stores everything on the device, and does not call out to the network.

## Run

```bash
npm install
npm test
npm run dev
```

Open the dev URL. On a phone, use the browser’s “Add to Home Screen” after `npm run build && npm run preview` (or any static host you control). The app is a PWA.

## What’s stored

One JSON document in IndexedDB. Export and import it from Settings. Demo mode draws a fictional history and leaves the real log alone.

History starts empty. The finance page is seeded with the October 2026 snapshot (net, euros). Habit targets start at exercise 4/week, reading 5/week, music 3/week, sleep 7h, nicotine-free, diet at 2 or 3 on 6 days/week. All of that is editable.

## Open question

Whether the €1,500 Malta spend includes the mortgage is **not confirmed**. Until you set it on the finance page, runway treats €1,500 as the whole monthly spend and does not invent a repayment. Sale, step-up, and rent scenarios stay blank until the payment, rent, and date are filled in.

## Money maths

All projections live in `src/finance/engine.ts` and are covered by `npm test`. Returns are real. Amounts are today’s euros. The savings grid does not grow the contribution. The “worst realistic case” uses 0% return on purpose. Salary levels labelled €48k and €55k gross are upside, not the base, and only appear after you type a net monthly figure.
