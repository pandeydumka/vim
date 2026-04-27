/* VIM Dance Studio — Dynamic Theme Switcher
   Applies saved theme before first paint (no flash of wrong theme).
   Then injects a floating pill switcher into the page after DOM loads.
   Theme choice persists across all pages via localStorage.

   Themes:
     ethereal   — purple / lavender (default)
     gold       — warm dark / amber / gold
     noir       — VIM Red / Electric Blue (Kinetic Noir)
*/

(function () {
  var THEMES = ['ethereal', 'gold', 'noir'];
  var saved = localStorage.getItem('vim-theme') || 'ethereal';
  if (THEMES.indexOf(saved) === -1) saved = 'ethereal';

  // Apply immediately to <html> — runs before CSS paints (prevents flash)
  if (saved !== 'ethereal') {
    document.documentElement.setAttribute('data-theme', saved);
  }

  function applyTheme(theme) {
    if (theme === 'ethereal') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
    localStorage.setItem('vim-theme', theme);
    document.querySelectorAll('#vim-theme-switcher button').forEach(function (b) {
      b.classList.toggle('ts-active', b.dataset.theme === theme);
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var sw = document.createElement('div');
    sw.id = 'vim-theme-switcher';
    sw.innerHTML =
      '<span class="ts-label">Theme</span>' +
      '<button data-theme="ethereal">💜 Ethereal</button>' +
      '<button data-theme="gold">✨ Velvet Gold</button>' +
      '<button data-theme="noir">🔴 Kinetic Noir</button>';
    document.body.appendChild(sw);

    sw.querySelectorAll('button').forEach(function (b) {
      b.addEventListener('click', function () {
        applyTheme(this.dataset.theme);
      });
    });

    // Set initial active button state
    applyTheme(saved);
  });
})();
