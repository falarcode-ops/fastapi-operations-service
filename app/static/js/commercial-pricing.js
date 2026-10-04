// ─── 2.1 VISIT PRICING ───────────────────────────────────────────────────

async function loadVisitPricing() {
    const tbody = document.getElementById('visit-pricing-tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--text-muted);">Cargando tarifario de visitas...</td></tr>';
    try {
        const zones = await apiRequest(`${CMR_API}/visit-pricing`);
        if (!zones || zones.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--text-muted);">Sin zonas configuradas. Crea la primera.</td></tr>';
            return;
        }
        tbody.innerHTML = zones.map(z => {
            const statusBadge = z.is_active !== 0
                ? '<span style="background:rgba(46,125,50,0.12); color:#2e7d32; padding:3px 8px; border-radius:12px; font-weight:600; font-size:0.75rem;">Activa</span>'
                : '<span style="background:rgba(211,47,47,0.12); color:#d32f2f; padding:3px 8px; border-radius:12px; font-weight:600; font-size:0.75rem;">Inactiva</span>';
            return `<tr>
                <td><strong>${z.zone_name}</strong></td>
                <td>Cobertura geográfica estándar ALACOR</td>
                <td style="font-weight:700; color:var(--text-primary);">${fmtCOP(z.price)}</td>
                <td>${statusBadge}</td>
                <td>
                    <div class="icon-btn-group" style="justify-content:center;">
                        <button class="action-icon-btn" onclick='openVisitPricingModal(${JSON.stringify(z)})' title="Editar Zona" aria-label="Editar Zona">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                        <button class="action-icon-btn" onclick="deleteVisitPricing(${z.id})" title="Eliminar Zona" aria-label="Eliminar Zona" style="color:var(--danger);">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                    </div>
                </td>
            </tr>`;
        }).join('');
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="5" style="color:#f44336;padding:20px;">${e.message}</td></tr>`;
    }
}

let _editingVisitPricing = null;
function openVisitPricingModal(zone = null) {
    _editingVisitPricing = zone;
    const isNew = !zone;
    const html = `
    <div class="modal-overlay active" id="visit-pricing-modal" onclick="if(event.target===this)closeVisitPricingModal()">
        <div class="modal-card" style="max-width:500px;" onclick="event.stopPropagation()">
            <div class="modal-header">
                <h3>${isNew ? 'Nueva Zona de Visita Técnica' : 'Editar Zona de Visita Técnica'}</h3>
                <button class="modal-close" onclick="closeVisitPricingModal()" aria-label="Cerrar" title="Cerrar">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18"></line></svg>
                </button>
            </div>
            <div style="padding:20px; display:flex; flex-direction:column; gap:12px;">
                <div class="form-group" style="margin:0;">
                    <label>Nombre de la Zona / Cobertura *</label>
                    <input type="text" id="vp-zone-name" value="${zone ? zone.zone_name : ''}" placeholder="Ej: Bogotá Urbana">
                </div>
                <div class="form-group" style="margin:0;">
                    <label>Precio / Tarifa de la Visita (COP) *</label>
                    <input type="text" id="vp-price" value="${zone ? fmtCOP(zone.price) : '$ 120.000'}" inputmode="numeric" oninput="handleCurrencyInputEvent(event)">
                </div>
            </div>
            <div class="modal-footer" style="padding:15px 20px; display:flex; justify-content:flex-end; gap:10px;">
                <button class="btn-secondary" onclick="closeVisitPricingModal()">Cancelar</button>
                <button class="btn-primary" onclick="saveVisitPricing()">Guardar Zona</button>
            </div>
        </div>
    </div>`;
    const old = document.getElementById('visit-pricing-modal');
    if (old) old.remove();
    document.body.insertAdjacentHTML('beforeend', html);
}

function closeVisitPricingModal() {
    const m = document.getElementById('visit-pricing-modal');
    if (m) m.remove();
    _editingVisitPricing = null;
}

async function saveVisitPricing() {
    const name = document.getElementById('vp-zone-name')?.value.trim();
    const price = parseCurrency(document.getElementById('vp-price')?.value);
    if (!name || isNaN(price)) {
        alert("Por favor complete el nombre de la zona y la tarifa.");
        return;
    }
    const payload = { zone_name: name, price: price, is_active: 1 };
    try {
        if (_editingVisitPricing) {
            await apiRequest(`${CMR_API}/visit-pricing/${_editingVisitPricing.id}`, 'PUT', payload);
        } else {
            await apiRequest(`${CMR_API}/visit-pricing`, 'POST', payload);
        }
        closeVisitPricingModal();
        loadVisitPricing();
    } catch(e) {
        alert("Error guardando zona: " + e.message);
    }
}

async function deleteVisitPricing(id) {
    if (!confirm("¿Está seguro de eliminar esta zona de visita técnica?")) return;
    try {
        await apiRequest(`${CMR_API}/visit-pricing/${id}`, 'DELETE');
        loadVisitPricing();
    } catch(e) {
        alert("Error eliminando zona: " + e.message);
    }
}

async function loadPricing() {
    const tbody = document.getElementById('pricing-tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:20px;color:var(--text-muted);">Cargando...</td></tr>';
    try {
        const rules = await apiRequest(`${CMR_API}/pricing`);
        if (!rules || rules.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:30px;color:var(--text-muted);">Sin reglas. Crea la primera.</td></tr>';
            return;
        }
        tbody.innerHTML = rules.map(r => {
            const annual = (parseFloat(r.implementation_price)||0) + (parseFloat(r.monthly_price)||0)*12;
            return `<tr>
                <td><strong>${r.package_code}</strong></td>
                <td>${r.label||'—'}</td>
                <td>${r.employees_min}–${r.employees_max}</td>
                <td>Nivel ${r.risk_group}</td>
                <td>${fmtCOP(r.implementation_price)}</td>
                <td>${fmtCOP(r.monthly_price)}</td>
                <td style="color:#4caf50; font-weight:600;">${fmtCOP(annual)}</td>
                <td style="font-size:0.78rem;">${r.valid_from||'—'} / ${r.valid_until||'—'}</td>
                <td>
                    <div class="icon-btn-group" style="justify-content:center;">
                        <button class="action-icon-btn" onclick='openPricingModal(${JSON.stringify(r)})' title="Editar Regla" aria-label="Editar Regla">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                        <button class="action-icon-btn" onclick="deletePricingRule(${r.id})" title="Eliminar Regla" aria-label="Eliminar Regla" style="color:var(--danger);">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                    </div>
                </td>
            </tr>`;
        }).join('');
    } catch(e) {
        tbody.innerHTML = `<tr><td colspan="9" style="color:#f44336;padding:20px;">${e.message}</td></tr>`;
    }
}

let _editingPricing = null;
function openPricingModal(rule) {
    _editingPricing = rule;
    const isNew = !rule;
    const html = `
    <div class="modal-overlay active" id="pricing-modal" onclick="if(event.target===this)closePricingModal()">
        <div class="modal-card" style="max-width:520px;" onclick="event.stopPropagation()">
            <div class="modal-header">
                <h3>${isNew ? 'Nueva Regla de Precio' : 'Editar Regla de Precio'}</h3>
                <button class="modal-close" onclick="closePricingModal()" aria-label="Cerrar" title="Cerrar">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18"></line></svg>
                </button>
            </div>
            <div style="padding:20px; display:flex; flex-direction:column; gap:12px;">
                <div class="form-group" style="margin:0;">
                    <label>Plan (código)</label>
                    <select id="pr-pkg-code" style="width:100%;"><option value="">Cargando...</option></select>
                </div>
                <div class="form-group" style="margin:0;">
                    <label>Etiqueta descriptiva</label>
                    <input type="text" id="pr-label" value="${rule?.label||''}" placeholder="Ej: Emprende 1-10 emp Riesgo I-II">
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                    <div class="form-group" style="margin:0;"><label>Min. empleados</label><input type="number" id="pr-emp-min" value="${rule?.employees_min||1}" min="1"></div>
                    <div class="form-group" style="margin:0;"><label>Máx. empleados</label><input type="number" id="pr-emp-max" value="${rule?.employees_max||10}" min="1"></div>
                </div>
                <div class="form-group" style="margin:0;">
                    <label>Grupo de riesgo</label>
                    <select id="pr-risk-grp" style="width:100%;">
                        <option value="1-3" ${rule?.risk_group==='1-3'?'selected':''}>Nivel 1-3 (Bajo - Medio)</option>
                        <option value="4-5" ${rule?.risk_group==='4-5'?'selected':''}>Nivel 4-5 (Alto)</option>
                        <option value="1-5" ${rule?.risk_group==='1-5'?'selected':''}>Todos (1-5)</option>
                    </select>
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                    <div class="form-group" style="margin:0;"><label>Precio Implementación (COP)</label><input type="number" id="pr-impl-price" value="${rule?.implementation_price||0}" min="0" step="1000"></div>
                    <div class="form-group" style="margin:0;"><label>Precio Mensual (COP)</label><input type="number" id="pr-monthly-price" value="${rule?.monthly_price||0}" min="0" step="1000"></div>
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                    <div class="form-group" style="margin:0;"><label>Válido desde</label><input type="date" id="pr-valid-from" value="${rule?.valid_from||new Date().toISOString().split('T')[0]}"></div>
                    <div class="form-group" style="margin:0;"><label>Válido hasta</label><input type="date" id="pr-valid-until" value="${rule?.valid_until||''}"></div>
                </div>
                <div style="background:rgba(0,200,100,0.08); border:1px solid rgba(0,200,100,0.2); border-radius:8px; padding:10px; font-size:0.82rem; color:var(--text-secondary); display:flex; align-items:center; gap:6px;">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                    <span><strong>Total anual estimado:</strong> <span id="pr-annual-calc">—</span></span>
                </div>
                <div style="display:flex; gap:8px; justify-content:flex-end;">
                    <button class="btn-secondary" onclick="closePricingModal()">Cancelar</button>
                    <button class="btn-primary" onclick="savePricingRule()" style="display:inline-flex; align-items:center; gap:6px;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                        <span>Guardar</span>
                    </button>
                </div>
            </div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
    // Load packages into select
    loadPackagesForSelect('pr-pkg-code').then(() => {
        if (rule?.package_code) {
            const sel = document.getElementById('pr-pkg-code');
            if (sel) sel.value = rule.package_code;
        }
    });
    // Live calc
    ['pr-impl-price','pr-monthly-price'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', () => {
            const impl = parseFloat(document.getElementById('pr-impl-price')?.value||0);
            const mo = parseFloat(document.getElementById('pr-monthly-price')?.value||0);
            const el = document.getElementById('pr-annual-calc');
            if (el) el.textContent = fmtCOP(impl + mo*12);
        });
    });
    // Trigger initial calc
    const e = new Event('input');
    document.getElementById('pr-impl-price')?.dispatchEvent(e);
}

function closePricingModal() {
    const m = document.getElementById('pricing-modal');
    if (m) m.remove();
}

async function savePricingRule() {
    const pkg = document.getElementById('pr-pkg-code')?.value;
    if (!pkg) return alert('Selecciona un plan.');
    const payload = {
        package_code: pkg,
        label: document.getElementById('pr-label')?.value?.trim(),
        employees_min: parseInt(document.getElementById('pr-emp-min')?.value)||1,
        employees_max: parseInt(document.getElementById('pr-emp-max')?.value)||10,
        risk_group: document.getElementById('pr-risk-grp')?.value||'1-3',
        implementation_price: parseFloat(document.getElementById('pr-impl-price')?.value)||0,
        monthly_price: parseFloat(document.getElementById('pr-monthly-price')?.value)||0,
        valid_from: document.getElementById('pr-valid-from')?.value,
        valid_until: document.getElementById('pr-valid-until')?.value||null,
    };
    try {
        if (_editingPricing) {
            await apiRequest(`${CMR_API}/pricing/${_editingPricing.id}`, 'PUT', payload);
        } else {
            await apiRequest(`${CMR_API}/pricing`, 'POST', payload);
        }
        showToast('Regla de precio guardada.', 'success');
        closePricingModal();
        loadPricing();
    } catch(e) { alert('Error: ' + e.message); }
}

async function deletePricingRule(id) {
    if (!confirm('¿Eliminar esta regla de precio?')) return;
    await apiRequest(`${CMR_API}/pricing/${id}`, 'DELETE');
    showToast('Regla eliminada.', 'info');
    loadPricing();
}

async function queryPriceSuggestion() {
    const pkg = document.getElementById('quote-package-code')?.value;
    const emp = document.getElementById('quote-employees')?.value;
    const risk = document.getElementById('quote-risk-level')?.value;
    const res = document.getElementById('price-suggestion-result');
    if (!pkg || !emp) { alert('Selecciona plan y empleados.'); return; }
    res.style.display = 'none';
    try {
        const r = await apiRequest(`${CMR_API}/pricing/quote?package_code=${pkg}&employees=${emp}&risk_level=${risk}`);
        if (!r.found) {
            res.innerHTML = `<span style="color:#f44336; display:inline-flex; align-items:center; gap:5px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>${escapeHtml(r.message)}</span>`;
        } else {
            res.innerHTML = `
                <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:16px;">
                    <div><div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:4px;">Implementación</div><div style="font-size:1.1rem; font-weight:700; color:var(--accent-primary);">${fmtCOP(r.implementation_price)}</div></div>
                    <div><div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:4px;">Mensual</div><div style="font-size:1.1rem; font-weight:700; color:var(--accent-primary);">${fmtCOP(r.monthly_price)}</div></div>
                    <div><div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:4px;">Total Anual Est.</div><div style="font-size:1.1rem; font-weight:700; color:#4caf50;">${fmtCOP(r.total_annual_estimate)}</div></div>
                </div>
                <div style="margin-top:10px; font-size:0.78rem; color:var(--text-muted);">Plan: <strong>${r.package_code}</strong> · Rango: ${r.employees_min}–${r.employees_max} emp · Riesgo: ${r.risk_group} · ${r.label||''}</div>`;
        }
        res.style.display = 'block';
    } catch(e) {
        res.innerHTML = `<span style="color:#f44336;">Error: ${e.message}</span>`;
        res.style.display = 'block';
    }
}

// ─── 3. OFFERS ───────────────────────────────────────────────────────────

