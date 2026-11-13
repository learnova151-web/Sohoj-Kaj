# Sohoj Kaj (সহজ কাজ)

Free voice typing for Mac and Windows: press one key, speak Bangla or English,
and the words are typed wherever your cursor is. Works offline, or in the cloud
with your own Google Gemini key.

## What is in this repository

```
index.html, styles.css, app.js   landing page (also works as the GitHub Pages site)
app/                             the desktop app (Electron)
  src/main/                      main process: shortcuts, recorder, transcriber, typing
  src/renderer/                  HUD overlay, settings window, hidden recorder page
  src/worklet/                   AudioWorklet PCM capture
  src/shared/constants.js        model URL, languages, default settings
build/                           app icons
scripts/make_icon.py             icon generator
.github/workflows/build.yml      builds Mac + Windows installers automatically
```

## How the app works

1. You press the Bangla shortcut (`Alt+Shift+B` by default) or the English one
   (`Alt+Shift+E`). Both are changeable in Settings.
2. The app records your microphone and shows a small overlay.
3. When you pause for a moment (or press the shortcut again, or hit the maximum
   length), the recording stops and is transcribed:
   - **Offline**: a bundled `whisper-cli` binary (whisper.cpp) runs the Bangla
     Whisper Medium fine-tune by Bengali.AI (Apache-2.0, GGUF Q8_0, about 830 MB,
     downloaded once from Settings). Nothing leaves your computer.
   - **Cloud**: the audio goes to Google Gemini with your own free API key —
     the most accurate mode, and the best at Bangla mixed with English.
4. The text is typed into whatever app you were using (via a paste simulation),
   or copied to the clipboard if you turn auto-typing off.

Why press-and-pause instead of hold-and-release: Electron cannot reliably detect
the release of a global shortcut across both platforms, so the app starts on the
key press and finishes on a short silence, which feels the same in practice.

## Run it from source

```bash
cd app
npm install
npm start
```

Offline mode needs the model: open Settings (tray icon > Settings) and click
"Download model", or choose any local whisper `.ggml`/`.gguf` file. It also needs
a `whisper-cli` binary in `app/resources/whisper/` — the build workflow produces
it, or build whisper.cpp yourself:

```bash
git clone https://github.com/ggml-org/whisper.cpp
cmake -S whisper.cpp -B whisper.cpp/build -DCMAKE_BUILD_TYPE=Release
cmake --build whisper.cpp/build --config Release --target whisper-cli
mkdir -p app/resources/whisper && cp whisper.cpp/build/bin/whisper-cli app/resources/whisper/
```

## Build installers

Push a tag like `v0.1.0` (or run the workflow manually from the Actions tab).
GitHub Actions builds `whisper.cpp` and the Electron app on macOS and Windows
runners and uploads:

- `Sohoj-Kaj-mac-arm64.dmg` (Apple Silicon)
- `Sohoj-Kaj-mac-x64.dmg` (Intel)
- `Sohoj-Kaj-win-x64.exe` (Windows 10/11, 64-bit)

Tagged builds are attached to the GitHub release, which is exactly where the
landing page download buttons point.

## First-run permissions

- **Microphone**: the app asks the first time you dictate.
- **macOS Accessibility**: needed to type into other apps
  (System Settings > Privacy & Security > Accessibility).
- The installers are not code-signed yet, so Windows shows "Windows protected
  your PC" (More info > Run anyway) and macOS needs a right-click > Open once.

## Credits

- Offline speech engine: [whisper.cpp](https://github.com/ggml-org/whisper.cpp) (MIT)
- Offline Bangla model: Bengali.AI Whisper Medium fine-tune (Apache-2.0), GGUF Q8_0
- Interaction design inspired by the open-source app
  [Handy](https://github.com/cjpais/Handy) (MIT)
- Cloud mode: your own Google Gemini key; audio goes to Google for transcription only
