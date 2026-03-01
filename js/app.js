/* ============================================================
   App Entry Point — Dashboard Initialization
   Auth guard, page load, event wiring
   ============================================================ */

document.addEventListener('DOMContentLoaded', async () => {
    // Auth guard — must be logged in to view dashboard
    const user = await requireAuth('user');
    if (!user) return;
    currentUser = user;

    // Update header with user info
    const emailEl = document.getElementById('userEmailDisplay');
    const avatarEl = document.getElementById('userAvatar');
    if (emailEl) emailEl.textContent = user.email;
    if (avatarEl) avatarEl.textContent = (user.email || 'U')[0].toUpperCase();

    // Check if admin → show admin panel button
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role === 'admin') {
        const adminBtn = document.getElementById('adminPanelBtn');
        if (adminBtn) adminBtn.style.display = 'block';
    }

    // Initialize month/year filters
    initMonthYearFilters();

    // Load customers
    await loadCustomers();

    // Log visit
    await logUserAction('dashboard_visit');
});
