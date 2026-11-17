(function () {
  const SECTIONS = window.TRIVIA_SECTIONS;
  const ALL = '__all__';
  const LEVELS = ['easy', 'medium', 'hard'];
  const LEVEL_NAMES = { easy: 'Easy', medium: 'Medium', hard: 'Hard', [ALL]: 'Random' };
  const MIN_T = 5, MAX_T = 120, STEP_T = 5;
  const PREFS_KEY = 'trivia-prefs-v2';

  // "All" is a virtual section holding every category of every real section.
  const ALL_SECTION = {
    id: ALL,
    name: 'All sections',
    label: 'All',
    categories: Object.assign({}, ...SECTIONS.map(sec => sec.categories)),
  };
  const SECTION_CHOICES = [ALL_SECTION, ...SECTIONS];

  const $ = (id) => document.getElementById(id);
  const els = {
    home: $('home'), play: $('play'), sections: $('sections'),
    categoryPanel: $('category-panel'), categories: $('categories'), levels: $('levels'),
    selectAll: $('select-all'), clearAll: $('clear-all'), startHint: $('start-hint'),
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
  // `cats` holds the selected categories per section; a section with no
  // saved entry starts with all of its categories selected.
  const prefs = { section: SECTIONS[0].id, cats: {}, level: ALL, timerOn: false, seconds: 15 };
  try { Object.assign(prefs, JSON.parse(localStorage.getItem(PREFS_KEY)) || {}); } catch { /* ignore */ }
  if (!SECTION_CHOICES.some(sec => sec.id === prefs.section)) prefs.section = SECTIONS[0].id;
  if (prefs.level !== ALL && !LEVELS.includes(prefs.level)) prefs.level = ALL;
  prefs.seconds = Math.min(MAX_T, Math.max(MIN_T, Math.round(prefs.seconds / STEP_T) * STEP_T || 15));
  if (!prefs.cats || typeof prefs.cats !== 'object') prefs.cats = {};
  const savePrefs = () => { try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch { /* ignore */ } };

  const section = () => SECTION_CHOICES.find(sec => sec.id === prefs.section);
  const allCats = (sec) => Object.keys(sec.categories);
  // The selected categories for the current section, in display order.
  function selectedCats() {
    const sec = section();
    const names = allCats(sec);
    if (names.length < 2 || sec === ALL_SECTION) return names; // nothing to choose between
    const saved = prefs.cats[sec.id];
    return Array.isArray(saved) ? names.filter(n => saved.includes(n)) : names;
  }
  function setSelected(list) { prefs.cats[prefs.section] = list; }

  // The questions matching a section / categories / difficulty choice.
  function pool(sec, cats, level) {
    const cards = [];
    for (const [name, byLevel] of Object.entries(sec.categories)) {
      if (!cats.includes(name)) continue;
      for (const lv of LEVELS) {
        if (level !== ALL && level !== lv) continue;
        for (const [q, a] of byLevel[lv] || []) cards.push({ q, a, category: name, level: lv });
      }
    }
    return cards;
  }

  // ---- Home screen
  function choiceButton(label, attrs) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'choice';
    b.setAttribute('role', 'radio');
    Object.assign(b.dataset, attrs);
    b.innerHTML = `<span class="label"></span><span class="count"></span>`;
    b.querySelector('.label').textContent = label;
    return b;
  }
  for (const sec of SECTION_CHOICES) els.sections.append(choiceButton(sec.label || sec.name, { section: sec.id }));
  for (const lv of [...LEVELS, ALL]) els.levels.append(choiceButton(LEVEL_NAMES[lv], { level: lv }));

  function renderHome() {
    const sec = section();
    const cats = selectedCats();
    els.sections.querySelectorAll('.choice').forEach(b => {
      const s = SECTION_CHOICES.find(x => x.id === b.dataset.section);
      b.setAttribute('aria-checked', String(s === sec));
      b.querySelector('.count').textContent = pool(s, allCats(s), prefs.level).length;
    });

    // Category toggles are rebuilt per section; a one-category section skips them.
    const names = allCats(sec);
    els.categoryPanel.hidden = names.length < 2 || sec === ALL_SECTION;
    els.categories.replaceChildren(...names.map(n => {
      const b = choiceButton(n, { category: n });
      b.setAttribute('role', 'checkbox');
      b.setAttribute('aria-checked', String(cats.includes(n)));
      b.querySelector('.count').textContent = pool(sec, [n], prefs.level).length;
      return b;
    }));
    els.selectAll.disabled = cats.length === names.length;
    els.clearAll.disabled = cats.length === 0;

    els.levels.querySelectorAll('.choice').forEach(b => {
      b.setAttribute('aria-checked', String(b.dataset.level === prefs.level));
      b.querySelector('.count').textContent = pool(sec, cats, b.dataset.level).length;
    });

    const total = pool(sec, cats, prefs.level).length;
    els.start.disabled = total === 0;
    els.start.textContent = total ? `Start · ${total} questions` : 'Start';
    els.startHint.hidden = cats.length > 0;

    document.querySelectorAll('[data-timer]').forEach(b =>
      b.setAttribute('aria-checked', String((b.dataset.timer === 'on') === prefs.timerOn)));
    els.timerSettings.hidden = !prefs.timerOn;
    els.timeValue.textContent = prefs.seconds + 's';
    els.timeDown.disabled = prefs.seconds <= MIN_T;
    els.timeUp.disabled = prefs.seconds >= MAX_T;
  }

  const onChoice = (container, fn) => container.addEventListener('click', (e) => {
    const b = e.target.closest('.choice');
    if (b) { fn(b.dataset); savePrefs(); renderHome(); }
  });
  onChoice(els.sections, d => { prefs.section = d.section; });
  onChoice(els.categories, d => {
    const cur = selectedCats();
    setSelected(cur.includes(d.category) ? cur.filter(n => n !== d.category) : [...cur, d.category]);
  });
  els.selectAll.addEventListener('click', () => { setSelected(allCats(section())); savePrefs(); renderHome(); });
  els.clearAll.addEventListener('click', () => { setSelected([]); savePrefs(); renderHome(); });
  onChoice(els.levels, d => { prefs.level = d.level; });
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
    const cards = shuffle(pool(section(), selectedCats(), prefs.level));
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
    const sec = section(), cats = selectedCats();
    const many = allCats(sec).length > 1;
    els.catOfQ.textContent = (many ? item.category + ' · ' : '') + LEVEL_NAMES[item.level];
    const scope = !many || cats.length === allCats(sec).length ? sec.name
      : cats.length <= 2 ? cats.join(' + ')
      : `${cats.length} categories`;
    els.catLabel.textContent = `${scope} · ${LEVEL_NAMES[prefs.level]}`;
    els.catLabel.title = many && sec !== ALL_SECTION ? cats.join(', ') : '';
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
    if (!pool(section(), selectedCats(), prefs.level).length) return;
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
