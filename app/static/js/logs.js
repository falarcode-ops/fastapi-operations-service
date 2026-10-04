/**
 * logs.js (v12.13.0)
 * -------------------
 * Centro de Trazabilidad y Buscador Inteligente de Comunicaciones Omnicanal.
 * Monitoreo en tiempo real de correos de marketing N8N, cotizaciones emitidas,
 * interacciones de WhatsApp, llamadas y bitácora comercial de asesores.
 */

let editLogId = null;
let commsDebounceTimer = null;

const commsState = {
    datePreset: 'all',
    dateFrom: '',
    dateTo: '',
    category: 'all',
    search: '',
    limit: 50,
    offset: 0,
    total: 0,
    feed: []
};

/**
 * Carga el feed de comunicaciones omnicanal desde el backend
 */
async function loadCommunicationsFeed(resetPage = false) {
    if (resetPage) commsState.offset = 0;
    const tbody = document.getElementById('logs-feed-tbody');
    const badge = document.getElementById('comms-results-badge');
    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px; color:var(--text-muted);">Consultando trazabilidad de comunicaciones...</td></tr>`;
    }

    try {
        const params = new URLSearchParams();
        if (commsState.datePreset && commsState.datePreset !== 'all') {
            params.append('date_preset', commsState.datePreset);
        }
        if (commsState.dateFrom) params.append('date_from', commsState.dateFrom);
        if (commsState.dateTo) params.append('date_to', commsState.dateTo);
        if (commsState.category && commsState.category !== 'all') {
            params.append('category', commsState.category);
        }
        if (commsState.search && commsState.search.trim()) {
            params.append('search', commsState.search.trim());
        }
        params.append('limit', commsState.limit);
        params.append('offset', commsState.offset);

        const res = await apiFetch(`${API_BASE}/commercial-logs/feed?${params.toString()}`);
        if (!res.ok) throw new Error('No se pudo obtener el feed de comunicaciones');
        const data = await res.json();

        commsState.total = data.total || 0;
        commsState.feed = data.feed || [];

        renderCommsFeedTable(commsState.feed);
        renderCommsPagination();

        if (badge) {
            badge.innerText = `Mostrando ${commsState.feed.length} de ${commsState.total} registros`;
        }
        const countAll = document.getElementById('count-cat-all');
        if (countAll && commsState.category === 'all' && !commsState.search) {
            countAll.innerText = commsState.total;
        }
    } catch (e) {
        console.error('Error loading communications feed:', e);
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px; color:#ef4444;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px; margin-right:4px;"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>Error al cargar comunicaciones: ${e.message}</td></tr>`;
        }
    }
}

/**
 * Cambia el preset de fecha rápido (Hoy, Ayer y Hoy, Últimos 3 días, etc.)
 */
function setCommsDatePreset(preset) {
    commsState.datePreset = preset;
    commsState.dateFrom = '';
    commsState.dateTo = '';

    const dFrom = document.getElementById('comms-date-from');
    const dTo = document.getElementById('comms-date-to');
    if (dFrom) dFrom.value = '';
    if (dTo) dTo.value = '';

    const chips = ['all', 'today', 'yesterday-today', 'last-3', 'last-7', 'month'];
    chips.forEach(c => {
        const btn = document.getElementById(`chip-date-${c}`);
        if (btn) btn.classList.remove('active');
    });

    const presetMap = {
        all: 'all',
        today: 'today',
        yesterday_today: 'yesterday-today',
        last_3_days: 'last-3',
        last_7_days: 'last-7',
        this_month: 'month'
    };
    const activeChipId = presetMap[preset] || 'all';
    const activeBtn = document.getElementById(`chip-date-${activeChipId}`);
    if (activeBtn) activeBtn.classList.add('active');

    loadCommunicationsFeed(true);
}

/**
 * Manejo de rango de fechas personalizado
 */
function onCommsCustomDateChange() {
    const dFrom = document.getElementById('comms-date-from')?.value;
    const dTo = document.getElementById('comms-date-to')?.value;

    if (dFrom || dTo) {
        commsState.datePreset = null;
        commsState.dateFrom = dFrom || '';
        commsState.dateTo = dTo || '';

        const chips = ['all', 'today', 'yesterday-today', 'last-3', 'last-7', 'month'];
        chips.forEach(c => {
            const btn = document.getElementById(`chip-date-${c}`);
            if (btn) btn.classList.remove('active');
        });

        loadCommunicationsFeed(true);
    }
}

function clearCommsCustomDates() {
    setCommsDatePreset('all');
}

/**
 * Filtro de categorías de canal (N8N, Cotizaciones, WhatsApp, etc.)
 */
function setCommsCategory(cat) {
    commsState.category = cat;

    const cats = ['all', 'marketing_outbound', 'quotes', 'whatsapp', 'calls', 'visits'];
    const catMap = {
        all: 'all',
        marketing_outbound: 'n8n',
        quotes: 'quotes',
        whatsapp: 'whatsapp',
        calls: 'calls',
        visits: 'visits'
    };

    cats.forEach(c => {
        const cid = catMap[c];
        const btn = document.getElementById(`chip-cat-${cid}`);
        if (btn) btn.classList.remove('active');
    });

    const activeBtnId = catMap[cat] || 'all';
    const activeBtn = document.getElementById(`chip-cat-${activeBtnId}`);
    if (activeBtn) activeBtn.classList.add('active');

    loadCommunicationsFeed(true);
}

/**
 * Debounce para búsqueda universal
 */
function debounceCommsSearch() {
    clearTimeout(commsDebounceTimer);
    commsDebounceTimer = setTimeout(() => {
        const val = document.getElementById('comms-search-input')?.value || '';
        commsState.search = val;
        loadCommunicationsFeed(true);
    }, 300);
}

/**
 * Formatea fecha y hora en zona horaria local colombiana
 */
function formatCommDateTime(dateStr) {
    if (!dateStr) return '<span style="color:var(--text-muted)">-</span>';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const pad = n => n < 10 ? '0' + n : n;
    const day = pad(d.getDate());
    const month = pad(d.getMonth() + 1);
    const year = d.getFullYear();
    let hours = d.getHours();
    const minutes = pad(d.getMinutes());
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `<div style="font-weight:600; color:var(--text-primary); font-size:0.82rem;">${day}/${month}/${year}</div>
            <div style="font-size:0.74rem; color:var(--text-muted);">${hours}:${minutes} ${ampm}</div>`;
}

/**
 * Genera el badge HTML según la naturaleza de la comunicación
 */
function getCommBadgeHtml(it) {
    const type = (it.interaction_type || '').toUpperCase();
    const method = (it.contact_method || '').toUpperCase();
    const obs = (it.observations || '').toUpperCase();
    const salesperson = (it.salesperson || '').toUpperCase();

    if (type.includes('PROSPECCION') || salesperson.includes('N8N') || obs.includes('PROSPECCIÓN N8N') || obs.includes('MODO SEGURO')) {
        return `<span class="comm-badge type-n8n"><span class="comm-dot dot-purple"></span>Marketing N8N</span>`;
    }
    if (type.includes('COTIZACION') || it.offer_number || obs.includes('ESTIMACIÓN OFICIAL') || obs.includes('DESPACHO DE OFERTA')) {
        return `<span class="comm-badge type-quote"><span class="comm-dot dot-emerald"></span>Cotización ${it.offer_number ? '#' + it.offer_number : ''}</span>`;
    }
    if (method.includes('WHATSAPP') || type.includes('WHATSAPP') || obs.includes('[WHATSAPP')) {
        return `<span class="comm-badge type-whatsapp"><span class="comm-dot dot-green"></span>WhatsApp</span>`;
    }
    if (method.includes('TELEFON') || type.includes('LLAMADA') || obs.includes('[LLAMADA')) {
        return `<span class="comm-badge type-call"><span class="comm-dot dot-blue"></span>Llamada</span>`;
    }
    if (method.includes('VISITA') || type.includes('VISITA') || obs.includes('[VISITA')) {
        return `<span class="comm-badge type-visit"><span class="comm-dot dot-amber"></span>Visita</span>`;
    }
    if (type.includes('INGRESO_WEB') || type.includes('INBOUND') || type.includes('SOLICITUD COTIZACION')) {
        return `<span class="comm-badge type-inbound"><span class="comm-dot dot-cyan"></span>Inbound Web</span>`;
    }
    return `<span class="comm-badge type-generic"><span class="comm-dot dot-slate"></span>${it.interaction_type || 'Gestión'}</span>`;
}

/**
 * Renderizado de la tabla de feed
 */
function renderCommsFeedTable(items) {
    const tbody = document.getElementById('logs-feed-tbody');
    if (!tbody) return;

    if (!items || items.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center; padding:40px; color:var(--text-muted);">
                    <div style="margin-bottom:10px; display:inline-flex; align-items:center; justify-content:center; width:44px; height:44px; border-radius:50%; background:var(--bg-secondary); border:1px solid var(--border-color); color:var(--text-muted);">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    </div>
                    <div style="font-weight:600; color:var(--text-primary); font-size:0.9rem;">No se encontraron comunicaciones registradas</div>
                    <div style="font-size:0.8rem; margin-top:4px;">Prueba ajustando el rango de fechas o los términos de búsqueda.</div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = items.map(it => {
        const nit = it.customer_nit || '';
        const compName = it.company_name || `Empresa ${nit}`;
        const dateHtml = formatCommDateTime(it.created_at || it.occurred_at);
        const badgeHtml = getCommBadgeHtml(it);
        const advisor = it.salesperson || 'Sistema';
        const obs = it.observations || 'Sin observaciones registradas.';
        const contacts = it.contacts_info || 'Sin decisor registrado';
        const scoreBadge = it.lead_score !== null && it.lead_score !== undefined
            ? `<span class="score-pill warm" style="margin-left:4px;">${it.lead_score} pts</span>`
            : '';

        const actionBtn = it.related_request_id
            ? `<button class="action-icon-btn" onclick="viewRequestDetails(${it.related_request_id})" title="Ver Solicitud Comercial #${it.related_request_id}" aria-label="Solicitud"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></button>`
            : `<button class="action-icon-btn" onclick="openCustomerModal('${nit}')" title="Ver Ficha del Cliente" aria-label="Cliente"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></button>`;

        return `
            <tr>
                <td>${dateHtml}</td>
                <td>
                    <button class="comm-company-btn" onclick="openCustomerModal('${nit}')" title="Abrir Ficha de Cliente">
                        ${compName}
                    </button>
                    <div style="font-size:0.74rem; color:var(--text-muted); margin-top:2px;">
                        NIT/ID: ${nit} ${scoreBadge}
                    </div>
                </td>
                <td>${badgeHtml}</td>
                <td style="font-size:0.8rem; color:var(--text-primary); line-height:1.35;">
                    ${contacts}
                </td>
                <td>
                    <span style="font-size:0.78rem; font-weight:600; color:var(--accent-primary); background:rgba(37,99,235,0.1); padding:2px 7px; border-radius:4px;">
                        ${advisor}
                    </span>
                </td>
                <td>
                    <div class="comm-obs-text">${obs}</div>
                </td>
                <td style="text-align:center;">
                    ${actionBtn}
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * Paginación para el feed de comunicaciones
 */
function renderCommsPagination() {
    const container = document.getElementById('logs-feed-pagination');
    if (!container) return;

    const totalPages = Math.ceil(commsState.total / commsState.limit) || 1;
    const currentPage = Math.floor(commsState.offset / commsState.limit) + 1;

    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = `
        <div style="display:flex; align-items:center; gap:8px; font-size:0.82rem;">
            <button class="btn-secondary btn-compact" ${currentPage === 1 ? 'disabled' : ''} onclick="changeCommsPage(${currentPage - 1})" title="Página anterior" aria-label="Anterior" style="padding:4px 8px; display:inline-flex; align-items:center;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <span style="color:var(--text-muted); font-weight:600;">Página ${currentPage} de ${totalPages}</span>
            <button class="btn-secondary btn-compact" ${currentPage === totalPages ? 'disabled' : ''} onclick="changeCommsPage(${currentPage + 1})" title="Página siguiente" aria-label="Siguiente" style="padding:4px 8px; display:inline-flex; align-items:center;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
        </div>
    `;
}

function changeCommsPage(page) {
    commsState.offset = (page - 1) * commsState.limit;
    loadCommunicationsFeed(false);
}

/**
 * Exportación de comunicaciones en CSV / Excel
 */
function exportLogsFeed() {
    if (!commsState.feed || commsState.feed.length === 0) {
        showToast('No hay datos en el feed para exportar', 'warning');
        return;
    }

    const headers = ['Fecha', 'NIT', 'Empresa', 'Tipo', 'Canal', 'Asesor', 'Decisores/Contactos', 'Observaciones', 'Lead Score'];
    const rows = commsState.feed.map(it => [
        `"${(it.created_at || it.occurred_at || '').replace(/"/g, '""')}"`,
        `"${(it.customer_nit || '').replace(/"/g, '""')}"`,
        `"${(it.company_name || '').replace(/"/g, '""')}"`,
        `"${(it.interaction_type || '').replace(/"/g, '""')}"`,
        `"${(it.contact_method || '').replace(/"/g, '""')}"`,
        `"${(it.salesperson || '').replace(/"/g, '""')}"`,
        `"${(it.contacts_info || '').replace(/"/g, '""')}"`,
        `"${(it.observations || '').replace(/"/g, '""')}"`,
        `"${it.lead_score || 0}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Coralis_Comunicaciones_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Reporte de comunicaciones descargado con éxito', 'success');
}

/**
 * Formulario modal para registrar gestión manual (Preservado)
 */
async function openLogFormModal(logId = null, defaultNit = null) {
    const title = document.getElementById('log-modal-title');
    const dateField = document.getElementById('log-date-field');
    const salespersonField = document.getElementById('log-salesperson-field');

    if (!title || !dateField) return;

    try {
        const res = await apiFetch(`${API_BASE}/employees?active_only=true`);
        const employees = await res.json();
        const activeList = (employees || []).filter(e => e.is_active !== false && e.is_active !== 0);
        if (salespersonField) {
            salespersonField.innerHTML = '';
            activeList.forEach(emp => {
                const opt = document.createElement('option');
                opt.value = emp.full_name;
                opt.textContent = emp.full_name;
                salespersonField.appendChild(opt);
            });
        }
    } catch (e) {
        console.error('Error populating employees:', e);
    }

    let d = new Date();
    const offset = d.getTimezoneOffset();
    d = new Date(d.getTime() - (offset * 60 * 1000));
    dateField.value = d.toISOString().slice(0, 16);

    const modal = document.getElementById('log-form-modal');
    if (modal) modal.classList.add('active');
}

function closeLogFormModal() {
    const modal = document.getElementById('log-form-modal');
    if (modal) modal.classList.remove('active');
}

async function submitLogForm(event) {
    event.preventDefault();
    const nit = typeof activeCustomerNit !== 'undefined' ? activeCustomerNit : null;
    if (!nit) {
        showToast('Seleccione un cliente para registrar la gestión', 'warning');
        return;
    }

    const payload = {
        customer_nit: nit,
        occurred_at: document.getElementById('log-date-field')?.value || new Date().toISOString(),
        contact_method: document.getElementById('log-method-field')?.value || 'TELEFONICO',
        interaction_type: document.getElementById('log-interaction-field')?.value || 'GESTION COMERCIAL',
        observations: document.getElementById('log-obs-field')?.value || '',
        salesperson: document.getElementById('log-salesperson-field')?.value || ''
    };

    try {
        const res = await apiFetch(`${API_BASE}/commercial-logs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Error al registrar gestión');
        showToast('Gestión registrada exitosamente', 'success');
        closeLogFormModal();
        loadCommunicationsFeed(true);
    } catch (e) {
        showToast(e.message, 'error');
    }
}

