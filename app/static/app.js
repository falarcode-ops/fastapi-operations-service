const API_BASE = '/api';
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
            const res = await fetch(`${API_BASE}/customers?limit=500&offset=${offset}`);
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
            const res = await fetch(`${API_BASE}/commercial-logs?limit=500&offset=${offset}`);
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

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initDashboard();
});

const SUN_SVG = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>';
const MOON_SVG = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>';

function initTheme() {
    const currentTheme = localStorage.getItem('theme') || 'dark';
    const themeIcon = document.getElementById('theme-icon');
    if (currentTheme === 'light') {
        document.documentElement.classList.add('light-mode');
        if (themeIcon) themeIcon.innerHTML = SUN_SVG;
    } else {
        document.documentElement.classList.remove('light-mode');
        if (themeIcon) themeIcon.innerHTML = MOON_SVG;
    }
}

function toggleTheme() {
    const isLight = document.documentElement.classList.toggle('light-mode');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    const themeIcon = document.getElementById('theme-icon');
    if (themeIcon) themeIcon.innerHTML = isLight ? SUN_SVG : MOON_SVG;
    
    // Redraw charts with new theme text/grid colors if visible
    if (document.getElementById('tab-overview').classList.contains('active')) {
        renderOverview();
    }
}

async function initDashboard() {
    try {
        // Fetch inicial de datos en paralelo
        const [customers, logs, sessRes] = await Promise.all([
            fetchAllCustomers(),
            fetchAllLogs(),
            fetch(`${API_BASE}/bot-sessions?limit=50`).then(res => res.json())
        ]);

        customersList = customers;
        logsList = logs;
        sessionsList = sessRes;

        // Renderizado Inicial
        updateStats();
        renderOverview();
        renderCustomersTable(customersList);
        renderLogsTable(logsList);
        renderBotSessionsList();
        
        // Obtener última fecha de actualización
        const syncRes = await fetch(`${API_BASE.replace('/api', '')}/`);
        const syncData = await syncRes.json();
        document.getElementById('sync-time-badge').innerText = syncData.status === 'online' ? 'Servidor Activo' : 'Offline';

    } catch (error) {
        console.error('Error al inicializar dashboard:', error);
        document.getElementById('sync-time-badge').innerText = 'Error Conexión API';
    }
}

function updateStats() {
    document.getElementById('stat-customers-val').innerText = customersList.length;
    document.getElementById('stat-logs-val').innerText = logsList.length;
    document.getElementById('stat-chats-val').innerText = sessionsList.length;
}

function toggleMobileSidebar(open) {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (!sidebar || !backdrop) return;
    
    if (typeof open === 'boolean') {
        if (open) {
            sidebar.classList.add('open');
            backdrop.classList.add('active');
        } else {
            sidebar.classList.remove('open');
            backdrop.classList.remove('active');
        }
    } else {
        sidebar.classList.toggle('open');
        backdrop.classList.toggle('active');
    }
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-pane').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.bottom-nav-btn').forEach(el => el.classList.remove('active'));
    
    document.getElementById(`tab-${tabId}`).classList.add('active');
    document.getElementById(`nav-${tabId}`).classList.add('active');
    const botNavEl = document.getElementById(`bot-nav-${tabId}`);
    if (botNavEl) botNavEl.classList.add('active');
    
    toggleMobileSidebar(false);
    
    // Cambiar títulos del Header
    const titles = {
        overview: ['Panel General', 'Resumen ejecutivo y analíticas clave de Coralis.'],
        customers: ['Clientes registrados', 'Listado de clientes y contactos de ALACOR.'],
        logs: ['Historial de Gestiones', 'Historial de ofertas, visitas y seguimientos.'],
        chat: ['Historial del Chatbot', 'Conversaciones e intenciones detectadas.'],
        config: ['Configuraciones del Sistema', 'Parámetros de integraciones, credenciales de API y comunicación SMTP.']
    };
    
    document.getElementById('view-title').innerText = titles[tabId][0];
    document.getElementById('view-subtitle').innerText = titles[tabId][1];

    if (tabId === 'config') {
        loadConfiguration();
        loadEmployeeSelector();
    }
}

function renderOverview() {
    // Totalizar categorías de productos a partir de las gestiones
    const catCounts = {};
    logsList.forEach(log => {
        if (log.interests) {
            log.interests.forEach(cat => {
                catCounts[cat] = (catCounts[cat] || 0) + 1;
            });
        }
    });

    const labels = Object.keys(catCounts);
    const data = Object.values(catCounts);

    if (chartInstance) {
        chartInstance.destroy();
    }

    const computedStyles = getComputedStyle(document.documentElement);
    const textSecColor = computedStyles.getPropertyValue('--text-secondary').trim() || '#9ca3af';
    const borderCol = computedStyles.getPropertyValue('--border-color').trim() || 'rgba(255, 255, 255, 0.05)';

    const ctx = document.getElementById('categoriesChart').getContext('2d');
    chartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: [
                    '#00f2fe', '#9d4edd', '#10b981', '#3b82f6', '#f59e0b',
                    '#ec4899', '#8b5cf6', '#ef4444', '#14b8a6', '#64748b'
                ],
                borderWidth: 1,
                borderColor: borderCol
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: { color: textSecColor, font: { family: 'Inter', size: 11 } }
                }
            }
        }
    });
}

// ── CUSTOMERS TABLE ENGINE ───────────────────────────────────────────────────
function renderCustomersTable(data) {
    // Augment with derived sort key for contacts count
    const enriched = data.map(c => ({ ...c, _contacts: (c.contacts || []).length }));
    custTableState.filtered = enriched;
    custTableState.page = 1;
    _drawCustomersTable();
}

function _drawCustomersTable() {
    const state = custTableState;
    const sorted = sortData(state.filtered, state.sortKey, state.sortDir, CUST_COLS.find(c=>c.key===state.sortKey)?.type);
    const start = (state.page - 1) * state.pageSize;
    const page = sorted.slice(start, start + state.pageSize);

    // Rebuild sortable header
    const thead = document.querySelector('#customers-table thead tr');
    if (thead) {
        thead.innerHTML = CUST_COLS.map((col, i) => {
            if (!col.key) return `<th>${col.label}</th>`;
            const cls = state.sortKey === col.key ? 'th-sortable th-active' : 'th-sortable';
            return `<th class="${cls}" onclick="custSortBy('${col.key}')">${col.label}${sortIndicator(col.key, state)}</th>`;
        }).join('');
    }

    const tbody = document.getElementById('customers-table-body');
    tbody.innerHTML = '';
    page.forEach(cust => {
        const tr = document.createElement('tr');
        tr.setAttribute('onclick', `openCustomerModal('${cust.nit}')`);
        const contactNames = cust.contacts.map(c => `${c.name} (${c.contact_type})`).join(', ') || 'Sin contactos';
        const badgeClass = cust.status.toUpperCase() === 'CLIENTE' ? 'cliente' : 'prospecto';
        const isNatural = (cust.customer_type || 'JURIDICA') === 'NATURAL';
        const typeBadge = isNatural
            ? '<span class="type-pill natural">👤 P. Natural</span>'
            : '<span class="type-pill juridica">🏢 Empresa</span>';
        tr.innerHTML = `
            <td><strong>${cust.nit}</strong></td>
            <td>${cust.company_name}</td>
            <td>${typeBadge}</td>
            <td><span class="status-pill ${badgeClass}">${cust.status}</span></td>
            <td>${cust.city || '-'}</td>
            <td>${cust.sector || '-'}</td>
            <td style="max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${contactNames}">${cust._contacts} contacto${cust._contacts !== 1 ? 's' : ''}</td>
            <td onclick="event.stopPropagation()">
                <div style="display:flex;gap:4px;align-items:center;">
                    <button class="action-icon-btn" onclick="openCompanyFormModal('${cust.nit}')" title="Editar Empresa/Cliente">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    <button class="action-icon-btn delete" onclick="deleteCustomer('${cust.nit}')" title="Eliminar Empresa/Cliente">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
    renderPagination(state, state.filtered.length, 'cust-pagination', 'custPageCtrl');
}

function custSortBy(key) {
    if (custTableState.sortKey === key) custTableState.sortDir *= -1;
    else { custTableState.sortKey = key; custTableState.sortDir = 1; }
    custTableState.page = 1;
    _drawCustomersTable();
}

function custPageCtrl(size, delta) {
    if (size !== null) { custTableState.pageSize = parseInt(size); custTableState.page = 1; }
    else custTableState.page = Math.max(1, Math.min(custTableState.page + delta, Math.ceil(custTableState.filtered.length / custTableState.pageSize)));
    _drawCustomersTable();
}

function filterCustomers() {
    const searchVal = document.getElementById('customer-search').value.toLowerCase();
    const statusVal = document.getElementById('customer-status-filter').value;
    const typeVal = document.getElementById('customer-type-filter').value;
    const filtered = customersList.filter(cust => {
        const matchesSearch = cust.company_name.toLowerCase().includes(searchVal) || cust.nit.toLowerCase().includes(searchVal);
        const matchesStatus = statusVal === '' || cust.status === statusVal;
        const matchesType = typeVal === '' || (cust.customer_type || 'JURIDICA') === typeVal;
        return matchesSearch && matchesStatus && matchesType;
    });
    renderCustomersTable(filtered);
}

// ── COMMERCIAL LOGS TABLE ENGINE ─────────────────────────────────────────────
function renderLogsTable(data) {
    logsTableState.filtered = data;
    logsTableState.page = 1;
    _drawLogsTable();
}

async function _drawLogsTable() {
    const state = logsTableState;
    const sorted = sortData(state.filtered, state.sortKey, state.sortDir, LOGS_COLS.find(c=>c.key===state.sortKey)?.type);
    const start = (state.page - 1) * state.pageSize;
    const page = sorted.slice(start, start + state.pageSize);

    // Dynamic on-demand customer lookup for missing names on the current page
    const missingNits = [...new Set(page.map(log => log.customer_nit))]
        .filter(nit => nit && !customersList.some(c => c.nit === nit));

    if (missingNits.length > 0) {
        try {
            const fetched = await Promise.all(
                missingNits.map(nit => 
                    fetch(`${API_BASE}/customers/${nit}`)
                        .then(res => res.ok ? res.json() : null)
                )
            );
            fetched.forEach(cust => {
                if (cust && cust.nit) {
                    if (!customersList.some(c => c.nit === cust.nit)) {
                        customersList.push(cust);
                    }
                }
            });
        } catch (e) {
            console.error('Error al resolver nombres de clientes bajo demanda:', e);
        }
    }

    // Rebuild sortable header
    const thead = document.querySelector('#logs-table thead tr');
    if (thead) {
        thead.innerHTML = LOGS_COLS.map(col => {
            if (!col.key) return `<th>${col.label}</th>`;
            const cls = state.sortKey === col.key ? 'th-sortable th-active' : 'th-sortable';
            return `<th class="${cls}" onclick="logsSortBy('${col.key}')">${col.label}${sortIndicator(col.key, state)}</th>`;
        }).join('');
    }

    const tbody = document.getElementById('logs-table-body');
    tbody.innerHTML = '';
    page.forEach(log => {
        const tr = document.createElement('tr');
        const dateStr = log.occurred_at ? new Date(log.occurred_at).toLocaleDateString('es-CO') : '-';
        // Resolve NIT → company name from in-memory customersList
        const custRecord = customersList.find(c => c.nit === log.customer_nit);
        const clientName = custRecord ? custRecord.company_name : log.customer_nit;
        const clientCell = `<div class="log-client-cell">
            <span class="log-client-name" title="NIT: ${log.customer_nit}">${clientName}</span>
            <span class="log-client-nit">${log.customer_nit}</span>
        </div>`;
        tr.innerHTML = `
            <td>${dateStr}</td>
            <td>${clientCell}</td>
            <td>${log.contact_method || '-'}</td>
            <td>${log.interaction_type || '-'}</td>
            <td>${log.salesperson || '-'}</td>
            <td style="max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${log.observations || ''}">${log.observations || '-'}</td>
            <td onclick="event.stopPropagation()">
                <div style="display:flex;gap:4px;align-items:center;">
                    <button class="action-icon-btn" onclick="openLogFormModal(${log.id})" title="Editar Gestión">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    <button class="action-icon-btn delete" onclick="deleteCommercialLog(${log.id})" title="Eliminar Gestión">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
    renderPagination(state, state.filtered.length, 'logs-pagination', 'logsPageCtrl');
}

function logsSortBy(key) {
    if (logsTableState.sortKey === key) logsTableState.sortDir *= -1;
    else { logsTableState.sortKey = key; logsTableState.sortDir = 1; }
    logsTableState.page = 1;
    _drawLogsTable();
}

function logsPageCtrl(size, delta) {
    if (size !== null) { logsTableState.pageSize = parseInt(size); logsTableState.page = 1; }
    else logsTableState.page = Math.max(1, Math.min(logsTableState.page + delta, Math.ceil(logsTableState.filtered.length / logsTableState.pageSize)));
    _drawLogsTable();
}

function filterLogs() {
    const searchVal = document.getElementById('logs-search').value.toLowerCase();
    const typeVal   = document.getElementById('logs-type-filter')?.value || '';
    const dateFrom  = document.getElementById('logs-date-from')?.value  || '';
    const dateTo    = document.getElementById('logs-date-to')?.value    || '';

    const fromTs = dateFrom ? new Date(dateFrom).setHours(0, 0, 0, 0)    : null;
    const toTs   = dateTo   ? new Date(dateTo).setHours(23, 59, 59, 999)  : null;

    const filtered = logsList.filter(log => {
        if (searchVal && !log.customer_nit.toLowerCase().includes(searchVal)) return false;
        if (typeVal && (log.interaction_type || '').toUpperCase() !== typeVal.toUpperCase()) return false;
        if (fromTs || toTs) {
            if (!log.occurred_at) return false;
            const logTs = new Date(log.occurred_at).getTime();
            if (fromTs && logTs < fromTs) return false;
            if (toTs   && logTs > toTs)   return false;
        }
        return true;
    });
    renderLogsTable(filtered);
}

function clearLogsDateFilter() {
    const from = document.getElementById('logs-date-from');
    const to   = document.getElementById('logs-date-to');
    if (from) from.value = '';
    if (to)   to.value   = '';
    filterLogs();
}

function exportCustomers() {
    const searchVal = document.getElementById('customer-search').value.trim();
    const statusVal = document.getElementById('customer-status-filter').value;
    const typeVal = document.getElementById('customer-type-filter').value;
    
    const params = new URLSearchParams();
    if (searchVal) params.append('search', searchVal);
    if (statusVal) params.append('status', statusVal);
    if (typeVal) params.append('customer_type', typeVal);
    
    const url = `${API_BASE}/reports/customers/export?${params.toString()}`;
    window.open(url, '_blank');
}

function renderLogsTable(data) {
    const tbody = document.getElementById('logs-table-body');
    tbody.innerHTML = '';
    
    data.forEach(log => {
        const tr = document.createElement('tr');
        const dateStr = log.occurred_at ? new Date(log.occurred_at).toLocaleDateString() : '-';
        tr.innerHTML = `
            <td>${dateStr}</td>
            <td><strong>${log.customer_nit}</strong></td>
            <td>${log.contact_method || '-'}</td>
            <td>${log.interaction_type || '-'}</td>
            <td>${log.salesperson || '-'}</td>
            <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${log.observations}">${log.observations || '-'}</td>
            <td onclick="event.stopPropagation()">
                <div style="display: flex; gap: 4px; align-items: center;">
                    <button class="action-icon-btn" onclick="openLogFormModal(${log.id})" title="Editar Gestión">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    <button class="action-icon-btn delete" onclick="deleteCommercialLog(${log.id})" title="Eliminar Gestión">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function exportLogs() {
    const searchVal = document.getElementById('logs-search').value.trim();
    
    const params = new URLSearchParams();
    if (searchVal) params.append('search', searchVal);
    
    const url = `${API_BASE}/reports/commercial-logs/export?${params.toString()}`;
    window.open(url, '_blank');
}

function renderBotSessionsList() {
    const container = document.getElementById('session-list-container');
    container.innerHTML = '';
    
    sessionsList.forEach(sess => {
        const div = document.createElement('div');
        div.className = 'session-item';
        div.id = `sess-item-${sess.session_id}`;
        
        const dateStr = sess.started_at ? new Date(sess.started_at).toLocaleString() : '';
        div.innerHTML = `
            <h4>${sess.visitor_name || 'Visitante'}</h4>
            <span>${dateStr}</span>
        `;
        div.onclick = () => loadSessionDetails(sess.session_id, sess.visitor_name);
        container.appendChild(div);
    });
}

async function loadSessionDetails(sessionId, visitorName) {
    document.querySelectorAll('.session-item').forEach(el => el.classList.remove('active'));
    document.getElementById(`sess-item-${sessionId}`).classList.add('active');

    const container = document.getElementById('chat-messages-container');
    container.innerHTML = 'Cargando mensajes...';

    try {
        const res = await fetch(`${API_BASE}/bot-sessions/${sessionId}`);
        const data = await res.json();
        
        container.innerHTML = '';
        
        if (data.messages && data.messages.length > 0) {
            data.messages.forEach(msg => {
                const msgDiv = document.createElement('div');
                // Si el remitente contiene "Visitante", asumimos que es el usuario, de lo contrario el bot
                const isUser = msg.sender_name.toLowerCase().includes('visitante');
                msgDiv.className = `msg ${isUser ? 'user' : 'bot'}`;
                
                const timeStr = msg.sent_at ? new Date(msg.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                msgDiv.innerHTML = `
                    <p>${msg.message_text}</p>
                    <span class="msg-meta">${msg.sender_name} • ${timeStr}</span>
                `;
                container.appendChild(msgDiv);
            });
        } else {
            container.innerHTML = '<div class="chat-empty-state"><p>No hay mensajes en esta sesión.</p></div>';
        }

    } catch (error) {
        console.error('Error al cargar mensajes:', error);
        container.innerHTML = 'Error al cargar mensajes.';
    }
}

// --- Configuration Management v1.6.0 ---
async function loadConfiguration() {
    const statusMsg = document.getElementById('config-status-msg');
    if (statusMsg) statusMsg.innerText = 'Cargando configuraciones...';

    try {
        const res = await fetch(`${API_BASE}/config`);
        if (!res.ok) throw new Error('Failed to fetch config');
        
        const data = await res.json();
        
        // Mapear claves a los inputs correspondientes del HTML
        for (const [key, value] of Object.entries(data)) {
            const input = document.getElementById(`cfg-${key}`);
            if (input) {
                input.value = value || '';
            }
        }
        if (statusMsg) statusMsg.innerText = '';
    } catch (error) {
        console.error('Error loading config:', error);
        showStatusMsg('Error al cargar configuraciones de la API.', 'error');
    }
}

async function saveConfiguration(event) {
    if (event) event.preventDefault();
    
    const saveBtn = document.getElementById('save-config-btn');
    const originalText = saveBtn.innerText;
    saveBtn.innerText = 'Guardando...';
    saveBtn.disabled = true;
    
    // Armar payload dinámico del formulario
    const payload = {};
    const inputs = document.querySelectorAll('[id^="cfg-"]');
    inputs.forEach(input => {
        const key = input.id.replace('cfg-', '');
        payload[key] = input.value;
    });

    try {
        const res = await fetch(`${API_BASE}/config`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (res.ok && data.status === 'success') {
            showStatusMsg(data.message || 'Configuración guardada.', 'success');
            // Recargar para refrescar campos con sus máscaras
            await loadConfiguration();
        } else {
            showStatusMsg(data.detail || 'Fallo al guardar configuración.', 'error');
        }
    } catch (error) {
        console.error('Error saving config:', error);
        showStatusMsg('Error de red al guardar la configuración.', 'error');
    } finally {
        saveBtn.innerText = originalText;
        saveBtn.disabled = false;
    }
}

async function testTelegramAlert() {
    const message = prompt("Ingrese un mensaje de prueba para enviar a Telegram:", "Mensaje de prueba desde Coralis CRM 🚀");
    if (!message) return;

    try {
        const res = await fetch(`${API_BASE}/integrations/test-telegram`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: message })
        });
        const data = await res.json();
        alert(data.message || "Solicitud de prueba enviada.");
    } catch (error) {
        alert("Error de red al enviar la prueba de Telegram.");
    }
}

async function testEmailAlert() {
    const toEmail = prompt("Ingrese el correo electrónico de destino para la prueba:");
    if (!toEmail) return;

    try {
        const res = await fetch(`${API_BASE}/integrations/test-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                to_email: toEmail,
                subject: "Prueba de Integración SMTP - Coralis CRM",
                body_html: "<h3>¡Conexión SMTP Exitosa!</h3><p>Este es un correo de diagnóstico automático enviado por Coralis CRM.</p>"
            })
        });
        const data = await res.json();
        alert(data.message || "Solicitud de prueba enviada.");
    } catch (error) {
        alert("Error de red al enviar la prueba SMTP.");
    }
}

function showStatusMsg(text, type) {
    const el = document.getElementById('config-status-msg');
    if (!el) return;
    el.innerText = text;
    el.className = `status-msg ${type}`;
    setTimeout(() => {
        if (el.innerText === text) el.innerText = '';
    }, 4000);
}

// --- Customer Profile Modal & Communications v1.7.0 ---
let activeCustomerNit = null;
let activeCustomerDetails = null;
let activeCustomerLogs = [];

async function openCustomerModal(nit) {
    activeCustomerNit = nit;
    try {
        // Fetch paralelo del cliente y su historial de gestiones
        const [custRes, logsRes] = await Promise.all([
            fetch(`${API_BASE}/customers/${nit}`),
            fetch(`${API_BASE}/commercial-logs?customer_nit=${nit}&limit=150`)
        ]);

        if (!custRes.ok) throw new Error("Fallo al obtener datos del cliente");
        
        const customer = await custRes.json();
        const logs = await logsRes.json();
        activeCustomerDetails = customer;
        activeCustomerLogs = logs;

        // Rellenar Hoja de Vida
        document.getElementById('modal-cust-name').innerText = customer.company_name;
        document.getElementById('modal-cust-nit').innerText = `NIT: ${customer.nit}`;
        
        const badge = document.getElementById('modal-cust-status');
        badge.innerText = customer.status;
        badge.className = `modal-badge ${customer.status.toLowerCase()}`;

        // Customer type badge — clickable to reclassify
        const typeBadge = document.getElementById('modal-cust-type');
        const isNatural = (customer.customer_type || 'JURIDICA') === 'NATURAL';
        typeBadge.innerText = isNatural ? '👤 Persona Natural' : '🏢 Empresa';
        typeBadge.className = `modal-badge customer-type-badge ${isNatural ? 'natural' : 'juridica'}`;
        typeBadge.dataset.currentType = customer.customer_type || 'JURIDICA';

        document.getElementById('modal-cust-city').innerText = customer.city || '-';
        document.getElementById('modal-cust-sector').innerText = customer.sector || '-';
        document.getElementById('modal-cust-address').innerText = customer.address || '-';
        document.getElementById('modal-cust-obs').innerText = customer.observations || 'Sin observaciones.';

        // Segmentar y renderizar contactos
        const commContainer = document.getElementById('contact-seg-commercial');
        const operContainer = document.getElementById('contact-seg-operative');
        const finContainer = document.getElementById('contact-seg-financial');

        commContainer.innerHTML = '';
        operContainer.innerHTML = '';
        finContainer.innerHTML = '';

        if (customer.contacts && customer.contacts.length > 0) {
            customer.contacts.forEach(c => {
                const card = document.createElement('div');
                card.className = 'contact-item-card';
                
                const cleanPhone = c.phone ? c.phone.replace(/[^0-9]/g, '') : '';
                const waLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent('Hola ' + c.name + ', te escribo de ALACOR...')}`;
                // Telegram direct profile link or search by username/phone
                const tgLink = c.phone ? `https://t.me/+${cleanPhone}` : 'https://t.me/';

                card.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px;">
                        <h5 style="margin: 0; font-size: 0.95rem; color: var(--text-main); font-family: 'Outfit'; font-weight: 500;">${c.name}</h5>
                        <div class="contact-actions-menu" onclick="event.stopPropagation()" style="display: flex; gap: 4px;">
                            <button class="action-icon-btn" onclick="openEditContactModal(${c.id})" title="Editar Contacto">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            </button>
                            <button class="action-icon-btn delete" onclick="deleteContact(${c.id})" title="Eliminar Contacto">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                            </button>
                        </div>
                    </div>
                    ${c.role ? `<span>💼 ${c.role}</span>` : ''}
                    ${c.phone ? `<span>📞 ${c.phone}</span>` : ''}
                    ${c.email ? `<span>📧 ${c.email}</span>` : ''}
                    <div class="contact-actions" onclick="event.stopPropagation()">
                        ${c.email ? `<button class="contact-action-btn" onclick="openEmailCompose('${c.email}')">📧 Correo</button>` : ''}
                        ${c.phone ? `<a class="contact-action-btn" href="${waLink}" target="_blank">💬 WA</a>` : ''}
                        ${c.phone ? `<a class="contact-action-btn" href="${tgLink}" target="_blank">✈️ TG</a>` : ''}
                    </div>
                `;

                // Clasificar por tipo
                const type = c.contact_type.toUpperCase();
                if (type === 'COMMERCIAL') {
                    commContainer.appendChild(card);
                } else if (type === 'OPERATIVE' || type === 'OPERATIONAL') {
                    operContainer.appendChild(card);
                } else if (type === 'FINANCIAL') {
                    finContainer.appendChild(card);
                } else {
                    commContainer.appendChild(card);
                }
            });
        }

        // Si algún segmento quedó vacío, mostrar mensaje
        if (commContainer.innerHTML === '') commContainer.innerHTML = '<span class="section-tip">Ninguno</span>';
        if (operContainer.innerHTML === '') operContainer.innerHTML = '<span class="section-tip">Ninguno</span>';
        if (finContainer.innerHTML === '') finContainer.innerHTML = '<span class="section-tip">Ninguno</span>';

        // Renderizar Historial/Timeline
        const timeline = document.getElementById('modal-timeline');
        timeline.innerHTML = '';

        if (logs && logs.length > 0) {
            logs.forEach(log => {
                const item = document.createElement('div');
                item.className = 'timeline-item';
                const dateStr = log.occurred_at ? new Date(log.occurred_at).toLocaleDateString() : '-';
                
                item.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <span class="timeline-date">${dateStr} • Por: ${log.salesperson || 'Sistema'}</span>
                        <div class="timeline-log-actions" onclick="event.stopPropagation()" style="display: flex; gap: 4px;">
                            <button class="action-icon-btn" onclick="openLogFormModal(${log.id})" title="Editar Gestión">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            </button>
                            <button class="action-icon-btn delete" onclick="deleteCommercialLog(${log.id})" title="Eliminar Gestión">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                            </button>
                        </div>
                    </div>
                    <span class="timeline-title">${log.interaction_type || 'Gestión'} (${log.contact_method || 'Canal indefinido'})</span>
                    ${log.offer_value ? `<span class="timeline-desc"><b>Oferta:</b> $${parseFloat(log.offer_value).toLocaleString()} (${log.offer_status || 'Pendiente'})</span>` : ''}
                    <p class="timeline-desc">${log.observations || 'Sin observaciones de gestión.'}</p>
                `;
                timeline.appendChild(item);
            });
        } else {
            timeline.innerHTML = '<p class="section-tip">No se han registrado gestiones para este cliente.</p>';
        }

        // Mostrar modal
        document.getElementById('customer-modal').classList.add('active');

    } catch (error) {
        console.error("Error al cargar detalles de cliente:", error);
        alert("Ocurrió un error al cargar la hoja de vida del cliente.");
    }
}

function closeCustomerModal() {
    document.getElementById('customer-modal').classList.remove('active');
}

async function reclassifyCustomer() {
    if (!activeCustomerNit) return;
    const typeBadge = document.getElementById('modal-cust-type');
    const currentType = typeBadge.dataset.currentType || 'JURIDICA';
    const newType = currentType === 'JURIDICA' ? 'NATURAL' : 'JURIDICA';

    const confirmMsg = newType === 'NATURAL'
        ? `¿Reclasificar este registro como Persona Natural?`
        : `¿Reclasificar este registro como Empresa (Persona Jurídica)?`;
    if (!confirm(confirmMsg)) return;

    try {
        const res = await fetch(`${API_BASE}/customers/${activeCustomerNit}/type?customer_type=${newType}`, {
            method: 'PATCH'
        });
        if (!res.ok) throw new Error('Error al reclasificar');
        const updated = await res.json();

        // Update badge in modal immediately
        const isNatural = updated.customer_type === 'NATURAL';
        typeBadge.innerText = isNatural ? '👤 Persona Natural' : '🏢 Empresa';
        typeBadge.className = `modal-badge customer-type-badge ${isNatural ? 'natural' : 'juridica'}`;
        typeBadge.dataset.currentType = updated.customer_type;

        // Update local cache so the table filter reflects the change
        const idx = customersList.findIndex(c => c.nit === activeCustomerNit);
        if (idx !== -1) {
            customersList[idx].customer_type = updated.customer_type;
            renderCustomersTable(customersList);
        }
    } catch (e) {
        console.error('Error reclassifying customer:', e);
        alert('No se pudo cambiar la clasificación. Intente de nuevo.');
    }
}

function openEmailCompose(email) {
    document.getElementById('email-to-field').value = email;
    document.getElementById('email-subject-field').value = '';
    document.getElementById('email-message-field').value = '';

    // Populate sender dropdown dynamically from employees API
    const senderSelect = document.getElementById('email-sender-field');
    fetch(`${API_BASE}/employees`)
        .then(r => r.json())
        .then(employees => {
            senderSelect.innerHTML = '';
            employees.forEach(emp => {
                const opt = document.createElement('option');
                opt.value = emp.username;
                opt.textContent = `${emp.full_name} (${emp.role || 'Empleado'})`;
                senderSelect.appendChild(opt);
            });
        })
        .catch(() => {
            senderSelect.innerHTML = '<option value="">Error al cargar empleados</option>';
        });

    document.getElementById('email-compose-modal').classList.add('active');
}

function closeEmailModal() {
    document.getElementById('email-compose-modal').classList.remove('active');
}

async function sendCustomEmail(event) {
    if (event) event.preventDefault();

    const sendBtn = document.getElementById('send-email-btn');
    const originalText = sendBtn.innerText;
    sendBtn.innerText = 'Enviando...';
    sendBtn.disabled = true;

    const payload = {
        to_email: document.getElementById('email-to-field').value,
        sender_key: document.getElementById('email-sender-field').value,
        subject: document.getElementById('email-subject-field').value,
        message_body: document.getElementById('email-message-field').value
    };

    try {
        const res = await fetch(`${API_BASE}/integrations/send-custom-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (res.ok && data.status === 'success') {
            alert('¡Correo enviado con éxito!');
            closeEmailModal();
        } else {
            alert('Error al enviar el correo: ' + (data.detail || 'Fallo de envío.'));
        }
    } catch (error) {
        console.error('Error sending email:', error);
        alert('Error de red al enviar el correo.');
    } finally {
        sendBtn.innerText = originalText;
        sendBtn.disabled = false;
    }
}

// --- Contact CRUD Modal v1.8.0 ---
let editContactId = null;

function openAddContactModal() {
    editContactId = null;
    document.getElementById('contact-name-field').value = '';
    document.getElementById('contact-role-field').value = '';
    document.getElementById('contact-type-field').value = 'COMMERCIAL';
    document.getElementById('contact-phone-field').value = '';
    document.getElementById('contact-email-field').value = '';
    
    document.getElementById('add-contact-submit-btn').innerText = 'Registrar Contacto';
    document.querySelector('#add-contact-modal h3').innerText = 'Agregar Nuevo Contacto';
    document.getElementById('add-contact-modal').classList.add('active');
}

function openEditContactModal(contactId) {
    if (!activeCustomerDetails) return;
    const c = activeCustomerDetails.contacts.find(con => con.id === contactId);
    if (!c) return;

    editContactId = contactId;
    document.getElementById('contact-name-field').value = c.name || '';
    document.getElementById('contact-role-field').value = c.role || '';
    document.getElementById('contact-type-field').value = c.contact_type || 'COMMERCIAL';
    document.getElementById('contact-phone-field').value = c.phone || '';
    document.getElementById('contact-email-field').value = c.email || '';

    document.getElementById('add-contact-submit-btn').innerText = 'Guardar Cambios';
    document.querySelector('#add-contact-modal h3').innerText = 'Editar Contacto';
    document.getElementById('add-contact-modal').classList.add('active');
}

function closeAddContactModal() {
    document.getElementById('add-contact-modal').classList.remove('active');
}

async function submitAddContact(event) {
    if (event) event.preventDefault();
    if (!activeCustomerNit) return;

    const submitBtn = document.getElementById('add-contact-submit-btn');
    const originalText = submitBtn.innerText;
    submitBtn.innerText = 'Guardando...';
    submitBtn.disabled = true;

    const payload = {
        name: document.getElementById('contact-name-field').value,
        role: document.getElementById('contact-role-field').value || null,
        contact_type: document.getElementById('contact-type-field').value,
        phone: document.getElementById('contact-phone-field').value || null,
        email: document.getElementById('contact-email-field').value || null
    };

    const isEdit = editContactId !== null;
    const url = isEdit 
        ? `${API_BASE}/customers/${activeCustomerNit}/contacts/${editContactId}`
        : `${API_BASE}/customers/${activeCustomerNit}/contacts`;
    const method = isEdit ? 'PUT' : 'POST';

    try {
        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (res.ok && data.id) {
            closeAddContactModal();
            await openCustomerModal(activeCustomerNit);
            
            // Reload global cache
            await loadCustomers();
        } else {
            alert('Error al guardar el contacto: ' + (data.detail || 'Fallo de registro.'));
        }
    } catch (error) {
        console.error('Error saving contact:', error);
        alert('Error de red al guardar el contacto.');
    } finally {
        submitBtn.innerText = originalText;
        submitBtn.disabled = false;
    }
}

async function deleteContact(contactId) {
    if (!activeCustomerNit) return;
    if (!confirm('¿Está seguro de eliminar este contacto? (Paso 1/2)')) return;
    const secondConfirm = prompt('Para confirmar, escriba "ELIMINAR" en mayúsculas (Paso 2/2):');
    if (secondConfirm !== 'ELIMINAR') {
        alert('Eliminación cancelada. Confirmación incorrecta.');
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/customers/${activeCustomerNit}/contacts/${contactId}`, {
            method: 'DELETE'
        });
        if (!res.ok) throw new Error('Fallo al eliminar contacto');
        
        // Refresh details & list
        await openCustomerModal(activeCustomerNit);
        await loadCustomers();
    } catch (e) {
        alert(e.message);
    }
}

// ──────────────────────────────────────────────────────────
// Employee & Signature Management v1.9.0
// ──────────────────────────────────────────────────────────

let employeesList = [];

async function loadEmployeeSelector() {
    try {
        const res = await fetch(`${API_BASE}/employees`);
        if (!res.ok) return;
        employeesList = await res.json();

        const selector = document.getElementById('emp-selector');
        if (!selector) return;
        selector.innerHTML = '<option value="">-- Seleccione un empleado --</option>';
        employeesList.forEach(emp => {
            const opt = document.createElement('option');
            opt.value = emp.username;
            opt.textContent = `${emp.full_name} (${emp.role || 'Empleado'})`;
            selector.appendChild(opt);
        });
    } catch (e) {
        console.error('Error loading employees:', e);
    }
}

function loadEmployeeData() {
    const username = document.getElementById('emp-selector').value;
    const editor = document.getElementById('emp-editor');
    if (!username) {
        editor.style.display = 'none';
        return;
    }
    const emp = employeesList.find(e => e.username === username);
    if (!emp) return;

    document.getElementById('emp-fullname').value = emp.full_name || '';
    document.getElementById('emp-role').value = emp.role || '';
    document.getElementById('emp-email').value = emp.email || '';
    document.getElementById('emp-phone').value = emp.phone || '';
    document.getElementById('emp-signature').value = emp.signature || '';
    editor.style.display = 'block';

    const statusMsg = document.getElementById('emp-status-msg');
    if (statusMsg) statusMsg.innerText = '';
}

async function saveEmployeeData() {
    const username = document.getElementById('emp-selector').value;
    if (!username) return;

    const btn = document.getElementById('emp-save-btn');
    const statusMsg = document.getElementById('emp-status-msg');
    const original = btn.innerText;
    btn.innerText = 'Guardando...';
    btn.disabled = true;

    const payload = {
        full_name: document.getElementById('emp-fullname').value,
        role: document.getElementById('emp-role').value,
        email: document.getElementById('emp-email').value,
        phone: document.getElementById('emp-phone').value,
        signature: document.getElementById('emp-signature').value
    };

    try {
        const res = await fetch(`${API_BASE}/employees/${username}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok && data.username) {
            // Update local cache
            const idx = employeesList.findIndex(e => e.username === username);
            if (idx !== -1) employeesList[idx] = data;
            statusMsg.innerText = '✅ Datos guardados correctamente.';
            statusMsg.className = 'status-msg success';
        } else {
            statusMsg.innerText = '❌ Error: ' + (data.detail || 'No se pudo guardar.');
            statusMsg.className = 'status-msg error';
        }
    } catch (e) {
        console.error('Error saving employee:', e);
        statusMsg.innerText = '❌ Error de red al guardar.';
        statusMsg.className = 'status-msg error';
    } finally {
        btn.innerText = original;
        btn.disabled = false;
        setTimeout(() => { if (statusMsg) statusMsg.innerText = ''; }, 4000);
    }
}


// ──────────────────────────────────────────────────────────
// Company (Customer) CRUD Operations
// ──────────────────────────────────────────────────────────

let compEmployeesList = [];

function openCompanyFormModal(nit = null) {
    const title = document.getElementById('company-modal-title');
    const nitField = document.getElementById('comp-nit-field');
    const nameField = document.getElementById('comp-name-field');
    const statusField = document.getElementById('comp-status-field');
    const typeField = document.getElementById('comp-type-field');
    const sectorField = document.getElementById('comp-sector-field');
    const cityField = document.getElementById('comp-city-field');
    const addressField = document.getElementById('comp-address-field');
    const deptoField = document.getElementById('comp-depto-field');
    const userField = document.getElementById('comp-user-field');
    const obsField = document.getElementById('comp-obs-field');

    // Populate employees dropdown
    fetch(`${API_BASE}/employees`)
        .then(r => r.json())
        .then(employees => {
            compEmployeesList = employees;
            userField.innerHTML = '<option value="">-- Sin asignar --</option>';
            employees.forEach(emp => {
                const opt = document.createElement('option');
                opt.value = emp.username;
                opt.textContent = `${emp.full_name} (${emp.role})`;
                userField.appendChild(opt);
            });

            // If editing
            if (nit) {
                const cust = customersList.find(c => c.nit === nit);
                if (cust) {
                    title.innerText = 'Editar Empresa / Cliente';
                    nitField.value = cust.nit;
                    nitField.readOnly = true;
                    nitField.classList.add('readonly-input');
                    nameField.value = cust.company_name || '';
                    statusField.value = cust.status || 'PROSPECTO';
                    typeField.value = cust.customer_type || 'JURIDICA';
                    sectorField.value = cust.sector || '';
                    cityField.value = cust.city || '';
                    addressField.value = cust.address || '';
                    deptoField.value = cust.department || '';
                    userField.value = cust.assigned_user || '';
                    obsField.value = cust.observations || '';
                }
            } else {
                title.innerText = 'Nueva Empresa / Cliente';
                nitField.value = '';
                nitField.readOnly = false;
                nitField.classList.remove('readonly-input');
                nameField.value = '';
                statusField.value = 'PROSPECTO';
                typeField.value = 'JURIDICA';
                sectorField.value = '';
                cityField.value = '';
                addressField.value = '';
                deptoField.value = '';
                userField.value = '';
                obsField.value = '';
            }
        });

    document.getElementById('company-form-modal').classList.add('active');
}

function closeCompanyFormModal() {
    document.getElementById('company-form-modal').classList.remove('active');
}

async function submitCompanyForm(event) {
    event.preventDefault();
    const nit = document.getElementById('comp-nit-field').value;
    const isEdit = document.getElementById('comp-nit-field').readOnly;

    const payload = {
        nit: nit,
        company_name: document.getElementById('comp-name-field').value,
        status: document.getElementById('comp-status-field').value,
        customer_type: document.getElementById('comp-type-field').value,
        sector: document.getElementById('comp-sector-field').value || null,
        address: document.getElementById('comp-address-field').value || null,
        city: document.getElementById('comp-city-field').value || null,
        department: document.getElementById('comp-depto-field').value || null,
        assigned_user: document.getElementById('comp-user-field').value || null,
        observations: document.getElementById('comp-obs-field').value || null
    };

    const url = isEdit ? `${API_BASE}/customers/${nit}` : `${API_BASE}/customers`;
    const method = isEdit ? 'PUT' : 'POST';

    try {
        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.detail || 'Fallo al guardar cliente');
        }

        closeCompanyFormModal();
        // Refresh local cache and list
        await loadCustomers();
        if (isEdit) {
            // Refresh detail modal
            openCustomerModal(nit);
        }
    } catch (e) {
        alert('Error: ' + e.message);
    }
}

async function deleteCustomer(nit) {
    if (!confirm('¿Está seguro de eliminar permanentemente esta empresa y todos sus contactos y gestiones asociadas? Esta acción no se puede deshacer. (Paso 1/2)')) return;
    const secondConfirm = prompt(`Para confirmar la eliminación, escriba el NIT exacto del cliente: "${nit}" (Paso 2/2):`);
    if (secondConfirm !== nit) {
        alert('Eliminación cancelada. El NIT no coincide.');
        return;
    }
    try {
        const res = await fetch(`${API_BASE}/customers/${nit}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Error al eliminar cliente');
        const modal = document.getElementById('customer-modal');
        if (modal && modal.classList.contains('active')) {
            closeCustomerModal();
        }
        await loadCustomers();
    } catch (e) {
        alert(e.message);
    }
}


// ──────────────────────────────────────────────────────────
// Commercial Log (Gestión) CRUD Operations
// ──────────────────────────────────────────────────────────

let editLogId = null;

async function openLogFormModal(logId = null) {
    const title = document.getElementById('log-modal-title');
    const dateField = document.getElementById('log-date-field');
    const methodField = document.getElementById('log-method-field');
    const interactionField = document.getElementById('log-interaction-field');
    const probField = document.getElementById('log-prob-field');
    const offerNum = document.getElementById('log-offer-num');
    const offerVers = document.getElementById('log-offer-vers');
    const offerVal = document.getElementById('log-offer-val');
    const offerStatus = document.getElementById('log-offer-status');
    const rejection = document.getElementById('log-rejection');
    const orderNum = document.getElementById('log-order-num');
    const orderVal = document.getElementById('log-order-val');
    const nextDate = document.getElementById('log-next-date');
    const nextMethod = document.getElementById('log-next-method');
    const nextType = document.getElementById('log-next-type');
    const salespersonField = document.getElementById('log-salesperson-field');
    const statusField = document.getElementById('log-status-field');
    const obsField = document.getElementById('log-obs-field');
    const interestsContainer = document.getElementById('log-interests-container');

    // Render category checkboxes
    interestsContainer.innerHTML = '';
    const PRODUCT_CATEGORIES = ['SEGURIDAD INDUSTRIAL', 'CALZADO', 'COMPRESORES', 'BOMBAS', 'PLANTAS', 'VENTILACIÓN', 'TH', 'DOTACIÓN', 'COMISIONES', 'OTROS'];
    PRODUCT_CATEGORIES.forEach(cat => {
        const label = document.createElement('label');
        label.style.display = 'flex';
        label.style.alignItems = 'center';
        label.style.gap = '6px';
        label.style.fontSize = '0.85rem';
        label.innerHTML = `<input type="checkbox" class="interest-chk" value="${cat}"> ${cat}`;
        interestsContainer.appendChild(label);
    });

    // Populate salesperson selector
    try {
        const res = await fetch(`${API_BASE}/employees`);
        const employees = await res.json();
        salespersonField.innerHTML = '';
        employees.forEach(emp => {
            const opt = document.createElement('option');
            opt.value = emp.full_name;
            opt.textContent = emp.full_name;
            salespersonField.appendChild(opt);
        });
    } catch(e) {
        console.error('Error fetching employees:', e);
    }

    if (logId) {
        // Editing
        const log = activeCustomerLogs.find(l => l.id === logId);
        if (log) {
            editLogId = logId;
            title.innerText = 'Editar Gestión';
            
            // Format ISO datetime to YYYY-MM-DDTHH:MM for datetime-local input
            let d = new Date(log.occurred_at);
            // adjust timezone offset
            const offset = d.getTimezoneOffset();
            d = new Date(d.getTime() - (offset*60*1000));
            dateField.value = d.toISOString().slice(0, 16);

            methodField.value = log.contact_method || 'TELEFONICO';
            interactionField.value = log.interaction_type || 'GESTIÓN COMERCIAL';
            probField.value = log.close_probability !== null ? log.close_probability : '';
            offerNum.value = log.offer_number || '';
            offerVers.value = log.offer_version || '';
            offerVal.value = log.offer_value !== null ? log.offer_value : '';
            offerStatus.value = log.offer_status || '';
            rejection.value = log.rejection_reason || '';
            orderNum.value = log.order_number || '';
            orderVal.value = log.order_value !== null ? log.order_value : '';
            
            nextDate.value = log.next_followup_date || '';
            nextMethod.value = log.next_contact_method || '';
            nextType.value = log.next_interaction_type || '';
            salespersonField.value = log.salesperson || '';
            statusField.value = log.status || 'ABIERTA';
            obsField.value = log.observations || '';

            // Check interests
            if (log.interests) {
                const chks = document.querySelectorAll('.interest-chk');
                chks.forEach(chk => {
                    if (log.interests.includes(chk.value)) {
                        chk.checked = true;
                    }
                });
            }
        }
    } else {
        // Creating
        editLogId = null;
        title.innerText = 'Registrar Nueva Gestión';

        // set date to now local datetime
        let d = new Date();
        const offset = d.getTimezoneOffset();
        d = new Date(d.getTime() - (offset*60*1000));
        dateField.value = d.toISOString().slice(0, 16);

        methodField.value = 'TELEFONICO';
        interactionField.value = 'GESTIÓN COMERCIAL';
        probField.value = '';
        offerNum.value = '';
        offerVers.value = '';
        offerVal.value = '';
        offerStatus.value = '';
        rejection.value = '';
        orderNum.value = '';
        orderVal.value = '';
        nextDate.value = '';
        nextMethod.value = '';
        nextType.value = '';
        statusField.value = 'ABIERTA';
        obsField.value = '';
    }

    document.getElementById('log-form-modal').classList.add('active');
}

function closeLogFormModal() {
    document.getElementById('log-form-modal').classList.remove('active');
}

async function submitLogForm(event) {
    event.preventDefault();
    if (!activeCustomerNit) return;

    // Gather selected checkboxes
    const selectedInterests = [];
    document.querySelectorAll('.interest-chk:checked').forEach(chk => {
        selectedInterests.push(chk.value);
    });

    const payload = {
        customer_nit: activeCustomerNit,
        occurred_at: document.getElementById('log-date-field').value,
        contact_method: document.getElementById('log-method-field').value,
        interaction_type: document.getElementById('log-interaction-field').value,
        close_probability: document.getElementById('log-prob-field').value ? parseFloat(document.getElementById('log-prob-field').value) : null,
        offer_number: document.getElementById('log-offer-num').value || null,
        offer_version: document.getElementById('log-offer-vers').value || null,
        offer_value: document.getElementById('log-offer-val').value ? parseFloat(document.getElementById('log-offer-val').value) : null,
        offer_status: document.getElementById('log-offer-status').value || null,
        rejection_reason: document.getElementById('log-rejection').value || null,
        order_number: document.getElementById('log-order-num').value || null,
        order_value: document.getElementById('log-order-val').value ? parseFloat(document.getElementById('log-order-val').value) : null,
        next_followup_date: document.getElementById('log-next-date').value || null,
        next_contact_method: document.getElementById('log-next-method').value || null,
        next_interaction_type: document.getElementById('log-next-type').value || null,
        observations: document.getElementById('log-obs-field').value,
        status: document.getElementById('log-status-field').value,
        salesperson: document.getElementById('log-salesperson-field').value,
        interests: selectedInterests
    };

    const isEdit = editLogId !== null;
    const url = isEdit ? `${API_BASE}/commercial-logs/${editLogId}` : `${API_BASE}/commercial-logs`;
    const method = isEdit ? 'PUT' : 'POST';

    try {
        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.detail || 'Fallo al guardar gestión');
        }

        closeLogFormModal();
        openCustomerModal(activeCustomerNit); // Reload customer details & timeline
    } catch(e) {
        alert(e.message);
    }
}

async function deleteCommercialLog(logId) {
    if (!confirm('¿Está seguro de eliminar esta gestión? (Paso 1/2)')) return;
    const secondConfirm = prompt('Para confirmar, escriba "ELIMINAR" en mayúsculas (Paso 2/2):');
    if (secondConfirm !== 'ELIMINAR') {
        alert('Eliminación cancelada. Confirmación incorrecta.');
        return;
    }
    try {
        const res = await fetch(`${API_BASE}/commercial-logs/${logId}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Error al eliminar gestión');
        const modal = document.getElementById('customer-modal');
        if (activeCustomerNit && modal && modal.classList.contains('active')) {
            openCustomerModal(activeCustomerNit); // Reload customer details & timeline
        }
        await loadLogs();
    } catch (e) {
        alert(e.message);
    }
}


// Registro de Service Worker para PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js?v=2.9')
            .then(reg => {
                console.log('Service Worker v2.9 registrado con éxito:', reg.scope);
                reg.update(); // Fuerza la verificación e instalación de la nueva versión v2.9
                const badge = document.getElementById('pwa-badge');
                if (badge) badge.style.display = 'inline-block';
            })
            .catch(err => {
                console.warn('Error al registrar Service Worker:', err);
                const badge = document.getElementById('pwa-badge');
                if (badge) badge.style.display = 'none';
            });
    });
}
