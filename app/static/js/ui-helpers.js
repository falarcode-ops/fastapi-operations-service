
function showToast(msg, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = 'position: fixed; bottom: 24px; right: 24px; z-index: 9999; display: flex; flex-direction: column; gap: 10px; max-width: 380px; pointer-events: none;';
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icons = {
        success: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
        error:   `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`,
        warning: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
        info:    `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`
    };
    
    const colors = {
        success: { border: '#10b981' },
        error:   { border: '#ef4444' },
        warning: { border: '#f59e0b' },
        info:    { border: '#0ea5e9' }
    };
    
    const styleConf = colors[type] || colors.info;
    
    toast.style.cssText = `
        pointer-events: auto;
        background: #0f172a;
        color: #ffffff;
        border: 1px solid rgba(255,255,255,0.2);
        border-left: 4px solid ${styleConf.border};
        box-shadow: 0 10px 25px -5px rgba(0,0,0,0.6);
        padding: 14px 18px;
        border-radius: 8px;
        font-size: 0.85rem;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 12px;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        opacity: 0;
        transform: translateY(12px);
    `;
    
    toast.innerHTML = `<span style="display:flex; align-items:center; flex-shrink:0;">${icons[type] || icons.info}</span><span style="flex:1; color:#ffffff !important; font-size:0.85rem; font-weight:600; line-height:1.4;">${msg}</span>`;
    container.appendChild(toast);
    
    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    });
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(12px)';
        setTimeout(() => toast.remove(), 350);
    }, 4000);
}

function toggleAccordionCard(headerEl) {
    const card = headerEl.closest('.config-section-card');
    if (!card) return;
    const body = card.querySelector('.config-card-body');
    const chevron = headerEl.querySelector('.accordion-chevron');
    if (!body) return;
    
    const isHidden = window.getComputedStyle(body).display === 'none';
    if (isHidden) {
        body.style.display = 'block';
        if (chevron) chevron.style.transform = 'rotate(180deg)';
        headerEl.style.borderBottom = '1px solid var(--border-color)';
        headerEl.style.paddingBottom = '12px';
        headerEl.style.marginBottom = '12px';
    } else {
        body.style.display = 'none';
        if (chevron) chevron.style.transform = 'rotate(0deg)';
        headerEl.style.borderBottom = 'none';
        headerEl.style.paddingBottom = '0px';
        headerEl.style.marginBottom = '0px';
    }
}

function buildPhoneValue(prefixId, phoneId) {
    const elPrefix = document.getElementById(prefixId);
    const elPhone = document.getElementById(phoneId);
    if (!elPrefix || !elPhone) return '';
    
    const prefix = elPrefix.value;
    const phone = elPhone.value.trim().replace(/[\s\-\(\)\+]/g, '');
    if (!phone) return '';
    return `+${prefix}${phone}`;
}

function togglePasswordVisibility(inputId, btnEl) {
    const input = document.getElementById(inputId);
    if (!input) return;
    
    const showIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
    const hideIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;

    if (input.type === 'password') {
        input.type = 'text';
        if (btnEl) btnEl.innerHTML = hideIcon;
    } else {
        input.type = 'password';
        if (btnEl) btnEl.innerHTML = showIcon;
    }
}

function generateSecureToken(inputId, length = 32) {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    let token = 'sgsst_sec_';
    const randomValues = new Uint8Array(length);
    window.crypto.getRandomValues(randomValues);
    for (let i = 0; i < length; i++) {
        token += charset[randomValues[i] % charset.length];
    }
    const input = document.getElementById(inputId);
    if (input) {
        input.value = token;
        input.type = 'text';
    }
    if (navigator.clipboard) {
        navigator.clipboard.writeText(token).then(() => {
            if (typeof showStatusMsg === 'function') {
                showStatusMsg('¡Token seguro generado y copiado al portapapeles!', 'success');
            }
        }).catch(() => {
            if (typeof showStatusMsg === 'function') {
                showStatusMsg('¡Token seguro generado!', 'success');
            }
        });
    }
}

function copyInputToClipboard(inputId, btnEl) {
    const input = document.getElementById(inputId);
    if (!input || !input.value) {
        if (typeof showStatusMsg === 'function') {
            showStatusMsg('No hay ningún texto para copiar.', 'error');
        }
        return;
    }
    
    navigator.clipboard.writeText(input.value).then(() => {
        if (btnEl) {
            const origColor = btnEl.style.color;
            btnEl.style.color = '#00e5ff';
            setTimeout(() => { btnEl.style.color = origColor; }, 1500);
        }
        if (typeof showStatusMsg === 'function') {
            showStatusMsg('¡Texto copiado al portapapeles!', 'success');
        }
    }).catch(err => {
        console.error('Error al copiar:', err);
        if (typeof showStatusMsg === 'function') {
            showStatusMsg('Fallo al copiar al portapapeles.', 'error');
        }
    });
}

function renderPhaseBadge(status) {
    const st = (status || '').toUpperCase();
    switch (st) {
        case 'PROSPECTO':
        case 'INGRESO_WEB':
            return '<span class="status-pill prospecto"><span class="comm-dot dot-blue"></span>Prospecto</span>';
        case 'COTIZADO':
            return '<span class="status-pill cotizado"><span class="comm-dot dot-amber"></span>Cotizado</span>';
        case 'CONTRATO':
            return '<span class="status-pill contrato"><span class="comm-dot dot-purple"></span>Contrato</span>';
        case 'VIGENTE':
        case 'CLIENTE':
            return '<span class="status-pill cliente"><span class="comm-dot dot-emerald"></span>Vigente</span>';
        case 'FINALIZADO':
            return '<span class="status-pill finalizado"><span class="comm-dot dot-slate"></span>Finalizado</span>';
        case 'CERRADA':
            return '<span class="status-pill cerrada"><span class="comm-dot dot-red"></span>Cerrada</span>';
        default:
            return `<span class="status-pill prospecto"><span class="comm-dot dot-slate"></span>${status || 'Abierta'}</span>`;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
//  MÓDULO COMERCIAL SG-SST — v3.6.0
//  Paquetes, Tarifario, Ofertas, Contratos, Condiciones
// ═══════════════════════════════════════════════════════════════════════════

async function apiRequest(url, method = 'GET', body = null) {
    const options = { method };
    if (body) {
        if (body instanceof FormData) {
            options.body = body;
        } else {
            options.headers = { 'Content-Type': 'application/json' };
            options.body = JSON.stringify(body);
        }
    }
    const res = await apiFetch(url, options);
    if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Error HTTP ${res.status}`);
    }
    return await res.json().catch(() => ({}));
}


// ═══════════════════════════════════════════════════════════════════════════
// MOTOR GLOBAL DE TOOLTIPS FLOTANTES (v12.55.0 - UNIFIED GLASSMORPHIC)
// ═══════════════════════════════════════════════════════════════════════════
function initGlobalTooltips() {
    let tooltipEl = document.getElementById('global-coralis-tooltip');
    if (!tooltipEl) {
        tooltipEl = document.createElement('div');
        tooltipEl.id = 'global-coralis-tooltip';
        document.body.appendChild(tooltipEl);
    }

    let activeTarget = null;

    function formatTooltipContent(rawText) {
        if (!rawText) return '';
        const lines = rawText.split(/\r?\n|&#10;/g).map(l => l.trim()).filter(Boolean);
        if (lines.length === 0) return '';
        
        // Single line label: render as sleek, compact badge without dividers
        if (lines.length === 1) {
            return `<div class="tooltip-single">${lines[0]}</div>`;
        }
        
        // Multi-line detailed tooltip
        let html = '';
        const firstLine = lines[0];
        html += `<div class="tooltip-header">${firstLine}</div>`;
        
        html += `<div class="tooltip-body">`;
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            if (line.startsWith('•') || line.startsWith('-')) {
                const colonIdx = line.indexOf(':');
                if (colonIdx !== -1) {
                    const tag = line.substring(0, colonIdx + 1);
                    const desc = line.substring(colonIdx + 1);
                    html += `<div class="tooltip-item"><span class="tooltip-tag">${tag}</span><span style="flex:1;">${desc}</span></div>`;
                } else {
                    html += `<div class="tooltip-item">${line}</div>`;
                }
            } else {
                html += `<div style="margin-top:4px; font-size:0.72rem; color:#94a3b8;">${line}</div>`;
            }
        }
        html += `</div>`;
        return html;
    }

    function showTooltip(el) {
        const text = el.getAttribute('data-tip') || el.getAttribute('data-original-title');
        if (!text) return;
        
        tooltipEl.innerHTML = formatTooltipContent(text);
        tooltipEl.classList.add('active');
        
        const rect = el.getBoundingClientRect();
        const tipRect = tooltipEl.getBoundingClientRect();
        
        // Posicionamiento horizontal centrado respecto al elemento disparador
        let left = rect.left + (rect.width / 2) - (tipRect.width / 2);
        const padding = 12;
        if (left < padding) left = padding;
        if (left + tipRect.width > window.innerWidth - padding) {
            left = window.innerWidth - tipRect.width - padding;
        }

        // Posicionamiento vertical: si está muy cerca de la parte superior del viewport, se abre abajo
        let top = rect.top - tipRect.height - 8;
        if (top < 10) {
            top = rect.bottom + 8; // Auto-flip hacia abajo para evitar solape con thead o pantalla
        }

        tooltipEl.style.left = `${Math.round(left)}px`;
        tooltipEl.style.top = `${Math.round(top)}px`;
    }

    function hideTooltip() {
        if (tooltipEl) {
            tooltipEl.classList.remove('active');
        }
        activeTarget = null;
    }

    document.body.addEventListener('pointerover', (e) => {
        // Intercepta cualquier elemento con [data-tip] o [title]
        const target = e.target.closest('[data-tip], [title]');
        if (target) {
            // Suprimir cualquier tooltip nativo del navegador para que exista UNA SOLA etiqueta unificada
            if (target.hasAttribute('title')) {
                const titleVal = target.getAttribute('title');
                if (titleVal && titleVal.trim()) {
                    if (!target.hasAttribute('data-tip')) {
                        target.setAttribute('data-tip', titleVal.trim());
                    }
                    target.setAttribute('data-original-title', titleVal.trim());
                }
                target.removeAttribute('title');
            }
            if (target !== activeTarget) {
                activeTarget = target;
                showTooltip(target);
            }
        }
    });

    document.body.addEventListener('pointerout', (e) => {
        if (!activeTarget) return;
        const related = e.relatedTarget ? e.relatedTarget.closest('[data-tip], [data-original-title]') : null;
        if (related !== activeTarget) {
            hideTooltip();
        }
    });

    window.addEventListener('scroll', hideTooltip, { passive: true });
    document.addEventListener('click', hideTooltip);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGlobalTooltips);
} else {
    initGlobalTooltips();
}


