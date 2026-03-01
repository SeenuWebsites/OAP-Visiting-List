/* ============================================================
   PWA Manager — Service Worker Registration & Install Prompt
   ============================================================ */

let deferredInstallPrompt = null;

// ---- Register Service Worker ----
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => {
                console.log('[PWA] Service Worker registered:', reg.scope);
                reg.addEventListener('updatefound', () => {
                    const newWorker = reg.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            showToast('New version available! Refresh to update.', 'info', 8000);
                        }
                    });
                });
            })
            .catch(err => console.warn('[PWA] SW registration failed:', err));
    });
}

// ---- Capture Install Prompt ----
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    const banner = document.getElementById('installBanner');
    const dismissed = localStorage.getItem('pwa_install_dismissed');
    if (banner && !dismissed) {
        banner.classList.remove('hidden');
    }
    document.querySelectorAll('.pwa-install-btn').forEach(btn => btn.classList.remove('hidden'));
});

// ---- Handle Install Button Click ----
document.addEventListener('DOMContentLoaded', () => {
    const installBtn = document.getElementById('installBtn');
    if (installBtn) installBtn.addEventListener('click', () => triggerInstall());
    document.querySelectorAll('.pwa-install-btn').forEach(btn => btn.addEventListener('click', triggerInstall));
    // Detect if already installed (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
        document.getElementById('installBanner')?.classList.add('hidden');
    }
});

async function triggerInstall() {
    if (!deferredInstallPrompt) {
        showToast('To install: open browser menu → "Add to Home Screen"', 'info', 5000);
        return;
    }
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    if (outcome === 'accepted') {
        showToast('App installed! Open from your home screen. 🎉', 'success');
        document.getElementById('installBanner')?.classList.add('hidden');
    }
    deferredInstallPrompt = null;
}

function dismissInstallBanner() {
    localStorage.setItem('pwa_install_dismissed', '1');
    document.getElementById('installBanner')?.classList.add('hidden');
}

window.addEventListener('appinstalled', () => {
    showToast('App successfully installed! 🎉', 'success');
    deferredInstallPrompt = null;
    document.getElementById('installBanner')?.classList.add('hidden');
});
