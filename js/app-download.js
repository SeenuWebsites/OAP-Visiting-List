/* ============================================================
   App Download Module — APK Download & Version Display
   Device detection, QR code for desktop
   ============================================================ */

// Load QR code library on demand
function loadQRScript(cb) {
    if (window.QRCode) { cb(); return; }
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js';
    s.onload = cb;
    document.head.appendChild(s);
}

// ---- Load Latest Version Info ----
async function loadLatestAppVersion() {
    try {
        const { data, error } = await supabase
            .from('app_versions')
            .select('*')
            .eq('is_latest', true)
            .eq('platform', 'android')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        const displayEl = document.getElementById('appVersionDisplay');
        if (!data || error) {
            if (displayEl) displayEl.textContent = 'No version uploaded yet';
            return null;
        }
        if (displayEl) {
            displayEl.innerHTML = `<b>${escapeHtml(data.version_number)}</b> • Updated: ${formatDate(data.released_at)} • ${formatFileSize(data.file_size)}`;
        }
        return data;
    } catch (e) {
        return null;
    }
}

// ---- Handle Download Button Click ----
async function handleAppDownload() {
    const version = await loadLatestAppVersion();
    if (!version || !version.file_url) {
        showToast('No APK available yet. Check back later.', 'warning');
        return;
    }

    const ua = navigator.userAgent.toLowerCase();
    const isAndroid = ua.includes('android');
    const isIOS = /ipad|iphone|ipod/.test(ua);

    if (isAndroid) {
        // Direct APK download
        const link = document.createElement('a');
        link.href = version.file_url;
        link.download = `OAP-Visit-${version.version_number}.apk`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('Downloading APK... Enable "Install from unknown sources" if prompted.', 'info', 6000);
    } else if (isIOS) {
        // iOS: Prompt PWA install
        showToast('iOS: Tap Share → "Add to Home Screen" to install the web app.', 'info', 8000);
        document.getElementById('installBanner')?.classList.remove('hidden');
    } else {
        // Desktop: Show QR + link
        showQRModal(version.file_url, version.version_number);
    }
}

// ---- QR Code Modal for Desktop ----
function showQRModal(url, version) {
    // Create modal dynamically
    const existing = document.getElementById('qrDownloadModal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'qrDownloadModal';
    modal.className = 'modal-overlay active';
    modal.innerHTML = `
        <div class="modal" style="max-width:380px">
            <div class="modal-header">
                <h2 class="modal-title">📱 Download on Android</h2>
                <button class="modal-close" onclick="document.getElementById('qrDownloadModal').remove()">✕</button>
            </div>
            <div class="modal-body">
                <div class="qr-container">
                    <div id="qrcode"></div>
                    <p class="text-sm text-center text-secondary">Scan this QR code with your Android phone to download the APK.</p>
                    <div style="background:var(--bg-hover);border-radius:var(--radius-sm);padding:0.75rem;text-align:center;width:100%">
                        <p class="text-xs text-secondary">Version: <b>${escapeHtml(version)}</b></p>
                        <p class="text-xs text-secondary" style="word-break:break-all;margin-top:0.25rem">${escapeHtml(url)}</p>
                    </div>
                    <a href="${url}" class="btn btn-primary btn-lg w-full" download>⬇️ Download APK</a>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

    // Generate QR code
    loadQRScript(() => {
        new QRCode(document.getElementById('qrcode'), {
            text: url,
            width: 200,
            height: 200,
            colorDark: document.documentElement.getAttribute('data-theme') === 'dark' ? '#f1f5f9' : '#0f172a',
            colorLight: 'transparent',
            correctLevel: QRCode.CorrectLevel.M
        });
    });
}

// ---- Initialize on Page Load ----
document.addEventListener('DOMContentLoaded', () => {
    const versionEl = document.getElementById('appVersionDisplay');
    if (versionEl) loadLatestAppVersion();
});
