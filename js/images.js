/* ============================================================
   Image Upload Module — Supabase Storage
   OAP Card (front/back), Aadhar (front/back)
   ============================================================ */

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// ---- Upload an Image to Supabase Storage ----
async function uploadImage(file, userId, customerId, slot) {
    if (!file) return null;

    // Validate type
    if (!ALLOWED_TYPES.includes(file.type)) {
        showToast('Invalid image type. Use JPG, PNG, or WEBP.', 'error');
        return null;
    }

    // Validate size
    if (file.size > MAX_FILE_SIZE) {
        showToast('Image too large. Max 5MB per image.', 'error');
        return null;
    }

    // Build secure path: userId/customerId/slot.ext
    const ext = file.name.split('.').pop().toLowerCase();
    const safeExt = ['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? ext : 'jpg';
    const path = `${userId}/${customerId}/${slot}.${safeExt}`;

    const { data, error } = await supabase.storage
        .from('customer-images')
        .upload(path, file, {
            upsert: true,
            contentType: file.type,
            cacheControl: '3600'
        });

    if (error) {
        console.error('[Images] Upload error:', error.message);
        showToast('Image upload failed: ' + error.message, 'error');
        return null;
    }

    // Return the storage path (not public URL — accessed via signed URL)
    return data.path;
}

// ---- Get Signed URL for secure access ----
async function getImageUrl(storagePath) {
    if (!storagePath) return null;
    const { data, error } = await supabase.storage
        .from('customer-images')
        .createSignedUrl(storagePath, 3600); // 1 hour expiry

    if (error) return null;
    return data.signedUrl;
}

// ---- Delete an image ----
async function deleteImage(storagePath) {
    if (!storagePath) return;
    await supabase.storage.from('customer-images').remove([storagePath]);
}

// ---- Upload all 4 images for a customer ----
async function uploadCustomerImages(userId, customerId) {
    const slots = [
        { fileId: 'imgOAPFront', slot: 'oap_card_front' },
        { fileId: 'imgOAPBack', slot: 'oap_card_back' },
        { fileId: 'imgAaFront', slot: 'aadhar_front' },
        { fileId: 'imgAaBack', slot: 'aadhar_back' }
    ];

    const results = {};
    for (const { fileId, slot } of slots) {
        const input = document.getElementById(fileId);
        if (input && input.files[0]) {
            const path = await uploadImage(input.files[0], userId, customerId, slot);
            if (path) results[slot] = path;
        }
    }
    return results;
}

// ---- Reset image upload form ----
function resetImageForm() {
    ['imgOAPFront', 'imgOAPBack', 'imgAaFront', 'imgAaBack'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    ['previewOAPFront', 'previewOAPBack', 'previewAaFront', 'previewAaBack'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.src = ''; el.classList.add('hidden'); }
    });
    ['uploadBoxOAPFront', 'uploadBoxOAPBack', 'uploadBoxAaFront', 'uploadBoxAaBack'].forEach(id => {
        const box = document.getElementById(id);
        if (box) {
            const icon = box.querySelector('.upload-icon');
            const lbl = box.querySelector('.upload-label');
            if (icon) icon.style.display = '';
            if (lbl) lbl.style.display = '';
        }
    });
}

// ---- Render image preview in details view ----
async function renderDetailImages(customer) {
    const slots = [
        { key: 'oap_card_front', label: 'OAP Card Front' },
        { key: 'oap_card_back', label: 'OAP Card Back' },
        { key: 'aadhar_front', label: 'Aadhar Front' },
        { key: 'aadhar_back', label: 'Aadhar Back' }
    ];
    const images = slots.filter(s => customer[s.key]);
    if (!images.length) return '<p class="text-secondary text-sm">No images uploaded.</p>';

    const urls = await Promise.all(
        images.map(async (s) => ({
            label: s.label,
            url: await getImageUrl(customer[s.key])
        }))
    );

    return `<div class="detail-images">
        ${urls.map(({ label, url }) => url ? `
            <div class="detail-image" onclick="openImageFullscreen('${url}')">
                <img src="${url}" alt="${escapeHtml(label)}" loading="lazy">
                <div class="detail-image-label">${escapeHtml(label)}</div>
            </div>
        ` : '').join('')}
    </div>`;
}
