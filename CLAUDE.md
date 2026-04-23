# Voice Training App — Development Guide

## Architecture

The core app is **one HTML file** (`index.html`) — all CSS, HTML, and JS in one place. No build step, no framework, no dependencies. Keep it that way.

A small PWA envelope sits alongside it so users can install the app to their home screen and run it offline:

- `manifest.webmanifest` — name, icons, theme colors
- `sw.js` — service worker (stale-while-revalidate cache)
- `icon.svg` — single scalable icon used for manifest, favicon, and iOS home screen
- `generator.html` — standalone page; also cached by the service worker

The PWA files are intentionally minimal and don't require a build step. Do not grow them into a framework layer.

### Updating cached files (important)

The service worker caches `index.html`, `generator.html`, `manifest.webmanifest`, and `icon.svg`. When any of them changes, **bump `CACHE_NAME` in `sw.js`** (e.g. `voice-trainer-v1` → `voice-trainer-v2`) in the same commit. The `activate` handler deletes old caches and `clients.claim()` makes the new version take effect without a second reload.

If you skip the bump, installed users keep seeing the old version until their cache evicts naturally — sometimes days. This is the single most common PWA footgun; do not forget it.

Add any new files you reference from the HTML (scripts, stylesheets, fonts, images) to the `ASSETS` array in `sw.js` or they'll only work online.

### Icons

`icon.svg` covers everything for modern browsers and iOS Safari 17+. If you ever want belt-and-braces coverage for older iOS or nicer App Library thumbnails, add PNG sizes (`192×192`, `512×512`, `180×180` for `apple-touch-icon`) and list them in both `manifest.webmanifest` and `sw.js` `ASSETS`. Not required — just a polish upgrade.

## Key Sections (in order of appearance in the file)

1. **CSS** — custom properties in `:root`, dark theme, responsive breakpoints at 600px
2. **HTML** — splash screen, main UI (header, stage nav pills, pitch panel with canvas, stage content area, footer nav)
3. **Note data** — `ALL_NOTES` array (C2–E5), `noteFreq()`, `freqToNote()` with cent offset, `deriveWarmupNotes()` for adaptive warm-up sequencing
4. **Harvard sentences** — `HARVARD` array, 72 lists of 10 sentences each, used in the Sentences stage
5. **Conversation starters** — `STARTERS` array, used in Free Practice stage
6. **Audio engine** — `initAudio()` sets up `AnalyserNode` (fftSize 4096), `detectPitch()` does autocorrelation, `detectPitchFFT()` does FFT peak detection (used in spectrogram mode for performance)
7. **Reference tone** — `startReference()`/`stopReference()`, triangle wave oscillator with volume slider
8. **Pitch graph** — `renderGraph()`, rolling line chart with note grid, target lines/zones, 10-second window
9. **Spectrogram** — `renderSpectrogram()`, Friture-style waterfall with double-width ring buffer, log frequency scale, LUT colormap, time-based column advancement (10-second window)
10. **Custom reference lines** — `customLines` array, right-click to pin, per-line colors, chip list in header
11. **Stage definitions** — `ROUTINE.stages` array; each entry has `{id, name, short, type, config}`. The warm-up stage's `config.notes` is the hardcoded fallback; at runtime it is overridden by `stageState.derivedNotes` when the user has set a session target.
12. **Stage rendering** — `renderCurrentStage()` with a switch on stage ID, each stage has its own timer/substep logic
13. **Main loop** — `mainLoop()` runs via `requestAnimationFrame`, handles pitch detection, UI updates, and graph/spectrogram rendering. `graphPaused` flag freezes rendering (spacebar toggle); on unpause, `spectroLastColTime` is reset to avoid catch-up burst.

## How to Customize the Training Routine

### Change target notes and ranges

All per-stage notes and zones live in the `ROUTINE.stages` config objects (search `__ROUTINE_START__`):

- **Warm-up notes** — `ROUTINE.stages[0].config.notes` (hardcoded fallback; overridden at runtime by `deriveWarmupNotes()` — see below)
- **Counting notes** — `ROUTINE.stages[1].config.notes`
- **Blend zones** — `ROUTINE.stages[2].config.zone` / `ROUTINE.stages[3].config.zone`
- **Sentences / Free Practice zones** — `config.zone` on those stages
- **Resonance note** — `ROUTINE.stages[5].config.note`
- **Vowels** — `ROUTINE.stages[5].config.steps` array of `{label, description}` objects

### Adaptive warm-up

`deriveWarmupNotes(highNote, count=6, femmeOnly=false)` generates `count` whole-tone steps ending at `highNote`. When `femmeOnly` is true, notes below F3 are skipped (may produce fewer than `count` notes).

At session start the user picks their **highest target note** and optionally enables **femme/androgynous range only** on the splash screen. These are stored in `sessionTargetNote` and `sessionFemmeOnly`. The derived sequence is written into `stageState.derivedNotes` (for stage 0) so it survives navigation away and back.

`renderSustainedTone` uses `stageState.derivedNotes || cfg.notes`, so the hardcoded fallback applies whenever no session target has been set.

The user can also change the target mid-session via the target-note picker in the header; if the current stage is `sustained-tone`, `applyTargetPicker` re-derives notes and re-renders from step 0.

### Change the stages themselves

The `STAGES` array defines the stage list. Each entry has `{id, name, short}`. The `id` is used in the `switch` statement inside `renderCurrentStage()` to produce each stage's UI and logic. To add/remove/reorder stages, update both `STAGES` and the corresponding `case` in `renderCurrentStage()`.

### Change timing

Each stage uses `startStageTimer(seconds)` for its countdown. Search for `startStageTimer` calls to adjust durations. The warm-up uses per-note timers (15 seconds each by default).

### Change sentences

Replace the `HARVARD` array with your own. Structure: array of arrays, where each inner array is a list of sentence strings. The app picks a random list and cycles through sentences.

### Change conversation starters

Replace the `STARTERS` array with your own prompts.

## Performance Notes

- **Pitch detection** — autocorrelation is O(n^2) on ~4096 samples. In spectrogram mode, the app switches to `detectPitchFFT()` which is O(n) using the FFT data already computed for the spectrogram. Do not run autocorrelation in spectrogram mode.
- **Spectrogram rendering** — uses a double-width offscreen canvas as a ring buffer. New columns are written at two positions (Friture trick) so the visible region is always a single contiguous `drawImage` blit. Column advancement is time-based, not frame-based. A pre-computed `spectroBinMap` avoids log/pow math per pixel per frame.
- **LUT** — the spectrogram colormap is a flat `Uint8Array(256*3)`, indexed with bitwise ops in the hot loop. Do not replace with object arrays.

## Style

- Dark theme with CSS custom properties
- Monospace fonts for data display
- No external fonts or assets
- Responsive down to 600px width

## Versioning

- The app version lives in the footer of `index.html` (search for `app-footer`).
- Bump it on every user-facing change, following [semver](https://semver.org/):
  - **MAJOR** (`X.0.0`) — breaking change to saved state, routine schema, or a removed feature.
  - **MINOR** (`1.X.0`) — new user-facing feature or non-trivial UX change (added button, new stage type, new mode).
  - **PATCH** (`1.1.X`) — bug fix, copy tweak, small visual polish, or internal refactor with no behavior change.
- Do this in the same commit as the change it describes — don't leave a trailing "bump version" commit.
- Purely internal edits (CLAUDE.md, README, docs/, .gitignore) do not bump the version.
