
function handleLaunchPreQuoteModal() {
    const req = window.currentViewedReq;
    closeViewReqModal();
    setTimeout(() => {
        openPreQuoteGeneratorModal(req);
    }, 50);
}

function handleLaunchOfferModal() {
    const req = window.currentViewedReq;
    closeViewReqModal();
    setTimeout(() => {
        if (req && (req.vertical === 'PRODUCTOS' || req.vertical === 'DOTACION' || req.details?.cart_quote || (req.details?.items && req.details.items.length > 0))) {
            openProductQuoteModal(req);
        } else {
            openOfferGeneratorModal(req);
        }
    }, 50);
}

function handleLaunchProductQuoteModal() {
    const req = window.currentViewedReq;
    closeViewReqModal();
    setTimeout(() => {
        openProductQuoteModal(req);
    }, 50);
}



async function previewUnifiedSgsstPdf() {
    const nitInput = document.getElementById('of-nit');
    const nit = nitInput ? nitInput.value.trim() : '';
    const zoneSelect = document.getElementById('pq-zone-select');
    const zoneName = zoneSelect ? zoneSelect.value : '';
    const visitPriceInput = document.getElementById('pq-visit-price');
    const visitPrice = visitPriceInput ? parseCurrency(visitPriceInput.value) : 0;
    const estImplInput = document.getElementById('of-impl-price');
    const estImpl = estImplInput ? parseCurrency(estImplInput.value) : 0;
    const estMonthlyInput = document.getElementById('of-monthly-price');
    const estMonthly = estMonthlyInput ? parseCurrency(estMonthlyInput.value) : 0;
    const notesInput = document.getElementById('of-notes');
    const notes = notesInput ? notesInput.value.trim() : '';
    const pkgSelect = document.getElementById('of-pkg-code');
    const pkgCode = pkgSelect ? pkgSelect.value : '';
    const payModeSelect = document.getElementById('of-payment-mode');
    const payMode = payModeSelect ? payModeSelect.value : 'MENSUAL';
    const discInput = document.getElementById('of-discount-pct');
    const discPct = discInput ? parseFloat(discInput.value) || 0 : 0;

    if (!nit) return showToast('NIT del cliente requerido para la vista previa.', 'error');

    const isTechVisit = (_unifiedDocType === 'TECHNICAL_VISIT' || _unifiedDocType === 'VISITA_TECNICA');
    const incImpl = isTechVisit ? false : (document.getElementById('chk-item-impl')?.checked ?? true);
    const incMonthly = isTechVisit ? false : (document.getElementById('chk-item-monthly')?.checked ?? true);
    const incVisit = isTechVisit ? true : (document.getElementById('chk-item-visit')?.checked ?? false);

    const activeVisitPrice = isTechVisit ? (visitPrice || 120000) : (incVisit ? visitPrice : 0);

    const payload = {
        doc_type: _unifiedDocType,
        customer_nit: nit,
        package_code: pkgCode,
        payment_frequency: payMode,
        discount_pct: discPct,
        zone_name: zoneName,
        visit_price: activeVisitPrice,
        estimated_implementation: incImpl ? estImpl : 0,
        estimated_monthly: incMonthly ? estMonthly : 0,
        include_implementation: incImpl,
        include_monthly: incMonthly,
        include_visit: incVisit,
        special_notes: notes,
        salesperson: localStorage.getItem('full_name') || localStorage.getItem('username') || 'Asesor Comercial ALACOR'
    };

    showToast('Generando vista previa del PDF...', 'info');

    try {
        const token = localStorage.getItem('crm_token') || localStorage.getItem('token');
        const res = await fetch(`${CMR_API}/pre-quotes/preview-pdf`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.detail || 'Error generando vista previa de PDF');
        }

        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);

        const existingModal = document.getElementById('pdf-preview-modal');
        if (existingModal) existingModal.remove();

        const previewHtml = `
        <div class="modal-overlay active" id="pdf-preview-modal" style="z-index:9999; padding:0; align-items:center; justify-content:center;" onclick="if(event.target===this)closePdfPreviewModal()">
            <div class="modal-card" id="pdf-preview-card" style="max-width:950px; width:95%; height:90vh; max-height:90vh; display:flex; flex-direction:column; padding:0; overflow:hidden; transition:all 0.2s ease; margin:auto;" onclick="event.stopPropagation()">
                <div class="modal-header" style="padding:8px 16px; background:var(--card-bg); border-bottom:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; flex-shrink:0;">
                    <h3 style="margin:0; font-size:0.95rem; display:flex; align-items:center; gap:8px;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                        <span>Vista Previa de Documento PDF (Estándar Alegra)</span>
                    </h3>
                    <div style="display:flex; align-items:center; gap:6px;">
                        <a href="${blobUrl}" target="_blank" class="action-icon-btn" title="Abrir PDF en pestaña nueva" aria-label="Abrir PDF en pestaña nueva">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                        </a>
                        <button type="button" class="action-icon-btn" id="btn-pdf-fullscreen" onclick="togglePdfFullscreen()" title="Alternar modo pantalla completa" aria-label="Alternar modo pantalla completa">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>
                        </button>
                        <button class="modal-close" onclick="closePdfPreviewModal()" aria-label="Cerrar" title="Cerrar">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18"></line></svg>
                        </button>
                    </div>
                </div>
                <div style="flex:1 1 auto; height:calc(100% - 45px); min-height:0; background:#525659; position:relative;">
                    <iframe src="${blobUrl}" id="pdf-preview-iframe" style="width:100%; height:100%; border:none; display:block;"></iframe>
                </div>
            </div>
        </div>`;

        document.body.insertAdjacentHTML('beforeend', previewHtml);
    } catch(e) {
        showToast(e.message, 'error');
    }
}

function togglePdfFullscreen() {
    const modal = document.getElementById('pdf-preview-modal');
    const card = document.getElementById('pdf-preview-card');
    const btn = document.getElementById('btn-pdf-fullscreen');
    if (!card || !modal) return;

    const isFs = card.classList.toggle('pdf-fullscreen-active');
    if (isFs) {
        modal.style.padding = '0';
        modal.style.margin = '0';
        card.style.maxWidth = '100vw';
        card.style.width = '100vw';
        card.style.height = '100vh';
        card.style.maxHeight = '100vh';
        card.style.borderRadius = '0';
        card.style.margin = '0';
        if (btn) {
            btn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 14 10 14 10 20"></polyline><polyline points="20 10 14 10 14 4"></polyline><line x1="14" y1="10" x2="21" y2="3"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>';
            btn.setAttribute('title', 'Restaurar Vista');
            btn.setAttribute('aria-label', 'Restaurar Vista');
        }
    } else {
        modal.style.padding = '0';
        modal.style.margin = '0';
        card.style.maxWidth = '950px';
        card.style.width = '95%';
        card.style.height = '90vh';
        card.style.maxHeight = '90vh';
        card.style.borderRadius = '12px';
        card.style.margin = 'auto';
        if (btn) {
            btn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>';
            btn.setAttribute('title', 'Alternar modo pantalla completa');
            btn.setAttribute('aria-label', 'Alternar modo pantalla completa');
        }
    }
}

function closePdfPreviewModal() {
    const m = document.getElementById('pdf-preview-modal');
    if (m) m.remove();
}

async function uploadCorporateLogo() {
    const fileInput = document.getElementById('logo-file-input');
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        return showToast('Seleccione un archivo de imagen (.jpg o .png).', 'error');
    }

    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem('crm_token') || localStorage.getItem('token');
    showToast('Subiendo logo corporativo...', 'info');

    try {
        const res = await fetch(`${CMR_API}/settings/logo`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Error subiendo el logo');

        showToast(data.message || 'Logo corporativo subido correctamente.', 'success');
        checkCorporateLogoStatus();
    loadCompanyHeaderConfig();
    } catch(e) {
        showToast(e.message, 'error');
    }
}

async function checkCorporateLogoStatus() {
    const box = document.getElementById('logo-preview-box');
    if (!box) return;
    try {
        const res = await fetch(`${CMR_API}/settings/logo`);
        if (res.ok) {
            const data = await res.json();
            const imgUrl = data.url || data.path;
            if (data.exists && imgUrl) {
                box.innerHTML = `<img src="${imgUrl}?t=${Date.now()}" style="max-width:100%; max-height:100%; object-fit:contain;">`;
            } else {
                box.innerHTML = `<span style="font-size:0.75rem; color:var(--text-muted);">Sin logo cargado</span>`;
            }
        }
    } catch(e) {}
}


// ── ROLE HELPERS v8.0.0 ─────────────────────────────────────────────────────
// Jerarquia: SUPERUSER > DIRECTOR > ADMIN (tecnico) > USER (asesor)

