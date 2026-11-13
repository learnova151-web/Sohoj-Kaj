const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const { GEMINI_ENDPOINT, LANGUAGES } = require('../shared/constants');
const { modelPath } = require('./model-manager');

function whisperBinary() {
  const name = process.platform === 'win32' ? 'whisper-cli.exe' : 'whisper-cli';
  const bundled = path.join(process.resourcesPath || '', 'whisper', name);
  if (fs.existsSync(bundled)) return bundled;
  const dev = path.join(__dirname, '..', '..', 'resources', 'whisper', name);
  if (fs.existsSync(dev)) return dev;
  return null;
}

function runWhisper(bin, model, wavPath, lang) {
  const cfg = LANGUAGES[lang];
  const args = ['-m', model, '-f', wavPath, '-l', cfg.whisperLang, '-nt', '-np', '-t', '4'];
  if (cfg.whisperPrompt) args.push('--prompt', cfg.whisperPrompt);
  return new Promise((resolve, reject) => {
    execFile(bin, args, { timeout: 120000, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        err.message = (stderr || '').trim().split('\n').slice(-3).join(' ') || err.message;
        reject(err);
        return;
      }
      resolve(stdout.trim());
    });
  });
}

async function offlineTranscribe(wavPath, lang) {
  const bin = whisperBinary();
  if (!bin) {
    const err = new Error('The speech engine is missing from this installation.');
    err.userHint = 'Reinstall Sohoj Kaj, or pick a whisper.cpp binary in Settings.';
    throw err;
  }
  const model = modelPath();
  if (!model) {
    const err = new Error('The Bangla model is not downloaded yet.');
    err.code = 'no-model';
    err.userHint = 'Open Settings and download the offline model (about 830 MB, one time).';
    throw err;
  }
  return runWhisper(bin, model, wavPath, lang);
}

async function cloudTranscribe(wavPath, lang) {
  const settings = require('./store').get();
  if (!settings.geminiKey) {
    const err = new Error('No Google Gemini key set.');
    err.code = 'no-key';
    err.userHint = 'Open Settings, switch to Cloud mode and paste your free Google Gemini key.';
    throw err;
  }
  const audioB64 = fs.readFileSync(wavPath).toString('base64');
  const prompt =
    'Transcribe this audio exactly as spoken. If the speech is Bangla, write it in Bangla script. ' +
    'Keep any English words in English letters. Add natural punctuation. Output only the transcript text, nothing else.';
  const res = await fetch(
    `${GEMINI_ENDPOINT}/${settings.geminiModel}:generateContent?key=${encodeURIComponent(settings.geminiKey)}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }, { inlineData: { mimeType: 'audio/wav', data: audioB64 } }]
          }
        ]
      })
    }
  );
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    const err = new Error(`Gemini request failed (HTTP ${res.status})`);
    err.userHint = body.slice(0, 200);
    throw err;
  }
  const data = await res.json();
  const parts = data.candidates?.[0]?.content?.parts || [];
  return parts.map(p => p.text || '').join('').trim();
}

async function transcribe(wavPath, lang) {
  const settings = require('./store').get();
  if (settings.mode === 'cloud') return cloudTranscribe(wavPath, lang);
  return offlineTranscribe(wavPath, lang);
}

module.exports = { transcribe };
