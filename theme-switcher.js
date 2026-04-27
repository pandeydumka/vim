/* VIM Dance Studio — Dynamic Theme Switcher
   Applies saved theme before first paint (no flash of wrong theme).
   Then injects a floating pill switcher into the page after DOM loads.
   Theme choice persists across all pages via localStorage. */

(function () {
  var saved = localStorage.getItem('vim-theme') || 'ethereal';

  // Apply immediately to <html> — runs before CSS paints
  if (saved === 'gold') {
    document.documentElement.setAttribute('data-theme', 'gold');
  }

  function applyTheme(theme) {
    if (theme === 'gold') {
      document.documentElement.setAttribute('data-theme', 'gold');
    } else {
      document.documentElement.removeAttribute('data-theme');
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
      '<button data-theme="gold">✨ Velvet Gold</button>';
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
