# Voice Training

A browser-based voice training app with real-time pitch detection, spectrogram visualization, guided exercises, and recording. No install, no backend — runs entirely client-side.

**Live:** https://aidapaul.github.io/voice-trainer/

## Features

- **Real-time pitch detection** using autocorrelation (pitch view) or FFT peak analysis (spectrogram view)
- **Spectrogram** — Friture-inspired waterfall display with logarithmic frequency scale, 60 Hz–5 kHz range, time-synced 10-second window
- **7-stage guided routine** — Warm-up, Counting, Blend Up/Down, Sentences (Harvard corpus), Resonance (vowel sustain), Free Practice
- **Reference tone** — triangle wave with adjustable volume, hold-to-play on guided stages
- **Custom reference lines** — right-click the graph to pin lines at any frequency, each with a unique color
- **Pause** — press Space to freeze the graph for analysis, press again to resume
- **Session & exercise recording** via MediaRecorder with download support
- **Single HTML file** — no build step, no dependencies

## Generator

**[Generator](https://aidapaul.github.io/voice-trainer/generator.html)** — a teacher enters a client name, their Claude API key, and free-form exercise instructions. The generator calls Claude to produce a customized training routine and downloads a single HTML file ready for the student. No coding needed.

## Customization

The app separates the **engine** (pitch detection, spectrogram, recording, UI) from the **routine** (stages, exercises, data). The routine is a `ROUTINE` object in a clearly marked script block — see `CLAUDE.md` for the full architecture guide. The generator uses this same structure.

## Tech

- Web Audio API (`AnalyserNode`, `OscillatorNode`, `MediaRecorder`)
- Canvas 2D for pitch graph and spectrogram (double-width ring buffer for zero-copy scrolling)
- Autocorrelation pitch detection with parabolic interpolation
- Pre-computed LUT for spectrogram colormap

## License

BSD 2-Clause — see [LICENSE](LICENSE).

Copyright (c) 2026 Aida Paul <aida.paul@proton.me>
