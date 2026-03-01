/* ============================================================
   Import / Export Module
   CSV, Excel, PDF, HTML, Text — with validation on import
   ============================================================ */

// ---- Show Import/Export Modal ----
function showImportExport(mode) {
    const title = document.getElementById('importExportTitle');
    const body = document.getElementById('importExportBody');
    title.textContent = mode === 'export' ? '📤 Export Data' : '📥 Import Data';

    if (mode === 'export') {
        body.innerHTML = `
            <p class="text-sm text-secondary" style="margin-bottom:1rem">Choose a format to export your customer data:</p>
            <div class="flex flex-col gap-1">
                <button class="btn btn-primary w-full" onclick="doExport('csv')">📄 Export as CSV</button>
                <button class="btn btn-outline-primary w-full" onclick="doExport('excel')">📊 Export as Excel (.xlsx)</button>
                <button class="btn btn-outline-primary w-full" onclick="doExport('pdf')">📕 Export as PDF</button>
                <button class="btn btn-outline-primary w-full" onclick="doExport('html')">🌐 Export as HTML</button>
                <button class="btn btn-outline-primary w-full" onclick="doExport('text')">📝 Export as Text</button>
            </div>
            <p class="text-xs text-secondary" style="margin-top:1rem">Filename: <b>${getUserExportFilename()}</b></p>
        `;
    } else {
        body.innerHTML = `
            <p class="text-sm text-secondary" style="margin-bottom:1rem">Import customers from a file. Supported: CSV, Excel, HTML, Text.</p>
            <div class="form-group">
                <label for="importFile">Select File</label>
                <input type="file" id="importFile" class="form-control" accept=".csv,.xlsx,.xls,.html,.txt">
            </div>
            <div class="form-group">
                <label for="importDupeAction">Duplicate Handling</label>
                <select id="importDupeAction" class="form-control">
                    <option value="skip">Skip duplicates</option>
                    <option value="replace">Replace duplicates</option>
                    <option value="rename">Rename (Name+1)</option>
                </select>
            </div>
            <div id="importPreview" class="hidden" style="margin-top:1rem">
                <div class="table-wrapper" style="max-height:200px;overflow-y:auto">
                    <table id="importPreviewTable">
                        <thead><tr><th>#</th><th>Name</th><th>Mobile</th><th>Location</th><th>Status</th></tr></thead>
                        <tbody id="importPreviewBody"></tbody>
                    </table>
                </div>
                <p id="importStatus" class="text-xs text-secondary mt-1"></p>
            </div>
            <div id="importErrors" class="hidden" style="background:rgba(239,68,68,0.08);border-radius:6px;padding:0.75rem;margin-top:0.75rem">
                <p class="text-sm font-semibold text-danger">⚠ Validation Errors:</p>
                <ul id="importErrorList" class="text-xs text-danger" style="margin-top:0.25rem;list-style:disc;padding-left:1rem"></ul>
            </div>
            <div class="flex flex-col gap-1 mt-2">
                <button class="btn btn-secondary w-full" onclick="previewImport()">👁 Preview Import</button>
                <button class="btn btn-primary w-full hidden" id="confirmImportBtn" onclick="confirmImport()">✅ Confirm Import</button>
            </div>
        `;
    }

    document.getElementById('importExportModal').classList.add('active');
}

// ---- Export Filename ----
function getUserExportFilename() {
    const user = currentUser;
    const name = (user?.email || 'user').split('@')[0].replace(/[^a-z0-9]/gi, '_');
    const date = new Date().toISOString().split('T')[0];
    return `${name}_export_${date}`;
}

// ---- EXPORT ----
async function doExport(format) {
    if (!currentUser) return;
    const { month, year } = getFilterValues();

    showLoading('Preparing export...');
    try {
        // Fetch data
        const { data: customers } = await supabase
            .from('customers')
            .select('*')
            .eq('user_id', currentUser.id)
            .eq('is_deleted', false)
            .order('created_at', { ascending: true });

        const { data: records } = await supabase
            .from('monthly_records')
            .select('*')
            .eq('user_id', currentUser.id)
            .eq('year', year)
            .eq('month', month);

        const recordMap = {};
        (records || []).forEach(r => { recordMap[r.customer_id] = r.status; });

        const rows = (customers || []).map((c, i) => ({
            '#': i + 1,
            'Name': c.name,
            'Witness': c.witness_name || '',
            'Mobile': c.mobile,
            'Alt Mobile': c.alt_mobile || '',
            'Location': c.location || '',
            'Aadhar': c.aadhar || '',
            'CIF': c.cif || '',
            'Account': c.account_number || '',
            'Fingers': c.working_fingers || '',
            'Type': c.oap_type === 'Others' ? c.oap_type_other : c.oap_type,
            'Amount': c.amount,
            'Commission': c.commission,
            'Status': recordMap[c.id] || 'Pending',
            'Added On': formatDate(c.created_at)
        }));

        const fname = getUserExportFilename();

        if (format === 'csv') exportCSV(rows, fname);
        else if (format === 'excel') exportExcel(rows, fname);
        else if (format === 'pdf') exportPDF(rows, fname, month, year);
        else if (format === 'html') exportHTML(rows, fname);
        else if (format === 'text') exportText(rows, fname);
    } catch (err) {
        showToast('Export failed: ' + err.message, 'error');
    } finally {
        hideLoading();
    }
}

function exportCSV(rows, fname) {
    if (!rows.length) { showToast('No data to export.', 'warning'); return; }
    const headers = Object.keys(rows[0]);
    const csv = [
        headers.join(','),
        ...rows.map(r => headers.map(h => `"${String(r[h] || '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    downloadFile(csv, fname + '.csv', 'text/csv;charset=utf-8;');
    showToast('CSV exported!', 'success');
}

function exportExcel(rows, fname) {
    if (typeof XLSX === 'undefined') { showToast('Excel library not loaded. Try CSV.', 'error'); return; }
    if (!rows.length) { showToast('No data to export.', 'warning'); return; }
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Customers');
    XLSX.writeFile(wb, fname + '.xlsx');
    showToast('Excel file exported!', 'success');
}

function exportPDF(rows, fname, month, year) {
    if (typeof jspdf === 'undefined' && typeof window.jspdf === 'undefined') {
        showToast('PDF library not loaded.', 'error'); return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    doc.setFontSize(16);
    doc.text('OAP House Visiting List', 14, 15);
    doc.setFontSize(10);
    doc.text(`Report: ${months[month - 1]} ${year}`, 14, 22);
    doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, 14, 28);
    doc.autoTable({
        startY: 35,
        head: [['#', 'Name', 'Mobile', 'Location', 'Type', 'Amount', 'Commission', 'Status']],
        body: rows.map(r => [r['#'], r['Name'], r['Mobile'], r['Location'], r['Type'], r['Amount'], r['Commission'], r['Status']]),
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [79, 70, 229], textColor: 255 },
        alternateRowStyles: { fillColor: [248, 250, 252] }
    });
    doc.save(fname + '.pdf');
    showToast('PDF exported!', 'success');
}

function exportHTML(rows, fname) {
    const headers = Object.keys(rows[0] || {});
    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>OAP Export</title>
<style>body{font-family:sans-serif;padding:20px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#4f46e5;color:white}tr:nth-child(even){background:#f8f9fa}</style>
</head><body><h2>OAP Customer Export — ${new Date().toLocaleDateString('en-IN')}</h2>
<table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
<tbody>${rows.map(r => `<tr>${headers.map(h => `<td>${escapeHtml(String(r[h] || ''))}</td>`).join('')}</tr>`).join('')}</tbody>
</table></body></html>`;
    downloadFile(html, fname + '.html', 'text/html');
    showToast('HTML exported!', 'success');
}

function exportText(rows, fname) {
    const text = rows.map((r, i) =>
        `--- Customer ${i + 1} ---\n` +
        Object.entries(r).map(([k, v]) => `${k}: ${v}`).join('\n')
    ).join('\n\n');
    downloadFile(text, fname + '.txt', 'text/plain');
    showToast('Text file exported!', 'success');
}

function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ---- IMPORT ----
let importedRows = [];

async function previewImport() {
    const file = document.getElementById('importFile')?.files[0];
    if (!file) { showToast('Select a file first.', 'warning'); return; }

    const ext = file.name.split('.').pop().toLowerCase();
    try {
        if (ext === 'csv') importedRows = await parseCSV(file);
        else if (['xlsx', 'xls'].includes(ext)) importedRows = await parseExcel(file);
        else if (ext === 'html') importedRows = await parseHTML(file);
        else if (ext === 'txt') importedRows = await parseText(file);
        else { showToast('Unsupported format.', 'error'); return; }

        const { valid, errors } = validateImportRows(importedRows);

        // Show preview
        const preview = document.getElementById('importPreview');
        const tbody = document.getElementById('importPreviewBody');
        preview.classList.remove('hidden');
        tbody.innerHTML = importedRows.slice(0, 20).map((r, i) => `
            <tr>
                <td>${i + 1}</td>
                <td>${escapeHtml(r.name || '')}</td>
                <td>${escapeHtml(r.mobile || '')}</td>
                <td>${escapeHtml(r.location || '')}</td>
                <td><span class="badge badge-pending">Pending</span></td>
            </tr>
        `).join('');
        document.getElementById('importStatus').textContent = `${importedRows.length} rows found. ${importedRows.length > 20 ? 'Showing first 20.' : ''}`;

        if (errors.length > 0) {
            const errDiv = document.getElementById('importErrors');
            const errList = document.getElementById('importErrorList');
            errDiv.classList.remove('hidden');
            errList.innerHTML = errors.map(e => `<li>${escapeHtml(e)}</li>`).join('');
        }

        if (valid) {
            document.getElementById('confirmImportBtn').classList.remove('hidden');
        }
    } catch (err) {
        showToast('Failed to parse file: ' + err.message, 'error');
    }
}

async function confirmImport() {
    if (!importedRows.length || !currentUser) return;
    const dupeAction = document.getElementById('importDupeAction')?.value || 'skip';

    showLoading('Importing customers...');
    let added = 0, skipped = 0, errors = 0;

    try {
        for (let row of importedRows) {
            try {
                // Check duplicate by mobile
                const { data: existing } = await supabase
                    .from('customers')
                    .select('id,name')
                    .eq('user_id', currentUser.id)
                    .eq('mobile', row.mobile)
                    .eq('is_deleted', false)
                    .maybeSingle();

                if (existing) {
                    if (dupeAction === 'skip') { skipped++; continue; }
                    if (dupeAction === 'replace') {
                        await supabase.from('customers').update({
                            name: sanitize(row.name),
                            location: sanitize(row.location || ''),
                            amount: parseFloat(row.amount) || 0,
                            commission: parseFloat(row.commission) || 0,
                            aadhar: row.aadhar || null,
                            oap_type: row.oap_type || 'OAP'
                        }).eq('id', existing.id);
                        added++;
                        continue;
                    }
                    if (dupeAction === 'rename') {
                        row.name = row.name + '1';
                    }
                }

                await supabase.from('customers').insert({
                    user_id: currentUser.id,
                    name: sanitize(row.name || 'Unnamed'),
                    mobile: row.mobile,
                    alt_mobile: row.alt_mobile || null,
                    location: sanitize(row.location || ''),
                    aadhar: row.aadhar || null,
                    cif: row.cif || null,
                    account_number: row.account_number || null,
                    oap_type: row.oap_type || 'OAP',
                    amount: parseFloat(row.amount) || 0,
                    commission: parseFloat(row.commission) || 0,
                    witness_name: sanitize(row.witness_name || '')
                });
                added++;
            } catch (e) {
                errors++;
            }
        }

        await logUserAction('import', { added, skipped, errors });
        showToast(`Import done: ${added} added, ${skipped} skipped, ${errors} errors.`, added ? 'success' : 'warning', 6000);
        closeModal('importExportModal');
        await loadCustomers();
    } catch (err) {
        showToast('Import failed: ' + err.message, 'error');
    } finally {
        hideLoading();
    }
}

// ---- Parsers ----
function parseCSV(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const lines = e.target.result.split('\n').filter(l => l.trim());
                if (lines.length < 2) { resolve([]); return; }
                const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase().replace(/\s+/g, '_'));
                const rows = lines.slice(1).map(line => {
                    const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
                    const obj = {};
                    headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
                    return obj;
                });
                resolve(rows);
            } catch (err) { reject(err); }
        };
        reader.onerror = reject;
        reader.readAsText(file);
    });
}

function parseExcel(file) {
    return new Promise((resolve, reject) => {
        if (typeof XLSX === 'undefined') { reject(new Error('XLSX library not loaded')); return; }
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const wb = XLSX.read(e.target.result, { type: 'binary' });
                const sheet = wb.Sheets[wb.SheetNames[0]];
                const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
                const normalized = rows.map(r => {
                    const obj = {};
                    Object.keys(r).forEach(k => {
                        obj[k.trim().toLowerCase().replace(/\s+/g, '_')] = r[k];
                    });
                    return obj;
                });
                resolve(normalized);
            } catch (err) { reject(err); }
        };
        reader.onerror = reject;
        reader.readAsBinaryString(file);
    });
}

function parseHTML(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const parser = new DOMParser();
                const doc = parser.parseFromString(e.target.result, 'text/html');
                const rows = [];
                const headers = [...doc.querySelectorAll('table thead th')].map(th => th.textContent.trim().toLowerCase().replace(/\s+/g, '_'));
                doc.querySelectorAll('table tbody tr').forEach(tr => {
                    const cells = [...tr.querySelectorAll('td')].map(td => td.textContent.trim());
                    const obj = {};
                    headers.forEach((h, i) => { obj[h] = cells[i] || ''; });
                    rows.push(obj);
                });
                resolve(rows);
            } catch (err) { reject(err); }
        };
        reader.onerror = reject;
        reader.readAsText(file);
    });
}

function parseText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const blocks = e.target.result.split(/---.*---/).filter(b => b.trim());
                const rows = blocks.map(block => {
                    const obj = {};
                    block.trim().split('\n').forEach(line => {
                        const idx = line.indexOf(':');
                        if (idx > -1) {
                            const key = line.slice(0, idx).trim().toLowerCase().replace(/\s+/g, '_');
                            const val = line.slice(idx + 1).trim();
                            obj[key] = val;
                        }
                    });
                    return obj;
                }).filter(r => r.name);
                resolve(rows);
            } catch (err) { reject(err); }
        };
        reader.onerror = reject;
        reader.readAsText(file);
    });
}

// ---- Validate imported rows ----
function validateImportRows(rows) {
    const errors = [];
    let hasErrors = false;
    rows.forEach((r, i) => {
        if (!r.name || !r.name.trim()) {
            errors.push(`Row ${i + 1}: Name is missing`);
            hasErrors = true;
        }
        if (!r.mobile || !/^\d{10}$/.test(String(r.mobile).replace(/\D/g, ''))) {
            errors.push(`Row ${i + 1}: Mobile "${r.mobile}" is not a valid 10-digit number`);
            hasErrors = true;
        }
        if (r.aadhar && !/^\d{4}-?\d{4}-?\d{4}$/.test(r.aadhar)) {
            errors.push(`Row ${i + 1}: Aadhar format invalid`);
        }
        if (r.amount && isNaN(parseFloat(r.amount))) {
            errors.push(`Row ${i + 1}: Amount "${r.amount}" is not a valid number`);
        }
        // Sanitize mobile number
        r.mobile = String(r.mobile || '').replace(/\D/g, '').slice(0, 10);
    });
    return { valid: !hasErrors, errors: errors.slice(0, 10) };
}
