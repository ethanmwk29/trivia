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
    flipBtn: $('flip-btn'), nextBtn: $('next-btn'), backBtn: $('back-btn'), homeBtn: $('home-btn'),
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
  // `deck` is the whole session's history: each round is a fresh shuffle of
  // the chosen questions appended to the end, so Back works across reshuffles.
  let roundSize = 0, seenUpTo = -1;
  function addRound() {
    const cats = prefs.category === ALL ? Object.keys(BANK) : [prefs.category];
    const cards = [];
    for (const c of cats) for (const item of BANK[c]) cards.push({ ...item, category: c });
    shuffle(cards);
    // Avoid showing the same card twice in a row across a reshuffle.
    const last = deck[deck.length - 1];
    if (last && cards.length > 1 && cards[0].q === last.q) [cards[0], cards[1]] = [cards[1], cards[0]];
    roundSize = cards.length;
    deck.push(...cards);
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
    els.flipBtn.textContent = v ? 'Show question' : 'Reveal answer';
  }

  function stopTimer() {
    clearInterval(timerId);
    timerId = 0;
  }

  function tick() {
    const left = Math.min(prefs.seconds * 1000, Math.max(0, deadline - Date.now()));
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

  const PAGE_TURN_MS = 650;
  const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  // `delay` holds the timer at full for that long (used while the old page
  // is still turning away, so it doesn't eat into the new question's time).
  function showCard(delay = 0) {
    stopTimer();
    const item = deck[idx];
    // Reset to the question side instantly: the page turn covers the swap.
    els.card.classList.add('instant');
    setFlipped(false);
    void els.card.offsetWidth;
    els.card.classList.remove('instant');
    els.question.textContent = item.q;
    els.answer.textContent = item.a;
    els.catOfQ.textContent = item.category;
    els.catLabel.textContent = prefs.category === ALL ? 'All categories' : prefs.category;
    els.progress.textContent = `${(idx % roundSize) + 1} / ${roundSize}`;
    els.backBtn.disabled = idx === 0;

    els.timer.hidden = !prefs.timerOn;
    els.timer.classList.remove('done', 'low');
    // Only a card you haven't seen yet gets a timer; revisiting one (with
    // Back, or Next after Back) never restarts it.
    const fresh = idx > seenUpTo;
    seenUpTo = Math.max(seenUpTo, idx);
    if (prefs.timerOn && !fresh) {
      els.timerBar.style.transform = 'scaleX(0)';
      finishTimer('Already seen');
    } else if (prefs.timerOn) {
      timerDone = false;
      deadline = Date.now() + delay + prefs.seconds * 1000;
      tick();
      timerId = setInterval(tick, 100);
    } else {
      timerDone = true;
    }
  }

  // Page turns use snapshots of the card: a clone of the side that's
  // showing, laid over the real card and animated, then thrown away.
  function snapshot(cls) {
    const page = els.card.cloneNode(true);
    page.querySelector(flipped ? '.front' : '.back').remove();
    page.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));
    page.removeAttribute('id');
    page.classList.add('page', cls);
    page.setAttribute('aria-hidden', 'true');
    els.card.parentElement.append(page);
    return page;
  }
  function clearPages() {
    document.querySelectorAll('.page').forEach(n => n.remove());
  }
  function whenTurned(page, fn) {
    let done = false;
    const finish = () => { if (!done) { done = true; fn(); } };
    page.addEventListener('animationend', finish);
    setTimeout(finish, PAGE_TURN_MS + 200); // in case animationend never fires
  }

  // Next: the old card swings away around its left edge, uncovering the
  // next question, which is already in place underneath.
  function next() {
    clearPages();
    const animate = !reducedMotion();
    if (animate) {
      const page = snapshot('page-turn');
      whenTurned(page, () => page.remove());
    }
    idx += 1;
    if (idx >= deck.length) addRound();
    showCard(animate ? PAGE_TURN_MS : 0);
  }

  // Back: the reverse. The previous card swings back in from the left and
  // lands on top of the current one.
  function prev() {
    if (idx === 0) return;
    clearPages();
    const animate = !reducedMotion();
    const under = animate ? snapshot('page-under') : null;
    idx -= 1;
    showCard();
    if (animate) {
      const page = snapshot('page-return');
      whenTurned(page, () => { page.remove(); under.remove(); });
    }
  }

  function toggleFlip() {
    if (!flipped && !timerDone) finishTimer('Timer stopped');
    setFlipped(!flipped);
  }

  function goHome() {
    stopTimer();
    clearPages();
    els.play.hidden = true;
    els.home.hidden = false;
    renderHome();
    els.start.focus();
  }

  function start() {
    deck = []; idx = 0; seenUpTo = -1;
    addRound();
    els.home.hidden = true;
    els.play.hidden = false;
    showCard();
    els.flipBtn.focus();
  }

  els.start.addEventListener('click', start);
  els.flipBtn.addEventListener('click', toggleFlip);
  els.card.addEventListener('click', toggleFlip);
  els.nextBtn.addEventListener('click', next);
  els.backBtn.addEventListener('click', prev);
  els.homeBtn.addEventListener('click', goHome);

  document.addEventListener('keydown', (e) => {
    if (els.play.hidden || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === ' ' || e.key === 'Enter') {
      if (e.target.tagName === 'BUTTON' && e.target !== els.flipBtn) return; // let focused buttons act normally
      e.preventDefault(); toggleFlip();
    } else if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
    else if (e.key === 'Escape') { goHome(); }
  });

  renderHome();
})();
