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
├─ package.json              scripts and dependencies
├─ vite.incharge.config.ts   incharge app + PWA (installable, offline)
├─ vite.team.config.ts       team app -> ONE html file (vite-plugin-singlefile)
├─ index.html                incharge entry
├─ team/index.html           team entry. Holds <script id="polio-config"> that the incharge app rewrites per team/day
├─ scripts/copy-team.mjs     copies the built team file to public/team-template.html
├─ public/icons/             app icons
├─ .github/workflows/deploy.yml   builds both and publishes to GitHub Pages
├─ tests/
│  ├─ engine.test.ts         checks every formula against Excel's stored results
│  └─ f2a-sample.json        your real F2A sheet, exported
└─ src/
   ├─ shared/
   │  ├─ theme.css           colours, buttons, cards, F2A table styles (light + dark)
   │  └─ prefs.ts            language + theme, remembered on the device
   ├─ incharge/
   │  ├─ main.tsx            (stage 1 placeholder, replaced in stage 2)
   │  └─ lib/
   │     ├─ core.ts          F2A layout: groups per section, section map, column maps, Import map   [DONE]
   │     └─ engine.ts        formula engine, display values, team-file totals                    [DONE, tested]
   └─ team/
      └─ main.tsx            (stage 1 placeholder, replaced in stage 3)
```

## Build stages

1. **Done:** project, build setup, GitHub deploy, theme, F2A layout and formula engine. The engine matches all 470 formulas of your real file.
2. **Next:** workbook load/save (ExcelJS), new template, start new campaign, autosave; screens: F2A form, Team App generator, Import, Children, More.
3. **Then:** team app (Entry, Missed, Review, Settings).
4. **Last:** test everything with your Excel, polish.

## Run it

```
npm install
npm run build        # builds team app, copies it, then builds the incharge app
npm run dev          # incharge app on http://localhost:3000
npm run dev:team     # team app on http://localhost:3001
npx tsx tests/engine.test.ts    # formula check
```

On GitHub: push to `main`, then Settings -> Pages -> Source: **GitHub Actions**.

## Decisions so far

- Children Count columns stay at **Y, Z, AA** for now (can be moved later; none of your other sheets point at them).
- Finger Markers: Final Team Wise does not add Catch Day, Final Day Wise does (kept as in your original).
- Your file stores "Returned" and "Still missed" as `MINUS(..)`. The app reads and keeps that as is.
- MMP in the team app is a button that turns green (not a switch).
