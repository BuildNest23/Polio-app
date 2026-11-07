# Polio App

Two apps from one project:

| App | What it is | Hosted / shared how |
|---|---|---|
| **Polio Incharge** (`index.html`, `src/incharge`) | The area incharge's PWA: F2A form (loads and edits your Excel), Team App generator, Import, Children, More | GitHub Pages, install to home screen |
| **Polio Team** (`team/`, `src/team`) | One offline `.html` file per team and day, replaces the paper tally sheet | Built into one file, handed out by the Incharge app (`T-12_Day1.html`) |

Both use the same look (`src/shared/theme.css`), English/Urdu and light/dark (set in Settings only).

## Folder map

```
polio-app/
├─ package.json / tsconfig.json / vite.*.config.ts / index.html / team/index.html
├─ scripts/copy-team.mjs          copies the built team file to public/team-template.html
├─ public/icons/                  app icons
├─ .github/workflows/deploy.yml   builds both apps, publishes to GitHub Pages
├─ tests/
│  ├─ engine.test.ts              every formula vs Excel's stored result        (470/470 match)
│  ├─ model.test.ts               builds all F2A sections from the real file    (9/9 ok)
│  └─ f2a-sample.json, f2a-merges.json   your real F2A sheet, exported
└─ src/
   ├─ shared/
   │  ├─ theme.css                colours, buttons, cards, F2A table (light + dark)
   │  └─ prefs.ts                 language + theme, remembered on the device
   ├─ incharge/
   │  ├─ main.tsx, App.tsx        app shell, 5 bottom tabs, welcome screen
   │  ├─ Dialogs.tsx, Icon.tsx, incharge.css
   │  ├─ lib/
   │  │  ├─ core.ts               F2A layout: groups, section map, column maps, Import map
   │  │  ├─ engine.ts             formula engine, display values, team-file totals
   │  │  ├─ state.ts              shared state, IndexedDB, dialogs, toasts
   │  │  ├─ workbook.ts           Excel load/save, autosave, editing, team codes, section model,
   │  │  │                        print, Children data, new template, start new campaign
   │  │  ├─ teamio.ts             Team App generator (share/download) and Import ("Add to F2A")
   │  │  └─ i18n.ts               English / Urdu labels
   │  └─ views/
   │     ├─ F2AView.tsx           THE FORM: section chips, table, zoom, print, download
   │     ├─ TeamsView.tsx         Team App generator
   │     ├─ ImportView.tsx        load team files, review, Add to F2A
   │     ├─ ChildrenView.tsx      Previous / Now / Difference
   │     └─ MoreView.tsx          language, theme, start date, team codes, backup, change file, new template
   └─ team/
      ├─ main.tsx, App.tsx        (4 tabs: Entry, Missed, Review, Settings)
      ├─ model.ts                 (data, rules, totals, file builder)
      ├─ i18n.ts, ui.tsx          (English/Urdu text, stepper, confirm, toast)
      └─ views/                   Entry, Missed, Review, Settings
   src/shared/teamfile.ts         (team file read + totals, used by both apps)
```

## Build stages

1. **Done:** project, build setup, GitHub deploy, theme, F2A layout and formula engine.
2. **Done (this zip):** the whole Incharge app. Not compiled yet: first real build is on GitHub or after package installs are allowed.
3. **Next:** the team app (Entry, Missed, Review, Settings), then it is generated per team from the Incharge app.
4. **Last:** test with your Excel, polish.

## Run it

```
npm install
npm run build        # builds team app, copies it, then builds the incharge app
npm run dev          # incharge app on http://localhost:3000
npm run dev:team     # team app on http://localhost:3001
npx tsx tests/engine.test.ts && npx tsx tests/layout.test.ts   # logic checks
```

On GitHub: push to `main`, then Settings -> Pages -> Source: **GitHub Actions**.

## Decisions so far

- Children Count columns stay at **Y, Z, AA** for now (can be moved later; none of your other sheets point at them).
- Finger Markers: Final Team Wise does not add Catch Day, Final Day Wise does (kept as in your original).
- Your file stores "Returned" and "Still missed" as `MINUS(..)`. The app reads and keeps that as is.
- MMP in the team app is a button that turns green (not a switch).


## Status
Stage 1, 2 and 3 done (stage 3 = team app). Stage 4: first real build on GitHub, test with your real Excel, polish.
