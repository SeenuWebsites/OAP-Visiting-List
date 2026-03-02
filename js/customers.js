/* ============================================================
   Customers Module — Full CRUD, Skip, Done/Undone, Commission
   ============================================================ */

let currentUser = null;
let allCustomers = [];

// ---- Open Add Customer Modal ----
function openAddCustomer() {
    currentEditId = null;
    document.getElementById('customerModalTitle').textContent = 'Add Customer';
    document.getElementById('saveCustomerBtnText').textContent = 'Save Customer';
    document.getElementById('editCustomerId').value = '';
    document.getElementById('customerForm').reset();
    resetImageForm();
    toggleOapOther();
    document.getElementById('customerModal').classList.add('active');
    setTimeout(() => document.getElementById('cName').focus(), 300);
}

// ---- Open Edit Customer Modal ----
async function openEditCustomer(customerId) {
    const customer = allCustomers.find(c => c.id === customerId);
    if (!customer) return;

    currentEditId = customerId;
    document.getElementById('customerModalTitle').textContent = 'Edit Customer';
    document.getElementById('saveCustomerBtnText').textContent = 'Save Changes';
    document.getElementById('editCustomerId').value = customerId;

    // Fill form
    document.getElementById('cName').value = customer.name || '';
    document.getElementById('cWitness').value = customer.witness_name || '';
    document.getElementById('cMobile').value = customer.mobile || '';
    document.getElementById('cAltMobile').value = customer.alt_mobile || '';
    document.getElementById('cLocation').value = customer.location || '';
    document.getElementById('cAadhar').value = customer.aadhar || '';
    document.getElementById('cCIF').value = customer.cif || '';
    document.getElementById('cAccount').value = customer.account_number || '';
    document.getElementById('cFingers').value = customer.working_fingers || '';
    document.getElementById('cOapType').value = customer.oap_type || 'OAP';
    document.getElementById('cOapOther').value = customer.oap_type_other || '';
    document.getElementById('cAmount').value = customer.amount || '';
    document.getElementById('cCommission').value = customer.commission || '';
    toggleOapOther();

    resetImageForm();
    document.getElementById('customerModal').classList.add('active');
}

// ---- Validate Customer Form ----
function validateCustomerForm() {
    let valid = true;
    const errors = [
        { field: 'cName', err: 'cNameErr', test: v => v.trim().length >= 2, msg: 'Name must be at least 2 characters' },
        { field: 'cMobile', err: 'cMobileErr', test: v => /^[6-9]\d{9}$/.test(v), msg: 'Enter a valid 10-digit mobile number' },
        { field: 'cLocation', err: 'cLocationErr', test: v => v.trim().length >= 2, msg: 'Location is required' },
        { field: 'cAmount', err: 'cAmountErr', test: v => v && parseFloat(v) >= 0, msg: 'Enter a valid amount' },
        { field: 'cCommission', err: 'cCommissionErr', test: v => !v || parseFloat(v) >= 0, msg: 'Enter a valid commission' },
    ];
    errors.forEach(({ field, err, test, msg }) => {
        const el = document.getElementById(field);
        const val = el?.value || '';
        if (!test(val)) {
            setFieldError(field, err, msg);
            valid = false;
        } else {
            clearFieldError(field, err);
        }
    });

    // Alternate Mobile
    const altMob = (document.getElementById('cAltMobile')?.value || '').trim();
    if (altMob && !/^[6-9]\d{9}$/.test(altMob)) {
        setFieldError('cAltMobile', 'cAltMobileErr', 'Enter a valid 10-digit mobile number');
        valid = false;
    } else {
        clearFieldError('cAltMobile', 'cAltMobileErr');
    }

    // Aadhar format
    const aadhar = document.getElementById('cAadhar').value;
    if (aadhar && !/^\d{4}-\d{4}-\d{4}$/.test(aadhar)) {
        setFieldError('cAadhar', 'cAadharErr', 'Aadhar must be in XXXX-XXXX-XXXX format');
        valid = false;
    } else {
        clearFieldError('cAadhar', 'cAadharErr');
    }

    // OAP Other
    const oapType = document.getElementById('cOapType').value;
    if (oapType === 'Others' && !document.getElementById('cOapOther').value.trim()) {
        showToast('Please specify the OAP type in the "Others" field.', 'warning');
        valid = false;
    }

    return valid;
}

// ---- Save Customer (Add or Edit) ----
async function saveCustomer() {
    if (!validateCustomerForm()) return;

    const btn = document.getElementById('saveCustomerBtn');
    const spinner = document.getElementById('saveCustomerSpinner');
    const btnText = document.getElementById('saveCustomerBtnText');
    btn.disabled = true;
    spinner.classList.remove('hidden');
    btnText.textContent = 'Saving...';

    try {
        const oapType = document.getElementById('cOapType').value;
        const customerData = {
            user_id: currentUser.id,
            name: sanitize(document.getElementById('cName').value),
            witness_name: sanitize(document.getElementById('cWitness').value),
            mobile: document.getElementById('cMobile').value.trim(),
            alt_mobile: document.getElementById('cAltMobile').value.trim() || null,
            location: sanitize(document.getElementById('cLocation').value),
            aadhar: document.getElementById('cAadhar').value.trim() || null,
            cif: sanitize(document.getElementById('cCIF').value),
            account_number: sanitize(document.getElementById('cAccount').value),
            working_fingers: document.getElementById('cFingers').value || null,
            oap_type: oapType,
            oap_type_other: oapType === 'Others' ? sanitize(document.getElementById('cOapOther').value) : null,
            amount: parseFloat(document.getElementById('cAmount').value) || 0,
            commission: parseFloat(document.getElementById('cCommission').value) || 0,
        };

        let customerId = document.getElementById('editCustomerId').value;

        if (customerId) {
            // Edit
            const { error } = await supabase
                .from('customers')
                .update(customerData)
                .eq('id', customerId)
                .eq('user_id', currentUser.id);
            if (error) { showToast('Update failed: ' + error.message, 'error'); return; }
            await logUserAction('customer_edit', { id: customerId, name: customerData.name });
        } else {
            // Add
            const { data, error } = await supabase
                .from('customers')
                .insert(customerData)
                .select()
                .single();
            if (error) { showToast('Save failed: ' + error.message, 'error'); return; }
            customerId = data.id;
            await logUserAction('customer_add', { id: customerId, name: customerData.name });
        }

        // Upload images
        const imgPaths = await uploadCustomerImages(currentUser.id, customerId);
        if (Object.keys(imgPaths).length > 0) {
            await supabase.from('customers').update(imgPaths).eq('id', customerId);
        }

        showToast(`Customer ${document.getElementById('editCustomerId').value ? 'updated' : 'added'} successfully!`, 'success');
        closeModal('customerModal');
        await loadCustomers();
    } catch (err) {
        showToast('An error occurred. Please try again.', 'error');
        console.error('[Customers] Save error:', err);
    } finally {
        btn.disabled = false;
        spinner.classList.add('hidden');
        btnText.textContent = document.getElementById('editCustomerId').value ? 'Save Changes' : 'Save Customer';
    }
}

// ---- Load Customers with Filters ----
async function loadCustomers() {
    if (!currentUser) return;
    const { month, year } = getFilterValues();
    updateHeaderMonthLabel();

    const tbody = document.getElementById('customerTableBody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state"><div class="spinner" style="margin:0 auto"></div></div></td></tr>';

    try {
        // Fetch all active customers
        const { data: customers, error } = await supabase
            .from('customers')
            .select('*')
            .eq('user_id', currentUser.id)
            .eq('is_deleted', false)
            .lte('created_at', getLastDayOfMonth(year, month).toISOString()) // only customers added up to this month
            .order('created_at', { ascending: true });

        if (error) { showToast('Failed to load customers: ' + error.message, 'error'); return; }

        allCustomers = customers || [];

        // Fetch monthly records for selected month
        const customerIds = allCustomers.map(c => c.id);
        let monthlyRecords = [];
        let skipData = {};

        if (customerIds.length > 0) {
            const { data: records } = await supabase
                .from('monthly_records')
                .select('*')
                .in('customer_id', customerIds)
                .eq('year', year)
                .eq('month', month);
            monthlyRecords = records || [];

            const { data: skips } = await supabase
                .from('skip_tracking')
                .select('*')
                .in('customer_id', customerIds)
                .eq('user_id', currentUser.id);
            (skips || []).forEach(s => { skipData[s.customer_id] = s.skip_count || 0; });
        }

        const recordMap = {};
        monthlyRecords.forEach(r => { recordMap[r.customer_id] = r; });

        // Build enriched list
        const enriched = allCustomers.map(c => ({
            ...c,
            record: recordMap[c.id] || null,
            status: recordMap[c.id]?.status || 'Pending',
            skipCount: skipData[c.id] || 0
        }));

        // Apply filters
        applyFiltersToList(enriched);
        await updateCommissionSummary(currentUser.id, year, month);
        updateLocationFilter(allCustomers);
    } catch (err) {
        console.error('[Customers] Load error:', err);
        showToast('Failed to load data.', 'error');
    }
}

// ---- Apply Filters (search, location, status) ----
function applyFilters() {
    updateHeaderMonthLabel();
    loadCustomers();
}

function applyFiltersToList(enrichedList) {
    const search = (document.getElementById('searchInput')?.value || '').toLowerCase().trim();
    const locationFilter = document.getElementById('filterLocation')?.value || '';
    const statusFilter = document.getElementById('filterStatus')?.value || '';

    let filtered = enrichedList.filter(c => {
        const matchSearch = !search ||
            c.name.toLowerCase().includes(search) ||
            (c.mobile && c.mobile.includes(search)) ||
            (c.location && c.location.toLowerCase().includes(search));
        const matchLocation = !locationFilter || c.location === locationFilter;
        const matchStatus = !statusFilter || c.status === statusFilter;
        return matchSearch && matchLocation && matchStatus;
    });

    // Sort: Skipped go to bottom
    filtered.sort((a, b) => {
        if (a.status === 'Skipped' && b.status !== 'Skipped') return 1;
        if (a.status !== 'Skipped' && b.status === 'Skipped') return -1;
        return new Date(a.created_at) - new Date(b.created_at);
    });

    renderCustomerTable(filtered);
}

// ---- Render Customer Table ----
function renderCustomerTable(list) {
    const tbody = document.getElementById('customerTableBody');
    if (!tbody) return;

    if (!list.length) {
        tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state">
            <div class="empty-icon">📋</div>
            <h3>No customers found</h3>
            <p>Add a customer or adjust your filters.</p>
        </div></td></tr>`;
        return;
    }

    tbody.innerHTML = list.map((c, i) => {
        const statusBadge = `<span class="badge badge-${c.status.toLowerCase()}">${c.status}</span>`;
        const skipBadge = c.skipCount > 0 ? `<span class="skip-count">⏭ ${c.skipCount}</span>` : '';
        const rowClass = c.status === 'Skipped' ? 'skip-row' : c.status === 'Completed' ? 'done-row' : '';

        const doneBtn = c.status !== 'Completed'
            ? `<button class="btn btn-success btn-sm" onclick="showDonePopup('${c.id}')">✅ Done</button>`
            : `<button class="btn btn-secondary btn-sm" onclick="markUndone('${c.id}')">↩ Undone</button>`;

        const skipBtn = c.status !== 'Completed'
            ? (c.status === 'Skipped'
                ? `<button class="btn btn-warning btn-sm" onclick="toggleSkip('${c.id}','unskip')">⏹ Unskip</button>`
                : `<button class="btn btn-sm" style="background:var(--bg-hover);color:var(--text-secondary);border:1px solid var(--border)" onclick="toggleSkip('${c.id}','skip')">⏭ Skip</button>`)
            : '';

        const type = c.oap_type === 'Others' ? c.oap_type_other : c.oap_type;

        return `<tr class="${rowClass}" data-id="${c.id}">
            <td>${i + 1}</td>
            <td>
                <div class="font-medium">${escapeHtml(c.name)}</div>
                ${c.witness_name ? `<div class="text-xs text-secondary">W: ${escapeHtml(c.witness_name)}</div>` : ''}
            </td>
            <td>
                <div>${escapeHtml(c.mobile)}</div>
                ${c.alt_mobile ? `<div class="text-xs text-secondary">${escapeHtml(c.alt_mobile)}</div>` : ''}
            </td>
            <td>${escapeHtml(c.location || '-')}</td>
            <td><span class="badge badge-pending" style="background:var(--primary-light);color:var(--primary)">${escapeHtml(type || c.oap_type)}</span></td>
            <td>
                ${statusBadge}
                ${skipBadge}
                ${c.record?.final_chance > 1 ? `<span class="chance-badge">🎯 ${c.record.final_chance}</span>` : ''}
            </td>
            <td>
                <div class="table-actions">
                    ${doneBtn}
                    ${skipBtn}
                    <button class="btn btn-secondary btn-sm" onclick="openDetailsView('${c.id}')">👁</button>
                    <button class="btn btn-secondary btn-sm" onclick="openEditCustomer('${c.id}')">✏️</button>
                    <button class="btn btn-danger btn-sm" onclick="softDeleteCustomer('${c.id}')">🗑</button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

// ---- Done Popup ----
async function showDonePopup(customerId) {
    const customer = allCustomers.find(c => c.id === customerId);
    if (!customer) return;
    const skipCount = await getSkipCount(customerId, currentUser.id);

    document.getElementById('doneCustomerId').value = customerId;
    document.getElementById('doneCustomerName').textContent = customer.name;
    const skipInfo = document.getElementById('doneSkipInfo');
    skipInfo.textContent = `Skipped months: ${skipCount}`;
    skipInfo.dataset.skipCount = skipCount;
    document.getElementById('chanceMultiplier').value = 1;
    updateFinalChance();
    document.getElementById('doneModal').classList.add('active');
}

// ---- Confirm Done ----
async function confirmDone() {
    const customerId = document.getElementById('doneCustomerId').value;
    const multiplier = parseInt(document.getElementById('chanceMultiplier').value) || 1;
    const skipCount = parseInt(document.getElementById('doneSkipInfo').dataset.skipCount || 0);
    const finalChance = multiplier + skipCount;
    const { month, year } = getFilterValues();

    try {
        await supabase.from('monthly_records').upsert({
            customer_id: customerId,
            user_id: currentUser.id,
            year: year,
            month: month,
            status: 'Completed',
            chance_multiplier: multiplier,
            final_chance: finalChance,
            done_at: new Date().toISOString()
        }, { onConflict: 'customer_id,year,month' });

        // Reset skip count on completion
        await resetSkipCount(customerId, currentUser.id);
        await logUserAction('customer_done', { id: customerId, year, month, final_chance: finalChance });
        showToast('Marked as Completed! 🎉', 'success');
        closeModal('doneModal');
        await loadCustomers();
    } catch (err) {
        showToast('Failed to mark as done.', 'error');
    }
}

// ---- Mark Undone ----
async function markUndone(customerId) {
    const { month, year } = getFilterValues();
    if (!confirm('Mark this customer as Pending (Undone)?')) return;
    try {
        await supabase.from('monthly_records').upsert({
            customer_id: customerId,
            user_id: currentUser.id,
            year: year,
            month: month,
            status: 'Pending',
            done_at: null
        }, { onConflict: 'customer_id,year,month' });
        await logUserAction('customer_undone', { id: customerId, year, month });
        showToast('Marked as Pending.', 'info');
        await loadCustomers();
    } catch (err) {
        showToast('Failed to update.', 'error');
    }
}

// ---- Skip / Unskip ----
async function toggleSkip(customerId, action) {
    const { month, year } = getFilterValues();
    const status = action === 'skip' ? 'Skipped' : 'Pending';
    try {
        await supabase.from('monthly_records').upsert({
            customer_id: customerId,
            user_id: currentUser.id,
            year: year,
            month: month,
            status: status
        }, { onConflict: 'customer_id,year,month' });

        if (action === 'skip') {
            await incrementSkipCount(customerId, currentUser.id, year, month);
            showToast('Customer skipped — will carry forward next month.', 'info');
        } else {
            showToast('Unskipped — back to Pending.', 'info');
        }
        await logUserAction(action === 'skip' ? 'customer_skip' : 'customer_unskip', { id: customerId, year, month });
        await loadCustomers();
    } catch (err) {
        showToast('Failed to update skip status.', 'error');
    }
}

// ---- Soft Delete ----
async function softDeleteCustomer(customerId) {
    const customer = allCustomers.find(c => c.id === customerId);
    if (!confirm(`Delete customer "${customer?.name}"? You can undo this.`)) return;
    try {
        await supabase.from('customers').update({
            is_deleted: true,
            deleted_at: new Date().toISOString()
        }).eq('id', customerId).eq('user_id', currentUser.id);
        await logUserAction('customer_delete', { id: customerId, name: customer?.name });
        showToast(`"${customer?.name}" deleted. <button onclick="undoDelete('${customerId}')" class="undo-chip">↩ Undo</button>`, 'warning', 8000);
        await loadCustomers();
    } catch (err) {
        showToast('Delete failed.', 'error');
    }
}

// ---- Undo Delete ----
async function undoDelete(customerId) {
    try {
        await supabase.from('customers').update({
            is_deleted: false,
            deleted_at: null
        }).eq('id', customerId).eq('user_id', currentUser.id);
        showToast('Customer restored!', 'success');
        await loadCustomers();
    } catch (err) {
        showToast('Restore failed.', 'error');
    }
}

// ---- Customer Details View ----
async function openDetailsView(customerId) {
    const customer = allCustomers.find(c => c.id === customerId);
    if (!customer) return;
    const { month, year } = getFilterValues();
    const record = await supabase.from('monthly_records').select('*').eq('customer_id', customerId).eq('year', year).eq('month', month).maybeSingle();
    const skipCount = await getSkipCount(customerId, currentUser.id);

    const modal = document.getElementById('detailsModal');
    const content = document.getElementById('detailsContent');

    const type = customer.oap_type === 'Others' ? customer.oap_type_other : customer.oap_type;
    const status = record.data?.status || 'Pending';

    const imgHtml = await renderDetailImages(customer);
    content.innerHTML = `
        <div class="detail-row"><div class="detail-label">Name</div><div class="detail-value font-bold">${escapeHtml(customer.name)}</div></div>
        <div class="detail-row"><div class="detail-label">Witness</div><div class="detail-value">${escapeHtml(customer.witness_name || '-')}</div></div>
        <div class="detail-row"><div class="detail-label">Mobile</div><div class="detail-value">${escapeHtml(customer.mobile)}</div></div>
        <div class="detail-row"><div class="detail-label">Alt Mobile</div><div class="detail-value">${escapeHtml(customer.alt_mobile || '-')}</div></div>
        <div class="detail-row"><div class="detail-label">Location</div><div class="detail-value">${escapeHtml(customer.location || '-')}</div></div>
        <div class="detail-row"><div class="detail-label">Aadhar</div><div class="detail-value">${escapeHtml(customer.aadhar || '-')}</div></div>
        <div class="detail-row"><div class="detail-label">CIF</div><div class="detail-value">${escapeHtml(customer.cif || '-')}</div></div>
        <div class="detail-row"><div class="detail-label">Account</div><div class="detail-value">${escapeHtml(customer.account_number || '-')}</div></div>
        <div class="detail-row"><div class="detail-label">Working Fingers</div><div class="detail-value">${escapeHtml(customer.working_fingers || '-')}</div></div>
        <div class="detail-row"><div class="detail-label">OAP Type</div><div class="detail-value"><span class="badge badge-pending" style="background:var(--primary-light);color:var(--primary)">${escapeHtml(type || customer.oap_type)}</span></div></div>
        <div class="detail-row"><div class="detail-label">Amount</div><div class="detail-value font-bold">${formatCurrency(customer.amount)}</div></div>
        <div class="detail-row"><div class="detail-label">Commission</div><div class="detail-value text-success font-bold">${formatCurrency(customer.commission)}</div></div>
        <div class="detail-row"><div class="detail-label">Status (${month}/${year})</div><div class="detail-value"><span class="badge badge-${status.toLowerCase()}">${status}</span></div></div>
        <div class="detail-row"><div class="detail-label">Skip Count</div><div class="detail-value">${skipCount} months</div></div>
        ${record.data?.final_chance > 1 ? `<div class="detail-row"><div class="detail-label">Final Chance</div><div class="detail-value"><span class="chance-badge">🎯 ${record.data.final_chance}</span></div></div>` : ''}
        <div class="detail-row"><div class="detail-label">Added On</div><div class="detail-value">${formatDateTime(customer.created_at)}</div></div>
        <div style="margin-top:0.75rem"><div class="detail-label" style="margin-bottom:0.5rem">Images</div>${imgHtml}</div>
    `;

    document.getElementById('editFromDetails').onclick = () => {
        closeModal('detailsModal');
        openEditCustomer(customerId);
    };

    modal.classList.add('active');
}

// ---- Update Location Filter Dropdown ----
function updateLocationFilter(customers) {
    const sel = document.getElementById('filterLocation');
    if (!sel) return;
    const current = sel.value;
    const locations = [...new Set(customers.map(c => c.location).filter(Boolean))].sort();
    sel.innerHTML = '<option value="">All Locations</option>' +
        locations.map(l => `<option value="${escapeHtml(l)}" ${l === current ? 'selected' : ''}>${escapeHtml(l)}</option>`).join('');
}

// ---- Helper: last day of month ----
function getLastDayOfMonth(year, month) {
    return new Date(year, month, 0, 23, 59, 59);
}

let currentEditId = null;
