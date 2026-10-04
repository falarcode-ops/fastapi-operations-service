let _isStalledMode = false;

function getRequestById(id) {
    if (!id) return null;
    const numId = parseInt(id, 10);
    return (_rawRequestsCache || []).find(r => r.id === numId || String(r.id) === String(id)) || null;
}
window.getRequestById = getRequestById;

function debounceLoadRequests() {
    clearTimeout(_reqSearchDebounceTimer);
    _reqSearchDebounceTimer = setTimeout(() => {
        if (_requestsPagination) _requestsPagination.currentPage = 1;
        loadRequests();
    }, 300);
}

function switchRequestVertical(vertical) {
    _isStalledMode = false;
    _currentReqVertical = vertical;
    const btnSst = document.getElementById('req-tab-sgsst');
    const btnProd = document.getElementById('req-tab-productos');
    const btnAll = document.getElementById('req-tab-all');
    const btnStalled = document.getElementById('req-tab-stalled');

    [btnSst, btnProd, btnAll].forEach(b => {
        if (b) {
            b.className = 'btn-secondary';
        }
    });

    if (btnStalled) {
        btnStalled.className = 'btn-secondary';
        btnStalled.style.background = '';
        btnStalled.style.color = '#d97706';
    }

    if ((vertical === 'Procesos' || vertical === 'SG-SST') && btnSst) btnSst.className = 'btn-primary';
    else if ((vertical === 'Automatización' || vertical === 'PRODUCTOS') && btnProd) btnProd.className = 'btn-primary';
    else if (!vertical && btnAll) btnAll.className = 'btn-primary';

    if (_requestsPagination) _requestsPagination.currentPage = 1;
    loadRequests();
}

function switchRequestStalledFilter() {
    _isStalledMode = !_isStalledMode;
    const btnStalled = document.getElementById('req-tab-stalled');
    const btnSst = document.getElementById('req-tab-sgsst');
    const btnProd = document.getElementById('req-tab-productos');
    const btnAll = document.getElementById('req-tab-all');

    if (_isStalledMode) {
        if (btnStalled) {
            btnStalled.className = 'btn-primary';
            btnStalled.style.background = '#f59e0b';
            btnStalled.style.color = '#fff';
        }
        [btnSst, btnProd, btnAll].forEach(b => { if (b) b.className = 'btn-secondary'; });
    } else {
        switchRequestVertical(_currentReqVertical);
        return;
    }

    if (_requestsPagination) _requestsPagination.currentPage = 1;
    loadRequests();
}
window.switchRequestStalledFilter = switchRequestStalledFilter;

function setRequestsPage(page) {
    if (!_requestsPagination) _requestsPagination = createPaginationState({ pageSize: 30 });
    _requestsPagination.currentPage = page;
    renderRequestsFromCache();
}
window.setRequestsPage = setRequestsPage;

function setRequestsPageSize(size) {
    if (!_requestsPagination) _requestsPagination = createPaginationState({ pageSize: 30 });
    _requestsPagination.pageSize = size;
    _requestsPagination.currentPage = 1;
    renderRequestsFromCache();
}
window.setRequestsPageSize = setRequestsPageSize;

function renderRequestsFromCache() {
    const tbody = document.getElementById('requests-tbody') || document.getElementById('requests-table-body');
    if (!tbody) return;

    if (!_requestsPagination) {
        _requestsPagination = createPaginationState({ pageSize: 30 });
    }

    const filtered = _rawRequestsCache || [];
    if (filtered.length === 0) {
        const emptyMsg = _isStalledMode ? 'No hay cotizaciones estancadas. ¡Todo el pipeline está al día!' : 'No hay solicitudes encontradas para el filtro seleccionado.';
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:40px; color:var(--text-muted);">
            <div style="margin-bottom:10px; display:inline-flex; align-items:center; justify-content:center; width:44px; height:44px; border-radius:50%; background:var(--bg-secondary); border:1px solid var(--border-color); color:var(--text-muted);">
                ${_isStalledMode 
                    ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>'
                    : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>'}
            </div>
            <div style="font-weight:600; color:var(--text-primary); font-size:0.9rem;">${emptyMsg}</div>
        </td></tr>`;
        renderPaginationBar('requests-pagination-bar', _requestsPagination, 'setRequestsPage', 'setRequestsPageSize');
        return;
    }

    const pagedRequests = getPagedSlice(filtered, _requestsPagination);

    tbody.innerHTML = pagedRequests.map(r => {
        const vBadge = r.vertical === 'SG-SST' ? 'SST' : 'PRODUCTOS';
        const vColor = r.vertical === 'SG-SST' ? '#0288d1' : '#7b1fa2';
        const detailsSummary = r.details ? (
            r.details.diagnostic_score !== undefined ? 
            `Score: <strong>${r.details.diagnostic_score}%</strong> · Plan: ${r.details.selected_plan || 'N/A'}` :
            (r.topic || 'Solicitud de Cotización')
        ) : (r.topic || '—');
        
        const spBadge = r.assigned_salesperson ? 
            `<span style="font-weight:500; color:var(--text-primary);">${r.assigned_salesperson}</span>` : 
            `<span style="color:var(--text-muted); font-style:italic; font-size:0.78rem;">Sin Asignar</span>`;

        const rawDate = r.created_at || '';
        const dateStr = rawDate.substring(0, 10);
        const timeStr = rawDate.length >= 16 ? rawDate.substring(11, 16) : '';
        
        const reqJsonStr = JSON.stringify(r).replace(/'/g, "&apos;");
        const reqDetails = r.details || (r.details_json ? (typeof r.details_json === 'string' ? JSON.parse(r.details_json) : r.details_json) : {});
        const alegraId = reqDetails.alegra_estimate_id;

        let subCompanyInfo = '';
        const nitVal = (r.customer_nit || '').trim();
        const isInternalId = nitVal.startsWith('ChIJ') || nitVal.startsWith('AC') || nitVal.length > 20 || nitVal === 'NATURAL' || nitVal === '0';
        
        if (!isInternalId && nitVal) {
            subCompanyInfo = `<div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">NIT: <span style="font-family:monospace; font-weight:600;">${nitVal}</span></div>`;
        } else {
            const sector = reqDetails.sector || reqDetails.segment || r.sector;
            const city = reqDetails.city || r.city;
            if (city && sector) {
                subCompanyInfo = `<div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;"><span>${city}</span> · <span>${sector}</span></div>`;
            } else if (sector) {
                subCompanyInfo = `<div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">${sector}</div>`;
            } else if (city) {
                subCompanyInfo = `<div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">${city}</div>`;
            } else {
                subCompanyInfo = `<div style="font-size:0.73rem; color:var(--accent-cyan); margin-top:2px; font-weight:500;">Prospección B2B</div>`;
            }
        }

        // Stalled Deal calculation & badge
        let stalledBadge = '';
        const rawUpd = r.updated_at || r.created_at || '';
        let daysInactive = r.days_stalled;
        if (daysInactive === undefined && rawUpd) {
            const updTs = new Date(rawUpd).getTime();
            const diffDays = (Date.now() - updTs) / (1000 * 86400);
            if (diffDays >= 3 && !['GANADO', 'PERDIDO', 'GANADA', 'PERDIDA', 'CERRADA'].includes((r.status || '').toUpperCase())) {
                daysInactive = Math.round(diffDays * 10) / 10;
            }
        }
        if (daysInactive && daysInactive >= 3) {
            stalledBadge = `<div style="margin-top:3px;"><span style="background:rgba(245,158,11,0.12); color:#d97706; border:1px solid rgba(245,158,11,0.25); padding:2px 6px; border-radius:4px; font-size:0.68rem; font-weight:600; display:inline-flex; align-items:center; gap:4px;" title="Cotización sin avance por más de 3 días"><span style="width:5px; height:5px; border-radius:50%; background:#d97706; display:inline-block;"></span> ${daysInactive}d inactiva</span></div>`;
        }

        let quoteActionBtn = '';
        if (alegraId) {
            quoteActionBtn = `<a href="https://app.alegra.com/estimate/view/id/${alegraId}" target="_blank" class="action-icon-btn" data-tip="Ver Cotización Oficial en Alegra #${alegraId}&#10;• Para qué sirve: Consulta la cotización oficial emitida en Alegra.&#10;• Cuándo usarlo: Para revisar ítems facturables o descargar el PDF oficial." style="text-decoration:none; display:inline-flex; align-items:center; justify-content:center;">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            </a>`;
        } else if (r.vertical === 'PRODUCTOS' || r.vertical === 'DOTACION' || reqDetails.cart_quote || (reqDetails.items && reqDetails.items.length > 0)) {
            quoteActionBtn = `<button class="action-icon-btn" onclick="openProductQuoteModal(${r.id})" data-tip="Cotizador Inteligente Alegra & COREPRICE&#10;• Para qué sirve: Conecta con el catálogo de precios y crea la cotización oficial en Alegra.&#10;• Cuándo usarlo: Para cotizar pedidos web de calzado y dotación.">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
            </button>`;
        }

        const safePhone = (r.contact_phone || '').replace(/'/g, "");
        const safeCompany = (r.company_name || '').replace(/'/g, "");

        return `<tr>
            <td><strong style="font-family:var(--font-heading); letter-spacing:0.02em;">${r.request_number}</strong></td>
            <td><span style="background:${vColor}18; color:${vColor}; border:1px solid ${vColor}40; padding:2px 7px; border-radius:6px; font-size:0.68rem; font-weight:600;">${vBadge}</span></td>
            <td>
                <div style="font-weight:600; color:var(--text-primary);">${r.company_name}</div>
                ${subCompanyInfo}
            </td>
            <td style="font-size:0.8rem;">
                <div>${r.contact_email ? `<a href="javascript:void(0)" onclick="openSendQuoteEmailModal(${r.id})" style="color:var(--text-primary); text-decoration:none; display:inline-flex; align-items:center; gap:4px;" data-tip="Despachar Correo de Cotización&#10;• Para qué sirve: Abre la plantilla oficial para enviar la oferta por correo.&#10;• Cuándo usarlo: Cuando la cotización esté lista para ser entregada al cliente."><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.6;"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>${r.contact_email}</a>` : '—'}</div>
                <div style="color:var(--text-muted); font-size:0.75rem; margin-top:2px;">
                    ${r.contact_phone ? `<a href="javascript:void(0)" onclick="openWhatsAppWithAutoLog('${safePhone}', '${safeCompany}', ${r.id}, '${r.request_number}')" style="color:var(--text-secondary); text-decoration:none; font-weight:500; display:inline-flex; align-items:center; gap:5px;" data-tip="WhatsApp con Auto-Registro&#10;• Para qué sirve: Abre chat en WhatsApp y solicita confirmación para guardar en bitácora.&#10;• Cuándo usarlo: Para contactar al decisor en tiempo real."><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style="color:#25d366;"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>${r.contact_phone}</a>` : ''}
                </div>
            </td>
            <td style="font-size:0.8rem;">${detailsSummary}</td>
            <td>${spBadge}</td>
            <td>
                ${cmrBadge(r.status)}
                ${stalledBadge}
            </td>
            <td style="font-size:0.78rem; white-space:nowrap;">
                <div>${dateStr}</div>
                ${timeStr ? `<div style="color:var(--text-muted); font-size:0.72rem;">${timeStr}</div>` : ''}
            </td>
            <td>
                <div class="icon-btn-group">
                    <button class="action-icon-btn" onclick="openLogNegotiationModal(${r.id})" data-tip="Registrar Negociación Externa&#10;• Para qué sirve: Graba llamadas, WhatsApp o visitas en la bitácora y actualiza la etapa.&#10;• Cuándo usarlo: Tras conversar con el cliente para evitar que la cotización caiga en estancadas.">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/><line x1="8" y1="9" x2="16" y2="9"/><line x1="8" y1="13" x2="14" y2="13"/></svg>
                    </button>
                    <button class="action-icon-btn" onclick="openSendQuoteEmailModal(${r.id})" data-tip="Despachar Cotización por Correo&#10;• Para qué sirve: Envía la propuesta formal con link de Alegra/PDF por correo corporativo.&#10;• Cuándo usarlo: Cuando la propuesta comercial esté lista para entrega formal.">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
                    </button>
                    <button class="action-icon-btn" onclick="openAssignModal(${r.id})" data-tip="Asignar Asesor Comercial&#10;• Para qué sirve: Transfiere la cuenta y la solicitud a un asesor responsable.&#10;• Cuándo usarlo: Para balancear la carga de trabajo entre el equipo de ventas.">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
                    </button>
                    <button class="action-icon-btn" onclick="viewRequestDetails(${r.id})" data-tip="Ver Detalle y Diagnóstico&#10;• Para qué sirve: Consulta ítems de carrito, diagnóstico SG-SST y recomendaciones IA.&#10;• Cuándo usarlo: Para estudiar el requerimiento técnico antes de contactar al cliente.">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    </button>
                    ${quoteActionBtn}
                    <button class="action-icon-btn" onclick="openUpdateReqStatusModal(${r.id})" data-tip="Actualizar Estado del Requerimiento&#10;• Para qué sirve: Modifica el ciclo de vida (EN_GESTION, COTIZADA, CERRADA).&#10;• Cuándo usarlo: Para forzar el avance del requerimiento.">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
                    </button>
                </div>
            </td>
        </tr>`;
    }).join('');

    renderPaginationBar('requests-pagination-bar', _requestsPagination, 'setRequestsPage', 'setRequestsPageSize');
}

async function loadRequests() {
    const tbody = document.getElementById('requests-tbody') || document.getElementById('requests-table-body');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:20px; color:var(--text-muted);">Cargando solicitudes...</td></tr>';
    
    try {
        const status = document.getElementById('req-filter-status')?.value || '';
        const stage = document.getElementById('req-filter-stage')?.value || '';
        const search = (document.getElementById('req-filter-search')?.value || '').toLowerCase().trim();
        
        let requests = [];
        if (_isStalledMode) {
            let url = `${REQ_API}/stalled?days=3`;
            if (_currentReqVertical) url += `&vertical=${encodeURIComponent(_currentReqVertical)}`;
            if (stage) url += `&stage=${encodeURIComponent(stage)}`;
            const res = await apiRequest(url);
            requests = res.stalled_requests || [];
        } else {
            let queryParams = [];
            if (_currentReqVertical) queryParams.push(`vertical=${encodeURIComponent(_currentReqVertical)}`);
            if (status) queryParams.push(`status=${encodeURIComponent(status)}`);
            if (stage) queryParams.push(`pipeline_stage=${encodeURIComponent(stage)}`);
            
            const url = `${REQ_API}${queryParams.length ? '?' + queryParams.join('&') : ''}`;
            requests = await apiRequest(url);
        }
        
        if (search) {
            requests = (requests || []).filter(r => 
                (r.company_name || '').toLowerCase().includes(search) ||
                (r.customer_nit || '').toLowerCase().includes(search) ||
                (r.request_number || '').toLowerCase().includes(search) ||
                (r.contact_email || '').toLowerCase().includes(search)
            );
        }
        
        _rawRequestsCache = requests || [];
        renderRequestsFromCache();
        
    } catch(e) {
        if (e.message && (e.message.includes('404') || e.message.includes('Not Found'))) {
            tbody.innerHTML = '<tr><td colspan="9" style="color:var(--text-muted); padding:30px; text-align:center;">Sin solicitudes registradas en esta bandeja.</td></tr>';
        } else {
            tbody.innerHTML = `<tr><td colspan="9" style="color:#f44336; padding:20px; text-align:center;">Error cargando solicitudes: ${e.message}</td></tr>`;
        }
    }
}


async function loadSalespeopleForSelect(selectId, currentValue = '') {
    const sel = document.getElementById(selectId);
    if (!sel) return;
    try {
        const res = await apiFetch(`${API_BASE}/employees?active_only=true`);
        let employees = [];
        if (res.ok) {
            employees = await res.json();
        }
        // Filter strictly ACTIVE employees
        const activeEmployees = (employees || []).filter(e => e.is_active !== false && e.is_active !== 0);

        sel.innerHTML = '<option value="">-- Seleccionar Asesor Comercial --</option>';
        activeEmployees.forEach(e => {
            const displayName = e.full_name ? `${e.full_name} (${e.username})` : e.username;
            const val = e.full_name || e.username;
            const isSelected = (currentValue && (currentValue.toLowerCase() === val.toLowerCase() || currentValue.toLowerCase() === e.username.toLowerCase())) ? 'selected' : '';
            sel.innerHTML += `<option value="${val}" ${isSelected}>${displayName}</option>`;
        });

        // If a request already has an inactive user assigned historically, maintain it visible with an explicit inactive tag
        if (currentValue && !activeEmployees.some(e => (e.full_name || '').toLowerCase() === currentValue.toLowerCase() || (e.username || '').toLowerCase() === currentValue.toLowerCase())) {
            sel.innerHTML += `<option value="${currentValue}" selected>${currentValue} (Inactivo)</option>`;
        }
    } catch(e) {
        sel.innerHTML = '<option value="">-- Error al cargar asesores --</option>';
    }
}


function openAssignModal(req) {
    if (typeof req === 'number' || typeof req === 'string') req = getRequestById(req);
    if (!req) return;
    const html = `
    <div class="modal-overlay active" id="assign-req-modal" onclick="if(event.target===this)closeAssignModal()">
        <div class="modal-card" style="max-width:480px;" onclick="event.stopPropagation()">
            <div class="modal-header">
                <h3 style="display:flex; align-items:center; gap:8px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>Asignar Asesor Comercial</h3>
                <button class="modal-close" onclick="closeAssignModal()" title="Cerrar ventana"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
            </div>
            <div style="padding:20px; display:flex; flex-direction:column; gap:14px;">
                <div style="background:var(--card-bg); border:1px solid var(--border-color); border-radius:8px; padding:12px;">
                    <div style="font-size:0.85rem; font-weight:700; color:var(--accent-primary);">${req.request_number} — ${req.company_name}</div>
                    <div style="font-size:0.78rem; color:var(--text-muted); margin-top:4px;">${(!((req.customer_nit||'').startsWith('ChIJ')||(req.customer_nit||'').startsWith('AC')||(req.customer_nit||'').length>20||req.customer_nit==='NATURAL') && req.customer_nit) ? `NIT: ${req.customer_nit} · ` : ''}Vertical: ${req.vertical}${req.details?.sector ? ` · Sector: ${req.details.sector}` : ''}</div>
                </div>
                <div class="form-group" style="margin:0;">
                    <label>Asesor Comercial Asignado *</label>
                    <select id="assign-sp-name" style="width:100%;">
                        <option value="">Cargando asesores comerciales...</option>
                    </select>
                </div>
                <p style="margin:0; font-size:0.78rem; color:var(--text-muted); display:flex; align-items:flex-start; gap:6px;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0; margin-top:2px;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                    <span>Al asignar un asesor, el estado cambiará automáticamente a <strong>ASIGNADA</strong> y la empresa conservará este asesor para futuras solicitudes.</span>
                </p>
                <div style="display:flex; gap:8px; justify-content:flex-end; margin-top:8px;">
                    <button class="btn-secondary btn-compact" onclick="closeAssignModal()">Cancelar</button>
                    <button class="btn-primary btn-compact" onclick="submitAssignRequest('${req.id}')" title="Confirmar asignación del asesor comercial"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:5px;"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>Asignar</button>
                </div>
            </div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
    loadSalespeopleForSelect('assign-sp-name', req.assigned_salesperson);
}

function closeAssignModal() {
    const m = document.getElementById('assign-req-modal');
    if (m) m.remove();
}

async function submitAssignRequest(reqId) {
    const sp = document.getElementById('assign-sp-name')?.value?.trim();
    if (!sp) return showToast('Seleccione un asesor comercial.', 'error');
    
    // Protocolo de confirmación de asignación
    if (!confirm(`PROTOCOLO DE ASIGNACIÓN:\n\n¿Confirmas que deseas asignar esta cuenta y solicitud al asesor comercial: "${sp}"?\n\nEl estado cambiará automáticamente a ASIGNADA y el cliente quedará vinculado a este asesor.`)) {
        return;
    }

    try {
        const res = await apiRequest(`${REQ_API}/${reqId}/assign`, 'PUT', { assigned_salesperson: sp });
        showToast(res.message || 'Asesor asignado correctamente.', 'success');
        closeAssignModal();
        loadRequests();
    } catch(e) {
        showToast(e.message, 'error');
    }
}

function openUpdateReqStatusModal(req) {
    const reqId = typeof req === 'object' ? req.id : req;
    const reqNum = typeof req === 'object' ? (req.request_number || `SOL-${reqId}`) : `SOL-${reqId}`;
    const compName = typeof req === 'object' ? (req.company_name || 'Empresa') : 'Empresa';
    const currStatus = typeof req === 'object' ? (req.status || 'NUEVA').toUpperCase() : 'NUEVA';

    const html = `
    <div class="modal-overlay active" id="update-req-status-modal" onclick="if(event.target===this)closeUpdateReqStatusModal()">
        <div class="modal-card" style="max-width:480px; width:100%;" onclick="event.stopPropagation()">
            <div class="modal-header">
                <h3 style="display:flex; align-items:center; gap:8px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>Actualizar Estado del Requerimiento</h3>
                <button class="modal-close" onclick="closeUpdateReqStatusModal()" title="Cerrar ventana"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
            </div>
            <div style="padding:20px; display:flex; flex-direction:column; gap:14px;">
                <div style="background:var(--card-bg); border:1px solid var(--border-color); border-radius:8px; padding:10px 12px; font-size:0.82rem;">
                    <strong>Solicitud:</strong> ${reqNum} — ${compName}
                </div>
                
                <div class="form-group" style="margin:0;">
                    <label>Nuevo Estado Comercial *</label>
                    <select id="update-status-val" style="width:100%;">
                        <option value="NUEVA" ${currStatus==='NUEVA'?'selected':''}>NUEVA (Sin Asignar / En cola)</option>
                        <option value="ASIGNADA" ${currStatus==='ASIGNADA'?'selected':''}>ASIGNADA (Asesor designado)</option>
                        <option value="EN_GESTION" ${currStatus==='EN_GESTION'?'selected':''}>EN GESTIÓN (Contacto o análisis en curso)</option>
                        <option value="COTIZADA" ${currStatus==='COTIZADA'?'selected':''}>COTIZADA (Propuesta formal emitida)</option>
                        <option value="CERRADA" ${currStatus==='CERRADA'?'selected':''}>CERRADA / GANADA (Venta exitosa)</option>
                        <option value="RECHAZADA" ${currStatus==='RECHAZADA'?'selected':''}>RECHAZADA / PERDIDA</option>
                    </select>
                </div>

                <div style="background:rgba(245,158,11,0.06); border:1px solid rgba(245,158,11,0.25); border-radius:8px; padding:10px 12px; font-size:0.75rem; color:#d97706; line-height:1.4; display:flex; align-items:flex-start; gap:8px;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2" style="flex-shrink:0; margin-top:2px;"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                    <span><strong>Protocolo de Control:</strong> Cambiar el estado a <strong>CERRADA</strong> o <strong>RECHAZADA</strong> finalizará el ciclo activo de esta oportunidad comercial en los reportes e indicadores.</span>
                </div>

                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
                    <button class="btn-secondary btn-compact" onclick="closeUpdateReqStatusModal()">Cancelar</button>
                    <button class="btn-primary btn-compact" onclick="submitUpdateReqStatus(${reqId})" title="Guardar nuevo estado del requerimiento">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:5px;"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>Actualizar
                    </button>
                </div>
            </div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
}
window.openUpdateReqStatusModal = openUpdateReqStatusModal;

function closeUpdateReqStatusModal() {
    const m = document.getElementById('update-req-status-modal');
    if (m) m.remove();
}
window.closeUpdateReqStatusModal = closeUpdateReqStatusModal;

async function submitUpdateReqStatus(reqId) {
    const newStatus = document.getElementById('update-status-val')?.value?.trim();
    if (!newStatus) return showToast('Seleccione un estado válido.', 'error');

    if (['CERRADA', 'RECHAZADA'].includes(newStatus)) {
        if (!confirm(`PROTOCOLO DE CONFIRMACIÓN:\n\n¿Estás completamente seguro de cambiar el estado de este requerimiento a "${newStatus}"?\n\nEsta acción modificará las métricas comerciales y el embudo de ventas.`)) {
            return;
        }
    }

    try {
        const res = await apiRequest(`${REQ_API}/${reqId}/status`, 'PUT', { status: newStatus });
        showToast(res.message || 'Estado actualizado con éxito.', 'success');
        closeUpdateReqStatusModal();
        loadRequests();
    } catch(e) {
        showToast(e.message, 'error');
    }
}
window.submitUpdateReqStatus = submitUpdateReqStatus;

window.updateReqStatus = (reqId) => {
    openUpdateReqStatusModal(reqId);
};

function renderDiagnosticDetailsHtml(details) {
    if (!details) return '<div style="color:var(--text-muted);">No hay detalles adicionales registrados.</div>';

    let data = details;
    if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch(e) {}
    }
    if (typeof data !== 'object' || data === null) {
        return `<div>${data}</div>`;
    }

    // Render Product Cart Quote
    if (data.cart_quote || (data.items && Array.isArray(data.items))) {
        const items = data.items || [];
        const itemRows = items.map(item => {
            const sku = item.sku || '—';
            const name = item.name || 'Producto';
            const brand = item.brand ? `<span style="font-size:0.75rem; background:rgba(99,102,241,0.1); color:#4f46e5; padding:2px 6px; border-radius:4px; margin-left:6px; font-weight:600;">${item.brand}</span>` : '';
            const qty = item.quantity || item.qty || 1;
            const price = item.unit_price || item.price;
            const priceStr = price ? `$${Number(price).toLocaleString('es-CO')}` : '<span style="color:var(--text-muted); font-style:italic;">Por cotizar</span>';
            const subtotal = price ? `$${(Number(price) * qty).toLocaleString('es-CO')}` : '—';
            
            return `<tr style="border-bottom:1px solid var(--border-color); font-size:0.83rem;">
                <td style="padding:10px 12px; font-family:monospace; font-weight:600; color:#6366f1;">${sku}</td>
                <td style="padding:10px 12px; min-width:240px;"><strong style="color:var(--text-primary);">${name}</strong> ${brand}</td>
                <td style="padding:10px 12px; text-align:center;"><span style="background:rgba(0,242,254,0.12); color:#0284c7; padding:3px 9px; border-radius:12px; font-weight:700;">${qty}</span></td>
                <td style="padding:10px 12px; text-align:right; color:var(--text-muted); font-family:monospace;">${priceStr}</td>
                <td style="padding:10px 12px; text-align:right; font-weight:700; color:var(--text-primary); font-family:monospace;">${subtotal}</td>
            </tr>`;
        }).join('');

        const totalStr = data.estimated_total ? `$${Number(data.estimated_total).toLocaleString('es-CO')}` : '—';
        const cityStr = data.city ? ` · ${data.city}` : '';
        const deliveryStr = data.delivery_address ? `<div style="font-size:0.82rem; color:var(--text-muted); margin-top:5px;"><span style="display:inline-flex; align-items:center; gap:4px;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg><strong>Dirección de Entrega:</strong></span> <span style="color:var(--text-primary);">${data.delivery_address}</span></div>` : '';
        const billingEmailStr = data.billing_email ? `<div style="font-size:0.82rem; color:var(--text-muted); margin-top:4px;"><span style="display:inline-flex; align-items:center; gap:4px;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="16" x="2" y="4" rx="2"></rect><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path></svg><strong>Facturación Electrónica:</strong></span> <span style="color:var(--text-primary);">${data.billing_email}</span></div>` : '';
        const howFoundStr = data.how_found ? `<div style="font-size:0.82rem; color:var(--text-muted); margin-top:4px;"><span style="display:inline-flex; align-items:center; gap:4px;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg><strong>Origen / Cómo nos conoció:</strong></span> <span style="color:var(--text-primary);">${data.how_found}</span></div>` : '';

        const isAbandoned = data.is_abandoned === true || String(data.quote_status).includes('ABANDONED');
        const badgeBg = isAbandoned ? 'rgba(255,152,0,0.15)' : 'rgba(76,175,80,0.15)';
        const badgeColor = isAbandoned ? '#f57c00' : '#2e7d32';
        const badgeText = isAbandoned ? '<span class="comm-dot comm-dot-amber"></span> Carrito Abandonado (Borrador Web)' : '<span class="comm-dot comm-dot-green"></span> Cotización Formal Web';

        return `
            <div style="background:var(--card-bg); border:1px solid var(--border-color); border-radius:10px; padding:14px; margin-bottom:14px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                    <span style="font-weight:700; color:var(--accent-primary); font-size:0.92rem; display:inline-flex; align-items:center; gap:6px;">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                        Cotización de Carrito Web (${items.length} productos${cityStr})
                    </span>
                    <span style="background:${badgeBg}; color:${badgeColor}; font-size:0.78rem; font-weight:700; padding:4px 10px; border-radius:12px; display:inline-flex; align-items:center; gap:6px;">
                        ${badgeText}
                    </span>
                </div>
                ${deliveryStr}
                ${billingEmailStr}
                ${howFoundStr}
            </div>
            <div style="overflow-x:auto; -webkit-overflow-scrolling:touch; border-radius:10px; border:1px solid var(--border-color); margin-bottom:14px; background:var(--card-bg);">
                <table style="width:100%; min-width:620px; border-collapse:collapse; text-align:left;">
                    <thead>
                        <tr style="background:rgba(0,120,255,0.08); font-size:0.75rem; text-transform:uppercase; letter-spacing:0.04em; color:var(--text-primary); border-bottom:1px solid var(--border-color);">
                            <th style="padding:10px 12px; width:140px;">SKU</th>
                            <th style="padding:10px 12px;">Producto / Descripción</th>
                            <th style="padding:10px 12px; text-align:center; width:70px;">Cant.</th>
                            <th style="padding:10px 12px; text-align:right; width:120px;">P. Unit</th>
                            <th style="padding:10px 12px; text-align:right; width:130px;">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemRows}
                    </tbody>
                </table>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; background:linear-gradient(135deg, rgba(0,242,254,0.08) 0%, rgba(79,70,229,0.08) 100%); border:1px solid var(--border-color); padding:12px 18px; border-radius:10px;">
                <span style="font-weight:700; font-size:0.9rem; color:var(--text-primary);">Total Estimado de la Solicitud:</span>
                <span style="font-weight:800; font-size:1.25rem; color:var(--accent-primary); font-family:monospace;">${totalStr}</span>
            </div>
        `;
    }

    let onboarding = null;
    if (data.onboarding_payload) {
        if (typeof data.onboarding_payload === 'string') {
            try { onboarding = JSON.parse(data.onboarding_payload); } catch(e) {}
        } else if (typeof data.onboarding_payload === 'object') {
            onboarding = data.onboarding_payload;
        }
    }

    const labelsMap = {
        'selected_plan': 'Plan Seleccionado',
        'plan_recommended': 'Plan Recomendado',
        'employees_count': 'Número de Empleados',
        'risk_level': 'Nivel de Riesgo ARL',
        'economic_activity': 'Actividad Económica',
        'diagnostic_score': 'Puntaje Diagnóstico Web',
        'contact_name': 'Nombre de Contacto',
        'preferred_payment_mode': 'Modalidad de Pago Preferida'
    };

    // Render N8N Outbound Lead Intelligence Card if present
    const n8nMeta = data.n8n_metadata || {};
    const hasN8n = data.source === 'N8N_ETL' || Object.keys(n8nMeta).length > 0 || data.draft_message;
    let n8nCardHtml = '';
    if (hasN8n) {
        const linkedin = n8nMeta.linkedin || data.linkedin;
        const seniority = n8nMeta.seniority || data.seniority;
        const priority = n8nMeta.priority || data.priority || 'Normal';
        const conf = n8nMeta.email_confidence || data.email_confidence;
        const segment = n8nMeta.segment || data.segment;
        const draft = n8nMeta.draft_message || data.draft_message;
        
        n8nCardHtml = `
        <div style="grid-column: 1 / -1; background: rgba(99, 102, 241, 0.06); border: 1px solid rgba(99, 102, 241, 0.25); border-radius: 10px; padding: 14px; margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <span style="font-size: 0.88rem; font-weight: 700; color: #6366f1; display: flex; align-items: center; gap: 6px;">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>
                    Inteligencia de Prospección Outbound (N8N / IA)
                </span>
                <span style="font-size: 0.74rem; background: rgba(99, 102, 241, 0.15); color: #4f46e5; padding: 3px 9px; border-radius: 6px; font-weight: 700;">
                    Prioridad: ${priority}
                </span>
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 8px; font-size: 0.82rem; margin-bottom: 10px;">
                ${segment ? `<div><strong>Segmento:</strong> ${segment}</div>` : ''}
                ${seniority && seniority !== 'N/A' ? `<div><strong>Jerarquía:</strong> ${seniority}</div>` : ''}
                ${conf ? `<div><strong>Certeza Email:</strong> <span style="color: #10b981; font-weight: 700;">${conf}%</span></div>` : ''}
                ${linkedin && linkedin !== 'No disponible' && linkedin !== '' ? `<div><strong>LinkedIn:</strong> <a href="${linkedin}" target="_blank" style="color: #0077b5; text-decoration: none; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>Ver Perfil</a></div>` : ''}
            </div>
            ${draft ? `
            <div style="margin-top: 10px; border-top: 1px dashed rgba(99, 102, 241, 0.25); padding-top: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <strong style="font-size: 0.8rem; color: #4f46e5; display: inline-flex; align-items: center; gap: 5px;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>Borrador de Propuesta IA Generado:</strong>
                    <button type="button" class="btn-secondary" onclick="navigator.clipboard.writeText(this.nextElementSibling.innerText); showToast('Borrador copiado al portapapeles', 'success')" style="font-size: 0.72rem; padding: 2px 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>Copiar Borrador</button>
                    <div style="display: none;">${draft}</div>
                </div>
                <div style="max-height: 180px; overflow-y: auto; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 6px; padding: 10px; font-size: 0.8rem; color: var(--text-primary); line-height: 1.45;">
                    ${draft}
                </div>
            </div>` : ''}
        </div>
        `;
    }

    // Render key metrics in cards
    let itemsHtml = [];
    const plan = data.selected_plan || data.plan_recommended || (onboarding ? onboarding.selected_plan : '');

    if (plan) {
        const cleanPlan = String(plan).replace(/_/g, ' ').toUpperCase();
        itemsHtml.push(`
            <div style="grid-column:1/-1; background:rgba(0,120,255,0.08); border-left:4px solid var(--accent-primary); padding:8px 12px; border-radius:6px; font-weight:700; color:var(--accent-primary); display:flex; align-items:center; gap:6px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>
                Plan SG-SST: ${cleanPlan}
            </div>
        `);
    }

    if (data.diagnostic_score !== undefined && data.diagnostic_score !== null) {
        const score = Number(data.diagnostic_score);
        const color = score >= 85 ? '#2e7d32' : (score >= 60 ? '#f57c00' : '#d32f2f');
        itemsHtml.push(`
            <div style="background:var(--card-bg); border:1px solid var(--border-color); padding:8px 12px; border-radius:8px;">
                <div style="font-size:0.75rem; color:var(--text-muted); font-weight:600;">Puntaje Diagnóstico</div>
                <div style="font-size:1.1rem; font-weight:700; color:${color};">${score}%</div>
            </div>
        `);
    }

    if (data.employees_count) {
        itemsHtml.push(`
            <div style="background:var(--card-bg); border:1px solid var(--border-color); padding:8px 12px; border-radius:8px;">
                <div style="font-size:0.75rem; color:var(--text-muted); font-weight:600;">Trabajadores</div>
                <div style="font-size:0.95rem; font-weight:700;">${data.employees_count} empleados</div>
            </div>
        `);
    }

    if (data.risk_level) {
        itemsHtml.push(`
            <div style="background:var(--card-bg); border:1px solid var(--border-color); padding:8px 12px; border-radius:8px;">
                <div style="font-size:0.75rem; color:var(--text-muted); font-weight:600;">Nivel de Riesgo</div>
                <div style="font-size:0.95rem; font-weight:700;">Riesgo ${data.risk_level}</div>
            </div>
        `);
    }

    if (data.economic_activity) {
        itemsHtml.push(`
            <div style="background:var(--card-bg); border:1px solid var(--border-color); padding:8px 12px; border-radius:8px;">
                <div style="font-size:0.75rem; color:var(--text-muted); font-weight:600;">Actividad Económica</div>
                <div style="font-size:0.9rem; font-weight:600;">${data.economic_activity}</div>
            </div>
        `);
    }

    if (data.preferred_payment_mode) {
        itemsHtml.push(`
            <div style="background:var(--card-bg); border:1px solid var(--border-color); padding:8px 12px; border-radius:8px;">
                <div style="font-size:0.75rem; color:var(--text-muted); font-weight:600;">Frecuencia de Pago</div>
                <div style="font-size:0.9rem; font-weight:600;">${data.preferred_payment_mode}</div>
            </div>
        `);
    }

    // Render onboarding answers if present
    let answersHtml = '';
    if (onboarding) {
        const catCode = onboarding.category_code || '';
        const stdCount = onboarding.applicable_standards_count || (onboarding.answers ? onboarding.answers.length : 0);
        
        if (onboarding.answers && Array.isArray(onboarding.answers) && onboarding.answers.length > 0) {
            const rows = onboarding.answers.map((a, idx) => {
                const isOk = a.compliant === true || a.compliant === 'true';
                const statusBadge = isOk 
                    ? '<span style="color:#2e7d32; font-weight:700; display:inline-flex; align-items:center; gap:4px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>Cumple</span>' 
                    : '<span style="color:#d32f2f; font-weight:700; display:inline-flex; align-items:center; gap:4px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>No cumple</span>';
                const label = a.standard_id || `Estándar #${idx+1}`;
                return `<div style="display:flex; justify-content:space-between; padding:4px 0; border-bottom:1px solid var(--border-color); font-size:0.8rem;">
                    <span><strong>${label}</strong></span>
                    <span>${statusBadge}</span>
                </div>`;
            }).join('');

            answersHtml = `
                <div style="margin-top:10px; border-top:1px dashed var(--border-color); padding-top:8px;">
                    <div style="font-size:0.8rem; font-weight:700; color:var(--accent-primary); margin-bottom:6px; display:flex; align-items:center; gap:6px;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>
                        Estándares Mínimos Res. 0312 (${stdCount} aplicables · ${catCode}):
                    </div>
                    <div style="max-height:160px; overflow-y:auto; padding-right:4px;">
                        ${rows}
                    </div>
                </div>
            `;
        }
    }

    // Render remaining key-values cleanly
    const ignoreKeys = new Set(['selected_plan', 'plan_recommended', 'employees_count', 'risk_level', 'economic_activity', 'diagnostic_score', 'preferred_payment_mode', 'onboarding_payload', 'raw_payload', 'city', 'department', 'address', 'contact_name']);
    
    let otherKeysHtml = [];
    Object.keys(data).forEach(k => {
        if (ignoreKeys.has(k) || data[k] === null || data[k] === undefined || data[k] === '') return;
        const label = labelsMap[k] || k.replace(/_/g, ' ');
        const val = typeof data[k] === 'object' ? JSON.stringify(data[k]) : String(data[k]);
        otherKeysHtml.push(`<div><strong>${label}:</strong> ${val}</div>`);
    });

    let otherBlock = otherKeysHtml.length > 0 ? `<div style="margin-top:8px; font-size:0.8rem; display:flex; flex-direction:column; gap:4px;">${otherKeysHtml.join('')}</div>` : '';

    return `
        ${n8nCardHtml}
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
            ${itemsHtml.join('')}
        </div>
        ${answersHtml}
        ${otherBlock}
    `;
}


function switchReqDetailTab(tabId) {
    document.querySelectorAll('.req-detail-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.req-detail-pane').forEach(p => p.style.display = 'none');
    
    const btn = document.getElementById(`req-btn-${tabId}`);
    if (btn) btn.classList.add('active');
    
    const pane = document.getElementById(tabId);
    if (pane) pane.style.display = 'block';
}
window.switchReqDetailTab = switchReqDetailTab;


function viewRequestDetails(req) {
    try {
        if (typeof req === 'number' || typeof req === 'string') req = getRequestById(req);
        if (!req) {
            console.error('viewRequestDetails: no request found', req);
            return;
        }
        window.currentViewedReq = req;
        const reqDet = req.details || (req.details_json ? (typeof req.details_json === 'string' ? JSON.parse(req.details_json) : req.details_json) : {});
        const alId = reqDet.alegra_estimate_id;
        const alNum = reqDet.alegra_number ? ` (Doc #${reqDet.alegra_number})` : '';
        const emailVal = req.contact_email || reqDet.contact_email || reqDet.email || reqDet.correo || '';
        const phoneVal = req.contact_phone || reqDet.contact_phone || reqDet.phone || reqDet.telefono || '';
        
        const emailDisplay = emailVal ? `<a href="mailto:${emailVal}" style="color:var(--accent-primary); text-decoration:none; font-weight:600; display:inline-flex; align-items:center; gap:4px;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>${emailVal}</a>` : '—';
        const phoneDisplay = phoneVal ? `<a href="javascript:void(0)" onclick="openWhatsAppWithAutoLog('${phoneVal}', '${(req.company_name||'').replace(/'/g, '')}', ${req.id}, '${req.request_number}')" style="color:#10b981; text-decoration:none; font-weight:600; display:inline-flex; align-items:center; gap:4px;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>${phoneVal}</a>` : '—';

        const detailsHtml = renderDiagnosticDetailsHtml(reqDet);

        // Remove any prior opened instance
        closeViewReqModal();

        const html = `
        <div class="modal-overlay active" id="view-req-modal" onclick="if(event.target===this)closeViewReqModal()">
            <div class="modal-card" style="max-width:920px; width:95vw; max-height:88vh; display:flex; flex-direction:column; padding:0; overflow:hidden; position:relative;" onclick="event.stopPropagation()">
                
                <!-- BOTÓN DE CIERRE EN LA ESQUINA SUPERIOR DERECHA -->
                <button type="button" class="modal-close modal-close-topright" onclick="closeViewReqModal()" title="Cerrar ventana"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>

                <!-- ENCABEZADO PERSISTENTE LIMPIO -->
                <div style="padding:16px 54px 16px 24px; border-bottom:1px solid var(--border-color); background:var(--card-bg); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
                    <div>
                        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                            <h3 id="view-req-comp-name" style="margin:0; font-size:1.15rem; font-weight:700; color:var(--text-primary);">${req.company_name}</h3>
                            <button type="button" class="action-icon-btn" onclick="openEditCompanyNameModal(${req.id}, '${(req.company_name||'').replace(/'/g, "\\'")}')" style="font-size:0.75rem; padding:2px 6px; color:var(--accent-primary);" title="Corregir Razón Social"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>
                            ${cmrBadge(req.status)}
                            <span style="background:rgba(79,70,229,0.1); color:var(--accent-primary); border:1px solid rgba(79,70,229,0.25); padding:2px 8px; border-radius:6px; font-size:0.72rem; font-weight:600;">${req.vertical}</span>
                        </div>
                        <div style="font-size:0.78rem; color:var(--text-muted); margin-top:4px;">
                            ${(!((req.customer_nit||'').startsWith('ChIJ')||(req.customer_nit||'').startsWith('AC')||(req.customer_nit||'').length>20||req.customer_nit==='NATURAL'||req.customer_nit==='0') && req.customer_nit) ? `<strong>NIT:</strong> ${req.customer_nit} · ` : ''}
                            <strong>Solicitud:</strong> ${req.request_number} · 
                            <strong>Asesor:</strong> ${req.assigned_salesperson || 'Sin Asignar'} ${isDirectorOrSuperUser() ? `<button class="action-icon-btn" onclick="openAssignModal(window.currentViewedReq)" style="font-size:0.68rem; padding:1px 5px;" title="Asignar asesor"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg></button>` : ''} · 
                            <strong>Fecha:</strong> ${(req.created_at || '').substring(0,10)}
                        </div>
                    </div>

                    <!-- ACCIONES RÁPIDAS ENCABEZADO -->
                    <div style="display:flex; gap:8px; align-items:center;">
                        <button type="button" class="btn-primary btn-compact" onclick="openSendQuoteEmailModal(window.currentViewedReq);" style="background:linear-gradient(135deg, #0284c7, #0369a1); display:inline-flex; align-items:center; gap:5px;" title="Despachar oferta comercial formal por correo corporativo">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="16" x="2" y="4" rx="2"></rect><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path></svg>Despachar
                        </button>
                        <button type="button" class="btn-secondary btn-compact" onclick="openLogNegotiationModal(window.currentViewedReq);" style="border-color:#f59e0b; color:#d97706; display:inline-flex; align-items:center; gap:5px;" title="Registrar llamada, mensaje o acuerdo en la bitácora comercial">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 9.5-9.5z"></path></svg>Avance
                        </button>
                        ${phoneVal ? `
                        <button type="button" class="btn-secondary btn-compact" onclick="openWhatsAppWithAutoLog('${phoneVal}', '${(req.company_name||'').replace(/'/g, '')}', ${req.id}, '${req.request_number}')" style="border-color:#10b981; color:#10b981; display:inline-flex; align-items:center; gap:5px;" title="Abrir chat directo en WhatsApp y registrar gestión en 1 clic">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>WhatsApp
                        </button>` : ''}
                    </div>
                </div>

                <!-- BARRA DE PESTAÑAS SEGMENTADAS -->
                <div style="display:flex; gap:4px; border-bottom:1px solid var(--border-color); padding:0 24px; background:rgba(0,0,0,0.02);">
                    <button type="button" class="req-detail-tab active" onclick="switchReqDetailTab('tab-quote')" id="req-btn-tab-quote" style="display:inline-flex; align-items:center;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px;"><path d="m7.5 4.27 9 5.15"></path><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"></path><path d="m3.3 7 8.7 5 8.7-5"></path><path d="M12 22V12"></path></svg>1. Cotización & Propuesta ${alId ? `(#${alId})` : ''}
                    </button>
                    <button type="button" class="req-detail-tab" onclick="switchReqDetailTab('tab-timeline')" id="req-btn-tab-timeline" style="display:inline-flex; align-items:center;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px;"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>2. Historial de Negociación & Bitácora
                    </button>
                    <button type="button" class="req-detail-tab" onclick="switchReqDetailTab('tab-diag')" id="req-btn-tab-diag" style="display:inline-flex; align-items:center;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px;"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>3. Diagnóstico & Datos Técnicos
                    </button>
                </div>

                <!-- CUERPO PRINCIPAL (CONTENIDO SEGMENTADO) -->
                <div style="padding:22px 24px; overflow-y:auto; flex:1;">
                    
                    <!-- ══════════════════════════════════════════════════ -->
                    <!-- PESTAÑA 1: COTIZACIÓN & PROPUESTA COMERCIAL        -->
                    <!-- ══════════════════════════════════════════════════ -->
                    <div id="tab-quote" class="req-detail-pane" style="display:block;">
                        ${alId ? `
                        <div style="background:rgba(16, 185, 129, 0.06); border:1px solid rgba(16, 185, 129, 0.25); border-radius:10px; padding:16px 20px; display:flex; justify-content:space-between; align-items:center; margin-bottom:18px; flex-wrap:wrap; gap:12px;">
                            <div>
                                <div style="font-weight:700; color:var(--green-status); font-size:0.95rem; display:flex; align-items:center; gap:8px;">
                                    <span style="display:inline-flex; align-items:center; gap:6px;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>Cotización Oficial Alegra #${alId}${alNum}</span>
                                    ${reqDet.alegra_status ? `<span style="font-size:0.72rem; padding:2px 8px; border-radius:10px; background:#e0f2fe; color:#0369a1; text-transform:uppercase; font-weight:700;">${reqDet.alegra_status}</span>` : ''}
                                </div>
                                <div style="font-size:0.82rem; color:var(--text-secondary); margin-top:4px;" id="view-req-alegra-summary">
                                    Total: <strong style="color:var(--green-status); font-size:0.95rem;">${formatCurrency(reqDet.quoted_total || 0)} COP</strong> · Ítems: <strong>${reqDet.quoted_items_count || ''}</strong> · Asesor: <strong>${reqDet.quoted_by || req.assigned_salesperson || '—'}</strong>
                                    ${reqDet.alegra_synced_at ? `<span style="color:var(--text-muted); font-size:0.74rem; margin-left:6px;">(Sincronizado: ${reqDet.alegra_synced_at.substring(11, 16)})</span>` : ''}
                                </div>
                            </div>
                            <div style="display:flex; gap:8px;">
                                <button type="button" id="btn-sync-alegra-modal" onclick="syncRequestWithAlegra('${req.id}')" class="btn-secondary" style="padding:7px 12px; font-size:0.82rem; display:inline-flex; align-items:center; gap:5px; border-radius:6px; cursor:pointer;" title="Sincronizar cambios desde Alegra">
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>Sincronizar
                                </button>
                                <a href="https://app.alegra.com/estimate/view/id/${alId}" target="_blank" class="btn-primary" style="padding:7px 14px; font-size:0.82rem; text-decoration:none; display:inline-flex; align-items:center; gap:6px; background:linear-gradient(135deg, #10b981, #0ea5e9); border-radius:6px; font-weight:600; color:#fff;">
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>Ver en Alegra
                                </a>
                            </div>
                        </div>
                        ` : `
                        <div style="background:rgba(245,158,11,0.06); border:1px solid rgba(245,158,11,0.25); border-radius:10px; padding:14px 18px; margin-bottom:18px;">
                            <div style="font-weight:700; color:#d97706; font-size:0.9rem; display:flex; align-items:center; gap:6px;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>Propuesta Pendiente de Emisión</div>
                            <div style="font-size:0.78rem; color:var(--text-secondary); margin-top:2px;">Aún no se ha emitido una cotización oficial en Alegra para este requerimiento. Puedes generarla a continuación.</div>
                        </div>
                        `}

                        <!-- BOTONES DE ACCIÓN DE OFERTA -->
                        <div style="background:var(--card-bg); border:1px solid var(--border-color); border-radius:10px; padding:16px; margin-bottom:16px;">
                            <h5 style="margin:0 0 10px; font-size:0.86rem; color:var(--accent-primary); display:flex; align-items:center; gap:6px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>Acciones sobre la Oferta:</h5>
                            <div style="display:flex; gap:10px; flex-wrap:wrap;">
                                ${(() => {
                                    if (req.vertical === 'PRODUCTOS' || req.vertical === 'DOTACION' || reqDet.cart_quote || (reqDet.items && reqDet.items.length > 0)) {
                                        return `
                                        <button class="btn-primary btn-compact" onclick="closeViewReqModal(); openProductQuoteModal(window.currentViewedReq);" title="Cotizador inteligente de catálogo Alegra & CorePrice" style="flex:1; min-width:140px; padding:8px 12px;">
                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg> <span>${alId ? 'Modificar' : 'Cotizar'}</span>
                                        </button>
                                        `;
                                    } else {
                                        return `
                                        <button class="btn-primary btn-compact" onclick="handleLaunchPreQuoteModal()" title="Generar Pre-Oferta técnica preliminar SG-SST" style="flex:1; padding:8px 12px;">
                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg> <span>Pre-Oferta</span>
                                        </button>
                                        <button class="btn-secondary btn-compact" onclick="handleLaunchOfferModal()" title="Generar Oferta Formal sincronizada con Alegra" style="flex:1; padding:8px 12px;">
                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg> <span>Oferta Formal</span>
                                        </button>
                                        `;
                                    }
                                })()}
                                <button type="button" class="btn-secondary btn-compact" onclick="openSendQuoteEmailModal(window.currentViewedReq);" title="Despachar oferta comercial formal por correo corporativo" style="flex:1; min-width:140px; padding:8px 12px;">
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg> <span>Despachar</span>
                                </button>
                            </div>
                        </div>

                        ${req.suggested_action ? `
                        <div style="background:rgba(245,158,11,0.08); border-left:4px solid #f59e0b; padding:12px 16px; border-radius:6px; font-size:0.82rem; margin-bottom:14px; display:flex; align-items:center; gap:10px;">
                            <span style="display:inline-flex; align-items:center; color:#d97706;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg></span>
                            <div>
                                <div style="font-weight:700; color:#d97706;">Acción Sugerida por IA (${req.days_stalled || 3} días sin avance):</div>
                                <div style="color:var(--text-primary); margin-top:2px;">${req.suggested_action}</div>
                            </div>
                        </div>` : ''}
                    </div>

                    <!-- ══════════════════════════════════════════════════ -->
                    <!-- PESTAÑA 2: HISTORIAL DE NEGOCIACIÓN & BITÁCORA     -->
                    <!-- ══════════════════════════════════════════════════ -->
                    <div id="tab-timeline" class="req-detail-pane" style="display:none;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
                            <div>
                                <h5 style="margin:0; font-size:0.92rem; color:var(--text-primary);">Línea de Tiempo de Interacciones</h5>
                                <p style="margin:2px 0 0; font-size:0.75rem; color:var(--text-muted);">Registro cronológico de llamadas, chats de WhatsApp, reuniones y despachos de cotización.</p>
                            </div>
                            <button type="button" class="btn-primary" onclick="openLogNegotiationModal(window.currentViewedReq);" style="font-size:0.78rem; padding:6px 12px; display:inline-flex; align-items:center; gap:5px;">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Registrar Avance
                            </button>
                        </div>
                        <div id="view-req-timeline-box">
                            <div style="font-size:0.8rem; color:var(--text-muted); padding:10px 0;">Cargando bitácora de gestiones...</div>
                        </div>
                    </div>

                    <!-- ══════════════════════════════════════════════════ -->
                    <!-- PESTAÑA 3: DIAGNÓSTICO TÉCNICO & DATOS EMPRESA     -->
                    <!-- ══════════════════════════════════════════════════ -->
                    <div id="tab-diag" class="req-detail-pane" style="display:none;">
                        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:12px; font-size:0.83rem; background:var(--card-bg); padding:14px; border-radius:10px; border:1px solid var(--border-color); margin-bottom:16px;">
                            <div><strong>Razón Social:</strong> ${req.company_name}</div>
                            <div><strong>NIT Tributario:</strong> ${req.customer_nit || 'No registrado'}</div>
                            <div><strong>Sector / Actividad:</strong> ${reqDet.sector || reqDet.segment || 'Industria B2B'}</div>
                            <div><strong>Correo Comercial:</strong> ${emailDisplay}</div>
                            <div><strong>Teléfono Contacto:</strong> ${phoneDisplay}</div>
                            <div><strong>Asesor Asignado:</strong> ${req.assigned_salesperson || 'Sin Asignar'}</div>
                        </div>

                        ${req.notes ? `
                        <div style="background:rgba(245,158,11,0.08); border-left:4px solid #f59e0b; padding:10px 14px; border-radius:6px; font-size:0.83rem; margin-bottom:16px;">
                            <div style="font-weight:700; color:#d97706; margin-bottom:3px;">Notas / Requerimientos Especiales:</div>
                            <div style="color:var(--text-primary); line-height:1.4;">${req.notes}</div>
                        </div>` : ''}

                        <h5 style="margin:0 0 10px; color:var(--accent-primary); font-size:0.88rem;">Desglose Técnico & Respuestas del Diagnóstico / Carrito:</h5>
                        <div style="background:var(--card-bg); border:1px solid var(--border-color); border-radius:8px; padding:12px;">
                            ${detailsHtml}
                        </div>
                    </div>

                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', html);

        // Cargar bitácora de gestiones comerciales para esta empresa (Línea de Tiempo Unificada)
        loadRequestCommercialLogs(req.customer_nit, req.company_name, req);

        // Auto-sync in background if quote has Alegra ID
        if (alId) {
            syncRequestWithAlegra(req.id, true);
        }
    } catch (err) {
        console.error('Error opening viewRequestDetails:', err);
        if (typeof showToast === 'function') {
            showToast('Error al abrir detalle: ' + err.message, 'error');
        }
    }
}


async function loadRequestCommercialLogs(customerNit, companyName, reqParam = null) {
    const box = document.getElementById('view-req-timeline-box');
    if (!box) return;
    box.innerHTML = '<div style="font-size:0.8rem; color:var(--text-muted); padding:14px 0; text-align:center; display:flex; align-items:center; justify-content:center; gap:8px;"><svg class="spin-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg> Construyendo línea de tiempo unificada...</div>';
    
    const req = reqParam || window.currentViewedReq || (_rawRequestsCache || []).find(r => r.customer_nit === customerNit) || {};
    const reqDet = req.details || (req.details_json ? (typeof req.details_json === 'string' ? JSON.parse(req.details_json) : req.details_json) : {});
    
    let rawLogs = [];
    if (customerNit) {
        try {
            rawLogs = await apiRequest(`/api/commercial-logs?customer_nit=${encodeURIComponent(customerNit)}&limit=30`) || [];
        } catch(err) {
            console.warn('Error fetching commercial logs:', err);
        }
    }

    const events = [];

    // Hito 1: Radicación Inicial / Origen Web
    if (req.created_at || req.id) {
        const rawDate = req.created_at || new Date().toISOString();
        const dateStr = rawDate.substring(0, 16).replace('T', ' ');
        const ts = new Date(rawDate).getTime() || 0;

        let originDesc = '';
        if (req.vertical === 'SG-SST' || reqDet.selected_plan) {
            const planStr = (reqDet.selected_plan || 'SST').replace(/_/g, ' ');
            const scoreStr = (reqDet.diagnostic_score !== undefined && reqDet.diagnostic_score !== null) ? ` · Score Diagnóstico: ${reqDet.diagnostic_score}%` : '';
            originDesc = `Solicitud radicada a través del Diagnóstico Web SG-SST (Plan: **${planStr}**${scoreStr}).`;
        } else if (reqDet.cart_quote || (reqDet.items && reqDet.items.length > 0)) {
            const numItems = reqDet.items ? reqDet.items.length : 1;
            const cityStr = reqDet.city ? ` desde ${reqDet.city}` : '';
            originDesc = `Cotización web de productos radicada con **${numItems} referencias de calzado/dotación**${cityStr}.`;
        } else {
            originDesc = `Oportunidad comercial registrada en CORALIS con asunto: *${escapeHtml(req.topic || 'Solicitud de Cotización')}*.`;
        }

        events.push({
            type: 'ORIGIN',
            markerClass: 'type-web',
            icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>',
            title: `Radicación de Solicitud #${req.request_number || ('SOL-' + req.id)}`,
            tagHtml: `<span class="v-timeline-tag" style="background:#e0f2fe; color:#0369a1;">${req.vertical || 'INBOUND WEB'}</span>`,
            dateStr: dateStr,
            timestamp: ts,
            author: reqDet.contact_name || req.contact_email || 'Web / Inbound',
            desc: originDesc
        });
    }

    // Hito 2: Asignación a Asesor Comercial
    if (req.assigned_salesperson && req.assigned_salesperson !== 'Sin Asignar') {
        const rawDate = req.created_at || new Date().toISOString();
        const dateStr = rawDate.substring(0, 10);
        const ts = (new Date(rawDate).getTime() || 0) + 1000;

        events.push({
            type: 'ASSIGNMENT',
            markerClass: 'type-advisor',
            icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>',
            title: 'Asignación de Asesor Responsable',
            tagHtml: '<span class="v-timeline-tag" style="background:#ede9fe; color:#6d28d9;">ASIGNADO</span>',
            dateStr: dateStr,
            timestamp: ts,
            author: 'Dirección Comercial',
            desc: `Cuenta y requerimiento vinculados al asesor **${req.assigned_salesperson}** para liderazgo del ciclo de venta.`
        });
    }

    // Hito 3: Emisión de Cotización Oficial Alegra
    const alId = reqDet.alegra_estimate_id;
    if (alId) {
        const rawDate = reqDet.alegra_synced_at || req.updated_at || req.created_at || new Date().toISOString();
        const dateStr = rawDate.substring(0, 16).replace('T', ' ');
        const ts = (new Date(rawDate).getTime() || 0) + 2000;
        const totalStr = formatCurrency(reqDet.quoted_total || 0);
        const docNum = reqDet.alegra_number ? `Doc #${reqDet.alegra_number}` : `#${alId}`;

        events.push({
            type: 'ALEGRA_QUOTE',
            markerClass: 'type-quote',
            icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>',
            title: `Cotización Oficial Alegra (${docNum})`,
            tagHtml: '<span class="v-timeline-tag" style="background:#d1fae5; color:#065f46;">OFERTA FORMAL</span>',
            dateStr: dateStr,
            timestamp: ts,
            author: reqDet.quoted_by || req.assigned_salesperson || 'Comercial',
            desc: `Propuesta formal generada en Alegra por valor de **${totalStr} COP** (${reqDet.quoted_items_count || ''} ítems). Estado oficial: **${(reqDet.alegra_status || 'EMITIDA').toUpperCase()}**.`
        });
    }

    // Hitos 4+: Gestiones Comerciales en Bitácora (commercial_logs)
    const channelMap = {
        'WHATSAPP': { icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>', markerClass: 'type-whatsapp', tagBg: '#dcfce7', tagColor: '#15803d', label: 'WHATSAPP' },
        'LLAMADA': { icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>', markerClass: 'type-call', tagBg: '#fef3c7', tagColor: '#b45309', label: 'LLAMADA' },
        'TELEFONICO': { icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>', markerClass: 'type-call', tagBg: '#fef3c7', tagColor: '#b45309', label: 'LLAMADA' },
        'REUNION_VISITA': { icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>', markerClass: 'type-visit', tagBg: '#e0e7ff', tagColor: '#4338ca', label: 'VISITA' },
        'PRESENCIAL': { icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>', markerClass: 'type-visit', tagBg: '#e0e7ff', tagColor: '#4338ca', label: 'VISITA' },
        'CORREO': { icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="16" x="2" y="4" rx="2"></rect><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path></svg>', markerClass: 'type-email', tagBg: '#e0f2fe', tagColor: '#0284c7', label: 'CORREO' },
        'EMAIL': { icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="16" x="2" y="4" rx="2"></rect><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path></svg>', markerClass: 'type-email', tagBg: '#e0f2fe', tagColor: '#0284c7', label: 'CORREO' },
        'DESPACHO': { icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>', markerClass: 'type-email', tagBg: '#e0f2fe', tagColor: '#0284c7', label: 'DESPACHO' }
    };

    (rawLogs || []).forEach(l => {
        const actType = (l.action_type || l.interaction_type || '').toUpperCase();
        const chKey = (l.channel || l.contact_method || '').toUpperCase();
        
        // Skip duplicate INGRESO_WEB log if already synthesized
        if (actType.includes('INGRESO_WEB') || actType.includes('CREACION_SOLICITUD')) {
            return;
        }

        const chInfo = channelMap[chKey] || channelMap[actType] || { icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>', markerClass: 'type-stage', tagBg: 'rgba(79,70,229,0.1)', tagColor: 'var(--accent-primary)', label: l.pipeline_stage || 'GESTIÓN' };
        const rawDate = l.occurred_at || l.created_at || new Date().toISOString();
        const dateStr = rawDate.substring(0, 16).replace('T', ' ');
        const ts = new Date(rawDate).getTime() || 0;

        const stageBadge = l.pipeline_stage ? `<span class="v-timeline-tag" style="background:${chInfo.tagBg}; color:${chInfo.tagColor};">${l.pipeline_stage}</span>` : `<span class="v-timeline-tag" style="background:${chInfo.tagBg}; color:${chInfo.tagColor};">${chInfo.label}</span>`;

        events.push({
            type: 'LOG',
            markerClass: chInfo.markerClass,
            icon: chInfo.icon,
            title: l.action_type || l.interaction_type || `Contacto vía ${chInfo.label}`,
            tagHtml: stageBadge,
            dateStr: dateStr,
            timestamp: ts,
            author: l.user_name || l.salesperson || 'Comercial',
            desc: escapeHtml(l.observations || 'Sin observaciones.')
        });
    });

    // Hito 5: Cierre Comercial (Ganado / Perdido)
    const stUpper = (req.status || '').toUpperCase();
    const plStage = (req.pipeline_stage || '').toUpperCase();
    if (['GANADO', 'GANADA', 'CERRADA'].includes(stUpper) || plStage === 'GANADO' || plStage === 'CONTRATO') {
        const rawDate = req.updated_at || new Date().toISOString();
        events.push({
            type: 'CLOSING',
            markerClass: 'type-quote',
            icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>',
            title: 'Cierre Comercial / Oportunidad Ganada',
            tagHtml: '<span class="v-timeline-tag" style="background:#dcfce7; color:#15803d;">VENTA CERRADA</span>',
            dateStr: rawDate.substring(0, 16).replace('T', ' '),
            timestamp: (new Date(rawDate).getTime() || 0) + 10000,
            author: req.assigned_salesperson || 'Comercial',
            desc: `Ciclo comercial cerrado exitosamente. Razón Social: **${req.company_name}**.`
        });
    } else if (['PERDIDO', 'PERDIDA', 'RECHAZADA'].includes(stUpper) || plStage === 'PERDIDO') {
        const rawDate = req.updated_at || new Date().toISOString();
        events.push({
            type: 'CLOSING',
            markerClass: 'type-stage',
            icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>',
            title: 'Oportunidad Finalizada / No Concretada',
            tagHtml: '<span class="v-timeline-tag" style="background:#fee2e2; color:#b91c1c;">RECHAZADA</span>',
            dateStr: rawDate.substring(0, 16).replace('T', ' '),
            timestamp: (new Date(rawDate).getTime() || 0) + 10000,
            author: req.assigned_salesperson || 'Comercial',
            desc: `Negociación marcada como rechazada o descartada.`
        });
    }

    // Sort descending (newest on top)
    events.sort((a, b) => b.timestamp - a.timestamp);

    if (events.length === 0) {
        box.innerHTML = `
        <div style="background:var(--card-bg); border:1px solid var(--border-color); border-radius:8px; padding:14px; font-size:0.8rem; color:var(--text-muted); text-align:center;">
            Sin eventos registrados en la línea de tiempo. Utiliza el botón superior <strong>Registrar Avance</strong> para asentar llamadas, WhatsApp o reuniones.
        </div>`;
        return;
    }

    const timelineHtml = `
    <div class="v-timeline">
        ${events.map((ev, idx) => `
            <div class="v-timeline-item">
                <div class="v-timeline-marker ${ev.markerClass}">${ev.icon}</div>
                <div class="v-timeline-card ${idx === 0 ? 'latest-card' : ''}">
                    <div class="v-timeline-header">
                        <div class="v-timeline-title">
                            <span>${ev.title}</span>
                            ${ev.tagHtml || ''}
                            ${idx === 0 ? '<span style="background:var(--accent-primary); color:#fff; font-size:0.68rem; font-weight:700; padding:2px 7px; border-radius:6px; margin-left:4px;">Último Avance</span>' : ''}
                        </div>
                        <div class="v-timeline-date">
                            <span style="display:inline-flex; align-items:center; gap:4px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>${ev.dateStr}</span>
                            ${ev.author ? `<span style="display:inline-flex; align-items:center; gap:4px;">· <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg><strong>${ev.author}</strong></span>` : ''}
                        </div>
                    </div>
                    <div class="v-timeline-desc">${ev.desc}</div>
                </div>
            </div>
        `).join('')}
    </div>`;

    box.innerHTML = `
    <div style="max-height:360px; overflow-y:auto; padding-right:6px;">
        ${timelineHtml}
    </div>`;
}
window.loadRequestCommercialLogs = loadRequestCommercialLogs;


function closeViewReqModal() {
    const m = document.getElementById('view-req-modal');
    if (m) m.remove();
}

function calcOfferAnnual() {
    const chkImpl = document.getElementById('chk-item-impl')?.checked ?? true;
    const chkMonthly = document.getElementById('chk-item-monthly')?.checked ?? true;
    const chkVisit = document.getElementById('chk-item-visit')?.checked ?? false;

    const impl = chkImpl ? parseCurrency(document.getElementById('of-impl-price')?.value) : 0;
    const mo = chkMonthly ? parseCurrency(document.getElementById('of-monthly-price')?.value) : 0;
    const visit = chkVisit ? parseCurrency(document.getElementById('pq-visit-price')?.value) : 0;
    const disc = parseFloat(document.getElementById('of-discount-pct')?.value || 0);
    const payMode = (document.getElementById('of-payment-mode')?.value || 'MENSUAL').toUpperCase();

    let monthsToCharge = 1;
    let modeDiscPct = 0;
    let modeLabel = '';
    
    if (payMode.includes('SEMESTRAL')) {
        monthsToCharge = 6;
        modeDiscPct = 10;
        modeLabel = '10% desc. pago semestral';
    } else if (payMode.includes('ANUAL')) {
        monthsToCharge = 12;
        modeDiscPct = 15;
        modeLabel = '15% desc. pago anual anticipado';
    } else {
        monthsToCharge = 1;
        modeDiscPct = 0;
        modeLabel = 'Pago Mensual (1er mes + Implementación)';
    }

    const grossMonthlyPortion = mo * monthsToCharge;
    const netMonthlyPortion = grossMonthlyPortion * (1 - (modeDiscPct / 100));
    const modeSavings = (mo * monthsToCharge) - netMonthlyPortion;
    
    const baseTotal = impl + netMonthlyPortion + visit;
    const finalNetTotal = baseTotal * (1 - (disc / 100));

    const labelEl = document.getElementById('un-total-box-label');
    if (labelEl) {
        const moneySvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle; margin-right:4px;"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>';
        if (payMode.includes('SEMESTRAL')) labelEl.innerHTML = `${moneySvg}<strong>Total propuesta semestral (6 meses + impl.):</strong>`;
        else if (payMode.includes('ANUAL')) labelEl.innerHTML = `${moneySvg}<strong>Total propuesta anual (12 meses + impl.):</strong>`;
        else labelEl.innerHTML = `${moneySvg}<strong>Total propuesta inicial (1er mes + impl.):</strong>`;
    }
    
    const el = document.getElementById('of-annual-total');
    if (el) {
        if (modeDiscPct > 0) {
            el.innerHTML = `<div>${fmtCOP(finalNetTotal)}</div><div style="font-size:0.75rem; color:#2e7d32; font-weight:600; margin-top:2px; display:flex; align-items:center; justify-content:flex-end; gap:4px;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>${modeLabel} · Ahorro: ${fmtCOP(modeSavings)} COP</div>`;
        } else {
            el.innerHTML = `<div>${fmtCOP(finalNetTotal)}</div>${chkMonthly && monthsToCharge === 1 ? `<div style="font-size:0.75rem; color:var(--text-muted); font-weight:500; margin-top:2px;">(Incluye Implementación + 1er mes de acompañamiento)</div>` : ''}`;
        }
    }
}
function detectZoneFromLocation(city = '', dept = '') {
    const locStr = `${city} ${dept}`.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    if (locStr.includes('BOGOTA')) {
        return 'Zona 1 - Bogotá Urbana';
    }
    const sabanaCities = ['CHIA', 'COTA', 'SOACHA', 'CAJICA', 'ZIPAQUIRA', 'MOSQUERA', 'FUNZA', 'MADRID', 'TOCANCIPA', 'SOPO', 'FACATATIVA'];
    if (sabanaCities.some(c => locStr.includes(c))) {
        return 'Zona 2 - Sabana de Bogotá';
    }
    const cundinamarcaCities = ['CUNDINAMARCA', 'GIRARDOT', 'FUSAGASUGA', 'UBATE', 'VILLETA', 'SILVANIA', 'CALERA'];
    if (cundinamarcaCities.some(c => locStr.includes(c))) {
        return 'Zona 3 - Cundinamarca Central';
    }
    const mainCities = ['MEDELLIN', 'CALI', 'BARRANQUILLA', 'BUCARAMANGA', 'CARTAGENA', 'MANIZALES', 'PEREIRA', 'ARMENIA', 'IBAGUE', 'VILLAVICENCIO', 'NEIVA', 'TUNJA', 'ANTIOQUIA', 'VALLE', 'SANTANDER', 'ATLANTICO', 'RISARALDA', 'CALDAS', 'QUINDIO', 'TOLIMA', 'META', 'HUILA', 'BOYACA'];
    if (mainCities.some(c => locStr.includes(c))) {
        return 'Zona 4 - Ciudades Principales Nacional';
    }
    return 'Zona 5 - Resto del País / Especial';
}

async function autoFillOfferFromRequest(req) {
    if (!req) return;
    
    let details = req.details || {};
    if (typeof details === 'string') {
        try { details = JSON.parse(details); } catch(e) {}
    }
    
    let onboarding = null;
    if (details.onboarding_payload) {
        if (typeof details.onboarding_payload === 'string') {
            try { onboarding = JSON.parse(details.onboarding_payload); } catch(e) {}
        } else if (typeof details.onboarding_payload === 'object') {
            onboarding = details.onboarding_payload;
        }
    }

    // 1. Auto-select Plan / Package Code
    const rawPlan = (details.selected_plan || details.plan_recommended || req.plan || req.plan_recommended || onboarding?.selected_plan || onboarding?.plan || '').toUpperCase();
    const pkgSelect = document.getElementById('of-pkg-code');
    
    if (pkgSelect && pkgSelect.options.length > 1) {
        let matchedVal = '';
        for (let i = 0; i < pkgSelect.options.length; i++) {
            const opt = pkgSelect.options[i];
            const optVal = opt.value.toUpperCase();
            const optText = opt.text.toUpperCase();
            
            if (rawPlan.includes('ADMIN') && (optVal.includes('ADMIN') || optText.includes('ADMIN') || optVal.includes('CRECE'))) {
                matchedVal = opt.value;
                break;
            }
            if ((rawPlan.includes('AUDITOR') || rawPlan.includes('MANTEN')) && (optVal.includes('AUDIT') || optText.includes('AUDIT') || optVal.includes('EMPRENDE'))) {
                matchedVal = opt.value;
                break;
            }
            if ((rawPlan.includes('DIAG') || rawPlan.includes('DISENO') || rawPlan.includes('DISEÑO')) && (optVal.includes('DIAG') || optText.includes('DIAG'))) {
                matchedVal = opt.value;
                break;
            }
            if (optVal && rawPlan.includes(optVal)) {
                matchedVal = opt.value;
                break;
            }
        }
        if (matchedVal) {
            pkgSelect.value = matchedVal;
        } else if (pkgSelect.options.length > 1) {
            pkgSelect.selectedIndex = 1;
        }
    }

    // 2. Auto-select Payment Frequency
    const payMode = (details.preferred_payment_mode || onboarding?.preferred_payment_mode || 'MENSUAL').toUpperCase();
    const paySelect = document.getElementById('of-payment-mode');
    if (paySelect) {
        for (let i = 0; i < paySelect.options.length; i++) {
            if (payMode.includes(paySelect.options[i].value)) {
                paySelect.selectedIndex = i;
                break;
            }
        }
    }

    // 3. Auto-detect Zone & Pricing
    const city = details.city || details.ciudad || onboarding?.company?.city || onboarding?.city || '';
    const dept = details.department || details.departamento || onboarding?.company?.department || onboarding?.department || '';
    const detectedZoneName = detectZoneFromLocation(city, dept);
    
    const zoneSelect = document.getElementById('pq-zone-select');
    if (zoneSelect && zoneSelect.options.length > 0) {
        for (let i = 0; i < zoneSelect.options.length; i++) {
            const optVal = zoneSelect.options[i].value;
            if (optVal && optVal.toLowerCase().includes(detectedZoneName.toLowerCase().split(' - ')[0])) {
                zoneSelect.selectedIndex = i;
                break;
            }
        }
        updatePqVisitPrice();
    }

    // 4. Auto-calculate pricing from pricing rules table
    const empCount = parseInt(details.employees_count || onboarding?.company?.employees_count || 5);
    const riskLvl = parseInt(details.risk_level || onboarding?.company?.risk_level || 1);
    const selPkg = pkgSelect ? pkgSelect.value : '';

    if (selPkg && empCount) {
        try {
            const priceRes = await apiRequest(`${CMR_API}/pricing/quote?package_code=${selPkg}&employees=${empCount}&risk_level=${riskLvl}`);
            if (priceRes && priceRes.found) {
                if (document.getElementById('of-impl-price')) document.getElementById('of-impl-price').value = '$ ' + parseCurrency(priceRes.implementation_price || 0).toLocaleString('es-CO');
                if (document.getElementById('of-monthly-price')) document.getElementById('of-monthly-price').value = '$ ' + parseCurrency(priceRes.monthly_price || 0).toLocaleString('es-CO');
            }
        } catch(e) {
            console.warn("Autofill price suggestion fallback:", e);
        }
    }

    // 5. Auto-populate items and special notes for PRODUCTOS vertical
    if (req.vertical === 'PRODUCTOS' || (details.items && Array.isArray(details.items) && details.items.length > 0)) {
        const items = details.items || [];
        const itemLines = items.map(it => `• ${it.quantity || 1}x ${it.name || 'Producto'} (SKU: ${it.sku || '—'}${it.brand ? ', ' + it.brand : ''})`);
        const itemsBlock = itemLines.length > 0 ? `Ítems solicitados en catálogo web:\n${itemLines.join('\n')}` : '';
        const notesBlock = req.notes ? `\n\nRequerimientos del cliente: ${req.notes}` : '';
        const combinedNotes = `Cotización de Productos Web (${req.request_number})\n${itemsBlock}${notesBlock}`.trim();
        
        const notesField = document.getElementById('of-notes');
        if (notesField) {
            notesField.value = combinedNotes;
        }
    }

    calcOfferAnnual();
}

/**
 * Synchronizes quote request data, amounts and status directly with Alegra API
 */
async function syncRequestWithAlegra(reqId, silent = false) {
    if (!reqId) return;
    const btn = document.getElementById('btn-sync-alegra-modal');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<svg class="spin-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle; margin-right:4px;"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg> Sincronizando...';
    }
    if (!silent) showToast('Consultando cambios en Alegra...', 'info');
    
    try {
        const token = localStorage.getItem('crm_token') || localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/v1/requests/${reqId}/sync-alegra`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        const data = await res.json();
        if (res.ok && data.status === 'success') {
            // Update local memory cache
            if (Array.isArray(_rawRequestsCache)) {
                const idx = _rawRequestsCache.findIndex(r => String(r.id) === String(reqId));
                if (idx !== -1) {
                    _rawRequestsCache[idx].details = data.details;
                    _rawRequestsCache[idx].details_json = JSON.stringify(data.details);
                    _rawRequestsCache[idx].status = data.request_status;
                    _rawRequestsCache[idx].pipeline_stage = data.pipeline_stage;
                    if (data.company_name) _rawRequestsCache[idx].company_name = data.company_name;
                    if (data.customer_nit) _rawRequestsCache[idx].customer_nit = data.customer_nit;
                }
            }
            if (window.currentViewedReq && String(window.currentViewedReq.id) === String(reqId)) {
                window.currentViewedReq.details = data.details;
                window.currentViewedReq.details_json = JSON.stringify(data.details);
                window.currentViewedReq.status = data.request_status;
                window.currentViewedReq.pipeline_stage = data.pipeline_stage;
                if (data.company_name) {
                    window.currentViewedReq.company_name = data.company_name;
                    const compTitleEl = document.getElementById('view-req-comp-name');
                    if (compTitleEl) compTitleEl.innerText = data.company_name;
                }
                if (data.customer_nit) window.currentViewedReq.customer_nit = data.customer_nit;
                
                // Update summary banner text dynamically
                const sumEl = document.getElementById('view-req-alegra-summary');
                if (sumEl) {
                    const timeStr = data.synced_at ? data.synced_at.substring(11, 16) : 'Ahora';
                    sumEl.innerHTML = `Total: <strong style="color:var(--green-status);">${formatCurrency(data.quoted_total || 0)} COP</strong> · Ítems: <strong>${data.items_count || ''}</strong> · Asesor: <strong>${data.details.quoted_by || '—'}</strong> <span style="color:var(--text-muted); font-size:0.72rem; margin-left:6px;">(Sincronizado: ${timeStr})</span>`;
                }
                const stEl = document.getElementById('view-req-alegra-status');
                if (stEl && data.alegra_status) {
                    stEl.textContent = data.alegra_status.toUpperCase();
                }
            }
            renderRequestsFromCache();
            if (!silent) {
                const nameNotice = data.company_name ? ` · Razón social verificada: "${data.company_name}"` : '';
                showToast(`Sincronizado con Alegra: Total ${formatCurrency(data.quoted_total)} COP (${data.items_count} ítems)${nameNotice}`, 'success');
            }
        } else if (!silent) {
            showToast(data.detail || data.message || 'No se pudo sincronizar con Alegra', 'warning');
        }
    } catch (e) {
        console.error('Error syncing request with Alegra:', e);
        if (!silent) showToast('Error al conectar con el servidor para sincronizar', 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle; margin-right:4px;"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg> Sincronizar';
        }
    }
}
window.syncRequestWithAlegra = syncRequestWithAlegra;

function openEditCompanyNameModal(reqId, currentName) {
    const newName = prompt('Ingrese la razón social o nombre corregido para esta empresa (según RUT o Alegra):', currentName);
    if (!newName || !newName.trim() || newName.trim() === currentName) return;
    
    apiRequest(`${REQ_API}/${reqId}/company-name`, 'PUT', { company_name: newName.trim() })
        .then(res => {
            showToast(res.message || 'Razón social actualizada con éxito', 'success');
            const titleEl = document.getElementById('view-req-comp-name');
            if (titleEl) titleEl.innerText = newName.trim();
            const cached = getRequestById(reqId);
            if (cached) cached.company_name = newName.trim();
            if (window.currentViewedReq && String(window.currentViewedReq.id) === String(reqId)) {
                window.currentViewedReq.company_name = newName.trim();
            }
            renderRequestsFromCache();
        })
        .catch(err => {
            showToast(err.message || 'Error al actualizar razón social', 'error');
        });
}
window.openEditCompanyNameModal = openEditCompanyNameModal;


// ── MODAL DE DESPACHO DE COTIZACIÓN POR CORREO (DESDE CRM) ─────────────────
function openSendQuoteEmailModal(req) {
    if (typeof req === 'number' || typeof req === 'string') req = getRequestById(req);
    if (!req) return;
    const reqDetails = req.details || (req.details_json ? (typeof req.details_json === 'string' ? JSON.parse(req.details_json) : req.details_json) : {});
    const alegraId = reqDetails.alegra_estimate_id;
    const alegraUrl = alegraId ? `https://app.alegra.com/estimate/view/id/${alegraId}` : '';
    const emailVal = req.contact_email || reqDetails.contact_email || reqDetails.email || reqDetails.correo || '';
    const compName = req.company_name || 'Empresa';
    const reqNum = req.request_number || `SOL-${req.id}`;
    
    let itemsSummary = '';
    if (reqDetails.items && Array.isArray(reqDetails.items)) {
        itemsSummary = reqDetails.items.map(it => `• ${it.quantity || it.qty || 1}x ${it.name || it.sku} ${it.brand ? `(${it.brand})` : ''}`).join('\n');
    } else if (req.topic) {
        itemsSummary = `• ${req.topic}`;
    }

    const defaultSubject = `Cotización Comercial ÁLACOR S.A.S. - ${compName} (${reqNum})`;
    const defaultNotes = `Estimado(a) ${req.contact_name || 'Cliente'},\n\nEs un placer saludarle. En atención a su requerimiento comercial, ponemos a su disposición nuestra oferta formal para ${compName}.\n\nQuedamos a su entera disposición para cualquier aclaración técnica o de despacho.`;

    const html = `
    <div class="modal-overlay active" id="send-quote-email-modal" onclick="if(event.target===this)closeSendQuoteEmailModal()">
        <div class="modal-card" style="max-width:540px; width:100%;" onclick="event.stopPropagation()">
            <div class="modal-header">
                <h3>Despachar Cotización por Correo</h3>
                <button class="modal-close" onclick="closeSendQuoteEmailModal()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
            </div>
            <div style="padding:20px; display:flex; flex-direction:column; gap:12px;">
                <div style="background:var(--card-bg); border:1px solid var(--border-color); border-radius:8px; padding:10px 12px; font-size:0.82rem;">
                    <strong>Solicitud:</strong> ${reqNum} — ${compName}
                </div>
                <div class="form-group" style="margin:0;">
                    <label>Correo Electrónico de Destino *</label>
                    <input type="email" id="quote-email-to" value="${emailVal}" placeholder="cliente@empresa.com" style="width:100%;" required>
                </div>
                <div class="form-group" style="margin:0;">
                    <label>Asunto del Correo *</label>
                    <input type="text" id="quote-email-subject" value="${defaultSubject}" style="width:100%;" required>
                </div>
                ${alegraUrl ? `
                <div class="form-group" style="margin:0;">
                    <label>Enlace de Cotización Oficial Alegra</label>
                    <input type="text" id="quote-email-url" value="${alegraUrl}" readonly style="width:100%; background:rgba(0,0,0,0.04); font-family:monospace; font-size:0.8rem;">
                </div>` : ''}
                <div class="form-group" style="margin:0;">
                    <label>Mensaje Personalizado para el Cliente</label>
                    <textarea id="quote-email-notes" rows="3" style="width:100%;">${defaultNotes}</textarea>
                </div>
                <div class="form-group" style="margin:0;">
                    <label>Resumen de Ítems / Referencias</label>
                    <textarea id="quote-email-items" rows="2" style="width:100%; font-size:0.8rem;">${itemsSummary}</textarea>
                </div>
                <p style="margin:0; font-size:0.75rem; color:var(--text-muted);">
                    Al despachar, la solicitud cambiará a <strong>COTIZADA</strong>, quedará registrada en la bitácora y se reseteará el temporizador de inactividad.
                </p>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px;">
                    <button class="btn-secondary btn-compact" onclick="closeSendQuoteEmailModal()">Cancelar</button>
                    <button class="btn-primary btn-compact" id="btn-submit-send-email" onclick="submitSendQuoteEmail(${req.id})" title="Enviar cotización formal al correo del cliente" style="background:linear-gradient(135deg, #0284c7 0%, #0369a1 100%); display:inline-flex; align-items:center; gap:6px;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                        <span>Despachar</span>
                    </button>
                </div>
            </div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
}
window.openSendQuoteEmailModal = openSendQuoteEmailModal;

function closeSendQuoteEmailModal() {
    const m = document.getElementById('send-quote-email-modal');
    if (m) m.remove();
}
window.closeSendQuoteEmailModal = closeSendQuoteEmailModal;

async function submitSendQuoteEmail(reqId) {
    const toEmail = document.getElementById('quote-email-to')?.value?.trim();
    const subject = document.getElementById('quote-email-subject')?.value?.trim();
    const notes = document.getElementById('quote-email-notes')?.value?.trim();
    const items = document.getElementById('quote-email-items')?.value?.trim();
    const quoteUrl = document.getElementById('quote-email-url')?.value?.trim() || '';
    const btn = document.getElementById('btn-submit-send-email');

    if (!toEmail || !toEmail.includes('@')) {
        return showToast('Por favor ingrese un correo de destino válido.', 'error');
    }
    if (!subject) {
        return showToast('Por favor ingrese el asunto del correo.', 'error');
    }

    // Protocolo de confirmación de despacho formal
    if (!confirm(`PROTOCOLO DE DESPACHO SEGURO:\n\n¿Confirmas el envío formal de esta cotización a: "${toEmail}"?\n\nEsta acción enviará un correo electrónico oficial de ÁLACOR S.A.S., actualizará el estado a COTIZADA y quedará registrada en la bitácora comercial.`)) {
        return;
    }

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span style="display:inline-flex; align-items:center; gap:6px;"><svg class="spin-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg> Despachando...</span>';
    }

    try {
        const payload = {
            to_email: toEmail,
            subject: subject,
            custom_notes: notes,
            items_summary: items,
            quote_url: quoteUrl
        };
        const res = await apiRequest(`${REQ_API}/${reqId}/send-quote-email`, 'POST', payload);
        showToast(res.message || 'Cotización despachada con éxito.', 'success');
        closeSendQuoteEmailModal();
        if (window.currentViewedReq && window.currentViewedReq.id == reqId) {
            loadRequestCommercialLogs(window.currentViewedReq.customer_nit, window.currentViewedReq.company_name, window.currentViewedReq);
        }
        if (typeof loadRequests === 'function') loadRequests();
    } catch(err) {
        showToast(err.message || 'Error al despachar cotización.', 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<span style="display:inline-flex; align-items:center; gap:6px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg> Despachar y Registrar</span>';
        }
    }
}
window.submitSendQuoteEmail = submitSendQuoteEmail;


// ── MODAL DE REGISTRO RÁPIDO DE NEGOCIACIÓN Y AVANCES ────────────────────────
function openLogNegotiationModal(req) {
    if (typeof req === 'number' || typeof req === 'string') req = getRequestById(req);
    if (!req) return;
    const compName = req.company_name || 'Empresa';
    const reqNum = req.request_number || `SOL-${req.id}`;
    const currStage = req.pipeline_stage || 'NUEVO';

    const html = `
    <div class="modal-overlay active" id="log-negotiation-modal" onclick="if(event.target===this)closeLogNegotiationModal()">
        <div class="modal-card" style="max-width:520px; width:100%;" onclick="event.stopPropagation()">
            <div class="modal-header">
                <h3>Registrar Avance de Negociación</h3>
                <button class="modal-close" onclick="closeLogNegotiationModal()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
            </div>
            <div style="padding:20px; display:flex; flex-direction:column; gap:14px;">
                <div style="background:var(--card-bg); border:1px solid var(--border-color); border-radius:8px; padding:10px 12px; font-size:0.82rem;">
                    <strong>Solicitud:</strong> ${reqNum} — ${compName}
                </div>
                
                <div class="form-group" style="margin:0;">
                    <label>Canal de Comunicación Utilizado *</label>
                    <select id="neg-channel" style="width:100%;">
                        <option value="WHATSAPP">WhatsApp</option>
                        <option value="LLAMADA">Llamada Telefónica</option>
                        <option value="REUNION_VISITA">Reunión Presencial / Visita Técnica</option>
                        <option value="CORREO">Correo Electrónico</option>
                    </select>
                </div>

                <div class="form-group" style="margin:0;">
                    <label>Nueva Etapa del Pipeline Comercial *</label>
                    <select id="neg-stage" style="width:100%;">
                        <option value="NEGOCIACION" ${currStage==='NEGOCIACION'?'selected':''}>En Negociación / Revisión</option>
                        <option value="VISITA_AGENDADA" ${currStage==='VISITA_AGENDADA'?'selected':''}>Visita Agendada</option>
                        <option value="PRE_OFERTA_ENVIADA" ${currStage==='PRE_OFERTA_ENVIADA'?'selected':''}>Ajuste de Propuesta / Precios</option>
                        <option value="CONTRATO" ${currStage==='CONTRATO'?'selected':''}>Contrato / Orden de Compra</option>
                        <option value="GANADO" ${currStage==='GANADO'?'selected':''}>Ganado (Cierre Exitoso)</option>
                        <option value="PERDIDO" ${currStage==='PERDIDO'?'selected':''}>Rechazado / Perdido</option>
                    </select>
                </div>

                <div class="form-group" style="margin:0;">
                    <label>Detalle del Avance / Acuerdos de la Negociación *</label>
                    <textarea id="neg-observations" rows="4" style="width:100%; resize:vertical; font-size:0.85rem;" placeholder="Ej: Se habló con el Gerente General. Solicita descuento del 5% en la mensualidad para firmar contrato este viernes..."></textarea>
                </div>

                <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:8px;">
                    <button type="button" class="btn-secondary btn-compact" onclick="closeLogNegotiationModal()">Cancelar</button>
                    <button type="button" class="btn-primary btn-compact" id="btn-submit-log-neg" onclick="submitLogNegotiation(${req.id})" title="Registrar gestión en la bitácora comercial" style="display:inline-flex; align-items:center; gap:6px;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                        <span>Guardar</span>
                    </button>
                </div>
            </div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
}
window.openLogNegotiationModal = openLogNegotiationModal;

function closeLogNegotiationModal() {
    const m = document.getElementById('log-negotiation-modal');
    if (m) m.remove();
}
window.closeLogNegotiationModal = closeLogNegotiationModal;

async function submitLogNegotiation(reqId) {
    const channel = document.getElementById('neg-channel')?.value;
    const stage = document.getElementById('neg-stage')?.value;
    const obs = document.getElementById('neg-observations')?.value?.trim();
    const btn = document.getElementById('btn-submit-log-neg');

    if (!obs) {
        return showToast('Por favor ingrese las observaciones del avance o negociación.', 'error');
    }

    // Protocolo de confirmación para cierres de oportunidad
    if (['GANADO', 'PERDIDO'].includes(stage)) {
        const stageLabel = stage === 'GANADO' ? 'GANADA (Cierre Exitoso)' : 'RECHAZADA / PERDIDA';
        if (!confirm(`PROTOCOLO DE CIERRE COMERCIAL:\n\n¿Estás seguro de registrar esta gestión como ${stageLabel}?\n\nEsta acción finalizará el ciclo activo de la oportunidad comercial en el pipeline.`)) {
            return;
        }
    }

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span style="display:inline-flex; align-items:center; gap:6px;"><svg class="spin-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg> Guardando...</span>';
    }

    try {
        const payload = {
            channel: channel,
            pipeline_stage: stage,
            observations: obs
        };
        const res = await apiRequest(`${REQ_API}/${reqId}/log-negotiation`, 'POST', payload);
        showToast(res.message || 'Gestión registrada y etapa actualizada.', 'success');
        closeLogNegotiationModal();
        if (window.currentViewedReq && window.currentViewedReq.id == reqId) {
            window.currentViewedReq.pipeline_stage = stage;
            loadRequestCommercialLogs(window.currentViewedReq.customer_nit, window.currentViewedReq.company_name, window.currentViewedReq);
        }
        if (typeof loadRequests === 'function') loadRequests();
    } catch(err) {
        showToast(err.message || 'Error al registrar gestión.', 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<span style="display:inline-flex; align-items:center; gap:6px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg> Guardar</span>';
        }
    }
}
window.submitLogNegotiation = submitLogNegotiation;


// ── LANZADOR INTELIGENTE DE WHATSAPP CON AUTO-LOG ─────────────────────────
function openWhatsAppWithAutoLog(phone, companyName, reqId, reqNumber) {
    if (!phone) return showToast('No hay número de teléfono registrado.', 'error');
    const cleanPhone = phone.replace(/\D/g, '');
    const defaultMsg = encodeURIComponent(`Hola, te escribo de ÁLACOR S.A.S. respecto a la solicitud ${reqNumber || ''} de ${companyName || ''}.`);
    const waUrl = `https://wa.me/${cleanPhone.startsWith('57') ? cleanPhone : '57' + cleanPhone}?text=${defaultMsg}`;
    
    window.open(waUrl, '_blank');

    // Diálogo amigable para auto-registro
    setTimeout(() => {
        if (confirm(`¿Deseas registrar este contacto por WhatsApp con ${companyName} en la bitácora comercial?`)) {
            const obs = prompt("Ingresa una breve nota de la conversación de WhatsApp:", "Contacto por WhatsApp para seguimiento comercial.");
            if (obs && obs.trim()) {
                apiRequest(`${REQ_API}/${reqId}/log-negotiation`, 'POST', {
                    channel: 'WHATSAPP',
                    pipeline_stage: 'NEGOCIACION',
                    observations: obs.trim()
                }).then(() => {
                    showToast('Gestión de WhatsApp registrada con éxito en la bitácora.', 'success');
                    if (window.currentViewedReq && window.currentViewedReq.id == reqId) {
                        loadRequestCommercialLogs(window.currentViewedReq.customer_nit, window.currentViewedReq.company_name, window.currentViewedReq);
                    }
                    if (typeof loadRequests === 'function') loadRequests();
                }).catch(err => showToast(err.message, 'error'));
            }
        }
    }, 800);
}
window.openWhatsAppWithAutoLog = openWhatsAppWithAutoLog;



