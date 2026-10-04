// ─── GLOBAL API ENDPOINTS & AUTH HEADERS ───────────────────────────────────────
const _coralisTenantCfg = window._coralisConfig || {};
const API_BASE = _coralisTenantCfg.apiBase || '/api';
const CMR_API = _coralisTenantCfg.cmrApi || `${API_BASE}/v1/sgsst/commercial`;
const REQ_API = _coralisTenantCfg.reqApi || `${API_BASE}/v1/requests`;
const PERM_API = _coralisTenantCfg.permApi || `${API_BASE}/v1/permissions`;
const PROD_API = _coralisTenantCfg.prodApi || `${API_BASE}/v1/commercial/products`;

// ─── GLOBAL SHARED APPLICATION STATE ──────────────────────────────────────────
let _currentReqVertical = 'SG-SST';
let _reqSearchDebounceTimer = null;
let _unifiedDocType = 'PRE_OFFER';
let _pqZonesCache = [];
let _pipelineSummary = null;
let _permissionsMatrixData = [];
let _uploadedSignatureImgUrl = '';
let _allEmployeesData = [];
let _requestsPagination = null;
let _preQuotesPagination = null;
let _offersPagination = null;
let _contractsPagination = null;
let _rawRequestsCache = [];
let _rawPreQuotesCache = [];
let _rawOffersCache = [];
let _rawContractsCache = [];
let _currentProductQuoteItems = [];
let _currentProductQuoteReq = null;




function getAuthHeaders() {
    const token = localStorage.getItem('crm_token') || localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}


// Safe String helper to prevent TypeError on non-string values
function safeString(val) {
    if (!val) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'object') {
        try {
            return val.plan || val.plan_recommended || val.plan_code || JSON.stringify(val);
        } catch(e) {
            return '';
        }
    }
    return String(val);
}

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}



function formatDiagnosticDetails(details) {
    if (!details || typeof details !== 'object') {
        return '<div style="color:var(--text-muted); text-align:center; padding:10px;">No hay datos adicionales de diagnóstico registrados.</div>';
    }

    let payloadObj = null;
    if (details.onboarding_payload) {
        if (typeof details.onboarding_payload === 'string') {
            try { payloadObj = JSON.parse(details.onboarding_payload); } catch(e) {}
        } else if (typeof details.onboarding_payload === 'object') {
            payloadObj = details.onboarding_payload;
        }
    }

    let scoreHtml = '';
    const scoreVal = details.diagnostic_score !== undefined ? parseFloat(details.diagnostic_score) : (payloadObj?.score_percentico !== undefined ? parseFloat(payloadObj.score_percentico) : null);
    
    if (scoreVal !== null && !isNaN(scoreVal)) {
        let scoreColor = '#ef4444';
        let scoreLabel = 'Riesgo Alto / Crítico';
        if (scoreVal >= 80) {
            scoreColor = '#10b981';
            scoreLabel = 'Cumplimiento Alto';
        } else if (scoreVal >= 50) {
            scoreColor = '#f59e0b';
            scoreLabel = 'Cumplimiento Moderado';
        }

        scoreHtml = `
        <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border-color); border-radius:10px; padding:12px; margin-bottom:12px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                <span style="font-weight:600; font-size:0.82rem; color:var(--text-secondary);">Puntaje de Diagnóstico Inicial:</span>
                <span style="background:${scoreColor}20; color:${scoreColor}; border:1px solid ${scoreColor}50; padding:2px 8px; border-radius:12px; font-weight:700; font-size:0.8rem;">
                    ${scoreVal.toFixed(1)}% — ${scoreLabel}
                </span>
            </div>
            <div style="background:rgba(255,255,255,0.1); border-radius:4px; height:8px; width:100%; overflow:hidden;">
                <div style="background:${scoreColor}; width:${Math.min(100, Math.max(0, scoreVal))}%; height:100%; transition:width 0.5s ease;"></div>
            </div>
        </div>`;
    }

    const keyLabels = {
        'selected_plan': 'Plan Seleccionado',
        'employees_count': 'N° Empleados',
        'risk_level': 'Nivel de Riesgo',
        'economic_activity': 'Actividad Económica',
        'preferred_payment_mode': 'Modalidad de Pago',
        'contact_name': 'Contacto SG-SST',
        'city': 'Ciudad',
        'department': 'Departamento',
        'address': 'Dirección'
    };

    let gridItems = [];

    const formatValue = (key, rawVal) => {
        if (rawVal === null || rawVal === undefined || rawVal === '' || rawVal === 'null') return null;
        if (key === 'selected_plan') {
            return `<span style="color:var(--accent-primary); font-weight:600;">${String(rawVal).replace(/_/g, ' ')}</span>`;
        }
        if (key === 'risk_level') {
            return `<span style="font-weight:600;">Clase ${rawVal}</span>`;
        }
        if (key === 'preferred_payment_mode') {
            return `<span style="background:rgba(14,165,233,0.15); color:var(--accent-primary); padding:2px 6px; border-radius:4px; font-size:0.75rem; font-weight:600;">${rawVal}</span>`;
        }
        return String(rawVal);
    };

    for (const [k, label] of Object.entries(keyLabels)) {
        if (details[k] !== undefined) {
            const formattedVal = formatValue(k, details[k]);
            if (formattedVal !== null) {
                gridItems.push(`
                    <div style="display:flex; flex-direction:column; gap:2px; background:rgba(255,255,255,0.02); padding:8px 10px; border-radius:6px; border:1px solid var(--border-color);">
                        <span style="font-size:0.72rem; color:var(--text-muted); font-weight:500;">${label}</span>
                        <span style="font-size:0.82rem; font-weight:500; color:var(--text-primary);">${formattedVal}</span>
                    </div>
                `);
            }
        }
    }

    const knownKeys = new Set([...Object.keys(keyLabels), 'onboarding_payload', 'raw_payload', 'diagnostic_score', 'answers']);
    for (const k of Object.keys(details)) {
        if (!knownKeys.has(k)) {
            const val = details[k];
            if (val !== null && val !== undefined && val !== '' && val !== 'null' && typeof val !== 'object') {
                const label = k.replace(/_/g, ' ').replace(/\w/g, l => l.toUpperCase());
                gridItems.push(`
                    <div style="display:flex; flex-direction:column; gap:2px; background:rgba(255,255,255,0.02); padding:8px 10px; border-radius:6px; border:1px solid var(--border-color);">
                        <span style="font-size:0.72rem; color:var(--text-muted); font-weight:500;">${label}</span>
                        <span style="font-size:0.82rem; font-weight:500; color:var(--text-primary);">${val}</span>
                    </div>
                `);
            }
        }
    }

    let gridHtml = gridItems.length > 0 ? `
        <div style="display:grid; grid-template-columns:repeat(2, 1fr); gap:8px; margin-bottom:12px;">
            ${gridItems.join('')}
        </div>
    ` : '';

    let standardsHtml = '';
    const answers = payloadObj?.answers || (Array.isArray(details.answers) ? details.answers : null);
    if (answers && answers.length > 0) {
        const compliantCount = answers.filter(a => a.compliant === true).length;
        const totalCount = answers.length;
        const nonCompliantCount = totalCount - compliantCount;

        const answerPills = answers.map(a => {
            const isOk = a.compliant === true;
            const badgeColor = isOk ? '#10b981' : '#ef4444';
            const icon = isOk ? '✓' : '✕';
            return `<span style="background:${badgeColor}15; color:${badgeColor}; border:1px solid ${badgeColor}35; padding:2px 6px; border-radius:4px; font-size:0.72rem; font-weight:600; display:inline-flex; align-items:center; gap:3px;">
                ${icon} ${a.standard_id || 'STD'}
            </span>`;
        }).join(' ');

        standardsHtml = `
        <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border-color); border-radius:8px; padding:10px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <span style="font-size:0.78rem; font-weight:600; color:var(--accent-primary);">Estándares Evaluados (Res. 0312):</span>
                <span style="font-size:0.75rem; color:var(--text-muted);">
                    <strong style="color:#10b981;">${compliantCount} Cumplen</strong> / <strong style="color:#ef4444;">${nonCompliantCount} Pendientes</strong>
                </span>
            </div>
            <div style="display:flex; flex-wrap:wrap; gap:6px;">
                ${answerPills}
            </div>
        </div>`;
    }

    return scoreHtml + gridHtml + standardsHtml;
}

// Limpieza arquitectónica de Service Workers y Caché vieja para evitar conflictos de versiones
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
        for (let reg of registrations) {
            reg.unregister().then(() => console.log("SW unregistrado para prevenir desalineaciones de cache"));
        }
    });
}
if ('caches' in window) {
    caches.keys().then(keys => {
        for (let key of keys) {
            caches.delete(key).then(() => console.log("Caché limpiada para prevenir desalineaciones de código"));
        }
    });
}

// Envoltura global de fetch para inyectar token de autorización y manejar expiración
async function apiFetch(url, options = {}) {
    const headers = {
        ...options.headers
    };
    const token = localStorage.getItem('token');
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Si no es un FormData o similar, asegurar Content-Type
    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }
    
    const finalOptions = {
        ...options,
        headers
    };
    
    const response = await window.fetch(url, finalOptions);
    if (response.status === 401) {
        // Ignorar si ya estamos en la pantalla de login para evitar bucles
        if (localStorage.getItem('token')) {
            console.warn("Sesión no autorizada o expirada. Cerrando sesión...");
            logout();
        }
    }
    return response;
}
let customersList = [];
let logsList = [];
let sessionsList = [];
let chartInstance = null;

// ── TABLE ENGINE STATE ──────────────────────────────────────────────────────
const custTableState = { sortKey: null, sortDir: 1, page: 1, pageSize: 10, filtered: [] };
const logsTableState = { sortKey: null, sortDir: 1, page: 1, pageSize: 10, filtered: [] };

// Sortable column definitions
const CUST_COLS = [
    { key: 'nit',          label: 'NIT',            type: 'text' },
    { key: 'company_name', label: 'Empresa / Nombre',type: 'text' },
    { key: 'customer_type',label: 'Tipo',           type: 'text' },
    { key: 'status',       label: 'Estado',         type: 'text' },
    { key: 'city',         label: 'Ciudad',         type: 'text' },
    { key: 'sector',       label: 'Sector',         type: 'text' },
    { key: '_contacts',    label: 'Contactos',      type: 'num'  },
    { key: null,           label: 'Acciones',       type: null   }
];

const LOGS_COLS = [
    { key: 'occurred_at',     label: 'Fecha',        type: 'date' },
    { key: 'customer_nit',    label: 'Cliente',      type: 'text' },
    { key: 'contact_method',  label: 'Vía Contacto', type: 'text' },
    { key: 'interaction_type',label: 'Tipo Gestión', type: 'text' },
    { key: 'salesperson',     label: 'Vendedor',     type: 'text' },
    { key: 'status',          label: 'Fase / Estado',type: 'text' },
    { key: 'observations',    label: 'Observaciones',type: 'text' },
    { key: null,              label: 'Acciones',     type: null   }
];

// Generic sort comparator
function sortData(data, key, dir, type) {
    if (!key) return data;
    return [...data].sort((a, b) => {
        let va = a[key], vb = b[key];
        if (type === 'num') { va = Number(va) || 0; vb = Number(vb) || 0; }
        else if (type === 'date') { va = va ? new Date(va) : new Date(0); vb = vb ? new Date(vb) : new Date(0); }
        else { va = (va || '').toString().toLowerCase(); vb = (vb || '').toString().toLowerCase(); }
        if (va < vb) return -dir;
        if (va > vb) return dir;
        return 0;
    });
}

// Build sort-indicator character
function sortIndicator(colKey, state) {
    if (state.sortKey !== colKey) return ' <span class="sort-icon">⇅</span>';
    return state.sortDir === 1 ? ' <span class="sort-icon active">↑</span>' : ' <span class="sort-icon active">↓</span>';
}

// Render pagination bar
function renderPagination(state, totalItems, containerId, onChangeFn) {
    const totalPages = Math.max(1, Math.ceil(totalItems / state.pageSize));
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = `
        <div class="pagination-bar">
            <div class="page-size-wrap">
                <label>Filas:</label>
                <select class="page-size-select" onchange="${onChangeFn}(this.value)">
                    ${[5,10,25,50,100].map(n => `<option value="${n}" ${state.pageSize===n?'selected':''}>${n}</option>`).join('')}
                </select>
                <span class="page-info">${Math.min((state.page-1)*state.pageSize+1, totalItems)}–${Math.min(state.page*state.pageSize, totalItems)} de ${totalItems}</span>
            </div>
            <div class="page-nav">
                <button class="page-btn" onclick="${onChangeFn}(null,-1)" ${state.page<=1?'disabled':''}>&lsaquo;</button>
                <span class="page-num">${state.page} / ${totalPages}</span>
                <button class="page-btn" onclick="${onChangeFn}(null,1)" ${state.page>=totalPages?'disabled':''}>&rsaquo;</button>
            </div>
        </div>
    `;
}

// ── DATA FETCH HELPERS ──────────────────────────────────────────────────────
async function fetchAllCustomers() {
    try {
        const results = [];
        const pages = [0, 500, 1000, 1500];
        for (const offset of pages) {
            const res = await apiFetch(`${API_BASE}/customers?limit=500&offset=${offset}`);
            if (res.ok) {
                const data = await res.json();
                results.push(...data);
                if (data.length < 500) break; // No more records to fetch
            } else {
                break;
            }
        }
        return results;
    } catch (e) {
        console.error('Error fetching all customers:', e);
        return [];
    }
}

async function fetchAllLogs() {
    try {
        const results = [];
        const pages = [0, 500, 1000, 1500];
        for (const offset of pages) {
            const res = await apiFetch(`${API_BASE}/commercial-logs?limit=500&offset=${offset}`);
            if (res.ok) {
                const data = await res.json();
                results.push(...data);
                if (data.length < 500) break; // No more records to fetch
            } else {
                break;
            }
        }
        return results;
    } catch (e) {
        console.error('Error fetching all logs:', e);
        return [];
    }
}

// ── DATA RELOAD HELPERS ──────────────────────────────────────────────────────
// Refresh customers from API and re-render table preserving sort state
async function loadCustomers() {
    try {
        customersList = await fetchAllCustomers();
        updateStats();
        renderCustomersTable(customersList);
    } catch (e) {
        console.error('Error al recargar clientes:', e);
    }
}

// Refresh commercial logs from API and re-render table preserving sort state
async function loadLogs() {
    try {
        logsList = await fetchAllLogs();
        updateStats();
        renderLogsTable(logsList);
    } catch (e) {
        console.error('Error al recargar gestiones:', e);
    }
}
