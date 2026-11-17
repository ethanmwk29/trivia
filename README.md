# Trivia Flash Cards

A small static web app for practicing trivia as flip cards. Live at **https://ethanmwk29.github.io/trivia/**.

## Features
- 720 questions in two sections, each question tagged easy, medium, or hard:
  - **General Trivia** (600): History, Geography, Science & Nature, Sports, Entertainment — 120 each (40 per difficulty)
  - **Harry Potter** (120): 40 per difficulty
- Pick a section — **All** (every question from every section; the category picker is hidden), **General Trivia**, or **Harry Potter** — then (in General Trivia) toggle any combination of categories, with **Select all** and **Clear** shortcuts. Questions are shuffled across every selected category. Then pick a difficulty: Easy, Medium, Hard, or Random (all three mixed). Each deck runs through every matching question once, then reshuffles
- Click the card (or **Reveal answer**) to flip it, then flip it back to see the question again
- **Next** and **Back** turn the page (an animated page turn), and Back steps through every card you've seen this session. **Home** is in the top bar. Keyboard: Space flips, ← / → go back and next, Esc goes home
- Timer modes:
  - **No timer**
  - **Auto-reveal**: 5–120 seconds, in 5-second steps. When time runs out, the card flips to the answer. It does not move on by itself, and flipping back to the question does not restart the timer. Revealing the answer early stops the timer, and a card you return to with Back never restarts its timer.

- Light and dark mode: the theme button (home screen and the card screen's top bar) cycles Auto (follows your device) → Light → Dark, and is remembered per browser

## Adding questions
Questions live in `data/` — one file per section (`general.js`, `harry-potter.js`). Each category has `easy`, `medium`, and `hard` lists of `[question, answer]` pairs. A new category key shows up on the home screen automatically; a new section is a new file in `data/` plus a `<script>` tag in `index.html`.

## Running locally
Open `index.html` in a browser. No build step or server is needed.
