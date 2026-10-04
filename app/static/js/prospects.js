// ─────────────────────────────────────────────────────────────────────────────
//  NEW PROSPECT CREATION MODAL (For Advisors & Management)
// ─────────────────────────────────────────────────────────────────────────────
function openNewProspectModal(prefill = null) {
    const existing = document.getElementById('new-prospect-modal');
    if (existing) existing.remove();

    const currentUser = localStorage.getItem('username') || 'FALARCON';
    const isAdv = isAdvisor();
    const helperTxt = isAdv ? 
        `<span style="display:inline-flex; align-items:center; gap:6px;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>Esta solicitud se asignará automáticamente a su cuenta (<strong>${currentUser}</strong>).</span>` : 
        `<span style="display:inline-flex; align-items:center; gap:6px;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>Como administrador/director, podrá asignar un asesor comercial o dejarla en cola general.</span>`;

    const compName = prefill?.company_name || '';
    const nit = prefill?.nit || prefill?.customer_nit || '';
    const contactName = prefill?.contact_name || '';
    const contactEmail = prefill?.contact_email || '';
    const contactPhone = prefill?.contact_phone || '';
    const vertical = prefill?.vertical || 'PRODUCTOS';
    const notes = prefill?.notes || '';

    const html = `
    <div class="modal-overlay active" id="new-prospect-modal" onclick="if(event.target===this)closeNewProspectModal()">
        <div class="modal-card" style="max-width:540px;" onclick="event.stopPropagation()">
            <div class="modal-header">
                <h3>${prefill ? 'Crear Solicitud de Cotización Comercial' : 'Registrar Nueva Solicitud de Cotización'}</h3>
                <button class="modal-close" onclick="closeNewProspectModal()" title="Cerrar ventana"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
            </div>
            <form id="form-new-prospect" onsubmit="submitNewProspect(event)" style="padding:20px; display:flex; flex-direction:column; gap:14px;">
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                    <div class="form-group" style="grid-column:1/-1;">
                        <label>Nombre de la Empresa / Cliente *</label>
                        <input type="text" id="np-company-name" required value="${compName}" placeholder="Ej: Industrias Metalúrgicas S.A.S." style="width:100%;">
                    </div>
                    <div class="form-group">
                        <label>NIT / Identificador *</label>
                        <input type="text" id="np-nit" required value="${nit}" placeholder="Ej: 900123456-1" style="width:100%;">
                    </div>
                    <div class="form-group">
                        <label>Unidad de Negocio *</label>
                        <select id="np-vertical" style="width:100%;">
                            <option value="PRODUCTOS" ${vertical === 'PRODUCTOS' ? 'selected' : ''}>Productos / Dotación</option>
                            <option value="SG-SST" ${vertical === 'SG-SST' ? 'selected' : ''}>SG-SST (Servicios)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Nombre de Contacto</label>
                        <input type="text" id="np-contact-name" value="${contactName}" placeholder="Ej: Ing. Carlos Pérez" style="width:100%;">
                    </div>
                    <div class="form-group">
                        <label>Correo Electrónico *</label>
                        <input type="email" id="np-contact-email" required value="${contactEmail}" placeholder="contacto@empresa.com" style="width:100%;">
                    </div>
                    <div class="form-group" style="grid-column:1/-1;">
                        <label>Teléfono / WhatsApp de Contacto *</label>
                        <input type="tel" id="np-contact-phone" required value="${contactPhone}" placeholder="Ej: +57 300 123 4567" style="width:100%;">
                    </div>
                </div>

                <div class="form-group" style="margin:0;">
                    <label>Requerimientos / Tema a Cotizar *</label>
                    <textarea id="np-notes" rows="2" required placeholder="Describa el requerimiento a cotizar (ej. 50 pares de botas de seguridad talla 40, arneses, dotación...)" style="width:100%; font-family:inherit;">${notes}</textarea>
                </div>

                <p style="margin:0; font-size:0.78rem; color:var(--text-muted); background:var(--card-bg); border:1px solid var(--border-color); padding:8px 12px; border-radius:6px;">
                    ${helperTxt}
                </p>

                <div style="display:flex; gap:8px; justify-content:flex-end; margin-top:6px;">
                    <button type="button" class="btn-secondary" onclick="closeNewProspectModal()">Cancelar</button>
                    <button type="submit" class="btn-primary" id="btn-save-prospect" style="display:inline-flex; align-items:center; gap:6px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Crear Solicitud Comercial</button>
                </div>
            </form>
        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', html);
}

function openConvertProspectModal(nit) {
    const cust = (customersList || []).find(c => String(c.nit).trim() === String(nit).trim()) || activeCustomerDetails;
    if (!cust) return showToast('No se encontró el cliente.', 'error');
    
    // Obtener primer contacto si existe
    const firstContact = (cust.contacts && cust.contacts.length > 0) ? cust.contacts[0] : {};
    
    openNewProspectModal({
        company_name: cust.company_name,
        nit: cust.nit,
        contact_name: firstContact.name || '',
        contact_email: firstContact.email || '',
        contact_phone: firstContact.phone || '',
        vertical: 'PRODUCTOS',
        notes: `Requerimiento comercial solicitado por ${firstContact.name || cust.company_name}.`
    });
}

function closeNewProspectModal() {
    const m = document.getElementById('new-prospect-modal');
    if (m) m.remove();
}

async function submitNewProspect(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-save-prospect');
    if (btn) { btn.disabled = true; btn.innerText = 'Procesando...'; }

    try {
        const company_name = document.getElementById('np-company-name').value.trim();
        const nit = document.getElementById('np-nit').value.trim();
        const vertical = document.getElementById('np-vertical').value;
        const contact_name = document.getElementById('np-contact-name').value.trim();
        const contact_email = document.getElementById('np-contact-email').value.trim();
        const contact_phone = document.getElementById('np-contact-phone').value.trim();
        const notes = document.getElementById('np-notes').value.trim();

        const payload = {
            company_name,
            customer_nit: nit,
            vertical,
            contact_email,
            contact_phone,
            topic: notes || `Solicitud Comercial ${vertical}`,
            notes,
            details: {
                contact_name,
                source: 'CREADO_POR_ASESOR'
            }
        };

        const res = await apiRequest(`${REQ_API}`, 'POST', payload);
        showToast(res.message || 'Prospecto registrado exitosamente.', 'success');
        closeNewProspectModal();
        loadRequests();
    } catch(err) {
        showToast(err.message || 'Error al guardar prospecto.', 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Guardar Prospecto'; }
    }
}

async function uploadMySignatureImage() {
    const fileInput = document.getElementById('prof-signature-file-input');
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        return showToast('Seleccione una imagen de firma (.png o .jpg).', 'error');
    }

    const username = localStorage.getItem('username');
    if (!username) return showToast('Error de sesión.', 'error');

    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem('crm_token') || localStorage.getItem('token');
    showToast('Subiendo firma manuscrita...', 'info');

    try {
        const res = await fetch(`${API_BASE}/employees/${username}/upload-signature`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Error al subir la firma');

        showToast('Firma manuscrita guardada correctamente.', 'success');
        
        const previewBox = document.getElementById('prof-signature-preview-box');
        if (previewBox && data.url) {
            previewBox.innerHTML = `<img src="${data.url}?t=${Date.now()}" style="max-height:60px; max-width:260px; object-fit:contain;" alt="Firma">`;
        }
        if (typeof openProfileSettingsModal === 'function') {
            setTimeout(openProfileSettingsModal, 300);
        }
    } catch(e) {
        showToast(e.message, 'error');
    }
}
