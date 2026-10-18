# How long you're safe

A local page for Jake's finances, as of 18 October 2026. It shows how long the cash lasts, and which fallback applies before it runs out. It does not connect to the internet.

## Run

```bash
npm install
npm test
npm run dev
```

Open the address Vite prints. The page reads [`public/config.json`](public/config.json). Edit that file and refresh.

If you have already typed into the form on this computer, the browser copy wins. Use **Reload config.json** to drop it and read the file again. **Download config.json** writes the form, including monthly check-ins, so you can replace the file.

## Check monthly. Not daily.

Add the liquid balance once a month. The chart compares it with the plan: the cash you actually save, plus the DoorDash vest, at the real return you selected.

## What the numbers assume

- Malta spending of €1,700 includes the €600 mortgage and insurance. Confirmed.
- The €800 is cash saved from Wolt and C-360. The vest is extra, and it stops if Wolt stops.
- The mortgage has about 33 years left. The €600 payment holds until 1 October 2029. The 2% rate before that, and the 3.5% rate after, are placeholders. They are not the bank's quote. Type the real payment when you have it.
- Returns are real, after inflation. Every figure is in today's euros.
- The €48k and €55k paths use the 2026 Malta single-filer brackets and the Class 1 social-security cap stored in the config. They are a planning sketch, not a payslip and not tax advice. They are labelled upside, not the base plan.
- Once a path runs out of cash, the mortgage balance freezes. The page does not invent repayments, and it does not guess what the bank would do.

`npm test` covers compounding, runway, the cash gap, job loss, the crash, the vest, the mortgage step-up, a sale, the August 2027 milestone, and the gross-to-net sketch.
