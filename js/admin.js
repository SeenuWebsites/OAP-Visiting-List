/* ============================================================
   Admin Panel Module
   User management, logs, visits, commission, app versions
   ============================================================ */

let adminUser = null;
let adminAllUsers = [];
let adminAllCustomers = [];
let adminAllLogs = [];

// ---- Init Admin Page ----
document.addEventListener('DOMContentLoaded', async () => {
    adminUser = await requireAuth('admin');
    if (!adminUser) return;

    initAdminFilters();
    await loadAdminUsers();
    await loadVersionHistory();
    setupAppVersionForm();
    logUserAction('admin_panel_view');
});

// ---- Tab Switching ----
function showAdminTab(tab) {
    document.querySelectorAll('[id^="adminTab-"]').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.admin-tab').forEach(el => el.classList.remove('active'));
    document.getElementById(`adminTab-${tab}`)?.classList.remove('hidden');
    event.currentTarget.classList.add('active');

    // Lazy load
    if (tab === 'logs') loadLogs();
    else if (tab === 'visits') loadVisits();
    else if (tab === 'commission') loadCommission();
    else if (tab === 'customers') loadAdminCustomers();
}

// ---- Init Filters ----
function initAdminFilters() {
    const now = new Date();
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    ['commMonthFilter'].forEach(id => {
        const sel = document.getElementById(id);
        if (!sel) return;
        months.forEach((m, i) => {
            const opt = document.createElement('option');
            opt.value = i + 1;
            opt.textContent = m;
            if (i + 1 === now.getMonth() + 1) opt.selected = true;
            sel.appendChild(opt);
        });
    });

    ['commYearFilter'].forEach(id => {
        const sel = document.getElementById(id);
        if (!sel) return;
        for (let y = 2024; y <= now.getFullYear() + 1; y++) {
            const opt = document.createElement('option');
            opt.value = y;
            opt.textContent = y;
            if (y === now.getFullYear()) opt.selected = true;
            sel.appendChild(opt);
        }
    });
}

// ---- Load All Users ----
async function loadAdminUsers() {
    const tbody = document.getElementById('adminUsersBody');

    try {
        const { data: profiles, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error || !profiles) {
            tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><div class="empty-icon">❌</div><p>Failed to load users</p></div></td></tr>`;
            return;
        }

        adminAllUsers = profiles;

        // Get customer counts per user
        const { data: custCounts } = await supabase
            .from('customers')
            .select('user_id')
            .eq('is_deleted', false);
        const countMap = {};
        (custCounts || []).forEach(c => { countMap[c.user_id] = (countMap[c.user_id] || 0) + 1; });

        // Also populate user filters in other tabs
        populateUserFilters(profiles);

        if (!profiles.length) {
            tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><div class="empty-icon">👥</div><h3>No users yet</h3></div></td></tr>`;
            return;
        }

        tbody.innerHTML = profiles.map((p, i) => `
            <tr>
                <td>${i + 1}</td>
                <td>${escapeHtml(p.full_name || '-')}</td>
                <td>${escapeHtml(p.email || '-')}</td>
                <td>${escapeHtml(p.phone || '-')}</td>
                <td><span class="badge ${p.role === 'admin' ? 'badge-completed' : 'badge-pending'}">${p.role || 'user'}</span></td>
                <td>${countMap[p.id] || 0}</td>
                <td>${formatDate(p.created_at)}</td>
                <td>
                    <div class="table-actions">
                        <button class="btn btn-secondary btn-sm" onclick="viewUserDetail('${p.id}')">👁 View</button>
                        <button class="btn btn-sm ${p.role === 'admin' ? 'btn-warning' : 'btn-outline-primary'}" onclick="toggleUserRole('${p.id}','${p.role}')">
                            ${p.role === 'admin' ? '↓ User' : '↑ Admin'}
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        console.error('[Admin] Load users error:', err);
    }
}

// ---- Populate User Filter Dropdowns ----
function populateUserFilters(profiles) {
    ['logUserFilter', 'custUserFilter'].forEach(id => {
        const sel = document.getElementById(id);
        if (!sel) return;
        const current = sel.value;
        sel.innerHTML = '<option value="">All Users</option>' +
            profiles.map(p => `<option value="${p.id}" ${p.id === current ? 'selected' : ''}>${escapeHtml(p.email || p.full_name || p.id)}</option>`).join('');
    });
}

// ---- Toggle User Role ----
async function toggleUserRole(userId, currentRole) {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    if (!confirm(`Change role to "${newRole}"?`)) return;
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
    if (error) { showToast('Failed to update role.', 'error'); return; }
    showToast(`Role changed to ${newRole}.`, 'success');
    await loadAdminUsers();
}

// ---- View User Detail ----
async function viewUserDetail(userId) {
    const profile = adminAllUsers.find(p => p.id === userId);
    if (!profile) return;
    const content = document.getElementById('userDetailContent');
    content.innerHTML = `
        <div class="flex flex-col gap-2">
            <div class="detail-row"><div class="detail-label">Name</div><div class="detail-value">${escapeHtml(profile.full_name || '-')}</div></div>
            <div class="detail-row"><div class="detail-label">Email</div><div class="detail-value">${escapeHtml(profile.email || '-')}</div></div>
            <div class="detail-row"><div class="detail-label">Phone</div><div class="detail-value">${escapeHtml(profile.phone || '-')}</div></div>
            <div class="detail-row"><div class="detail-label">Role</div><div class="detail-value"><span class="badge ${profile.role === 'admin' ? 'badge-completed' : 'badge-pending'}">${profile.role || 'user'}</span></div></div>
            <div class="detail-row"><div class="detail-label">Security Q1</div><div class="detail-value">${escapeHtml(profile.security_q1 || '-')}</div></div>
            <div class="detail-row"><div class="detail-label">Security Q2</div><div class="detail-value">${escapeHtml(profile.security_q2 || '-')}</div></div>
            <div class="detail-row"><div class="detail-label">Security Q3</div><div class="detail-value">${escapeHtml(profile.security_q3 || '-')}</div></div>
            <div class="detail-row"><div class="detail-label">Joined</div><div class="detail-value">${formatDateTime(profile.created_at)}</div></div>
        </div>
    `;
    document.getElementById('toggleRoleBtn').textContent = profile.role === 'admin' ? '↓ Set as User' : '↑ Set as Admin';
    document.getElementById('toggleRoleBtn').onclick = () => { closeModal('userDetailModal'); toggleUserRole(profile.id, profile.role); };
    document.getElementById('userDetailModal').classList.add('active');
}

// ---- Load Logs ----
async function loadLogs() {
    const tbody = document.getElementById('adminLogsBody');
    const userFilter = document.getElementById('logUserFilter')?.value;

    let query = supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(200);
    if (userFilter) query = query.eq('user_id', userFilter);

    const { data: logs } = await query;
    adminAllLogs = logs || [];

    if (!logs?.length) {
        tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><div class="empty-icon">📋</div><h3>No logs yet</h3></div></td></tr>`;
        return;
    }

    tbody.innerHTML = logs.map((l, i) => `
        <tr>
            <td>${i + 1}</td>
            <td>${escapeHtml(l.user_email || '-')}</td>
            <td><span class="badge badge-pending">${escapeHtml(l.action || '-')}</span></td>
            <td class="text-xs">${l.details ? JSON.stringify(l.details).slice(0, 60) : '-'}</td>
            <td>${formatDateTime(l.created_at)}</td>
        </tr>
    `).join('');
}

// ---- Load Visits ----
async function loadVisits() {
    const container = document.getElementById('visitStatsGrid');
    const { data: logs } = await supabase.from('audit_logs').select('user_id, user_email, action').eq('action', 'login');
    if (!logs?.length) {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">📊</div><h3>No visits recorded</h3></div>`;
        return;
    }
    const counts = {};
    const emails = {};
    logs.forEach(l => {
        counts[l.user_id] = (counts[l.user_id] || 0) + 1;
        emails[l.user_id] = l.user_email;
    });
    container.innerHTML = Object.entries(counts).map(([uid, count]) => `
        <div class="stat-card blue">
            <div class="stat-label truncate">${escapeHtml(emails[uid] || uid)}</div>
            <div class="stat-value">${count}</div>
            <div class="stat-sub">logins</div>
        </div>
    `).join('');
}

// ---- Load Commission ----
async function loadCommission() {
    const tbody = document.getElementById('adminCommissionBody');
    const month = parseInt(document.getElementById('commMonthFilter')?.value || new Date().getMonth() + 1);
    const year = parseInt(document.getElementById('commYearFilter')?.value || new Date().getFullYear());

    const { data: profiles } = await supabase.from('profiles').select('id, email, full_name').eq('role', 'user');
    if (!profiles?.length) { tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><h3>No users</h3></div></td></tr>`; return; }

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    let rows = [];

    for (const p of profiles) {
        const { data: customers } = await supabase.from('customers').select('id, commission').eq('user_id', p.id).eq('is_deleted', false);
        if (!customers?.length) continue;
        const cIds = customers.map(c => c.id);
        const { data: records } = await supabase.from('monthly_records').select('customer_id, status').in('customer_id', cIds).eq('year', year).eq('month', month).eq('status', 'Completed');
        const completedIds = new Set((records || []).map(r => r.customer_id));
        let totalComm = 0;
        customers.forEach(c => { if (completedIds.has(c.id)) totalComm += parseFloat(c.commission || 0); });
        rows.push({ name: p.full_name || p.email, email: p.email, completed: completedIds.size, commission: totalComm });
    }

    if (!rows.length) { tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><div class="empty-icon">💰</div><h3>No commission data</h3></div></td></tr>`; return; }

    tbody.innerHTML = rows.map(r => `
        <tr>
            <td>${escapeHtml(r.name)}</td>
            <td>${escapeHtml(r.email)}</td>
            <td>${r.completed}</td>
            <td class="font-bold text-success">${formatCurrency(r.commission)}</td>
            <td>${months[month - 1]} ${year}</td>
        </tr>
    `).join('');
}

// ---- Load Admin Customers ----
async function loadAdminCustomers() {
    const tbody = document.getElementById('adminCustomersBody');
    const userFilter = document.getElementById('custUserFilter')?.value;

    let query = supabase.from('customers').select(`*, profiles:user_id(email, full_name)`).eq('is_deleted', false).order('created_at', { ascending: false }).limit(500);
    if (userFilter) query = query.eq('user_id', userFilter);

    const { data } = await query;
    adminAllCustomers = data || [];

    if (!data?.length) {
        tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><div class="empty-icon">🏠</div><h3>No customers found</h3></div></td></tr>`;
        return;
    }

    tbody.innerHTML = data.map((c, i) => `
        <tr>
            <td>${i + 1}</td>
            <td class="text-xs">${escapeHtml(c.profiles?.email || '-')}</td>
            <td>${escapeHtml(c.name)}</td>
            <td>${escapeHtml(c.mobile)}</td>
            <td>${escapeHtml(c.location || '-')}</td>
            <td>${formatCurrency(c.amount)}</td>
            <td class="text-success">${formatCurrency(c.commission)}</td>
            <td>${formatDate(c.created_at)}</td>
        </tr>
    `).join('');
}

// ---- Admin Export ----
async function exportAdminData(type, format) {
    let rows = [];
    const fname = `admin_${type}_${new Date().toISOString().split('T')[0]}`;

    if (type === 'users') {
        rows = adminAllUsers.map((p, i) => ({
            '#': i + 1, Name: p.full_name || '', Email: p.email || '', Phone: p.phone || '', Role: p.role || 'user', Joined: formatDate(p.created_at)
        }));
    } else if (type === 'logs') {
        rows = adminAllLogs.map((l, i) => ({
            '#': i + 1, User: l.user_email || '', Action: l.action || '', Details: JSON.stringify(l.details || {}), Time: formatDateTime(l.created_at)
        }));
    } else if (type === 'allcustomers') {
        rows = adminAllCustomers.map((c, i) => ({
            '#': i + 1, Email: c.profiles?.email || '', Name: c.name, Mobile: c.mobile, Location: c.location || '', Amount: c.amount, Commission: c.commission, Added: formatDate(c.created_at)
        }));
    }

    if (!rows.length) { showToast('No data to export.', 'warning'); return; }
    if (format === 'csv') exportCSV(rows, fname);
    else if (format === 'excel') exportExcel(rows, fname);
    else if (format === 'pdf') exportPDF(rows, fname, 0, 0);
    else if (format === 'html') exportHTML(rows, fname);
}

// ---- App Version Management ----
async function loadVersionHistory() {
    const tbody = document.getElementById('versionsBody');
    const { data: versions } = await supabase.from('app_versions').select('*').order('created_at', { ascending: false });

    if (!versions?.length) {
        tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">📱</div><h3>No versions uploaded yet</h3></div></td></tr>`;
        return;
    }

    tbody.innerHTML = versions.map(v => `
        <tr>
            <td class="font-bold">${escapeHtml(v.version_number)}</td>
            <td>${v.platform === 'android' ? '🤖 Android' : '🌐 Web'}</td>
            <td class="text-xs">${escapeHtml(v.release_notes || '-')}</td>
            <td>${formatFileSize(v.file_size)}</td>
            <td>${formatDate(v.released_at)}</td>
            <td>${v.is_latest ? '<span class="badge badge-completed">✓ Latest</span>' : '<span class="badge badge-pending">Archived</span>'}</td>
            <td>
                <div class="table-actions">
                    ${v.file_url ? `<a class="btn btn-success btn-sm" href="${v.file_url}" download>⬇️</a>` : ''}
                    ${!v.is_latest ? `<button class="btn btn-primary btn-sm" onclick="setLatestVersion('${v.id}')">Set Latest</button>` : ''}
                    <button class="btn btn-danger btn-sm" onclick="deleteVersion('${v.id}')">🗑</button>
                </div>
            </td>
        </tr>
    `).join('');
}

function setupAppVersionForm() {
    const form = document.getElementById('appVersionForm');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await uploadNewVersion();
    });
}

async function uploadNewVersion() {
    const versionNum = document.getElementById('newVersion').value.trim();
    const platform = document.getElementById('newPlatform').value;
    const notes = document.getElementById('newReleaseNotes').value.trim();
    const file = document.getElementById('newAppFile').files[0];
    const btn = document.getElementById('uploadVersionBtn');
    const spinner = document.getElementById('uploadVersionSpinner');
    const btnText = document.getElementById('uploadVersionBtnText');

    if (!versionNum) { showToast('Version number is required.', 'warning'); return; }

    btn.disabled = true;
    spinner.classList.remove('hidden');
    btnText.textContent = 'Uploading...';

    let fileUrl = null;
    let fileSize = 0;
    let fileName = null;

    try {
        if (file) {
            // Validate file
            const allowedExt = ['apk', 'aab', 'zip'];
            const ext = file.name.split('.').pop().toLowerCase();
            if (!allowedExt.includes(ext)) {
                showToast('Only .apk, .aab, or .zip files allowed.', 'error');
                return;
            }
            if (file.size > 100 * 1024 * 1024) {
                showToast('File too large. Max 100MB.', 'error');
                return;
            }

            const bar = document.getElementById('uploadProgress');
            const fill = document.getElementById('uploadProgressFill');
            bar.classList.remove('hidden');

            const path = `releases/${versionNum}/${file.name}`;
            const { data: uploadData, error: uploadErr } = await supabase.storage
                .from('app-releases')
                .upload(path, file, {
                    upsert: true, onUploadProgress: (p) => {
                        fill.style.width = Math.round((p.loaded / p.total) * 100) + '%';
                    }
                });

            if (uploadErr) { showToast('Upload failed: ' + uploadErr.message, 'error'); return; }

            const { data: urlData } = supabase.storage.from('app-releases').getPublicUrl(path);
            fileUrl = urlData?.publicUrl;
            fileSize = file.size;
            fileName = file.name;
            fill.style.width = '100%';
        }

        // Mark all existing as not latest
        await supabase.from('app_versions').update({ is_latest: false }).eq('platform', platform);

        // Insert new version
        const { error } = await supabase.from('app_versions').insert({
            version_number: versionNum,
            platform: platform,
            release_notes: notes,
            file_url: fileUrl,
            file_name: fileName,
            file_size: fileSize,
            is_latest: true,
            uploaded_by: adminUser.id,
            released_at: new Date().toISOString()
        });

        if (error) { showToast('Failed to save version: ' + error.message, 'error'); return; }

        showToast(`Version ${versionNum} published successfully!`, 'success');
        document.getElementById('appVersionForm').reset();
        document.getElementById('uploadProgress').classList.add('hidden');
        document.getElementById('uploadProgressFill').style.width = '0%';
        await loadVersionHistory();
    } catch (err) {
        showToast('Upload error: ' + err.message, 'error');
    } finally {
        btn.disabled = false;
        spinner.classList.add('hidden');
        btnText.textContent = '📤 Upload & Publish Version';
    }
}

async function setLatestVersion(versionId) {
    const { data: v } = await supabase.from('app_versions').select('platform').eq('id', versionId).single();
    await supabase.from('app_versions').update({ is_latest: false }).eq('platform', v.platform);
    await supabase.from('app_versions').update({ is_latest: true }).eq('id', versionId);
    showToast('Latest version updated.', 'success');
    await loadVersionHistory();
}

async function deleteVersion(versionId) {
    if (!confirm('Delete this version? This cannot be undone.')) return;
    await supabase.from('app_versions').delete().eq('id', versionId);
    showToast('Version deleted.', 'info');
    await loadVersionHistory();
}
