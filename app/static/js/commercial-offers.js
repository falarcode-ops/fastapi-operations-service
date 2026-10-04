// ─────────────────────────────────────────────────────────────────────────────
// COMMERCIAL OFFERS & CONTRACTS MODULE (Coralis CRM)
// ─────────────────────────────────────────────────────────────────────────────

function setOffersPage(page) {
    if (!_offersPagination) _offersPagination = createPaginationState({ pageSize: 30 });
    _offersPagination.currentPage = page;
    renderOffersFromCache();
}
window.setOffersPage = setOffersPage;

function setOffersPageSize(size) {
    if (!_offersPagination) _offersPagination = createPaginationState({ pageSize: 30 });
    _offersPagination.pageSize = size;
    _offersPagination.currentPage = 1;
    renderOffersFromCache();
}
window.setOffersPageSize = setOffersPageSize;

function renderOffersFromCache() {
    const tbody = document.getElementById('offers-tbody');
    if (!tbody) return;

    if (!_offersPagination) {
        _offersPagination = createPaginationState({ pageSize: 30 });
    }

    const filtered = _rawOffersCache || [];
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;padding:30px;color:var(--text-muted);">No hay ofertas. Usa "Crear Oferta Formal" para crear la primera.</td></tr>';
        renderPaginationBar('offers-pagination-bar', _offersPagination, 'setOffersPage', 'setOffersPageSize');
        return;
    }

    const pagedItems = getPagedSlice(filtered, _offersPagination);

    tbody.innerHTML = pagedItems.map(o => {
        const oDateRaw = o.created_at || '';
        const oDate = oDateRaw.substring(0,10);
        const oTime = oDateRaw.length >= 16 ? oDateRaw.substring(11,16) : '';
        return `<tr>
        <td><strong style="font-family:var(--font-heading); color:var(--accent-primary);">${o.offer_number}</strong></td>
        <td style="font-size:0.8rem;">${o.customer_nit}</td>
        <td><span style="font-size:0.78rem; color:var(--accent-primary); font-weight:600;">${o.package_code}</span></td>
        <td style="font-size:0.8rem;">${o.payment_mode}</td>
        <td>${fmtCOP(o.implementation_price)}</td>
        <td>${fmtCOP(o.monthly_price)}</td>
        <td style="font-weight:600; color:#4caf50;">${fmtCOP(o.total_annual_value)}</td>
        <td>${cmrBadge(o.status)}</td>
        <td style="font-size:0.78rem; white-space:nowrap;">
            <div>${oDate}</div>
            ${oTime ? `<div style="color:var(--text-muted); font-size:0.72rem;">${oTime}</div>` : ''}
        </td>
        <td style="font-size:0.78rem;">${o.salesperson||'—'}</td>
        <td>
            <div class="icon-btn-group" style="justify-content:center;">
                <button class="action-icon-btn" onclick="downloadOfferPDF(${o.id}, '${o.offer_number}')" data-tip="Descargar PDF" title="Descargar PDF">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                </button>
                <button class="action-icon-btn" onclick="updateOfferStatus(${o.id})" data-tip="Cambiar estado" title="Cambiar estado">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
                </button>
            </div>
        </td>
    </tr>`;}).join('');

    renderPaginationBar('offers-pagination-bar', _offersPagination, 'setOffersPage', 'setOffersPageSize');
}

async function loadOffers(nit='') {
    const tbody = document.getElementById('offers-tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;padding:20px;color:var(--text-muted);">Cargando ofertas...</td></tr>';
    try {
        const url = nit ? `${CMR_API}/offers?customer_nit=${encodeURIComponent(nit)}` : `${CMR_API}/offers`;
        const offers = await apiRequest(url);
        _rawOffersCache = offers || [];
        if (_offersPagination) _offersPagination.currentPage = 1;
        renderOffersFromCache();
    } catch(e) {
        tbody.innerHTML = `<tr><td colspan="11" style="color:#f44336;padding:20px;text-align:center;">${e.message}</td></tr>`;
    }
}

function downloadOfferPDF(id, offerNumber) {
    const url = `${CMR_API}/offers/${id}/pdf`;
    const token = localStorage.getItem('crm_token') || localStorage.getItem('token');
    showToast('Consultando documento de Oferta...', 'info');
    fetch(url, { headers: { 'Authorization': `Bearer ${token}` } })
        .then(res => {
            if (!res.ok) throw new Error('Documento de oferta no disponible');
            const contentType = res.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
                return res.json().then(data => {
                    const alegraUrl = data.alegra_public_url;
                    if (alegraUrl) {
                        window.open(alegraUrl, '_blank');
                        showToast('Abriendo cotización oficial en Alegra...', 'success');
                    } else {
                        showToast('Enlace de Alegra no disponible', 'warning');
                    }
                });
            }
            return res.blob().then(blob => {
                const blobUrl = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = blobUrl;
                a.download = `Oferta_Formal_${offerNumber || id}.pdf`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(blobUrl);
                showToast('PDF descargado exitosamente', 'success');
            });
        })
        .catch(e => showToast(e.message, 'error'));
}

async function updateOfferStatus(id) {
    const newStatus = prompt("Ingrese nuevo estado de la oferta (BORRADOR, EMITIDA, ENVIADA, ACEPTADA, RECHAZADA, VENCIDA):", "ACEPTADA");
    if (!newStatus) return;
    try {
        const res = await apiRequest(`${CMR_API}/offers/${id}/status`, 'PUT', { status: newStatus.toUpperCase().trim() });
        showToast(res.message || 'Estado de oferta actualizado.', 'success');
        loadOffers();
    } catch(e) {
        showToast(e.message, 'error');
    }
}

function setContractsPage(page) {
    if (!_contractsPagination) _contractsPagination = createPaginationState({ pageSize: 30 });
    _contractsPagination.currentPage = page;
    renderContractsFromCache();
}
window.setContractsPage = setContractsPage;

function setContractsPageSize(size) {
    if (!_contractsPagination) _contractsPagination = createPaginationState({ pageSize: 30 });
    _contractsPagination.pageSize = size;
    _contractsPagination.currentPage = 1;
    renderContractsFromCache();
}
window.setContractsPageSize = setContractsPageSize;

function renderContractsFromCache() {
    const tbody = document.getElementById('contracts-tbody');
    if (!tbody) return;

    if (!_contractsPagination) {
        _contractsPagination = createPaginationState({ pageSize: 30 });
    }

    const filtered = _rawContractsCache || [];
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:30px;color:var(--text-muted);">No hay contratos registrados aún.</td></tr>';
        renderPaginationBar('contracts-pagination-bar', _contractsPagination, 'setContractsPage', 'setContractsPageSize');
        return;
    }

    const pagedItems = getPagedSlice(filtered, _contractsPagination);

    tbody.innerHTML = pagedItems.map(c => {
        const startDate = (c.start_date || '').substring(0, 10) || '—';
        const endDate = (c.end_date || '').substring(0, 10) || '—';
        return `<tr>
            <td><strong style="font-family:var(--font-heading); color:var(--accent-primary);">${c.contract_number || '—'}</strong></td>
            <td style="font-size:0.8rem;">${c.customer_nit || '—'}</td>
            <td><span style="font-size:0.78rem; color:var(--accent-primary);">${c.package_code || 'SG-SST'}</span></td>
            <td style="font-size:0.8rem;">${c.payment_mode || 'MENSUAL'}</td>
            <td style="font-weight:600; color:#4caf50;">${fmtCOP(c.total_contract_value || c.total_value)}</td>
            <td style="font-size:0.78rem;">${startDate}</td>
            <td style="font-size:0.78rem;">${endDate}</td>
            <td>${cmrBadge(c.status || 'BORRADOR')}</td>
            <td style="text-align:center;">
                <div class="icon-btn-group" style="justify-content:center;">
                    <button class="action-icon-btn" onclick="downloadContractPDF(${c.id}, '${c.contract_number}')" data-tip="Descargar Contrato PDF" title="Descargar Contrato PDF">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    </button>
                    <button class="action-icon-btn" onclick="updateContractStatus(${c.id})" data-tip="Cambiar estado" title="Cambiar estado">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
                    </button>
                </div>
            </td>
        </tr>`;
    }).join('');

    renderPaginationBar('contracts-pagination-bar', _contractsPagination, 'setContractsPage', 'setContractsPageSize');
}

async function loadContracts(nit='') {
    const tbody = document.getElementById('contracts-tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:20px;color:var(--text-muted);">Cargando contratos...</td></tr>';
    try {
        const url = nit ? `${CMR_API}/contracts?customer_nit=${encodeURIComponent(nit)}` : `${CMR_API}/contracts`;
        const contracts = await apiRequest(url);
        _rawContractsCache = contracts || [];
        if (_contractsPagination) _contractsPagination.currentPage = 1;
        renderContractsFromCache();
    } catch(e) {
        tbody.innerHTML = `<tr><td colspan="9" style="color:#f44336;padding:20px;text-align:center;">${e.message}</td></tr>`;
    }
}


function downloadContractPDF(id, contractNumber) {
    const url = `${CMR_API}/contracts/${id}/pdf`;
    const token = localStorage.getItem('crm_token') || localStorage.getItem('token');
    showToast('Descargando Contrato PDF...', 'info');
    fetch(url, { headers: { 'Authorization': `Bearer ${token}` } })
        .then(res => {
            if (!res.ok) throw new Error('PDF de contrato no disponible');
            return res.blob();
        })
        .then(blob => {
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = blobUrl;
            a.download = `Contrato_${contractNumber || id}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(blobUrl);
            showToast('Contrato descargado exitosamente', 'success');
        })
        .catch(e => showToast(e.message, 'error'));
}

async function updateContractStatus(id) {
    const newStatus = prompt("Ingrese nuevo estado del contrato (BORRADOR, PENDIENTE_FIRMA, FIRMADO, VIGENTE, FINALIZADO, CANCELADO):", "FIRMADO");
    if (!newStatus) return;
    try {
        const res = await apiRequest(`${CMR_API}/contracts/${id}/status`, 'PUT', { status: newStatus.toUpperCase().trim() });
        showToast(res.message || 'Estado del contrato actualizado.', 'success');
        loadContracts();
    } catch(e) {
        showToast(e.message, 'error');
    }
}
