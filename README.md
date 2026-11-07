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
│  ├─ engine.test.ts         every formula in your real F2A vs Excel's stored result (470/470 match)
│  ├─ layout.test.ts         section row map vs your file, team-file totals, config replace
│  └─ f2a-sample.json        your real F2A sheet, exported
└─ src/
   ├─ shared/
   │  ├─ theme.css           colours, buttons, cards, F2A table styles (light + dark)
   │  └─ prefs.ts            language + theme, remembered on the device
   ├─ incharge/
   │  ├─ main.tsx, App.tsx   shell: top bar, 5 tabs (F2A | Team App | Import | Children | More), dialogs
   │  ├─ strings.ts          English + Urdu text for the app
   │  ├─ lib/
   │  │  ├─ core.ts          F2A layout: groups per section, section map, column maps, Import map
   │  │  ├─ engine.ts        formula engine, display values, team-file totals (no UI, tested)
   │  │  ├─ state.ts         app state store, IndexedDB, toast/confirm/prompt
   │  │  └─ workbook.ts      load/save/autosave, cell edit, team codes, new template, start new campaign,
   │  │                      children data, team app generator, import "Add to F2A"
   │  └─ views/
   │     ├─ F2AView.tsx      THE FORM: all sections, merged headers, formulas, zoom, print, download
   │     ├─ TeamsView.tsx    pick day, share/download each team's app (T-12_Day1.html)
   │     ├─ ImportView.tsx   load team files / paste text, full review, Add to F2A, Remove
   │     ├─ ChildrenView.tsx Previous / Now / Difference
   │     ├─ MoreView.tsx     language, theme, start date, team codes, download, new template/campaign
   │     ├─ Welcome.tsx      choose file / create template
   │     └─ Dialogs.tsx      confirm / prompt / toasts
   └─ team/
      └─ main.tsx            (stage 1 placeholder, replaced in stage 3)
```

## Build stages

1. **Done:** project, build setup, GitHub deploy, theme, F2A layout and formula engine.
2. **Done (this zip):** workbook load/save, new template, new campaign, team codes, children, generator, import, and all incharge screens.
3. **Next:** team app (Entry, Missed, Review, Settings, send/copy). Until then the Team App tab downloads a placeholder file.
4. **Last:** compile and test everything with your Excel, polish.

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
