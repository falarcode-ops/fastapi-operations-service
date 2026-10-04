// ─── Sub-tab navigation ───────────────────────────────────────────────────

function switchCommercialTab(tab) {
    if (tab === 'pre-offer' || tab === 'pre_quotes' || tab === 'pre-quote') tab = 'pre-quotes';
    if (tab === 'zones' || tab === 'visit_pricing') tab = 'visit-pricing';
    if (tab === 'rates') tab = 'pricing';

    const tabs = ['packages','pricing','visit-pricing','pre-quotes','offers','contracts','conditions'];
    tabs.forEach(t => {
        const section = document.getElementById(`cmr-section-${t}`);
        const btn = document.getElementById(`cmr-tab-${t}`);
        if (section) section.style.display = t === tab ? '' : 'none';
        if (btn) {
            btn.className = t === tab ? 'btn-primary' : 'btn-secondary';
            btn.style.fontSize = '0.82rem';
            btn.style.padding = '6px 14px';
        }
    });
    // Load data when switching
    if (tab === 'packages') loadPackages();
    if (tab === 'pricing')  { loadPricing(); loadPackagesForSelect('quote-package-code'); }
    if (tab === 'offers')   loadOffers('');
    if (tab === 'contracts') loadContracts('');
    if (tab === 'conditions') {
        if (typeof loadAllConditions === 'function') loadAllConditions();
    }
    if (tab === 'visit-pricing') loadVisitPricing();
    if (tab === 'pre-quotes') loadPreQuotes('');
}

function loadConditions() {
    if (typeof loadAllConditions === 'function') {
        return loadAllConditions();
    }
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function fmtCOP(val) {
    if (!val && val !== 0) return '—';
    return '$' + parseInt(val).toLocaleString('es-CO') + ' COP';
}

function cmrBadge(status) {
    const map = {
        'BORRADOR':       ['#64748b','rgba(100,116,139,0.12)','Borrador'],
        'EMITIDA':        ['#0284c7','rgba(2,132,199,0.12)','Emitida'],
        'ENVIADA':        ['#d97706','rgba(217,119,6,0.12)','Enviada'],
        'ACEPTADA':       ['#059669','rgba(5,150,105,0.12)','Aceptada'],
        'RECHAZADA':      ['#dc2626','rgba(220,38,38,0.12)','Rechazada'],
        'VENCIDA':        ['#64748b','rgba(100,116,139,0.12)','Vencida'],
        'PENDIENTE_FIRMA':['#d97706','rgba(217,119,6,0.12)','Pendiente Firma'],
        'FIRMADO':        ['#059669','rgba(5,150,105,0.12)','Firmado'],
        'VIGENTE':        ['#0891b2','rgba(8,145,178,0.12)','Vigente'],
        'FINALIZADO':     ['#64748b','rgba(100,116,139,0.12)','Finalizado'],
        'CANCELADO':      ['#dc2626','rgba(220,38,38,0.12)','Cancelado'],
        'NUEVA':          ['#0284c7','rgba(2,132,199,0.12)','Nueva'],
        'ASIGNADA':       ['#7c3aed','rgba(124,58,237,0.12)','Asignada'],
        'EN_GESTION':     ['#2563eb','rgba(37,99,235,0.12)','En Gestión'],
        'COTIZADA':       ['#059669','rgba(5,150,105,0.12)','Cotizada'],
        'CERRADA':        ['#64748b','rgba(100,116,139,0.12)','Cerrada'],
    };
    const [color, bg, label] = map[status] || ['#64748b','rgba(100,116,139,0.1)', status || '—'];
    return `<span class="cmr-status-badge" style="background:${bg}; color:${color}; border:1px solid ${color}33; padding:2px 8px; border-radius:12px; font-size:0.73rem; font-weight:600; display:inline-flex; align-items:center; gap:5px; white-space:nowrap;"><span style="width:5px; height:5px; border-radius:50%; background:${color}; display:inline-block; flex-shrink:0;"></span>${label}</span>`;
}

async function loadPackagesForSelect(selectId) {
    try {
        const pkgs = await apiRequest(`${CMR_API}/packages`);
        const sel = document.getElementById(selectId);
        if (!sel) return;
        sel.innerHTML = '<option value="">Seleccionar plan...</option>';
        (pkgs || []).forEach(p => {
            sel.innerHTML += `<option value="${p.code}">${p.name}</option>`;
        });
    } catch(e) {}
}

// ─── 1. PACKAGES ─────────────────────────────────────────────────────────

