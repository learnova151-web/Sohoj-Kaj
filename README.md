# Shobdo — Landing Page Rebuild

A faithful, feature-complete rebuild of the Shobdo (শব্দ) landing page — free Bangla
voice typing for Mac and Windows by Khalid Farhan.

## Features (all covered)

1. **Hero** — headline, subtext, Mac/Windows download buttons (platform-aware styling)
2. **App window mockup** — last Bangla sentence in large grid letters, the two key
   chips (বাংলা / English), and earlier dictations
3. **Interactive "Hold. Speak. Let go." demo** — hold the button (or hold `Space`)
   and your own speech is transcribed live in the browser via the Web Speech API,
   with a বাংলা (bn-BD) / English (en-US) toggle, interim + final text, animated
   listening indicator, and graceful error messages (mic blocked, no speech,
   unsupported browser)
4. **One key for each language** — বাংলা → Right Command (Windows: Right Alt),
   English → Fn (Windows: Right Ctrl), changeable in Settings
5. **Accuracy comparison** — animated bars: Whisper large-v3-turbo (42 wrong
   letters in 100), Shobdo offline (10), Shobdo cloud with Gemini (8), with the
   October 2026 test note
6. **Offline vs Cloud** — both cards with all bullets and the one-click switch note
7. **Set up in two minutes** — Download → Allow → Hold
8. **FAQ** — 6 questions, accordion (one open at a time)
9. **Final CTA** — real download buttons pointing to the official release assets:
   - Mac Apple Silicon: `Shobdo-mac-apple-silicon.dmg`
   - Mac Intel: `Shobdo-mac-intel.dmg`
   - Windows 64-bit: `Shobdo-windows-x64-setup.exe`
   (hosted at `khalidfarhanfarlu/shobdo-releases`, `releases/latest/download/...`)
10. **Footer** — attribution to Khalid Farhan, Handy (open source) and Bengali.AI

Also included: sticky top nav, scroll-reveal animations, reduced-motion support,
responsive layout, Bangla web fonts (Noto Serif Bengali / Hind Siliguri), SEO +
Open Graph meta, inline SVG favicon.

## Run

Static site — no build step.

```bash
python3 -m http.server 8080
# open http://localhost:8080
```

The live speech demo needs Chrome or Edge (built-in Web Speech API) and mic
permission; on other browsers the hold interaction still works with a clear notice.

## Files

- `index.html` — full page, all sections
- `styles.css` — design system, responsive + animations
- `app.js` — demo logic, chart animation, FAQ accordion, reveal-on-scroll,
  platform detection
