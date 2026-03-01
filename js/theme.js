/* ============================================================
   Theme Manager — Dark / Light Toggle
   Persists preference in localStorage
   ============================================================ */

(function () {
    // Apply stored theme before page paint (prevents flash)
    const stored = localStorage.getItem('oap_theme') || 'light';
    document.documentElement.setAttribute('data-theme', stored);
    document.documentElement.style.colorScheme = stored;
})();

document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('themeToggle');
    const themeLabel = document.getElementById('themeLabel');
    if (!toggle) return;

    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        document.documentElement.style.colorScheme = theme;
        localStorage.setItem('oap_theme', theme);
        toggle.classList.toggle('dark', theme === 'dark');
        if (themeLabel) themeLabel.textContent = theme === 'dark' ? '🌙' : '☀️';
        // Update meta theme-color
        const metaTheme = document.querySelector('meta[name=theme-color]');
        if (metaTheme) metaTheme.content = theme === 'dark' ? '#1e293b' : '#4f46e5';
    }

    // Init
    const current = localStorage.getItem('oap_theme') || 'light';
    applyTheme(current);

    toggle.addEventListener('click', () => {
        const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        applyTheme(next);
    });
});
