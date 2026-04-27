/* VIM Dance Studio — Theme Switcher (footer edition)
   ---------------------------------------------------------------------
   Themes:
     ethereal   — purple / lavender (default)
     gold       — warm dark / amber / gold
     noir       — VIM Red / Electric Blue (Kinetic Noir)
   ---------------------------------------------------------------------
   What this script does:
     1. Reads ?theme=… URL param OR localStorage to pick initial theme.
        URL param wins on this pageview AND becomes the new persisted choice.
     2. Applies the theme to <html> BEFORE first paint (no flash of wrong
        theme as the page renders).
     3. After DOMContentLoaded, injects a small "Theme:" link group into
        every <footer> on the page. Clicking a link switches themes.
     4. Tells the embedded VedaBots chat widget to recolor itself on every
        theme change, so the chat bubble matches the selected theme. The
        widget loads async; we retry briefly if it isn't ready yet on
        initial page load.
   ---------------------------------------------------------------------
   Why footer placement (and not a floating pill in the corner):
     • The floating pill obstructed the chat widget on mobile and looked
       like dev tooling on a marketing site.
     • Footer placement is discoverable but not prominent — visitors who
       care can find it; everyone else sees a clean page.
     • URL-param support (?theme=noir) makes it easy to share a specific
       look with a designer or client without touching the UI at all.
*/

(function () {
  'use strict';

  // ── Config ────────────────────────────────────────────────────────────
  const THEMES = ['ethereal', 'gold', 'noir'];
  const STORAGE_KEY = 'vim-theme';
  const URL_PARAM = 'theme';

  // Each theme maps to its --primary token value. The widget setColor() API
  // reads any CSS color (hex, rgb, named), but hex is the simplest source
  // of truth and matches what styles.css declares.
  //
  // Keep these in sync with styles.css. If you add a 4th theme, add it
  // both to styles.css's theme blocks AND here.
  const THEME_COLORS = {
    ethereal: '#e4b5ff',  // matches :root --primary
    gold:     '#ffd166',  // matches [data-theme="gold"] --primary
    noir:     '#e31e24',  // matches [data-theme="noir"] --primary (VIM Red)
  };

  // Display labels shown in the footer links. Decoration kept minimal —
  // emojis match the visual identity of each theme. Easy to remove later
  // if you want even less visual weight.
  const THEME_LABELS = {
    ethereal: '💜 Ethereal',
    gold:     '✨ Velvet Gold',
    noir:     '🔴 Kinetic Noir',
  };

  // ── Initial theme resolution ─────────────────────────────────────────
  // Priority: URL param > localStorage > default ('ethereal').
  // URL param ALSO writes to localStorage so the choice persists across
  // pageviews. This is how shareable theme URLs work — visit once with
  // ?theme=noir, the choice sticks until you change it.
  function resolveInitialTheme() {
    let candidate = null;

    try {
      const params = new URLSearchParams(window.location.search);
      const fromUrl = params.get(URL_PARAM);
      if (fromUrl && THEMES.indexOf(fromUrl) !== -1) {
        candidate = fromUrl;
      }
    } catch (_) { /* URLSearchParams not supported, ignore */ }

    if (!candidate) {
      try {
        const fromStorage = localStorage.getItem(STORAGE_KEY);
        if (fromStorage && THEMES.indexOf(fromStorage) !== -1) {
          candidate = fromStorage;
        }
      } catch (_) { /* localStorage blocked (private mode), ignore */ }
    }

    return candidate || 'ethereal';
  }

  const initialTheme = resolveInitialTheme();

  // Apply BEFORE first paint — runs immediately, not waiting for DOM.
  // This is what prevents the flash-of-wrong-theme as the page renders.
  if (initialTheme !== 'ethereal') {
    document.documentElement.setAttribute('data-theme', initialTheme);
  }

  // ── Widget color sync ─────────────────────────────────────────────────
  // The VedaBots widget loads async from a different origin. On initial
  // pageload the widget script may not have executed yet — we retry briefly.
  // After it's loaded once, every subsequent setColor() is synchronous
  // (the API stays on the window for the rest of the session).
  function tellWidgetToRecolor(theme, attempt) {
    attempt = attempt || 0;
    const color = THEME_COLORS[theme];
    if (!color) return;

    if (window.VedaBotsWidget && typeof window.VedaBotsWidget.setColor === 'function') {
      window.VedaBotsWidget.setColor(color);
      return;
    }

    // Retry up to ~2.5 seconds (10 × 250ms) for the widget to come online.
    // After that, give up silently — the widget may have failed to load
    // due to network issues, and we don't want to leak warnings to the
    // console of every visitor who has an ad blocker.
    if (attempt < 10) {
      setTimeout(function () { tellWidgetToRecolor(theme, attempt + 1); }, 250);
    }
  }

  // The widget also fires a 'vedabots:ready' CustomEvent when it finishes
  // booting. Listening for it gives us a deterministic "as soon as possible"
  // sync, complementing the polling fallback above (in case the event was
  // dispatched before our listener was registered, the polling catches up).
  document.addEventListener('vedabots:ready', function () {
    const current = document.documentElement.getAttribute('data-theme') || 'ethereal';
    tellWidgetToRecolor(current);
  });

  // ── Apply / persist a theme change ──────────────────────────────────
  function applyTheme(theme) {
    if (THEMES.indexOf(theme) === -1) return;

    if (theme === 'ethereal') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }

    try { localStorage.setItem(STORAGE_KEY, theme); } catch (_) { /* private mode */ }

    // Update active state on every footer-link group on the page (some
    // pages may render multiple footers; cheap to iterate).
    document.querySelectorAll('.vim-theme-link').forEach(function (a) {
      const isActive = a.dataset.theme === theme;
      a.classList.toggle('is-active', isActive);
      a.setAttribute('aria-current', isActive ? 'true' : 'false');
    });

    tellWidgetToRecolor(theme);
  }

  // ── Inject footer links ─────────────────────────────────────────────
  // Builds a small inline group: "Theme: Ethereal · Velvet Gold · Kinetic Noir"
  // and prepends it to every <footer> on the page. Some vim pages have
  // a footer with internal structure (.footer-bottom div); others have
  // the bare <footer> only. Prepending to the <footer> element directly
  // works for both — the new node lands above existing content.
  function buildLinkGroup() {
    const wrap = document.createElement('div');
    wrap.className = 'vim-theme-links';

    const label = document.createElement('span');
    label.className = 'vim-theme-label';
    label.textContent = 'Theme:';
    wrap.appendChild(label);

    THEMES.forEach(function (theme, idx) {
      if (idx > 0) {
        const sep = document.createElement('span');
        sep.className = 'vim-theme-sep';
        sep.textContent = '·';
        sep.setAttribute('aria-hidden', 'true');
        wrap.appendChild(sep);
      }

      const a = document.createElement('a');
      a.href = '#';
      a.className = 'vim-theme-link';
      a.dataset.theme = theme;
      a.textContent = THEME_LABELS[theme];
      a.addEventListener('click', function (e) {
        e.preventDefault();
        applyTheme(theme);
      });
      wrap.appendChild(a);
    });

    return wrap;
  }

  function injectStyles() {
    if (document.getElementById('vim-theme-link-styles')) return;
    const s = document.createElement('style');
    s.id = 'vim-theme-link-styles';
    s.textContent = [
      // Footer link group — quiet by default. Fits the existing footer
      // typography (small, uppercase, low-opacity text). Active link
      // colors with the current theme's --primary so it visually anchors
      // to the same palette as the page.
      '.vim-theme-links{',
      '  display:inline-flex;align-items:center;gap:8px;flex-wrap:wrap;',
      '  font-family:var(--sans);font-size:10px;font-weight:600;',
      '  letter-spacing:0.14em;text-transform:uppercase;',
      '  color:rgba(233,223,236,0.35);',
      '  margin-right:auto;', // pushes existing footer text to the right
      '}',
      '.vim-theme-label{opacity:0.7;}',
      '.vim-theme-sep{opacity:0.35;}',
      '.vim-theme-link{',
      '  color:rgba(233,223,236,0.55);text-decoration:none;cursor:pointer;',
      '  transition:color 0.2s;',
      '}',
      '.vim-theme-link:hover{color:rgba(233,223,236,0.95);}',
      '.vim-theme-link.is-active{',
      '  color:var(--primary);font-weight:800;',
      '}',
      // On narrow screens, drop the link group below existing footer
      // content so it doesn't squeeze the layout.
      '@media (max-width:560px){',
      '  footer .vim-theme-links{width:100%;margin:0 0 12px;}',
      '}',
    ].join('');
    document.head.appendChild(s);
  }

  // ── Boot ─────────────────────────────────────────────────────────────
  function init() {
    injectStyles();

    const footers = document.querySelectorAll('footer');
    footers.forEach(function (footer) {
      // Find the existing "footer-bottom" row if present (index.html), so
      // the link group lives next to the copyright text. Otherwise insert
      // at the start of the <footer> element directly (staff/gallery).
      const bottomRow = footer.querySelector('.footer-bottom');
      const target = bottomRow || footer;
      target.insertBefore(buildLinkGroup(), target.firstChild);
    });

    // Apply initial state — sets active link, updates widget color.
    applyTheme(initialTheme);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
