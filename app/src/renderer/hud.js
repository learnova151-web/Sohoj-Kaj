const badge = document.getElementById('badge');
const statusEl = document.getElementById('status');
const textEl = document.getElementById('text');
const waveEl = document.getElementById('wave');

document.getElementById('open-settings').addEventListener('click', () => {
  window.sohoj.openSettings();
});

let lastText = '';

textEl.addEventListener('click', () => {
  if (textEl.classList.contains('result') && lastText) window.sohoj.copyText(lastText);
});

function setBadge(lang) {
  const isEn = lang === 'en';
  badge.textContent = isEn ? 'English' : 'বাংলা';
  badge.classList.toggle('en', isEn);
}

window.sohoj.onHudState(state => {
  setBadge(state.lang);
  waveEl.classList.remove('on');
  textEl.classList.remove('result', 'error');

  switch (state.phase) {
    case 'recording':
      statusEl.textContent = 'Listening — pause to finish';
      textEl.textContent = 'Speak now…';
      waveEl.classList.add('on');
      break;
    case 'transcribing':
      statusEl.textContent = 'Writing it out…';
      textEl.textContent = 'One moment…';
      break;
    case 'done':
      statusEl.textContent = state.pasted ? 'Typed where your cursor was' : 'Copied to clipboard';
      textEl.textContent = state.text;
      textEl.classList.add('result');
      lastText = state.text;
      break;
    case 'error':
      statusEl.textContent = 'Problem';
      textEl.textContent = state.message;
      textEl.classList.add('error');
      if (state.openSettings) {
        setTimeout(() => window.sohoj.openSettings(), 900);
      }
      break;
    default:
      statusEl.textContent = 'Ready';
      textEl.textContent = 'Press the shortcut and speak.';
  }
});
