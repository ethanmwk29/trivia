// Theme: Auto (follow the device) → Light → Dark, remembered per browser.
// Loaded in <head> so the saved theme applies before the page paints.
// Sets data-theme="light"/"dark" on <html>; with no attribute, style.css
// follows the device's prefers-color-scheme setting.
(function () {
  const KEY = 'trivia-theme';
  const MODES = ['auto', 'light', 'dark'];
  const ICONS = { auto: '◐', light: '☀', dark: '☾' };
  const NAMES = { auto: 'Auto', light: 'Light', dark: 'Dark' };

  let mode = 'auto';
  try { const v = localStorage.getItem(KEY); if (MODES.includes(v)) mode = v; } catch { /* ignore */ }

  function apply() {
    const root = document.documentElement;
    if (mode === 'auto') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', mode);
    document.querySelectorAll('.theme-toggle').forEach(b => {
      const nextMode = MODES[(MODES.indexOf(mode) + 1) % MODES.length];
      b.querySelector('.theme-icon').textContent = ICONS[mode];
      const label = b.querySelector('.theme-name');
      if (label) label.textContent = NAMES[mode];
      b.title = `Theme: ${NAMES[mode]} (click for ${NAMES[nextMode]})`;
      b.setAttribute('aria-label', b.title);
    });
  }
  apply();

  document.addEventListener('DOMContentLoaded', () => {
    apply();
    document.querySelectorAll('.theme-toggle').forEach(b => b.addEventListener('click', () => {
      mode = MODES[(MODES.indexOf(mode) + 1) % MODES.length];
      try { localStorage.setItem(KEY, mode); } catch { /* ignore */ }
      apply();
    }));
  });
})();
