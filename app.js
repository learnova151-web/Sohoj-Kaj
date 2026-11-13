/* ---------- App window mockup: build the grid sentence ---------- */
(function buildMockSentence() {
  const el = document.getElementById('mock-sentence');
  if (!el) return;
  const words = [
    { t: 'আজকে', en: false }, { t: 'মিটিংটা', en: false }, { t: 'afternoon', en: true },
    { t: 'চারটায়', en: false }, { t: 'সরিয়ে', en: false }, { t: 'দিও', en: false }
  ];
  words.forEach(w => {
    const s = document.createElement('span');
    s.className = 'g-word' + (w.en ? ' en' : '');
    s.textContent = w.t;
    el.appendChild(s);
  });
})();

/* ---------- Reveal on scroll ---------- */
(function revealOnScroll() {
  const items = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) {
    items.forEach(i => i.classList.add('visible'));
    return;
  }
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
    });
  }, { threshold: 0.15 });
  items.forEach(i => io.observe(i));
})();

/* ---------- Accuracy chart animation ---------- */
(function animateChart() {
  const chart = document.getElementById('chart');
  if (!chart) return;
  const rows = chart.querySelectorAll('.chart-row');
  const max = 50;
  const run = () => rows.forEach((row, i) => {
    const v = parseFloat(row.dataset.value);
    const bar = row.querySelector('.chart-bar');
    setTimeout(() => { bar.style.width = (v / max * 100) + '%'; }, 150 * i);
  });
  if (!('IntersectionObserver' in window)) { run(); return; }
  const io = new IntersectionObserver(entries => {
    if (entries.some(e => e.isIntersecting)) { run(); io.disconnect(); }
  }, { threshold: 0.3 });
  io.observe(chart);
})();

/* ---------- FAQ: one open at a time ---------- */
(function faqSingleOpen() {
  const faqs = document.querySelectorAll('.faq');
  faqs.forEach(d => d.addEventListener('toggle', () => {
    if (d.open) faqs.forEach(o => { if (o !== d) o.open = false; });
  }));
})();

/* ---------- Platform-aware hero buttons ---------- */
(function platformButtons() {
  const isWin = /Windows/i.test(navigator.userAgent);
  const mac = document.getElementById('hero-mac');
  const win = document.getElementById('hero-win');
  if (!mac || !win) return;
  if (isWin) {
    win.classList.add('btn-solid'); win.classList.remove('btn-outline');
    mac.classList.remove('btn-solid'); mac.classList.add('btn-outline');
  }
})();

/* ---------- Hold-to-talk demo (Web Speech API) ---------- */
(function holdDemo() {
  const btn = document.getElementById('hold-btn');
  const output = document.getElementById('demo-output');
  const placeholder = document.getElementById('demo-placeholder');
  const note = document.getElementById('demo-note');
  const wave = document.getElementById('wave');
  const langBtns = document.querySelectorAll('.lang-btn');
  if (!btn || !output) return;

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let lang = 'bn-BD';
  let recog = null;
  let holding = false;
  let finalText = '';
  let gotResult = false;

  function setNote(msg) { note.textContent = msg || ''; }

  function buildRecognizer() {
    if (!SR) return null;
    const r = new SR();
    r.lang = lang;
    r.continuous = true;
    r.interimResults = true;
    r.maxAlternatives = 1;
    r.onresult = e => {
      gotResult = true;
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) finalText += res[0].transcript + ' ';
        else interim += res[0].transcript;
      }
      render(interim);
    };
    r.onerror = e => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        setNote('Microphone permission was blocked. Allow the mic in your browser and try again.');
      } else if (e.error === 'no-speech') {
        setNote('Nothing was heard. Hold the button, then speak.');
      } else if (e.error === 'network') {
        setNote('Browser speech recognition needs an internet connection.');
      }
    };
    return r;
  }

  function render(interim) {
    placeholder.style.display = (finalText.trim() || interim) ? 'none' : '';
    let html = '';
    if (finalText.trim()) html += '<span class="demo-final"></span> ';
    if (interim) html += '<span class="demo-interim"></span>';
    output.innerHTML = html || '<p class="demo-placeholder"></p>';
    if (finalText.trim()) output.querySelector('.demo-final').textContent = finalText.trim();
    if (interim) output.querySelector('.demo-interim').textContent = interim;
    if (!finalText.trim() && !interim) output.firstChild.textContent = 'Hold the button and say something\u2026';
  }

  function start() {
    if (holding) return;
    holding = true;
    gotResult = false;
    btn.classList.add('holding');
    btn.setAttribute('aria-pressed', 'true');
    btn.querySelector('.hold-label').textContent = 'Listening\u2026';
    wave.classList.add('on');
    setNote('');

    if (SR) {
      finalText = '';
      render('');
      recog = buildRecognizer();
      try { recog.start(); } catch (_) { /* already started */ }
    } else {
      setNote('This browser has no built-in speech recognition. The real Sohoj Kaj app does this offline \u2014 try Chrome or Edge to hear yourself typed here.');
    }
  }

  function stop() {
    if (!holding) return;
    holding = false;
    btn.classList.remove('holding');
    btn.setAttribute('aria-pressed', 'false');
    btn.querySelector('.hold-label').textContent = 'Hold to talk';
    wave.classList.remove('on');
    if (recog) {
      try { recog.stop(); } catch (_) {}
      recog = null;
      if (!gotResult && !note.textContent) setNote('Let go to finish \u2014 your words stay on screen.');
    }
  }

  btn.addEventListener('pointerdown', e => { e.preventDefault(); start(); });
  btn.addEventListener('pointerup', stop);
  btn.addEventListener('pointerleave', stop);
  btn.addEventListener('pointercancel', stop);
  btn.addEventListener('contextmenu', e => e.preventDefault());

  window.addEventListener('keydown', e => {
    if (e.code !== 'Space' || e.repeat) return;
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    const r = btn.getBoundingClientRect();
    const inView = r.top < window.innerHeight && r.bottom > 0;
    if (!inView) return;
    e.preventDefault();
    start();
  });
  window.addEventListener('keyup', e => { if (e.code === 'Space') stop(); });
  window.addEventListener('blur', stop);

  langBtns.forEach(b => b.addEventListener('click', () => {
    langBtns.forEach(x => { x.classList.remove('active'); x.setAttribute('aria-selected', 'false'); });
    b.classList.add('active');
    b.setAttribute('aria-selected', 'true');
    lang = b.dataset.lang;
    output.classList.toggle('lang-en', lang === 'en-US');
    finalText = '';
    render('');
    setNote('');
    if (SR && holding) { try { recog.stop(); } catch (_) {} recog = null; }
  }));
})();
