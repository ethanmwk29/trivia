(function () {
  const BANK = window.TRIVIA;
  const ALL = '__all__';
  const MIN_T = 5, MAX_T = 120, STEP_T = 5;
  const PREFS_KEY = 'trivia-prefs';

  const $ = (id) => document.getElementById(id);
  const els = {
    home: $('home'), play: $('play'), categories: $('categories'),
    timerSettings: $('timer-settings'), timeValue: $('time-value'),
    timeDown: $('time-down'), timeUp: $('time-up'), start: $('start'),
    catLabel: $('cat-label'), progress: $('progress'), card: $('card'),
    question: $('question'), answer: $('answer'), catOfQ: $('cat-of-q'),
    timer: $('timer'), timerBar: $('timer-bar'), timerText: $('timer-text'),
    flipBtn: $('flip-btn'), nextBtn: $('next-btn'), homeBtn: $('home-btn'),
  };
  const front = els.card.querySelector('.front');
  const back = els.card.querySelector('.back');

  // ---- Preferences (remembered per browser; works fine if storage is blocked)
  const prefs = { category: ALL, timerOn: false, seconds: 15 };
  try { Object.assign(prefs, JSON.parse(localStorage.getItem(PREFS_KEY)) || {}); } catch { /* ignore */ }
  if (prefs.category !== ALL && !BANK[prefs.category]) prefs.category = ALL;
  prefs.seconds = Math.min(MAX_T, Math.max(MIN_T, Math.round(prefs.seconds / STEP_T) * STEP_T || 15));
  const savePrefs = () => { try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch { /* ignore */ } };

  // ---- Home screen
  const total = Object.values(BANK).reduce((n, qs) => n + qs.length, 0);
  function choiceButton(label, value, count) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'choice';
    b.setAttribute('role', 'radio');
    b.dataset.category = value;
    b.innerHTML = `${label}<span class="count">${count}</span>`;
    return b;
  }
  els.categories.append(choiceButton('All categories', ALL, total));
  for (const [name, qs] of Object.entries(BANK)) els.categories.append(choiceButton(name, name, qs.length));

  function renderHome() {
    els.categories.querySelectorAll('.choice').forEach(b =>
      b.setAttribute('aria-checked', String(b.dataset.category === prefs.category)));
    document.querySelectorAll('[data-timer]').forEach(b =>
      b.setAttribute('aria-checked', String((b.dataset.timer === 'on') === prefs.timerOn)));
    els.timerSettings.hidden = !prefs.timerOn;
    els.timeValue.textContent = prefs.seconds + 's';
    els.timeDown.disabled = prefs.seconds <= MIN_T;
    els.timeUp.disabled = prefs.seconds >= MAX_T;
  }

  els.categories.addEventListener('click', (e) => {
    const b = e.target.closest('.choice');
    if (!b) return;
    prefs.category = b.dataset.category; savePrefs(); renderHome();
  });
  document.querySelectorAll('[data-timer]').forEach(b => b.addEventListener('click', () => {
    prefs.timerOn = b.dataset.timer === 'on'; savePrefs(); renderHome();
  }));
  els.timeDown.addEventListener('click', () => { prefs.seconds = Math.max(MIN_T, prefs.seconds - STEP_T); savePrefs(); renderHome(); });
  els.timeUp.addEventListener('click', () => { prefs.seconds = Math.min(MAX_T, prefs.seconds + STEP_T); savePrefs(); renderHome(); });

  // ---- Deck
  let deck = [], idx = 0;
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  function buildDeck() {
    const cats = prefs.category === ALL ? Object.keys(BANK) : [prefs.category];
    const cards = [];
    for (const c of cats) for (const item of BANK[c]) cards.push({ ...item, category: c });
    const last = deck[idx];
    deck = shuffle(cards);
    // Avoid showing the same card twice in a row across a reshuffle.
    if (last && deck.length > 1 && deck[0].q === last.q) [deck[0], deck[1]] = [deck[1], deck[0]];
    idx = 0;
  }

  // ---- Card state + timer
  // `timerDone` is per card: once the timer has expired (or the answer was
  // revealed manually), flipping back to the question never restarts it.
  let flipped = false, timerDone = true, deadline = 0, timerId = 0;

  function setFlipped(v) {
    flipped = v;
    els.card.classList.toggle('flipped', v);
    front.setAttribute('aria-hidden', String(v));
    back.setAttribute('aria-hidden', String(!v));
    els.flipBtn.textContent = v ? '← Back to question' : 'Reveal answer';
  }

  function stopTimer() {
    clearInterval(timerId);
    timerId = 0;
  }

  function tick() {
    const left = Math.max(0, deadline - Date.now());
    const frac = left / (prefs.seconds * 1000);
    els.timerBar.style.transform = `scaleX(${frac})`;
    els.timerText.textContent = Math.ceil(left / 1000) + 's';
    els.timer.classList.toggle('low', left <= 3000);
    if (left <= 0) {
      finishTimer("Time's up");
      setFlipped(true);
    }
  }

  function finishTimer(label) {
    stopTimer();
    timerDone = true;
    els.timer.classList.remove('low');
    els.timer.classList.add('done');
    els.timerText.textContent = label;
  }

  function showCard() {
    stopTimer();
    const item = deck[idx];
    setFlipped(false);
    els.question.textContent = item.q;
    els.answer.textContent = item.a;
    els.catOfQ.textContent = item.category;
    els.catLabel.textContent = prefs.category === ALL ? 'All categories' : prefs.category;
    els.progress.textContent = `${idx + 1} / ${deck.length}`;

    els.timer.hidden = !prefs.timerOn;
    els.timer.classList.remove('done', 'low');
    if (prefs.timerOn) {
      timerDone = false;
      deadline = Date.now() + prefs.seconds * 1000;
      tick();
      timerId = setInterval(tick, 100);
    } else {
      timerDone = true;
    }
  }

  // Swap the card content only once it has turned back to the question side,
  // so the next answer never flashes during the flip animation.
  function next() {
    const go = () => {
      idx += 1;
      if (idx >= deck.length) buildDeck();
      showCard();
    };
    if (flipped) {
      stopTimer();
      setFlipped(false);
      els.question.textContent = '';
      setTimeout(go, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 280);
    } else go();
  }

  function toggleFlip() {
    if (!flipped && !timerDone) finishTimer('Timer stopped');
    setFlipped(!flipped);
  }

  function goHome() {
    stopTimer();
    els.play.hidden = true;
    els.home.hidden = false;
    renderHome();
    els.start.focus();
  }

  function start() {
    deck = []; idx = 0;
    buildDeck();
    els.home.hidden = true;
    els.play.hidden = false;
    showCard();
    els.flipBtn.focus();
  }

  els.start.addEventListener('click', start);
  els.flipBtn.addEventListener('click', toggleFlip);
  els.card.addEventListener('click', toggleFlip);
  els.nextBtn.addEventListener('click', next);
  els.homeBtn.addEventListener('click', goHome);

  document.addEventListener('keydown', (e) => {
    if (els.play.hidden || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === ' ' || e.key === 'Enter') {
      if (e.target.tagName === 'BUTTON' && e.target !== els.flipBtn) return; // let focused buttons act normally
      e.preventDefault(); toggleFlip();
    } else if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
    else if (e.key === 'Escape') { goHome(); }
  });

  renderHome();
})();
