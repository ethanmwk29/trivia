# Trivia Flash Cards

A small static web app for practicing trivia as flip cards. Live at **https://ethanmwk29.github.io/trivia/**.

## Features
- 100 questions across 5 categories: History, Geography, Science & Nature, Sports, Entertainment (20 each)
- Shuffle one category, or all categories together. Each deck runs through every question once, then reshuffles
- Click the card (or **Reveal answer**) to flip it, then flip it back to see the question again
- **Next** and **Home** buttons. Keyboard: Space flips, → goes to the next card, Esc goes home
- Timer modes:
  - **No timer**
  - **Auto-reveal**: 5–120 seconds, in 5-second steps. When time runs out, the card flips to the answer. It does not move on by itself, and flipping back to the question does not restart the timer. Revealing the answer early stops the timer.

## Adding questions
Edit `questions.js`. Each category is a list of `{ q, a }` objects. A new category key shows up on the home screen automatically.

## Running locally
Open `index.html` in a browser. No build step or server is needed.
