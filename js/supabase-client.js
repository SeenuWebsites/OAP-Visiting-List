/* ============================================================
   Supabase Client Initialization
   Uses config.js values (public anon key only)
   ============================================================ */

// Validate config values before initializing
if (typeof SUPABASE_URL === 'undefined' || SUPABASE_URL.includes('YOUR_PROJECT_ID')) {
    console.warn('[OAP App] Supabase not configured yet. Please update config.js with your Supabase URL and anon key.');
}

const supabase = supabase_js.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false
    }
});

/* ---- Global Toast Utility (shared across pages) ---- */
function showToast(msg, type = 'info', duration = 3500) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
        <span class="toast-msg">${escapeHtml(String(msg))}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
    `;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(30px)';
        setTimeout(() => toast.remove(), 350);
    }, duration);
}

/* ---- Global Loading Overlay ---- */
function showLoading(msg = 'Loading...') {
    const el = document.getElementById('loadingOverlay');
    if (!el) return;
    const msgEl = document.getElementById('loadingMsg');
    if (msgEl) msgEl.textContent = msg;
    el.classList.remove('hidden');
}

function hideLoading() {
    const el = document.getElementById('loadingOverlay');
    if (el) el.classList.add('hidden');
}

/* ---- HTML Escape (security) ---- */
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/* ---- Input Sanitizer ---- */
function sanitize(str) {
    if (!str) return '';
    return String(str).trim().replace(/[<>]/g, '');
}

/* ---- Format Date ---- */
function formatDate(iso) {
    if (!iso) return '-';
    return new Date(iso).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric'
    });
}

function formatDateTime(iso) {
    if (!iso) return '-';
    return new Date(iso).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

/* ---- Format Currency ---- */
function formatCurrency(val) {
    const n = parseFloat(val) || 0;
    return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* ---- Format File Size ---- */
function formatFileSize(bytes) {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/* ---- Log user actions to audit_logs ---- */
async function logUserAction(action, details = {}) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        await supabase.from('audit_logs').insert({
            user_id: user.id,
            user_email: user.email,
            action: action,
            details: details
        });
    } catch (e) {
        // Silently fail — never block app for logging errors
        console.warn('[OAP Log] Failed to log action:', e.message);
    }
}
