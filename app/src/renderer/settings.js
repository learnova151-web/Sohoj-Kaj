const els = {
  modeOffline: document.querySelector('input[name="mode"][value="offline"]'),
  modeCloud: document.querySelector('input[name="mode"][value="cloud"]'),
  cloudBox: document.getElementById('cloud-box'),
  offlineBox: document.getElementById('offline-box'),
  geminiKey: document.getElementById('gemini-key'),
  geminiModel: document.getElementById('gemini-model'),
  modelStatus: document.getElementById('model-status'),
  btnDownload: document.getElementById('btn-download'),
  btnChoose: document.getElementById('btn-choose'),
  progress: document.getElementById('progress'),
  bar: document.getElementById('bar'),
  progressLabel: document.getElementById('progress-label'),
  shortcutBn: document.getElementById('shortcut-bn'),
  shortcutEn: document.getElementById('shortcut-en'),
  autoPaste: document.getElementById('auto-paste'),
  silence: document.getElementById('silence'),
  maxSec: document.getElementById('max-sec')
};

let loaded = false;

function toAccelerator(e) {
  const parts = [];
  if (e.ctrlKey) parts.push('Control');
  if (e.altKey) parts.push('Alt');
  if (e.metaKey) parts.push('Super');
  if (e.shiftKey) parts.push('Shift');
  const k = e.key;
  if (['Control', 'Alt', 'Meta', 'Shift'].includes(k)) return null;
  let key = k.length === 1 ? k.toUpperCase() : k;
  if (key === ' ') key = 'Space';
  if (key === 'ArrowUp') key = 'Up';
  else if (key === 'ArrowDown') key = 'Down';
  else if (key === 'ArrowLeft') key = 'Left';
  else if (key === 'ArrowRight') key = 'Right';
  parts.push(key);
  return parts.join('+');
}

function captureHotkey(input, field) {
  input.addEventListener('keydown', e => {
    e.preventDefault();
    e.stopPropagation();
    if (e.key === 'Escape') {
      input.classList.remove('capturing');
      input.blur();
      return;
    }
    const acc = toAccelerator(e);
    if (!acc) return;
    input.value = acc;
    input.classList.remove('capturing');
    input.blur();
    if (loaded) window.sohoj.setSettings({ [field]: acc });
  });
  input.addEventListener('click', () => {
    input.classList.add('capturing');
    input.value = '';
    input.placeholder = 'Press keys… (Esc to cancel)';
  });
}

captureHotkey(els.shortcutBn, 'banglaShortcut');
captureHotkey(els.shortcutEn, 'englishShortcut');

function renderMode(mode) {
  els.modeOffline.checked = mode === 'offline';
  els.modeCloud.checked = mode === 'cloud';
  els.cloudBox.classList.toggle('hidden', mode !== 'cloud');
  els.offlineBox.classList.toggle('hidden', mode !== 'offline');
}

function updateModelStatus(model) {
  if (model && model.exists) {
    els.modelStatus.textContent = `Model ready: ${model.path}`;
    els.btnDownload.disabled = true;
    els.btnDownload.textContent = 'Model downloaded';
  } else {
    els.modelStatus.textContent = 'No model yet. Download it once, or point to a local whisper model file.';
    els.btnDownload.disabled = false;
  }
}

async function load() {
  const { settings, model } = await window.sohoj.getSettings();
  renderMode(settings.mode);
  els.geminiKey.value = settings.geminiKey || '';
  els.geminiModel.value = settings.geminiModel || 'gemini-2.5-flash';
  els.shortcutBn.value = settings.banglaShortcut || '';
  els.shortcutEn.value = settings.englishShortcut || '';
  els.autoPaste.checked = Boolean(settings.autoPaste);
  els.silence.value = settings.silenceStopMs / 1000;
  els.maxSec.value = settings.maxSeconds;
  updateModelStatus(model);
  loaded = true;
}

document.querySelectorAll('input[name="mode"]').forEach(r =>
  r.addEventListener('change', () => {
    if (!loaded) return;
    const mode = document.querySelector('input[name="mode"]:checked').value;
    renderMode(mode);
    window.sohoj.setSettings({ mode });
  })
);

els.geminiKey.addEventListener('change', () => {
  if (loaded) window.sohoj.setSettings({ geminiKey: els.geminiKey.value.trim() });
});
els.geminiModel.addEventListener('change', () => {
  if (loaded) window.sohoj.setSettings({ geminiModel: els.geminiModel.value.trim() || 'gemini-2.5-flash' });
});
els.autoPaste.addEventListener('change', () => {
  if (loaded) window.sohoj.setSettings({ autoPaste: els.autoPaste.checked });
});
els.silence.addEventListener('change', () => {
  if (!loaded) return;
  const ms = Math.round(Math.min(6, Math.max(0.6, parseFloat(els.silence.value) || 1.8)) * 1000);
  els.silence.value = ms / 1000;
  window.sohoj.setSettings({ silenceStopMs: ms });
});
els.maxSec.addEventListener('change', () => {
  if (!loaded) return;
  const sec = Math.min(300, Math.max(5, parseInt(els.maxSec.value, 10) || 60));
  els.maxSec.value = sec;
  window.sohoj.setSettings({ maxSeconds: sec });
});

els.btnDownload.addEventListener('click', async () => {
  els.btnDownload.disabled = true;
  els.progress.classList.remove('hidden');
  els.progressLabel.textContent = 'Starting download…';
  const result = await window.sohoj.downloadModel();
  if (result.ok) {
    els.progressLabel.textContent = 'Download complete.';
    updateModelStatus({ exists: true, path: result.dest });
  } else {
    els.progressLabel.textContent = 'Download failed: ' + result.error;
    els.btnDownload.disabled = false;
  }
});

els.btnChoose.addEventListener('click', async () => {
  const picked = await window.sohoj.chooseModelFile();
  if (picked) updateModelStatus({ exists: true, path: picked });
});

window.sohoj.onModelProgress(p => {
  if (p.status === 'downloading') {
    els.progress.classList.remove('hidden');
    els.bar.style.width = p.pct + '%';
    const mb = Math.round(p.received / 1024 / 1024);
    const total = Math.round(p.total / 1024 / 1024);
    els.progressLabel.textContent = `Downloading… ${p.pct}% (${mb} / ${total} MB)`;
  } else if (p.status === 'done') {
    els.bar.style.width = '100%';
  }
});

document.getElementById('link-aistudio').addEventListener('click', e => {
  e.preventDefault();
  window.sohoj.openExternal('https://aistudio.google.com/apikey');
});

document.querySelectorAll('footer a[data-url]').forEach(a =>
  a.addEventListener('click', e => {
    e.preventDefault();
    window.sohoj.openExternal(a.dataset.url);
  })
);

load();
