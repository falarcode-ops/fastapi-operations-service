/**
 * card-scanner.js (v12.29.0)
 * Controlador frontend para Escáner Móvil de Tarjetas con Visión IA.
 * Captura en 1 toque desde PWA móvil o archivo, extracción Gemini y deduplicación 3NF.
 */
let currentScannedImageBase64 = null, currentScannedData = null, currentDuplicateMatch = null;

function openCardScannerModal() {
    const modal = document.getElementById('card-scanner-modal');
    if (!modal) return;
    resetCardScannerState();
    modal.classList.add('active');
    ensureEmployeesLoaded();
}

function closeCardScannerModal() {
    const modal = document.getElementById('card-scanner-modal');
    if (modal) modal.classList.remove('active');
    resetCardScannerState();
}

function resetCardScannerState() {
    currentScannedImageBase64 = null;
    currentScannedData = null;
    currentDuplicateMatch = null;
    const pIntro = document.getElementById('cs-panel-intro'), pLoad = document.getElementById('cs-panel-loading'), pRev = document.getElementById('cs-panel-review'), pSucc = document.getElementById('cs-panel-success');
    if (pIntro) pIntro.style.display = 'block';
    if (pLoad) pLoad.style.display = 'none';
    if (pRev) pRev.style.display = 'none';
    if (pSucc) pSucc.style.display = 'none';
    const input = document.getElementById('card-scanner-file-input');
    if (input) input.value = '';
}

function triggerCardScannerCapture() {
    const input = document.getElementById('card-scanner-file-input');
    if (input) input.click();
}

async function handleCardScannerFile(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    document.getElementById('cs-panel-intro').style.display = 'none';
    document.getElementById('cs-panel-review').style.display = 'none';
    document.getElementById('cs-panel-success').style.display = 'none';
    document.getElementById('cs-panel-loading').style.display = 'flex';

    try {
        const compressedBase64 = await compressCardImage(file, 1280, 1280, 0.82);
        currentScannedImageBase64 = compressedBase64;
        const prevImg = document.getElementById('cs-loading-preview-img');
        if (prevImg) prevImg.src = compressedBase64;

        const response = await apiFetch(`${API_BASE}/card-scanner/scan`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image_base64: compressedBase64, mime_type: 'image/jpeg' })
        });
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.detail || 'Error en el análisis de la tarjeta.');
        }
        const data = await response.json();
        currentScannedData = data.card_data || {};
        currentDuplicateMatch = data.duplicate_match || { found: false };
        renderCardScannerReview(currentScannedData, currentDuplicateMatch, compressedBase64);
    } catch (err) {
        console.error('Card Scanner Error:', err);
        showToast(err.message || 'Error al procesar la tarjeta', 'error');
        resetCardScannerState();
    }
}

function compressCardImage(file, maxWidth, maxHeight, quality) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = reject;
        reader.onload = (e) => {
            const img = new Image();
            img.onerror = reject;
            img.onload = () => {
                let w = img.width, h = img.height;
                if (w > h && w > maxWidth) { h = Math.round((h * maxWidth) / w); w = maxWidth; }
                else if (h > maxHeight) { w = Math.round((w * maxHeight) / h); h = maxHeight; }
                const canvas = document.createElement('canvas');
                canvas.width = w; canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

function renderCardScannerReview(card, dup, imgSrc) {
    document.getElementById('cs-panel-loading').style.display = 'none';
    document.getElementById('cs-panel-review').style.display = 'block';

    const cardImg = document.getElementById('cs-review-img');
    if (cardImg) cardImg.src = imgSrc;

    const dupAlert = document.getElementById('cs-dup-alert');
    if (dupAlert) {
        if (dup && dup.found) {
            dupAlert.style.display = 'flex';
            dupAlert.className = 'cs-dup-banner cs-dup-warning';
            dupAlert.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" style="flex-shrink:0; margin-right:8px; margin-top:2px;"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg><div><strong>Empresa existente:</strong> ${dup.company_name} (NIT: ${dup.company_nit}) por ${dup.match_field}.<span style="display:block; font-size:0.75rem; color:var(--text-muted); margin-top:2px;">Se vinculará este contacto a la empresa existente para evitar duplicados.</span></div>`;
        } else {
            dupAlert.style.display = 'flex';
            dupAlert.className = 'cs-dup-banner cs-dup-new';
            dupAlert.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" style="flex-shrink:0; margin-right:8px; margin-top:2px;"><circle cx="12" cy="12" r="10"></circle><polyline points="9 12 11 14 15 10"></polyline></svg><div><strong>Nuevo prospecto detectado:</strong> Listo para registrar en la base de datos 3NF.</div>`;
        }
    }

    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
    setVal('cs-field-company', card.company_name);
    setVal('cs-field-nit', card.nit || (dup.found ? dup.company_nit : ''));
    setVal('cs-field-contact', card.contact_name);
    setVal('cs-field-role', card.contact_role);
    setVal('cs-field-type', card.contact_type || 'COMERCIAL');
    setVal('cs-field-phone', card.phone);
    setVal('cs-field-email', card.email);
    setVal('cs-field-city', card.city);
    setVal('cs-field-address', card.address);
    setVal('cs-field-obs', card.observations);

    const userField = document.getElementById('cs-field-user');
    const role = localStorage.getItem('role') || 'USER', currentUsername = localStorage.getItem('username') || '';
    if (userField) {
        if (role === 'USER') { userField.value = currentUsername; userField.disabled = true; }
        else { userField.disabled = false; if (!userField.value) userField.value = currentUsername; }
    }
}

async function submitCardScannerForm(event) {
    if (event) event.preventDefault();
    const saveBtn = document.getElementById('cs-btn-submit-save');
    if (saveBtn) { saveBtn.disabled = true; saveBtn.innerHTML = '<span style="display:inline-flex; align-items:center; gap:6px;"><svg class="spin-anim" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line><line x1="19.07" y1="4.93" x2="4.93" y2="19.07"></line></svg>Guardando...</span>'; }

    const payload = {
        company_name: document.getElementById('cs-field-company').value.trim(),
        nit: document.getElementById('cs-field-nit').value.trim() || null,
        contact_name: document.getElementById('cs-field-contact').value.trim(),
        contact_role: document.getElementById('cs-field-role').value.trim() || 'Directivo / Asesor',
        contact_type: document.getElementById('cs-field-type').value.trim() || 'COMERCIAL',
        phone: document.getElementById('cs-field-phone').value.trim() || null,
        email: document.getElementById('cs-field-email').value.trim() || null,
        city: document.getElementById('cs-field-city').value.trim() || null,
        address: document.getElementById('cs-field-address').value.trim() || null,
        assigned_user: document.getElementById('cs-field-user').value || null,
        observations: document.getElementById('cs-field-obs').value.trim() || null
    };

    if (!payload.company_name) {
        showToast('El nombre de la empresa es obligatorio.', 'warning');
        if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = '<span style="display:inline-flex; align-items:center; gap:6px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>Guardar Prospecto</span>'; }
        return;
    }

    try {
        const response = await apiFetch(`${API_BASE}/card-scanner/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.detail || 'Fallo al guardar el prospecto.');
        }
        const result = await response.json();
        showToast(result.message || 'Prospecto guardado exitosamente', 'success');
        renderCardScannerSuccess(result);
        if (typeof loadCustomers === 'function') loadCustomers();
    } catch (err) {
        console.error('Error guardando tarjeta:', err);
        showToast(err.message || 'Error al guardar el prospecto', 'error');
    } finally {
        if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = '<span style="display:inline-flex; align-items:center; gap:6px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>Guardar Prospecto</span>'; }
    }
}

function renderCardScannerSuccess(res) {
    document.getElementById('cs-panel-review').style.display = 'none';
    document.getElementById('cs-panel-success').style.display = 'block';

    const cleanPhone = (res.phone || '').replace(/\D/g, '');
    let waPhone = cleanPhone;
    if (waPhone.length === 10 && !waPhone.startsWith('57')) waPhone = '57' + waPhone;

    const successDetails = document.getElementById('cs-success-details');
    if (successDetails) {
        successDetails.innerHTML = `
            <div style="font-size:1.15rem; font-weight:700; color:var(--text-main); margin-bottom:4px;">${res.company_name}</div>
            <div style="font-size:0.88rem; color:var(--text-muted); margin-bottom:12px; display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
                <span style="display:inline-flex; align-items:center; gap:4px;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>${res.contact_name}</span>
                <span style="display:inline-flex; align-items:center; gap:4px;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>${res.phone || 'Sin teléfono'}</span>
                <span style="display:inline-flex; align-items:center; gap:4px;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="16" x="2" y="4" rx="2"></rect><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path></svg>${res.email || 'Sin correo'}</span>
            </div>
            <div style="display:inline-flex; align-items:center; gap:6px; padding:3px 10px; border-radius:12px; font-size:0.75rem; font-weight:600; background:rgba(16,185,129,0.12); color:#10b981; border:1px solid rgba(16,185,129,0.3);">
                ${res.is_duplicate_merged ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>Contacto anexado a empresa existente' : '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 14 14"></polyline></svg>Nuevo prospecto prioritario registrado'}
            </div>
        `;
    }

    const waBtn = document.getElementById('cs-action-whatsapp');
    if (waBtn) {
        if (waPhone) {
            waBtn.style.display = 'inline-flex';
            waBtn.onclick = () => {
                const msg = encodeURIComponent(`Hola ${res.contact_name}, un gusto saludarte. Te escribe el equipo de ÁLACOR S.A.S.`);
                window.open(`https://wa.me/${waPhone}?text=${msg}`, '_blank');
            };
        } else waBtn.style.display = 'none';
    }

    const callBtn = document.getElementById('cs-action-call');
    if (callBtn) {
        if (cleanPhone) {
            callBtn.style.display = 'inline-flex';
            callBtn.onclick = () => { window.location.href = `tel:${cleanPhone}`; };
        } else callBtn.style.display = 'none';
    }

    const viewBtn = document.getElementById('cs-action-view');
    if (viewBtn) {
        viewBtn.onclick = () => {
            closeCardScannerModal();
            if (typeof openCustomerModal === 'function') openCustomerModal(res.nit);
        };
    }
}

function ensureEmployeesLoaded() {
    const userField = document.getElementById('cs-field-user');
    if (!userField || userField.options.length > 1) return;
    apiFetch(`${API_BASE}/employees?active_only=true`)
        .then(r => r.json())
        .then(employees => {
            userField.innerHTML = '<option value="">-- Sin asignar --</option>';
            (employees || []).forEach(emp => {
                if (emp.is_active !== false && emp.is_active !== 0) {
                    const opt = document.createElement('option');
                    opt.value = emp.username;
                    opt.textContent = `${emp.full_name} (${emp.role})`;
                    userField.appendChild(opt);
                }
            });
            const role = localStorage.getItem('role') || 'USER', currentUsername = localStorage.getItem('username') || '';
            if (role === 'USER') { userField.value = currentUsername; userField.disabled = true; }
        })
        .catch(err => console.error('Error cargando asesores:', err));
}
