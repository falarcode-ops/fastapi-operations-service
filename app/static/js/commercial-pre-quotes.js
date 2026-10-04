async function openUnifiedSgsstCommercialModal(req = null, defaultType = 'PRE_OFFER') {
    const existing = document.getElementById('unified-sgsst-modal');
    if (existing) existing.remove();

    _unifiedDocType = defaultType;
    window.currentUnifiedReq = req;

    const nitVal = req ? safeString(req.customer_nit) : '';
    const companyVal = req ? safeString(req.company_name) : '';
    const reqNum = req ? safeString(req.request_number) : '';
    const planName = req ? safeString(req.plan || req.plan_recommended || 'SG-SST') : 'SG-SST';

    let defaultImpl = 1500000;
    let defaultMonthly = 500000;

    if (req) {
        if (req.estimated_implementation && Number(req.estimated_implementation) > 0) {
            defaultImpl = Number(req.estimated_implementation);
        }
        if (req.estimated_monthly && Number(req.estimated_monthly) > 0) {
            defaultMonthly = Number(req.estimated_monthly);
        }
        
        const rawPlan = req.plan_recommended || req.plan || (typeof req.details === 'object' ? (req.details.plan || req.details.plan_recommended) : req.details);
        const planStr = safeString(rawPlan).toUpperCase();

        if (planStr.includes('ADMINISTRA')) {
            defaultImpl = 1800000;
            defaultMonthly = 650000;
        } else if (planStr.includes('AUDITORI') || planStr.includes('MANTENIMIENTO')) {
            defaultImpl = 1200000;
            defaultMonthly = 450000;
        } else if (planStr.includes('DIAGNOSTICO') || planStr.includes('DISEÑO')) {
            defaultImpl = 950000;
            defaultMonthly = 0;
        }
    }

    const defaultNotesOffer = req ? `Pre-Oferta Preliminar de Servicios SG-SST solicitados vía web (Solicitud ${reqNum}). Valores estimados según el plan ${planName}. Sujetos a confirmación técnica en visita presencial.` : 'Pre-Oferta Preliminar de Servicios SG-SST. Valores sujetos a confirmación técnica presencial.';

    const html = `
    <div class="modal-overlay active" id="unified-sgsst-modal" onclick="if(event.target===this)closeUnifiedSgsstModal()">
        <div class="modal-card" style="max-width:680px; max-height:92vh; overflow-y:auto;" onclick="event.stopPropagation()">
            <div class="modal-header">
                <h3 id="unified-modal-title" style="display:flex; align-items:center; gap:8px;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                    <span>Generador Comercial</span>
                </h3>
                <button class="modal-close" onclick="closeUnifiedSgsstModal()" aria-label="Cerrar" title="Cerrar">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18"></line></svg>
                </button>
            </div>
            <div style="padding:20px; display:flex; flex-direction:column; gap:14px;">
                
                <!-- MODALITY SELECTOR TABS (2 MODES ALIGNED WITH ALEGRA) -->
                <div style="display:flex; background:rgba(0,0,0,0.04); padding:4px; border-radius:8px; border:1px solid var(--border-color); gap:4px;">
                    <button type="button" id="un-tab-pre-offer" onclick="switchUnifiedDocType('PRE_OFFER')" style="flex:1; padding:8px 4px; border:none; border-radius:6px; font-weight:700; font-size:0.8rem; cursor:pointer; background:var(--accent-primary); color:white; transition:all 0.2s; display:inline-flex; align-items:center; justify-content:center; gap:6px;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                        Pre-Oferta
                    </button>
                    <button type="button" id="un-tab-formal-offer" onclick="switchUnifiedDocType('FORMAL_OFFER')" style="flex:1; padding:8px 4px; border:none; border-radius:6px; font-weight:700; font-size:0.8rem; cursor:pointer; background:transparent; color:var(--text-muted); transition:all 0.2s; display:inline-flex; align-items:center; justify-content:center; gap:6px;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                        Oferta Formal (Alegra)
                    </button>
                </div>

                <div id="un-modality-info" style="padding:10px 14px; background:rgba(0,120,255,0.08); border-left:4px solid var(--accent-primary); border-radius:6px; font-size:0.82rem; color:var(--text-primary); line-height:1.4; display:flex; align-items:flex-start; gap:8px;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0; margin-top:2px;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                    <span><strong>Pre-Oferta Comercial:</strong> Estructura completa pre-cargada con parámetros Alegra. Emite propuesta preliminar sujeta a verificación en visita presencial.</span>
                </div>

                <!-- PRE-LOADED CUSTOMER INFO (SHARED ACROSS ALL MODES) -->
                <div class="form-group" style="margin:0;">
                    <label>NIT del Cliente *</label>
                    <input type="text" id="of-nit" placeholder="900123456-1" value="${nitVal}" style="width:100%;" oninput="autoLookupUnifiedCustomer(this.value)">
                    <div id="of-customer-info" style="margin-top:5px; font-size:0.83rem; font-weight:600; color:var(--accent-primary);">
                        ${companyVal ? `<span style="display:inline-flex; align-items:center; gap:4px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Empresa: <strong>${companyVal}</strong></span>` : 'Buscando cliente en CRM...'}
                    </div>
                </div>

                <!-- ITEM SELECTION CHECKBOXES -->
                <div style="background:var(--bg-secondary); border:1px solid var(--border-color); border-radius:8px; padding:10px 14px;">
                    <div style="font-size:0.8rem; font-weight:700; color:var(--text-primary); margin-bottom:8px; display:flex; align-items:center; gap:6px;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>
                        <span>Ítems a Incluir en la Cotización:</span>
                    </div>
                    <div style="display:flex; gap:16px; flex-wrap:wrap; font-size:0.82rem; color:var(--text-secondary);">
                        <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
                            <input type="checkbox" id="chk-item-impl" checked onchange="toggleUnifiedItemSelection()">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>
                            Implementación SG-SST
                        </label>
                        <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
                            <input type="checkbox" id="chk-item-monthly" checked onchange="toggleUnifiedItemSelection()">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                            Acompañamiento Mensual
                        </label>
                        <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
                            <input type="checkbox" id="chk-item-visit" onchange="toggleUnifiedItemSelection()">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                            Visita Técnica Diagnóstica
                        </label>
                    </div>
                </div>

                <!-- PLAN & PAYMENT FREQUENCY (ALEGRA PARAMS) -->
                <div id="un-plan-payment-row" style="display:grid; grid-template-columns:1.2fr 0.8fr; gap:12px;">
                    <div class="form-group" style="margin:0;">
                        <label>Plan / Paquete de Servicio *</label>
                        <select id="of-pkg-code" onchange="autofillPriceFromPlan()" style="width:100%;">
                            <option value="">Cargando planes...</option>
                        </select>
                    </div>
                    <div class="form-group" style="margin:0;">
                        <label>Modalidad de Pago</label>
                        <select id="of-payment-mode" onchange="calcOfferAnnual()" style="width:100%;">
                            <option value="MENSUAL">Mensual (0% desc.)</option>
                            <option value="SEMESTRAL">Semestral (10% desc. mensualidades)</option>
                            <option value="ANUAL">Anual (15% desc. · Mejor Precio)</option>
                        </select>
                    </div>
                </div>

                <!-- IMPL & MONTHLY PRICING (ALEGRA PARAMS) -->
                <div id="un-pricing-row" style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                    <div class="form-group" style="margin:0;">
                        <label>Valor Implementación (COP) *</label>
                        <input type="text" id="of-impl-price" value="$ ${defaultImpl.toLocaleString('es-CO')}" inputmode="numeric" oninput="handleCurrencyInputEvent(event); calcOfferAnnual();">
                    </div>
                    <div class="form-group" style="margin:0;">
                        <label>Valor Mensual (COP) *</label>
                        <input type="text" id="of-monthly-price" value="$ ${defaultMonthly.toLocaleString('es-CO')}" inputmode="numeric" oninput="handleCurrencyInputEvent(event); calcOfferAnnual();">
                    </div>
                </div>

                <!-- DISCOUNTS & REASON (ALEGRA PARAMS) -->
                <div id="un-discount-row" style="display:grid; grid-template-columns:0.8fr 1.2fr; gap:12px;">
                    <div class="form-group" style="margin:0;">
                        <label>Descuento (%)</label>
                        <input type="number" id="of-discount-pct" value="0" min="0" max="100" oninput="calcOfferAnnual()">
                    </div>
                    <div class="form-group" style="margin:0;">
                        <label>Razón del descuento</label>
                        <input type="text" id="of-discount-reason" placeholder="Cliente referido, paquete especial, etc.">
                    </div>
                </div>

                <!-- VISIT PRICING ZONE SELECTION -->
                <div id="un-visit-zone-row" style="display:grid; grid-template-columns:1.2fr 0.8fr; gap:12px;">
                    <div class="form-group" style="margin:0;">
                        <label>Zona de Visita Técnica *</label>
                        <select id="pq-zone-select" onchange="updatePqVisitPrice()" style="width:100%;">
                            <option value="">Cargando zonas...</option>
                        </select>
                    </div>
                    <div class="form-group" style="margin:0;">
                        <label>Costo Visita (COP) *</label>
                        <input type="text" id="pq-visit-price" value="$ 0" inputmode="numeric" oninput="handleCurrencyInputEvent(event); calcOfferAnnual();">
                    </div>
                </div>

                <!-- FORMAL OFFER SPECIFIC PARAMS (VALIDITY & ADVANCE) -->
                <div id="un-formal-params-row" style="display:none; grid-template-columns:1fr 1fr; gap:12px;">
                    <div class="form-group" style="margin:0;">
                        <label>Vigencia (días)</label>
                        <input type="number" id="of-validity" value="15" min="1">
                    </div>
                    <div class="form-group" style="margin:0;">
                        <label>Anticipo (%)</label>
                        <input type="number" id="of-advance-pct" value="50" min="0" max="100">
                    </div>
                </div>

                <!-- ANNUAL / PROPOSAL TOTAL SUMMARY CALCULATION (POSITIONED AT THE END BEFORE NOTES) -->
                <div id="un-annual-box" style="background:rgba(0,200,100,0.08); border:1px solid rgba(0,200,100,0.3); border-radius:8px; padding:12px 14px; font-size:0.85rem; display:flex; justify-content:space-between; align-items:center;">
                    <span id="un-total-box-label" style="display:inline-flex; align-items:center; gap:6px;">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                        <strong>Total propuesta inicial (1er mes + impl.):</strong>
                    </span>
                    <span id="of-annual-total" style="color:#2e7d32; font-weight:700; font-size:1.05rem;">$0 COP</span>
                </div>

                <!-- NOTES / DISCLAIMER LEGAL -->
                <div class="form-group" style="margin:0;">
                    <label id="un-notes-label">Observaciones / Nota Legal Específica</label>
                    <textarea id="of-notes" rows="3" placeholder="Observaciones preliminares..." style="width:100%; resize:vertical; font-size:0.82rem;">${defaultNotesOffer}</textarea>
                </div>

                <div id="un-generating-status" style="display:none; text-align:center; padding:12px; color:var(--accent-primary); font-weight:600;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin" style="vertical-align:text-bottom; margin-right:6px;"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>
                    Procesando documento...
                </div>

                <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:6px;">
                    <button class="btn-secondary btn-compact" onclick="closeUnifiedSgsstModal()">Cancelar</button>
                    <button class="btn-secondary btn-compact" onclick="previewUnifiedSgsstPdf()" style="border:1px solid var(--accent-primary); color:var(--accent-primary); font-weight:600; display:inline-flex; align-items:center; gap:5px;" title="Ver vista previa del documento PDF">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                        Vista Previa
                    </button>
                    <button class="btn-primary btn-compact" id="un-submit-btn" onclick="submitUnifiedSgsstCommercialForm()" title="Generar y emitir Pre-Oferta preliminar" style="display:inline-flex; align-items:center; gap:5px;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                        Generar
                    </button>
                </div>
            </div>
        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', html);

    // Auto lookup customer in CRM
    if (nitVal) {
        autoLookupUnifiedCustomer(nitVal, companyVal);
    }

    // 1. Load packages for select
    await loadPackagesForSelect('of-pkg-code');

    // 2. Load visit pricing zones
    const select = document.getElementById('pq-zone-select');
    try {
        const zones = await apiRequest(`${CMR_API}/visit-pricing`);
        _pqZonesCache = zones || [];
        select.innerHTML = '';
        if (_pqZonesCache.length > 0) {
            _pqZonesCache.filter(z => z.is_active !== 0).forEach((z) => {
                const opt = document.createElement('option');
                opt.value = z.zone_name;
                opt.dataset.price = z.price;
                opt.innerText = `${z.zone_name} - ${fmtCOP(z.price)}`;
                select.appendChild(opt);
            });
            select.selectedIndex = 0;
            updatePqVisitPrice();
        } else {
            select.innerHTML = '<option value="">No hay zonas configuradas</option>';
        }
    } catch (e) {
        console.error("Error loading zones:", e);
        select.innerHTML = '<option value="">Error cargando zonas</option>';
    }

    // 3. Perform smart autofill from request once dropdowns are populated
    if (req) {
        await autoFillOfferFromRequest(req);
    }

    // 4. Initial switch to default modality & calculate annual total
    switchUnifiedDocType(defaultType);
    calcOfferAnnual();
}

function openPreQuoteGeneratorModal(req = null) {
    openUnifiedSgsstCommercialModal(req, 'PRE_OFFER');
}

function openOfferGeneratorModal(req = null) {
    openUnifiedSgsstCommercialModal(req, 'FORMAL_OFFER');
}

function closeUnifiedSgsstModal() {
    const m = document.getElementById('unified-sgsst-modal');
    if (m) m.remove();
}

function closeOfferModal() {
    closeUnifiedSgsstModal();
}

function closePreQuoteModal() {
    closeUnifiedSgsstModal();
}

function switchUnifiedDocType(type) {
    _unifiedDocType = type;
    const tabPreOffer = document.getElementById('un-tab-pre-offer');
    const tabFormalOffer = document.getElementById('un-tab-formal-offer');
    const infoEl = document.getElementById('un-modality-info');
    const planPaymentRow = document.getElementById('un-plan-payment-row');
    const pricingRow = document.getElementById('un-pricing-row');
    const annualBox = document.getElementById('un-annual-box');
    const discountRow = document.getElementById('un-discount-row');
    const formalParamsRow = document.getElementById('un-formal-params-row');
    const submitBtn = document.getElementById('un-submit-btn');
    const notesTxt = document.getElementById('of-notes');

    const req = window.currentUnifiedReq;
    const reqNum = req ? safeString(req.request_number) : '';
    const planName = req ? safeString(req.plan || req.plan_recommended || 'SG-SST') : 'SG-SST';

    // Reset tab active styles
    [tabPreOffer, tabFormalOffer].forEach(b => {
        if (b) { b.style.background = 'transparent'; b.style.color = 'var(--text-muted)'; }
    });

    if (type === 'PRE_OFFER') {
        if (tabPreOffer) { tabPreOffer.style.background = 'var(--accent-primary)'; tabPreOffer.style.color = 'white'; }
        infoEl.innerHTML = '<span style="display:flex; align-items:flex-start; gap:8px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0; margin-top:2px;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg><span><strong>Pre-Oferta Comercial:</strong> Seleccione los ítems a incluir (Implementación SG-SST, Acompañamiento Mensual y/o Visita Técnica) según su necesidad.</span></span>';
        planPaymentRow.style.display = 'grid';
        pricingRow.style.display = 'grid';
        annualBox.style.display = 'flex';
        discountRow.style.display = 'grid';
        if (formalParamsRow) formalParamsRow.style.display = 'none';
        if (document.getElementById('chk-item-impl')) document.getElementById('chk-item-impl').checked = true;
        if (document.getElementById('chk-item-monthly')) document.getElementById('chk-item-monthly').checked = true;
        if (document.getElementById('chk-item-visit')) document.getElementById('chk-item-visit').checked = false;
        toggleUnifiedItemSelection();
        submitBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:5px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>Generar Pre-Oferta';
        if (notesTxt && (!notesTxt.value || notesTxt.value.includes('* Pre-Oferta Preliminar') || notesTxt.value.includes('Pre-Oferta Preliminar'))) {
            const reqText = reqNum ? ` (Solicitud ${reqNum})` : '';
            notesTxt.value = `* Pre-Oferta Preliminar de Servicios SG-SST solicitados vía web${reqText}. Valores estimados según el plan ${planName}. Sujetos a confirmación técnica en visita presencial.\n\nCondiciones de pago: Contado (Consignación nacional y/o transferencia electrónica banco Davivienda, Cta. Ahorros # 455400047243 -Bancolombia Cta. Ahorros #634-000030-24 a nombre de ALACOR SAS). /Entrega: Instalaciones del cliente en pedidos superiores a 1'000.000 para ciudades principales, para pedidos menores a este el cliente debe asumir el flete - Los tiempos de Envió por transportadora están sujetos a los tiempos logísticos de estas (Tiempo de entrega: 3 días hábiles-sujeto a disponibilidad /Validez de la oferta: 20 días /Nota: Si algunas de las referencias cotizadas no están disponibles en el momento de recibir la orden de compra, estas pueden ser homologadas por una de otra marca que cumpla con estas características técnicas previo acuerdo con el Cliente.`;
        }
    } else if (type === 'FORMAL_OFFER') {
        if (tabFormalOffer) { tabFormalOffer.style.background = 'var(--accent-primary)'; tabFormalOffer.style.color = 'white'; }
        infoEl.innerHTML = '<span style="display:flex; align-items:flex-start; gap:8px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0; margin-top:2px;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg><span><strong>Oferta Comercial Formal (Alegra):</strong> Estructura completa de estimación oficial. Crea cliente/ítems en la API de Alegra y genera la estimación oficial.</span></span>';
        planPaymentRow.style.display = 'grid';
        pricingRow.style.display = 'grid';
        annualBox.style.display = 'flex';
        discountRow.style.display = 'grid';
        formalParamsRow.style.display = 'grid';
        submitBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:5px;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>Generar Oferta Formal (Sincronizar Alegra)';
        if (notesTxt && notesTxt.value.includes('Pre-Oferta Preliminar')) {
            notesTxt.value = req ? `Generado automáticamente desde solicitud ${reqNum}.` : '';
        }
    }
    calcOfferAnnual();
}

async function autofillPriceFromPlan() {
    const pkgSelect = document.getElementById('of-pkg-code');
    const pkgCode = pkgSelect ? pkgSelect.value : '';
    if (!pkgCode) return;
    try {
        const res = await apiRequest(`${CMR_API}/pricing/quote?package_code=${encodeURIComponent(pkgCode)}&employees=5&risk_level=1`);
        if (res && res.found) {
            if (document.getElementById('of-impl-price')) document.getElementById('of-impl-price').value = '$ ' + parseCurrency(res.implementation_price || 0).toLocaleString('es-CO');
            if (document.getElementById('of-monthly-price')) document.getElementById('of-monthly-price').value = '$ ' + parseCurrency(res.monthly_price || 0).toLocaleString('es-CO');
            calcOfferAnnual();
        }
    } catch(e) {
        console.warn("Autofill price suggestion fallback:", e);
    }
}

async function generateOffer() {
    const nitInput = document.getElementById('of-nit');
    const nit = nitInput ? nitInput.value.trim() : '';
    const pkgSelect = document.getElementById('of-pkg-code');
    const pkgCode = pkgSelect ? pkgSelect.value : '';
    const payModeSelect = document.getElementById('of-payment-mode');
    const payMode = payModeSelect ? payModeSelect.value : 'MENSUAL';
    const estImplInput = document.getElementById('of-impl-price');
    const estImpl = estImplInput ? parseCurrency(estImplInput.value) : 0;
    const estMonthlyInput = document.getElementById('of-monthly-price');
    const estMonthly = estMonthlyInput ? parseCurrency(estMonthlyInput.value) : 0;
    const discInput = document.getElementById('of-discount-pct');
    const discPct = discInput ? parseFloat(discInput.value) || 0 : 0;
    const discReason = document.getElementById('of-discount-reason')?.value || '';
    const validity = parseInt(document.getElementById('of-validity')?.value || 15);
    const advancePct = parseFloat(document.getElementById('of-advance-pct')?.value || 50);
    const notes = document.getElementById('of-notes')?.value || '';

    if (!nit) return showToast('NIT del cliente requerido.', 'error');
    if (!pkgCode) return showToast('Seleccione un paquete comercial.', 'error');

    const payload = {
        customer_nit: nit,
        package_code: pkgCode,
        payment_mode: payMode,
        implementation_price: estImpl,
        monthly_price: estMonthly,
        discount_pct: discPct,
        discount_reason: discReason,
        validity_days: validity,
        advance_payment_pct: advancePct,
        notes: notes,
        salesperson: localStorage.getItem('full_name') || localStorage.getItem('username') || 'Asesor Comercial ALACOR'
    };

    const statusEl = document.getElementById('un-generating-status');
    if (statusEl) statusEl.style.display = 'block';

    try {
        const res = await apiRequest(`${CMR_API}/offers`, 'POST', payload);
        showToast(res.message || 'Oferta Formal emitida y sincronizada con éxito.', 'success');
        closeUnifiedSgsstModal();
        if (typeof loadOffers === 'function') loadOffers();
        if (res.offer_id && typeof downloadOfferPDF === 'function') {
            downloadOfferPDF(res.offer_id, res.offer_number);
        }
    } catch (e) {
        showToast(e.message, 'error');
    } finally {
        if (statusEl) statusEl.style.display = 'none';
    }
}

async function submitUnifiedSgsstCommercialForm() {
    if (_unifiedDocType === 'FORMAL_OFFER') {
        await generateOffer();
    } else {
        await generatePreQuote();
    }
}

let _unifiedCustomerDebounceTimer = null;
function autoLookupUnifiedCustomer(nit, knownCompanyName = '') {
    clearTimeout(_unifiedCustomerDebounceTimer);
    const infoEl = document.getElementById('of-customer-info');
    if (!infoEl) return;

    if (!nit || nit.trim().length < 3) {
        infoEl.innerHTML = '<span style="color:var(--text-muted);">Ingrese NIT del cliente</span>';
        return;
    }

    _unifiedCustomerDebounceTimer = setTimeout(async () => {
        try {
            const res = await fetch(`${API_BASE}/customers/${encodeURIComponent(nit.trim())}`, { headers: getAuthHeaders() });
            if (res.ok) {
                const customer = await res.json();
                infoEl.innerHTML = `<span style="display:inline-flex; align-items:center; gap:4px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Empresa: <strong>${customer.name || customer.company_name}</strong></span>`;
            } else {
                if (knownCompanyName) {
                    infoEl.innerHTML = `<span style="display:inline-flex; align-items:center; gap:4px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg> Empresa Solicitante Web: <strong>${knownCompanyName}</strong> (Prospecto)</span>`;
                } else {
                    infoEl.innerHTML = `<span style="display:inline-flex; align-items:center; gap:4px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg> Prospecto Nuevo NIT: <strong>${nit.trim()}</strong></span>`;
                }
            }
        } catch (e) {
            infoEl.innerHTML = knownCompanyName ? `<span style="display:inline-flex; align-items:center; gap:4px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg> Empresa: <strong>${knownCompanyName}</strong></span>` : `<span style="display:inline-flex; align-items:center; gap:4px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg> NIT: <strong>${nit.trim()}</strong></span>`;
        }
    }, 300);
}
let _pqCustomerDebounceTimer = null;
function autoLookupPqCustomer(nit, knownCompanyName = '') {
    clearTimeout(_pqCustomerDebounceTimer);
    const targetEl = document.getElementById('pq-customer-name');
    if (!targetEl) return;

    if (!nit || nit.trim().length < 3) {
        targetEl.innerHTML = '<span style="color:var(--text-muted);">Ingrese NIT del cliente</span>';
        return;
    }

    _pqCustomerDebounceTimer = setTimeout(async () => {
        try {
            const res = await fetch(`${API_BASE}/customers/${encodeURIComponent(nit.trim())}`, { headers: getAuthHeaders() });
            if (res.ok) {
                const customer = await res.json();
                targetEl.innerHTML = `<span style="display:inline-flex; align-items:center; gap:4px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Empresa: <strong>${customer.name}</strong></span>`;
            } else {
                if (knownCompanyName) {
                    targetEl.innerHTML = `<span style="display:inline-flex; align-items:center; gap:4px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg> Empresa Solicitante Web: <strong>${knownCompanyName}</strong> (Prospecto)</span>`;
                } else {
                    targetEl.innerHTML = `<span style="display:inline-flex; align-items:center; gap:4px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg> Prospecto Nuevo NIT: <strong>${nit.trim()}</strong></span>`;
                }
            }
        } catch (e) {
            targetEl.innerHTML = knownCompanyName ? `<span style="display:inline-flex; align-items:center; gap:4px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg> Empresa: <strong>${knownCompanyName}</strong></span>` : `<span style="display:inline-flex; align-items:center; gap:4px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg> NIT: <strong>${nit.trim()}</strong></span>`;
        }
    }, 300);
}

function closePreQuoteModal() {
    const m = document.getElementById('pre-quote-generator-modal');
    if (m) m.remove();
}

function updatePqVisitPrice() {
    const select = document.getElementById('pq-zone-select');
    const priceInput = document.getElementById('pq-visit-price');
    if (!select || !priceInput) return;
    
    const selectedOpt = select.options[select.selectedIndex];
    const dataPrice = selectedOpt?.dataset?.price;
    const val = select.value;
    
    let priceVal = 0;
    if (dataPrice !== undefined && dataPrice !== '') {
        priceVal = parseFloat(dataPrice) || 0;
    } else {
        const zone = (_pqZonesCache || []).find(z => z.zone_name === val);
        if (zone) priceVal = zone.price || 0;
    }
    
    priceInput.value = priceVal ? '$ ' + parseCurrency(priceVal).toLocaleString('es-CO') : '$ 0';
    calcOfferAnnual();
}

async function validatePqCustomer() {
    const nit = document.getElementById('pq-customer-nit').value.trim();
    if (!nit) return showToast('Ingrese NIT primero.', 'error');
    try {
        const res = await fetch(`${API_BASE}/customers/${nit}`, { headers: getAuthHeaders() });
        if (!res.ok) throw new Error('Cliente no encontrado');
        const customer = await res.json();
        document.getElementById('pq-customer-name').innerText = customer.name;
        showToast('Cliente validado', 'success');
    } catch (e) {
        document.getElementById('pq-customer-name').innerHTML = '<span style="display:inline-flex; align-items:center; gap:4px; color:var(--danger);"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg> Cliente no existe en CRM</span>';
        showToast(e.message, 'error');
    }
}

async function generatePreQuote() {
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

    const isTechVisit = (_unifiedDocType === 'TECHNICAL_VISIT' || _unifiedDocType === 'VISITA_TECNICA');
    const incImpl = isTechVisit ? false : (document.getElementById('chk-item-impl')?.checked ?? true);
    const incMonthly = isTechVisit ? false : (document.getElementById('chk-item-monthly')?.checked ?? true);
    const incVisit = isTechVisit ? true : (document.getElementById('chk-item-visit')?.checked ?? false);

    if (!nit) return showToast('NIT del cliente requerido.', 'error');
    if (incVisit && !zoneName) return showToast('Debe seleccionar una zona de visita.', 'error');

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

    try {
        const res = await fetch(`${CMR_API}/pre-quotes`, {
            method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Error generando pre-oferta');
        showToast(data.message, 'success');
        closePreQuoteModal();
        loadPreQuotes();
        
        // Auto download
        downloadPreQuotePdf(data.pre_quote_id);
    } catch (e) {
        showToast(e.message, 'error');
    }
}

function downloadPreQuotePdf(id) {
    const url = `${CMR_API}/pre-quotes/${id}/pdf`;
    const token = localStorage.getItem('crm_token') || localStorage.getItem('token');
    
    fetch(url, { headers: { 'Authorization': `Bearer ${token}` } })
        .then(res => {
            if (!res.ok) throw new Error('PDF no disponible');
            return res.blob();
        })
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `Pre_Cotizacion_${id}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
        })
        .catch(e => showToast(e.message, 'error'));
}


function setPreQuotesPage(page) {
    if (!_preQuotesPagination) _preQuotesPagination = createPaginationState({ pageSize: 30 });
    _preQuotesPagination.currentPage = page;
    renderPreQuotesFromCache();
}
window.setPreQuotesPage = setPreQuotesPage;

function setPreQuotesPageSize(size) {
    if (!_preQuotesPagination) _preQuotesPagination = createPaginationState({ pageSize: 30 });
    _preQuotesPagination.pageSize = size;
    _preQuotesPagination.currentPage = 1;
    renderPreQuotesFromCache();
}
window.setPreQuotesPageSize = setPreQuotesPageSize;

function renderPreQuotesFromCache() {
    const tbody = document.getElementById('pre-quotes-tbody');
    if (!tbody) return;

    if (!_preQuotesPagination) {
        _preQuotesPagination = createPaginationState({ pageSize: 30 });
    }

    const filtered = _rawPreQuotesCache || [];
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;padding:40px;color:var(--text-muted);">No hay pre-ofertas emitidas aún.</td></tr>';
        renderPaginationBar('pre-quotes-pagination-bar', _preQuotesPagination, 'setPreQuotesPage', 'setPreQuotesPageSize');
        return;
    }

    const pagedItems = getPagedSlice(filtered, _preQuotesPagination);

    tbody.innerHTML = pagedItems.map(pq => {
        const impl = pq.estimated_implementation || 0;
        const monthly = pq.estimated_monthly || 0;
        const visit = pq.visit_price || 0;
        const totalAnual = (monthly * 12) + impl + visit;
        const fecha = pq.created_at ? pq.created_at.split('T')[0] : '—';
        const docLabel = pq.doc_type === 'VISITA_TECNICA' || pq.doc_type === 'TECHNICAL_VISIT' ? 'Visita Técnica' : 'Pre-Oferta';
        return `<tr>
            <td style="padding:10px 14px;font-weight:600;color:var(--accent-primary);">${pq.pre_quote_number || '—'}</td>
            <td style="padding:10px 14px;">${pq.customer_nit || '—'}</td>
            <td style="padding:10px 14px;"><span style="font-weight:500;">${docLabel}</span></td>
            <td style="padding:10px 14px;">${pq.zone_name || '—'}</td>
            <td style="padding:10px 14px;">${impl > 0 ? '$' + parseInt(impl).toLocaleString('es-CO') : '—'}</td>
            <td style="padding:10px 14px;">${monthly > 0 ? '$' + parseInt(monthly).toLocaleString('es-CO') : '—'}</td>
            <td style="padding:10px 14px;font-weight:600;">${totalAnual > 0 ? '$' + parseInt(totalAnual).toLocaleString('es-CO') : '—'}</td>
            <td style="padding:10px 14px;">${cmrBadge(pq.status || 'EMITIDA')}</td>
            <td style="padding:10px 14px;">${fecha}</td>
            <td style="padding:10px 14px;">${pq.salesperson || '—'}</td>
            <td style="padding:10px 14px;text-align:center;">
                <button class="action-icon-btn" onclick="downloadPreQuotePdf(${pq.id})" title="Descargar PDF" aria-label="Descargar PDF">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                </button>
            </td>
        </tr>`;
    }).join('');

    renderPaginationBar('pre-quotes-pagination-bar', _preQuotesPagination, 'setPreQuotesPage', 'setPreQuotesPageSize');
}

async function loadPreQuotes(filter) {
    const tbody = document.getElementById('pre-quotes-tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;padding:30px;color:var(--text-muted);"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin" style="vertical-align:text-bottom; margin-right:6px;"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>Cargando pre-ofertas...</td></tr>';
    try {
        const token = localStorage.getItem('crm_token') || localStorage.getItem('token');
        if (!res.ok) {
            if (res.status === 404) {
                tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;padding:30px;color:var(--text-muted);">Sin pre-ofertas registradas en este módulo.</td></tr>';
                return;
            }
            throw new Error(`Error HTTP ${res.status}`);
        }
        const list = await res.json();
        _rawPreQuotesCache = list || [];
        if (_preQuotesPagination) _preQuotesPagination.currentPage = 1;
        renderPreQuotesFromCache();
    } catch(e) {
        tbody.innerHTML = `<tr><td colspan="11" style="text-align:center;padding:30px;color:var(--text-muted);">Sin pre-ofertas disponibles (${e.message}).</td></tr>`;
    }
}



