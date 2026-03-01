/* ============================================================
   Monthly Logic Module
   Month/Year filter, skip carry-forward, commission updates
   ============================================================ */

let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth() + 1; // 1-12

// ---- Initialize Filters ----
function initMonthYearFilters() {
    const monthSel = document.getElementById('filterMonth');
    const yearSel = document.getElementById('filterYear');
    if (!monthSel || !yearSel) return;

    // Populate year: from 2024 to current+1
    yearSel.innerHTML = '';
    for (let y = 2024; y <= currentYear + 1; y++) {
        const opt = document.createElement('option');
        opt.value = y;
        opt.textContent = y;
        if (y === currentYear) opt.selected = true;
        yearSel.appendChild(opt);
    }

    // Set current month
    monthSel.value = currentMonth;

    updateHeaderMonthLabel();
}

// ---- Get Selected Filter Values ----
function getFilterValues() {
    const month = parseInt(document.getElementById('filterMonth')?.value || currentMonth);
    const year = parseInt(document.getElementById('filterYear')?.value || currentYear);
    return { month, year };
}

// ---- Update header month label ----
function updateHeaderMonthLabel() {
    const { month, year } = getFilterValues();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const el = document.getElementById('headerMonthLabel');
    if (el) el.textContent = `${months[month - 1]} ${year}`;
}

// ---- Get or Create Monthly Record ----
async function getOrCreateMonthlyRecord(customerId, userId, year, month) {
    // Check existing
    const { data: existing } = await supabase
        .from('monthly_records')
        .select('*')
        .eq('customer_id', customerId)
        .eq('year', year)
        .eq('month', month)
        .maybeSingle();

    if (existing) return existing;

    // Create new (default Pending)
    const { data: newRecord, error } = await supabase
        .from('monthly_records')
        .insert({
            customer_id: customerId,
            user_id: userId,
            year: year,
            month: month,
            status: 'Pending',
            chance_multiplier: 1,
            final_chance: 1
        })
        .select()
        .single();

    if (error) {
        console.error('[Monthly] Create record error:', error.message);
        return null;
    }
    return newRecord;
}

// ---- Get Skip Count for a Customer ----
async function getSkipCount(customerId, userId) {
    const { data } = await supabase
        .from('skip_tracking')
        .select('skip_count')
        .eq('customer_id', customerId)
        .eq('user_id', userId)
        .maybeSingle();
    return data?.skip_count || 0;
}

// ---- Increment Skip Count ----
async function incrementSkipCount(customerId, userId, year, month) {
    const existing = await supabase
        .from('skip_tracking')
        .select('*')
        .eq('customer_id', customerId)
        .eq('user_id', userId)
        .maybeSingle();

    if (existing.data) {
        await supabase
            .from('skip_tracking')
            .update({
                skip_count: (existing.data.skip_count || 0) + 1,
                last_skipped_month: month,
                last_skipped_year: year,
                updated_at: new Date().toISOString()
            })
            .eq('id', existing.data.id);
    } else {
        await supabase.from('skip_tracking').insert({
            customer_id: customerId,
            user_id: userId,
            skip_count: 1,
            last_skipped_month: month,
            last_skipped_year: year
        });
    }
}

// ---- Reset Skip Count (when Done is clicked) ----
async function resetSkipCount(customerId, userId) {
    await supabase
        .from('skip_tracking')
        .update({ skip_count: 0, updated_at: new Date().toISOString() })
        .eq('customer_id', customerId)
        .eq('user_id', userId);
}

// ---- Update Final Chance Display ----
function updateFinalChance() {
    const multiplier = parseInt(document.getElementById('chanceMultiplier')?.value || 1);
    const skipCount = parseInt(document.getElementById('doneSkipInfo')?.dataset.skipCount || 0);
    const final = (isNaN(multiplier) ? 1 : multiplier) + skipCount;
    const display = document.getElementById('finalChanceDisplay');
    if (display) display.textContent = final;
    return final;
}

// ---- Commission Summary ----
async function updateCommissionSummary(userId, year, month) {
    try {
        // Get all non-deleted customers for this user/month
        const { data: customers } = await supabase
            .from('customers')
            .select('id, commission')
            .eq('user_id', userId)
            .eq('is_deleted', false);

        if (!customers?.length) {
            setStats(0, 0, 0, 0);
            return;
        }

        const customerIds = customers.map(c => c.id);

        // Fetch monthly records for this month
        const { data: records } = await supabase
            .from('monthly_records')
            .select('customer_id, status')
            .in('customer_id', customerIds)
            .eq('year', year)
            .eq('month', month);

        const recordMap = {};
        (records || []).forEach(r => { recordMap[r.customer_id] = r.status; });

        let total = customers.length;
        let completed = 0;
        let pending = 0;
        let commission = 0;

        customers.forEach(c => {
            const status = recordMap[c.customer_id] || 'Pending';
            if (status === 'Completed') {
                completed++;
                commission += parseFloat(c.commission || 0);
            } else if (status !== 'Skipped') {
                pending++;
            }
        });

        setStats(total, completed, pending, commission);
    } catch (e) {
        console.error('[Monthly] Commission update error:', e);
    }
}

function setStats(total, completed, pending, commission) {
    const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
    el('statTotal', total);
    el('statCompleted', completed);
    el('statPending', pending);
    el('statCommission', formatCurrency(commission));
}

// ---- Check if customer should carry-forward (skpped) ----
async function getSkippedCustomerIds(userId, year, month) {
    // Customers skipped in this or previous months that haven't been Completed
    const { data } = await supabase
        .from('monthly_records')
        .select('customer_id')
        .eq('user_id', userId)
        .eq('status', 'Skipped')
        .eq('year', year)
        .eq('month', month);
    return (data || []).map(r => r.customer_id);
}
