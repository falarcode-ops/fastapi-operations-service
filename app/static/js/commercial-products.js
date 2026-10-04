// ─── COMMERCIAL PRODUCTS & ALEGRA QUOTATION MODULE (v12.4.0) ──────────────────
// Dedicated quotation builder for Product Portfolio, Dotación, and COREPRICE items.
// Step-by-Step Gradual Wizard Architecture for Clean & Frictionless UX.

let _cpSearchTimer = null;
let _currentProductQuoteStep = 1;

/**
 * Opens the dedicated Product Quotation Modal with Gradual Stepper UX.
 * @param {Object} req - The quote_requests object or null.
 */
async function openProductQuoteModal(req = null) {
    if (typeof req === 'number' || typeof req === 'string') {
        req = (typeof getRequestById === 'function' ? getRequestById(req) : null) || req;
    }
    _currentProductQuoteReq = req;
    _currentProductQuoteItems = [];
    _currentProductQuoteStep = 1;

    const nitVal = req ? (req.customer_nit || '') : '';
    const companyVal = req ? (req.company_name || '') : '';
    const contactVal = req ? (req.details?.contact_name || req.contact_name || '') : '';
    const emailVal = req ? (req.contact_email || req.details?.contact_email || req.details?.email || '') : '';
    const phoneVal = req ? (req.contact_phone || req.details?.contact_phone || req.details?.phone || '') : '';
    const cityVal = req ? (req.details?.city || '') : '';
    const addressVal = req ? (req.details?.delivery_address || req.details?.address || '') : '';
    const reqNum = req ? (req.request_number || '') : '';

    // Extract initial items from request details if available (prioritizing draft_items)
    let initialItems = [];
    let reqDetails = req ? (req.details || req.details_json || {}) : {};
    if (typeof reqDetails === 'string') {
        try { reqDetails = JSON.parse(reqDetails); } catch(e) { reqDetails = {}; }
    }

    if (reqDetails) {
        if (Array.isArray(reqDetails.draft_items) && reqDetails.draft_items.length > 0) {
            initialItems = reqDetails.draft_items;
        } else if (Array.isArray(reqDetails.items) && reqDetails.items.length > 0) {
            initialItems = reqDetails.items;
        } else if (Array.isArray(reqDetails.cart_items) && reqDetails.cart_items.length > 0) {
            initialItems = reqDetails.cart_items;
        } else if (Array.isArray(reqDetails.products) && reqDetails.products.length > 0) {
            initialItems = reqDetails.products;
        }
    }

    // Convert to internal structured items
    if (initialItems.length > 0) {
        _currentProductQuoteItems = initialItems.map(it => ({
            sku: it.sku || it.reference || it.code || '',
            name: it.name || it.title || it.product_name || 'Producto sin nombre',
            brand: it.brand || '',
            price: Number(it.unit_price || it.price || 0),
            quantity: Number(it.quantity || it.qty || 1),
            discount: Number(it.discount || 0),
            description: it.description || (it.brand ? `Marca: ${it.brand}` : '')
        }));
    } else {
        _currentProductQuoteItems = [{
            sku: '',
            name: '',
            brand: '',
            price: 0,
            quantity: 1,
            discount: 0,
            description: ''
        }];
    }

    const draftConds = (reqDetails && reqDetails.draft_conditions) ? reqDetails.draft_conditions : {};
    const validityVal = draftConds.validity_days || 15;
    const paymentModeVal = draftConds.payment_mode || 'Contado (Consignación nacional / Transferencia electrónica)';
    const shippingTermsVal = draftConds.shipping_terms || "Instalaciones del cliente en pedidos > $1'000.000 COP (ciudades principales); pedidos menores asumen flete.";
    const specialNotesVal = draftConds.special_notes || (reqNum ? `Cotización formal generada a partir de la Solicitud Web ${reqNum}.` : '');

    // Close any previous modal
    closeProductQuoteModal();


    const html = `
    <div class="modal-overlay active" id="product-quote-modal" onclick="if(event.target===this)closeProductQuoteModal()" style="z-index: 9990;">

        <div class="modal-card" style="max-width: min(920px, 95vw); width: 100%; max-height: 90vh; display: flex; flex-direction: column; padding: 0; overflow: hidden; border-radius: 14px; box-shadow: 0 20px 40px rgba(0,0,0,0.4);" onclick="event.stopPropagation()">
            
            <!-- Modal Header -->
            <div class="modal-header" style="padding: 14px 22px; background: var(--bg-table-header); border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="display: flex; align-items: center; color: var(--accent-primary);">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
                    </span>
                    <div>
                        <h3 style="margin: 0; font-size: 1.05rem; color: var(--text-primary); font-weight: 700;">Cotizador de Productos & Estimación Alegra</h3>
                        <p style="margin: 2px 0 0 0; font-size: 0.76rem; color: var(--text-secondary);">
                            ${reqNum ? `Solicitud <strong style="color:var(--accent-primary);">${reqNum}</strong> · ${escapeHtml(companyVal)}` : 'Generador comercial oficial de productos del portafolio.'}
                        </p>
                    </div>
                </div>
                <button class="modal-close" onclick="closeProductQuoteModal()" aria-label="Cerrar" title="Cerrar">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18"></line></svg>
                </button>
            </div>

            <!-- Wizard Stepper Navigation Bar -->
            <div style="display: flex; background: var(--bg-card); border-bottom: 1px solid var(--border-color); padding: 8px 18px; gap: 8px; align-items: center;">
                
                <button type="button" class="pq-step-btn" id="pq-step-btn-1" onclick="switchProductQuoteStep(1)" style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 8px 12px; border-radius: 8px; border: 1px solid var(--accent-primary); background: rgba(0, 242, 254, 0.1); color: var(--text-primary); cursor: pointer; font-size: 0.82rem; font-weight: 600; transition: all 0.2s;">
                    <span id="pq-step-badge-1" style="width: 22px; height: 22px; border-radius: 50%; background: var(--accent-primary); color: white; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700;">1</span>
                    <span>1. Cliente & Facturación</span>
                </button>

                <div style="width: 24px; height: 2px; background: var(--border-color);"></div>

                <button type="button" class="pq-step-btn" id="pq-step-btn-2" onclick="switchProductQuoteStep(2)" style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 8px 12px; border-radius: 8px; border: 1px solid transparent; background: transparent; color: var(--text-secondary); cursor: pointer; font-size: 0.82rem; font-weight: 600; transition: all 0.2s;">
                    <span id="pq-step-badge-2" style="width: 22px; height: 22px; border-radius: 50%; background: var(--border-color); color: var(--text-secondary); display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700;">2</span>
                    <span>2. Productos & Precios</span>
                </button>

                <div style="width: 24px; height: 2px; background: var(--border-color);"></div>

                <button type="button" class="pq-step-btn" id="pq-step-btn-3" onclick="switchProductQuoteStep(3)" style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 8px 12px; border-radius: 8px; border: 1px solid transparent; background: transparent; color: var(--text-secondary); cursor: pointer; font-size: 0.82rem; font-weight: 600; transition: all 0.2s;">
                    <span id="pq-step-badge-3" style="width: 22px; height: 22px; border-radius: 50%; background: var(--border-color); color: var(--text-secondary); display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700;">3</span>
                    <span>3. Condiciones & Totales</span>
                </button>

            </div>

            <!-- Modal Content Body -->
            <div style="padding: 20px 24px; overflow-y: auto; flex: 1;">
                
                <!-- ════════════ STEP 1: CLIENT DATA ════════════ -->
                <div id="pq-step-pane-1" style="display: flex; flex-direction: column; gap: 16px;">
                    <div style="background: rgba(0, 242, 254, 0.04); border-left: 4px solid var(--accent-cyan); padding: 10px 14px; border-radius: 6px; font-size: 0.82rem; color: var(--text-secondary); display: flex; align-items: center; gap: 8px;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink: 0;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                        <span>Verifique los datos fiscales y de contacto del cliente antes de cotizar. Se sincronizarán automáticamente con <strong>Alegra</strong>.</span>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; font-size: 0.85rem;">
                        <div class="form-group">
                            <label style="font-size: 0.78rem; font-weight: 600; color: var(--text-primary);">NIT / Identificación Fiscal *</label>
                            <input type="text" id="pq-cust-nit" value="${escapeHtml(nitVal)}" placeholder="Ej: 900123456-1" required style="padding: 8px 12px; font-size: 0.85rem; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-primary);">
                        </div>
                        <div class="form-group">
                            <label style="font-size: 0.78rem; font-weight: 600; color: var(--text-primary);">Razón Social / Nombre de la Empresa *</label>
                            <input type="text" id="pq-cust-name" value="${escapeHtml(companyVal)}" placeholder="Nombre de la empresa" required style="padding: 8px 12px; font-size: 0.85rem; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-primary);">
                        </div>
                        <div class="form-group">
                            <label style="font-size: 0.78rem; font-weight: 600; color: var(--text-primary);">Persona de Contacto / Solicitante</label>
                            <input type="text" id="pq-cust-contact" value="${escapeHtml(contactVal)}" placeholder="Nombre del solicitante" style="padding: 8px 12px; font-size: 0.85rem; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-primary);">
                        </div>
                        <div class="form-group">
                            <label style="font-size: 0.78rem; font-weight: 600; color: var(--text-primary);">Correo Electrónico de Facturación</label>
                            <input type="email" id="pq-cust-email" value="${escapeHtml(emailVal)}" placeholder="correo@empresa.com" style="padding: 8px 12px; font-size: 0.85rem; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-primary);">
                        </div>
                        <div class="form-group">
                            <label style="font-size: 0.78rem; font-weight: 600; color: var(--text-primary);">Teléfono Móvil / WhatsApp</label>
                            <input type="text" id="pq-cust-phone" value="${escapeHtml(phoneVal)}" placeholder="Ej: 3201234567" style="padding: 8px 12px; font-size: 0.85rem; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-primary);">
                        </div>
                        <div class="form-group">
                            <label style="font-size: 0.78rem; font-weight: 600; color: var(--text-primary);">Ciudad</label>
                            <input type="text" id="pq-cust-city" value="${escapeHtml(cityVal)}" placeholder="Ej: Bogotá D.C." style="padding: 8px 12px; font-size: 0.85rem; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-primary);">
                        </div>
                        <div class="form-group" style="grid-column: 1 / -1;">
                            <label style="font-size: 0.78rem; font-weight: 600; color: var(--text-primary);">Dirección de Entrega / Envío</label>
                            <input type="text" id="pq-cust-address" value="${escapeHtml(addressVal)}" placeholder="Dirección de bodega o despacho" style="padding: 8px 12px; font-size: 0.85rem; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-primary);">
                        </div>
                    </div>
                </div>

                <!-- ════════════ STEP 2: PRODUCTS & PRICING ════════════ -->
                <div id="pq-step-pane-2" style="display: none; flex-direction: column; gap: 14px;">
                    
                    <!-- Search Bar in COREPRICE -->
                    <div style="background: rgba(0, 242, 254, 0.04); border: 1px dashed rgba(0, 242, 254, 0.3); border-radius: 8px; padding: 10px 14px; position: relative;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                            <span style="font-size: 0.8rem; font-weight: 700; color: var(--accent-cyan); display: flex; align-items: center; gap: 6px;">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                                <span>Buscar Producto en Catálogo COREPRICE:</span>
                            </span>
                            <button type="button" class="btn-secondary" onclick="addProductQuoteBlankRow()" style="font-size: 0.72rem; padding: 3px 8px; display: inline-flex; align-items: center; gap: 4px;">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                <span>Fila Manual</span>
                            </button>
                        </div>
                        <div style="position: relative;">
                            <input type="text" id="pq-cp-search-input" oninput="handleCorepriceQuoteSearch(this.value)" placeholder="Escriba SKU, referencia o nombre (ej: Bota, Casco, Línea de vida, AC1225W...)" style="width: 100%; padding: 8px 12px; font-size: 0.83rem; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-primary);">
                            <div id="pq-cp-search-results" style="display: none; position: absolute; top: 105%; left: 0; right: 0; background: var(--bg-modal); border: 1px solid var(--border-color); border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); max-height: 220px; overflow-y: auto; z-index: 100;"></div>
                        </div>
                    </div>

                    <!-- Products Table Container -->
                    <div style="border: 1px solid var(--border-color); border-radius: 8px; overflow: hidden; background: var(--card-bg);">
                        <div style="max-height: 280px; overflow-y: auto;">
                            <table style="width: 100%; border-collapse: collapse; font-size: 0.82rem; text-align: left;">
                                <thead style="position: sticky; top: 0; background: var(--bg-table-header); z-index: 10;">
                                    <tr style="border-bottom: 2px solid var(--border-color); color: var(--text-secondary);">
                                        <th style="padding: 8px 12px; width: 18%;">SKU / Ref</th>
                                        <th style="padding: 8px 12px; width: 34%;">Producto</th>
                                        <th style="padding: 8px 12px; width: 10%; text-align: center;">Cant.</th>
                                        <th style="padding: 8px 12px; width: 16%; text-align: right;">Precio Unit. (COP)</th>
                                        <th style="padding: 8px 12px; width: 8%; text-align: center;">Desc%</th>
                                        <th style="padding: 8px 12px; width: 14%; text-align: right;">Subtotal</th>
                                        <th style="padding: 8px 6px; width: 4%; text-align: center;"></th>
                                    </tr>
                                </thead>
                                <tbody id="pq-items-tbody">
                                    <!-- Dynamic rows -->
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- Step 2 Mini Footer Summary -->
                    <div style="display: flex; justify-content: space-between; align-items: center; background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 8px; padding: 10px 16px;">
                        <span style="font-size: 0.8rem; color: var(--text-secondary);" id="pq-items-count-badge">0 productos listados</span>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span style="font-size: 0.85rem; color: var(--text-secondary);">Subtotal:</span>
                            <strong style="font-size: 1rem; color: var(--accent-primary);" id="pq-step2-subtotal">$0 COP</strong>
                        </div>
                    </div>

                </div>

                <!-- ════════════ STEP 3: CONDITIONS & TOTALS ════════════ -->
                <div id="pq-step-pane-3" style="display: none; flex-direction: column; gap: 16px;">
                    <div style="display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 16px; align-items: start;">
                        
                        <!-- Commercial Conditions -->
                        <div style="background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 10px; padding: 14px 18px; display: flex; flex-direction: column; gap: 10px;">
                            <div style="font-size: 0.83rem; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 6px;">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>
                                <span>Condiciones Comerciales:</span>
                            </div>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                                <div class="form-group">
                                    <label style="font-size: 0.74rem; font-weight: 600;">Validez (Días)</label>
                                    <input type="number" id="pq-validity-days" value="${validityVal}" min="1" max="90" style="padding: 6px 10px; font-size: 0.82rem; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-primary);">
                                </div>
                                <div class="form-group">
                                    <label style="font-size: 0.74rem; font-weight: 600;">Forma de Pago</label>
                                    <select id="pq-payment-mode" style="padding: 6px 10px; font-size: 0.82rem; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-primary);">
                                        <option value="Contado (Consignación nacional y/o transferencia electrónica)" ${paymentModeVal.includes('Consignación') || paymentModeVal.includes('Contado') ? 'selected' : ''}>Contado (Consignación / Transferencia Bancaria)</option>
                                        <option value="Contado 100% anticipado" ${paymentModeVal === 'Contado 100% anticipado' ? 'selected' : ''}>Contado 100% anticipado</option>
                                        <option value="Contado (50% anticipo - 50% contra entrega)" ${paymentModeVal.includes('50%') ? 'selected' : ''}>Contado (50% anticipo - 50% contra entrega)</option>
                                        <option value="Crédito 30 días" ${paymentModeVal.includes('30') ? 'selected' : ''}>Crédito 30 días</option>
                                        <option value="Crédito 60 días" ${paymentModeVal.includes('60') ? 'selected' : ''}>Crédito 60 días</option>
                                        <option value="Contra entrega" ${paymentModeVal === 'Contra entrega' ? 'selected' : ''}>Contra entrega</option>
                                    </select>
                                </div>
                            </div>
                            <div class="form-group">
                                <label style="font-size: 0.74rem; font-weight: 600;">Condiciones de Entrega y Flete</label>
                                <input type="text" id="pq-shipping-terms" value="${escapeHtml(shippingTermsVal)}" style="padding: 6px 10px; font-size: 0.82rem; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-primary);">
                            </div>
                            <div class="form-group">
                                <label style="font-size: 0.74rem; font-weight: 600;">Notas Especiales / Observaciones</label>
                                <textarea id="pq-special-notes" rows="2" placeholder="Observaciones adicionales para el cliente..." style="padding: 6px 10px; font-size: 0.82rem; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-primary); resize: vertical;">${escapeHtml(specialNotesVal)}</textarea>
                            </div>
                        </div>


                        <!-- Financial Summary Card -->
                        <div style="background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 10px; padding: 18px 20px; display: flex; flex-direction: column; gap: 12px;">
                            <div style="font-size: 0.85rem; font-weight: 700; color: var(--text-primary); border-bottom: 1px solid var(--border-color); padding-bottom: 8px; display: flex; align-items: center; gap: 6px;">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                                <span>Resumen Financiero Oficial:</span>
                            </div>
                            
                            <div style="display: flex; justify-content: space-between; font-size: 0.83rem; color: var(--text-secondary);">
                                <span>Cliente:</span>
                                <strong style="color: var(--text-primary);" id="pq-sum-client-label">${escapeHtml(companyVal || nitVal || '—')}</strong>
                            </div>

                            <div style="display: flex; justify-content: space-between; font-size: 0.83rem; color: var(--text-secondary);">
                                <span>Subtotal Bruto:</span>
                                <strong id="pq-sum-gross" style="color: var(--text-primary);">$0 COP</strong>
                            </div>

                            <div style="display: flex; justify-content: space-between; font-size: 0.83rem; color: var(--text-secondary);">
                                <span>Descuentos Aplicados:</span>
                                <strong id="pq-sum-discount" style="color: #ef4444;">-$0 COP</strong>
                            </div>

                            <div style="display: flex; justify-content: space-between; font-size: 0.83rem; color: var(--text-secondary);">
                                <span>Subtotal Gravable:</span>
                                <strong id="pq-sum-subtotal" style="color: var(--text-primary);">$0 COP</strong>
                            </div>

                            <div style="display: flex; justify-content: space-between; font-size: 0.83rem; color: var(--accent-cyan);">
                                <span>IVA (19%):</span>
                                <strong id="pq-sum-tax" style="color: var(--accent-cyan);">+$0 COP</strong>
                            </div>

                            <div style="display: flex; justify-content: space-between; font-size: 1.15rem; font-weight: 800; border-top: 1px solid var(--border-color); padding-top: 12px; margin-top: 4px; color: var(--green-status);">
                                <span>Total General (con IVA):</span>
                                <span id="pq-sum-net">$0 COP</span>
                            </div>


                            <div style="background: rgba(16, 185, 129, 0.08); border-radius: 6px; padding: 8px 12px; font-size: 0.74rem; color: var(--text-secondary); text-align: center; border: 1px solid rgba(16, 185, 129, 0.2); display: flex; align-items: center; justify-content: center; gap: 5px;">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
                                <span>Se sincronizará en tiempo real como Estimación Oficial en <strong>Alegra</strong>.</span>
                            </div>
                        </div>

                    </div>
                </div>

            </div>

            <!-- Modal Navigation Footer -->
            <div class="modal-footer" style="padding: 12px 24px; background: var(--bg-table-header); border-top: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
                
                <div style="display: flex; gap: 8px; align-items: center;">
                    <button type="button" class="btn-secondary btn-compact" id="pq-btn-prev" onclick="handleProductQuotePrev()" style="display: none; align-items: center; gap: 5px;" title="Volver al paso anterior">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                        <span>Volver</span>
                    </button>
                    <button type="button" class="btn-secondary btn-compact" id="pq-btn-cancel" onclick="closeProductQuoteModal()" style="display: inline-flex; align-items: center; gap: 5px;" title="Cerrar modal de cotización">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18"></line></svg>
                        <span>Cancelar</span>
                    </button>
                    <button type="button" class="btn-secondary btn-compact" id="pq-btn-save-draft" onclick="saveProductQuoteDraft()" style="border-color: rgba(0, 242, 254, 0.4); color: var(--accent-cyan); display: inline-flex; align-items: center; gap: 5px;" title="Guarda los productos y condiciones editadas en Coralis sin enviar a Alegra todavía">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                        <span>Borrador</span>
                    </button>
                </div>

                <div>
                    <button type="button" class="btn-primary btn-compact" id="pq-btn-next" onclick="handleProductQuoteNext()" style="display: inline-flex; align-items: center; gap: 5px;" title="Continuar al selector de productos">
                        <span>Siguiente</span>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                    </button>
                    <button type="button" class="btn-primary btn-compact" id="btn-submit-product-quote" onclick="submitProductQuoteToAlegra()" style="display: none; background: linear-gradient(135deg, #10b981, #0ea5e9); align-items: center; gap: 5px;" title="Generar estimación oficial sincronizada en Alegra">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                        <span>Emitir en Alegra</span>
                    </button>
                </div>

            </div>


        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', html);
    renderProductQuoteItemsTable();
    autoFetchCorepricePricesForQuote();
}

/**
 * Switches the active step in the wizard
 */
function switchProductQuoteStep(step) {
    _currentProductQuoteStep = step;

    const pane1 = document.getElementById('pq-step-pane-1');
    const pane2 = document.getElementById('pq-step-pane-2');
    const pane3 = document.getElementById('pq-step-pane-3');

    const btn1 = document.getElementById('pq-step-btn-1');
    const btn2 = document.getElementById('pq-step-btn-2');
    const btn3 = document.getElementById('pq-step-btn-3');

    const badge1 = document.getElementById('pq-step-badge-1');
    const badge2 = document.getElementById('pq-step-badge-2');
    const badge3 = document.getElementById('pq-step-badge-3');

    const btnPrev = document.getElementById('pq-btn-prev');
    const btnCancel = document.getElementById('pq-btn-cancel');
    const btnNext = document.getElementById('pq-btn-next');
    const btnSubmit = document.getElementById('btn-submit-product-quote');

    // Panes visibility
    if (pane1) pane1.style.display = (step === 1 ? 'flex' : 'none');
    if (pane2) pane2.style.display = (step === 2 ? 'flex' : 'none');
    if (pane3) pane3.style.display = (step === 3 ? 'flex' : 'none');

    // Reset Stepper Button styles
    [
        { btn: btn1, badge: badge1, s: 1 },
        { btn: btn2, badge: badge2, s: 2 },
        { btn: btn3, badge: badge3, s: 3 }
    ].forEach(item => {
        if (item.btn && item.badge) {
            if (item.s === step) {
                item.btn.style.border = '1px solid var(--accent-primary)';
                item.btn.style.background = 'rgba(0, 242, 254, 0.1)';
                item.btn.style.color = 'var(--text-primary)';
                item.badge.style.background = 'var(--accent-primary)';
                item.badge.style.color = 'white';
            } else if (item.s < step) {
                item.btn.style.border = '1px solid var(--border-color)';
                item.btn.style.background = 'transparent';
                item.btn.style.color = 'var(--green-status)';
                item.badge.style.background = 'var(--green-status)';
                item.badge.style.color = 'white';
                item.badge.innerHTML = '✓';
            } else {
                item.btn.style.border = '1px solid transparent';
                item.btn.style.background = 'transparent';
                item.btn.style.color = 'var(--text-secondary)';
                item.badge.style.background = 'var(--border-color)';
                item.badge.style.color = 'var(--text-secondary)';
                item.badge.innerHTML = String(item.s);
            }
        }
    });

    // Update Client label in Step 3 summary
    const custNameInput = document.getElementById('pq-cust-name');
    const custNitInput = document.getElementById('pq-cust-nit');
    const clientLabel = document.getElementById('pq-sum-client-label');
    if (clientLabel && custNameInput) {
        clientLabel.innerText = `${custNameInput.value || 'Cliente'} (${custNitInput?.value || ''})`;
    }

    // Navigation buttons state
    if (step === 1) {
        if (btnPrev) btnPrev.style.display = 'none';
        if (btnCancel) btnCancel.style.display = 'inline-block';
        if (btnNext) {
            btnNext.style.display = 'inline-block';
            btnNext.innerText = 'Continuar a Productos ➔';
        }
        if (btnSubmit) btnSubmit.style.display = 'none';
    } else if (step === 2) {
        if (btnPrev) btnPrev.style.display = 'inline-block';
        if (btnCancel) btnCancel.style.display = 'none';
        if (btnNext) {
            btnNext.style.display = 'inline-block';
            btnNext.innerText = 'Continuar a Condiciones & Totales ➔';
        }
        if (btnSubmit) btnSubmit.style.display = 'none';
    } else if (step === 3) {
        if (btnPrev) btnPrev.style.display = 'inline-block';
        if (btnCancel) btnCancel.style.display = 'none';
        if (btnNext) btnNext.style.display = 'none';
        if (btnSubmit) btnSubmit.style.display = 'inline-block';
    }

    calcProductQuoteTotals();
}

/**
 * Next step handler with validation
 */
function handleProductQuoteNext() {
    if (_currentProductQuoteStep === 1) {
        const nit = (document.getElementById('pq-cust-nit')?.value || '').trim();
        const name = (document.getElementById('pq-cust-name')?.value || '').trim();
        if (!nit) return showToast('El NIT o Identificación es obligatorio.', 'error');
        if (!name) return showToast('La Razón Social o Nombre es obligatorio.', 'error');
        switchProductQuoteStep(2);
    } else if (_currentProductQuoteStep === 2) {
        if (_currentProductQuoteItems.length === 0) {
            return showToast('Debe incluir al menos un producto en la cotización.', 'error');
        }
        for (let it of _currentProductQuoteItems) {
            if (!it.name) return showToast('Todos los productos deben tener un nombre.', 'error');
            if (!it.price || it.price <= 0) return showToast(`El producto "${it.name}" debe tener un precio unitario mayor a $0.`, 'error');
        }
        switchProductQuoteStep(3);
    }
}

/**
 * Previous step handler
 */
function handleProductQuotePrev() {
    if (_currentProductQuoteStep > 1) {
        switchProductQuoteStep(_currentProductQuoteStep - 1);
    }
}

/**
 * Closes the Product Quotation Modal
 */
function closeProductQuoteModal() {
    const m = document.getElementById('product-quote-modal');
    if (m) {
        if (typeof m.remove === 'function') m.remove();
        else if (m.parentNode) m.parentNode.removeChild(m);
    }
}

/**
 * Renders the table of quote items
 */
function renderProductQuoteItemsTable() {
    const tbody = document.getElementById('pq-items-tbody');
    if (!tbody) return;

    if (_currentProductQuoteItems.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 25px; color: var(--text-muted);">No hay productos en la lista. Busque arriba o agregue una fila.</td></tr>`;
        calcProductQuoteTotals();
        return;
    }

    tbody.innerHTML = _currentProductQuoteItems.map((it, idx) => {
        const lineSub = (Number(it.price) || 0) * (Number(it.quantity) || 1);
        const discAmt = lineSub * ((Number(it.discount) || 0) / 100);
        const lineTotal = lineSub - discAmt;

        // Extraer o estructurar resumen de variantes
        let talla = it.talla || it.size || '';
        let color = it.color || '';
        const nameStr = it.name || '';
        
        if (!talla) {
            const mTalla = nameStr.match(/(?:[-\s/](?:talla[:\s]*|t[:\s]*)?|\btalla[:\s]+)(\b(?:[2-5][0-9]|XXS|XS|S|M|L|XL|XXL|XXXL)\b)$/i);
            if (mTalla) talla = mTalla[1].toUpperCase();
        }
        if (!color) {
            const mCol = nameStr.match(/[-\s/]\s*(NEGRO|BLANCO|AZUL NAVY|AZUL OSCURO|AZUL|ROJO|AMARILLO|VERDE|CAFE|GRIS|NARANJA|BEIGE)\b/i);
            if (mCol) color = mCol[1].toUpperCase();
        }

        const varBadges = [];
        if (talla) varBadges.push(`<span style="background: rgba(0, 242, 254, 0.12); color: var(--accent-cyan); padding: 1px 6px; border-radius: 4px; font-size: 0.72rem; font-weight: 600; display: inline-flex; align-items: center; gap: 3px;"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>Talla: ${escapeHtml(talla)}</span>`);
        if (color) varBadges.push(`<span style="background: rgba(245, 158, 11, 0.12); color: #f59e0b; padding: 1px 6px; border-radius: 4px; font-size: 0.72rem; font-weight: 600; display: inline-flex; align-items: center; gap: 3px;"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="3"></circle></svg>Color: ${escapeHtml(color)}</span>`);
        if (it.brand) varBadges.push(`<span style="background: rgba(148, 163, 184, 0.12); color: var(--text-secondary); padding: 1px 6px; border-radius: 4px; font-size: 0.72rem; display: inline-flex; align-items: center; gap: 3px;"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><line x1="9" y1="22" x2="9" y2="2"></line><line x1="15" y1="22" x2="15" y2="2"></line></svg>${escapeHtml(it.brand)}</span>`);

        return `
        <tr style="border-bottom: 1px solid var(--border-color);">
            <td style="padding: 6px 10px;">
                <input type="text" value="${escapeHtml(it.sku || '')}" placeholder="SKU / Ref" onchange="updateProductQuoteItemField(${idx}, 'sku', this.value)" style="width: 100%; padding: 5px 8px; font-size: 0.78rem; border-radius: 4px; border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-primary); font-family: monospace;">
            </td>
            <td style="padding: 6px 10px;">
                <input type="text" value="${escapeHtml(it.name || '')}" placeholder="Nombre del producto" onchange="updateProductQuoteItemField(${idx}, 'name', this.value)" style="width: 100%; padding: 5px 8px; font-size: 0.8rem; border-radius: 4px; border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-primary); font-weight: 500;">
                <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-top: 3px;">
                    ${varBadges.join('')}
                </div>
            </td>
            <td style="padding: 6px 8px; text-align: center;">
                <input type="number" min="1" value="${it.quantity || 1}" onchange="updateProductQuoteItemField(${idx}, 'quantity', this.value)" style="width: 50px; text-align: center; padding: 4px; font-size: 0.8rem; border-radius: 4px; border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-primary);">
            </td>
            <td style="padding: 6px 10px; text-align: right;">
                <input type="number" min="0" step="100" value="${it.price || 0}" onchange="updateProductQuoteItemField(${idx}, 'price', this.value)" style="width: 105px; text-align: right; padding: 4px 6px; font-size: 0.8rem; border-radius: 4px; border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-primary);">
            </td>
            <td style="padding: 6px 6px; text-align: center;">
                <input type="number" min="0" max="100" value="${it.discount || 0}" onchange="updateProductQuoteItemField(${idx}, 'discount', this.value)" style="width: 44px; text-align: center; padding: 4px; font-size: 0.8rem; border-radius: 4px; border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-primary);">
            </td>
            <td style="padding: 6px 10px; text-align: right; font-weight: 600; color: var(--text-primary);">
                ${formatCurrency(lineTotal)}
            </td>
            <td style="padding: 6px 6px; text-align: center;">
                <button type="button" onclick="removeProductQuoteItem(${idx})" class="action-icon-btn" style="color: #ef4444;" title="Eliminar ítem" aria-label="Eliminar ítem">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
            </td>
        </tr>
        `;
    }).join('');


    calcProductQuoteTotals();
}

/**
 * Updates a single item field and recalculates totals
 */
function updateProductQuoteItemField(idx, field, val) {
    if (!_currentProductQuoteItems[idx]) return;
    if (field === 'price' || field === 'quantity' || field === 'discount') {
        _currentProductQuoteItems[idx][field] = Number(val) || 0;
    } else {
        _currentProductQuoteItems[idx][field] = val;
    }
    renderProductQuoteItemsTable();
}

/**
 * Adds a blank row to the quote
 */
function addProductQuoteBlankRow() {
    _currentProductQuoteItems.push({
        sku: '',
        name: '',
        brand: '',
        price: 0,
        quantity: 1,
        discount: 0,
        description: ''
    });
    renderProductQuoteItemsTable();
}

/**
 * Removes an item row
 */
function removeProductQuoteItem(idx) {
    _currentProductQuoteItems.splice(idx, 1);
    renderProductQuoteItemsTable();
}

/**
 * Calculates and updates the summary totals in real-time
 */
function calcProductQuoteTotals() {
    let gross = 0;
    let discount = 0;
    let subtotal = 0;
    let tax = 0;

    _currentProductQuoteItems.forEach(it => {
        const p = Number(it.price) || 0;
        const q = Number(it.quantity) || 1;
        const d = Number(it.discount) || 0;
        const taxRate = (it.tax_rate !== undefined && it.tax_rate !== null) ? Number(it.tax_rate) : 19;
        
        const lineGross = p * q;
        const lineDisc = lineGross * (d / 100);
        const lineSubtotal = lineGross - lineDisc;
        const lineTax = lineSubtotal * (taxRate / 100);

        gross += lineGross;
        discount += lineDisc;
        subtotal += lineSubtotal;
        tax += lineTax;
    });

    const net = subtotal + tax;

    const elGross = document.getElementById('pq-sum-gross');
    const elDisc = document.getElementById('pq-sum-discount');
    const elSubtotal = document.getElementById('pq-sum-subtotal');
    const elTax = document.getElementById('pq-sum-tax');
    const elNet = document.getElementById('pq-sum-net');
    const elStep2Sub = document.getElementById('pq-step2-subtotal');
    const elCountBadge = document.getElementById('pq-items-count-badge');

    if (elGross) elGross.innerText = `${formatCurrency(gross)} COP`;
    if (elDisc) elDisc.innerText = `-${formatCurrency(discount)} COP`;
    if (elSubtotal) elSubtotal.innerText = `${formatCurrency(subtotal)} COP`;
    if (elTax) elTax.innerText = `+${formatCurrency(tax)} COP`;
    if (elNet) elNet.innerText = `${formatCurrency(net)} COP`;
    if (elStep2Sub) elStep2Sub.innerText = `${formatCurrency(net)} COP`;
    if (elCountBadge) elCountBadge.innerText = `${_currentProductQuoteItems.length} producto${_currentProductQuoteItems.length === 1 ? '' : 's'} listado${_currentProductQuoteItems.length === 1 ? '' : 's'}`;
}


/**
 * Debounced search for products in COREPRICE catalog
 */
function handleCorepriceQuoteSearch(query) {
    clearTimeout(_cpSearchTimer);
    const resultsContainer = document.getElementById('pq-cp-search-results');
    if (!resultsContainer) return;

    const q = (query || '').trim();
    if (q.length < 2) {
        resultsContainer.style.display = 'none';
        resultsContainer.innerHTML = '';
        return;
    }

    _cpSearchTimer = setTimeout(async () => {
        resultsContainer.style.display = 'block';
        resultsContainer.innerHTML = '<div style="padding: 10px; color: var(--text-muted); font-size: 0.8rem; text-align: center; display: flex; align-items: center; justify-content: center; gap: 6px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg><span>Buscando en COREPRICE...</span></div>';

        try {
            const token = localStorage.getItem('crm_token') || localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/v1/integrations/coreprice/products?search=${encodeURIComponent(q)}&limit=10`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            const products = data.data || (Array.isArray(data) ? data : []);

            if (products.length === 0) {
                resultsContainer.innerHTML = '<div style="padding: 10px; color: var(--text-muted); font-size: 0.8rem; text-align: center;">No se encontraron productos coincidentes.</div>';
                return;
            }

            resultsContainer.innerHTML = products.map(p => {
                const sku = p.sku || p.reference || '';
                const name = p.name || p.title || '';
                const brand = p.brand || '';
                const price = Number(p.price || p.unit_price || p.base_price || 0);
                const pJson = JSON.stringify(p).replace(/'/g, "&apos;");

                return `
                <div style="padding: 8px 12px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: background 0.15s;" onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background='transparent'" onclick='addProductItemFromCoreprice(${pJson})'>
                    <div>
                        <div style="font-size: 0.82rem; font-weight: 600; color: var(--text-primary);">${escapeHtml(name)}</div>
                        <div style="font-size: 0.72rem; color: var(--text-secondary); display: flex; gap: 8px;">
                            <span style="font-family: monospace;">SKU: ${escapeHtml(sku)}</span>
                            ${brand ? `<span>· Marca: ${escapeHtml(brand)}</span>` : ''}
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 0.82rem; font-weight: 700; color: var(--green-status);">${formatCurrency(price)}</span>
                        <button type="button" class="btn-primary" style="font-size: 0.7rem; padding: 2px 7px;">+ Añadir</button>
                    </div>
                </div>
                `;
            }).join('');
        } catch (e) {
            resultsContainer.innerHTML = `<div style="padding: 10px; color: #ef4444; font-size: 0.8rem; text-align: center;">Error al consultar COREPRICE: ${e.message}</div>`;
        }
    }, 300);
}

/**
 * Adds a selected COREPRICE product to the quotation list
 */
function addProductItemFromCoreprice(product) {
    const resultsContainer = document.getElementById('pq-cp-search-results');
    const searchInput = document.getElementById('pq-cp-search-input');
    if (resultsContainer) {
        resultsContainer.style.display = 'none';
        resultsContainer.innerHTML = '';
    }
    if (searchInput) {
        searchInput.value = '';
    }

    // If only 1 empty row exists, replace it
    if (_currentProductQuoteItems.length === 1 && !_currentProductQuoteItems[0].name && !_currentProductQuoteItems[0].sku) {
        _currentProductQuoteItems = [];
    }

    _currentProductQuoteItems.push({
        sku: product.sku || product.reference || '',
        name: product.name || product.title || 'Producto COREPRICE',
        brand: product.brand || '',
        price: Number(product.price || product.unit_price || product.base_price || 0),
        quantity: 1,
        discount: 0,
        description: product.description || (product.brand ? `Marca: ${product.brand}` : '')
    });

    renderProductQuoteItemsTable();
    showToast(`Producto añadido: ${product.name}`, 'info');
}

/**
 * Asynchronously attempts to fetch prices for items loaded with price 0
 */
async function autoFetchCorepricePricesForQuote() {
    const zeroPriceItems = _currentProductQuoteItems.filter(it => (!it.price || it.price === 0) && it.sku);
    if (zeroPriceItems.length === 0) return;

    const token = localStorage.getItem('crm_token') || localStorage.getItem('token');
    for (let it of zeroPriceItems) {
        try {
            const res = await fetch(`${API_BASE}/v1/integrations/coreprice/products/${encodeURIComponent(it.sku)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const prod = await res.json();
                const pr = Number(prod.price || prod.unit_price || prod.base_price || 0);
                if (pr > 0) {
                    it.price = pr;
                    if (!it.brand && prod.brand) it.brand = prod.brand;
                }
            }
        } catch (e) {
            // Ignore background price fetch error
        }
    }
    renderProductQuoteItemsTable();
}

/**
 * Saves the current products and terms as draft without syncing with Alegra yet
 */
async function saveProductQuoteDraft() {
    const nit = (document.getElementById('pq-cust-nit')?.value || '').trim();
    const name = (document.getElementById('pq-cust-name')?.value || '').trim();
    const contact = (document.getElementById('pq-cust-contact')?.value || '').trim();
    const email = (document.getElementById('pq-cust-email')?.value || '').trim();
    const phone = (document.getElementById('pq-cust-phone')?.value || '').trim();
    const city = (document.getElementById('pq-cust-city')?.value || '').trim();
    const address = (document.getElementById('pq-cust-address')?.value || '').trim();
    const validityDays = parseInt(document.getElementById('pq-validity-days')?.value || '15', 10);
    const paymentMode = (document.getElementById('pq-payment-mode')?.value || '').trim();
    const shippingTerms = (document.getElementById('pq-shipping-terms')?.value || '').trim();
    const specialNotes = (document.getElementById('pq-special-notes')?.value || '').trim();

    if (!nit) return showToast('Ingrese el NIT o Identificación para guardar el borrador.', 'error');

    const draftBtn = document.getElementById('pq-btn-save-draft');
    const originalText = draftBtn ? draftBtn.innerHTML : '';
    if (draftBtn) {
        draftBtn.disabled = true;
        draftBtn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin" style="margin-right: 5px;"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>Guardando...';
    }

    const payload = {
        request_id: _currentProductQuoteReq ? _currentProductQuoteReq.id : null,
        customer_nit: nit,
        customer_name: name,
        customer_email: email,
        customer_phone: phone,
        delivery_address: address,
        city: city,
        items: _currentProductQuoteItems,
        validity_days: validityDays,
        payment_mode: paymentMode,
        shipping_terms: shippingTerms,
        special_notes: specialNotes,
        salesperson: localStorage.getItem('full_name') || localStorage.getItem('username') || 'Asesor Comercial'
    };

    try {
        const res = await fetch(`${PROD_API}/draft`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.detail || 'Fallo al guardar el borrador.');
        }

        const data = await res.json();
        showToast('Borrador de cotización guardado exitosamente.', 'success');
        
        // Update current request in memory if exists
        if (_currentProductQuoteReq) {
            if (!_currentProductQuoteReq.details) _currentProductQuoteReq.details = {};
            _currentProductQuoteReq.details.draft_items = _currentProductQuoteItems;
            _currentProductQuoteReq.details.draft_conditions = {
                validity_days: validityDays,
                payment_mode: paymentMode,
                shipping_terms: shippingTerms,
                special_notes: specialNotes
            };
        }
    } catch (e) {
        showToast(e.message, 'error');
    } finally {
        if (draftBtn) {
            draftBtn.disabled = false;
            draftBtn.innerHTML = originalText || '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 5px;"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>Guardar Borrador';
        }
    }
}

/**
 * Submits the product quote to create the official Alegra Estimate
 */
async function submitProductQuoteToAlegra() {
    const nit = (document.getElementById('pq-cust-nit')?.value || '').trim();
    const name = (document.getElementById('pq-cust-name')?.value || '').trim();
    const contact = (document.getElementById('pq-cust-contact')?.value || '').trim();
    const email = (document.getElementById('pq-cust-email')?.value || '').trim();
    const phone = (document.getElementById('pq-cust-phone')?.value || '').trim();
    const city = (document.getElementById('pq-cust-city')?.value || '').trim();
    const address = (document.getElementById('pq-cust-address')?.value || '').trim();
    const validityDays = parseInt(document.getElementById('pq-validity-days')?.value || '15', 10);
    const paymentMode = (document.getElementById('pq-payment-mode')?.value || '').trim();
    const shippingTerms = (document.getElementById('pq-shipping-terms')?.value || '').trim();
    const specialNotes = (document.getElementById('pq-special-notes')?.value || '').trim();

    if (!nit) return showToast('El NIT o Identificación del cliente es obligatorio.', 'error');
    if (!name) return showToast('La Razón Social / Nombre de la empresa es obligatorio.', 'error');
    if (_currentProductQuoteItems.length === 0) return showToast('Debe incluir al menos un producto.', 'error');

    // Validate prices
    for (let it of _currentProductQuoteItems) {
        if (!it.name) return showToast('Todos los productos deben tener un nombre descriptivo.', 'error');
        if (!it.price || it.price <= 0) return showToast(`El producto "${it.name}" debe tener un precio unitario mayor a $0 COP.`, 'error');
        if (!it.quantity || it.quantity <= 0) return showToast(`El producto "${it.name}" debe tener una cantidad mayor a 0.`, 'error');
    }

    const submitBtn = document.getElementById('btn-submit-product-quote');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin" style="margin-right: 5px;"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>Generando en Alegra...';
    }

    const payload = {
        request_id: _currentProductQuoteReq ? _currentProductQuoteReq.id : null,
        customer_nit: nit,
        customer_name: name,
        customer_email: email,
        customer_phone: phone,
        delivery_address: address,
        city: city,
        items: _currentProductQuoteItems,
        validity_days: validityDays,
        payment_mode: paymentMode,
        shipping_terms: shippingTerms,
        special_notes: specialNotes,
        salesperson: localStorage.getItem('full_name') || localStorage.getItem('username') || 'Asesor Comercial'
    };

    try {
        const res = await fetch(`${PROD_API}/offers`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.detail || 'Fallo al generar la estimación en Alegra.');
        }

        const data = await res.json();
        closeProductQuoteModal();
        showProductQuoteSuccessModal(data);

        // Refresh requests list if available
        if (typeof loadRequests === 'function') {
            loadRequests();
        }
    } catch (e) {
        showToast(e.message, 'error');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 5px;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>Generar Estimación Oficial en Alegra';
        }
    }
}

/**
 * Displays the success modal after an Alegra Estimate is generated
 */
function showProductQuoteSuccessModal(data) {
    const estId = data.alegra_estimate_id;
    const pubUrl = data.alegra_public_url;
    const totalNet = formatCurrency(data.total_net || 0);
    const alegraDirectUrl = `https://app.alegra.com/estimate/view/id/${estId}`;

    const html = `

    <div class="modal-overlay active" id="pq-success-modal" style="z-index: 9995;">
        <div class="modal-card" style="max-width: 500px; width: 92%; text-align: center; padding: 26px 22px; border-radius: 14px;">
            <div style="width: 52px; height: 52px; border-radius: 50%; background: rgba(16, 185, 129, 0.12); color: #10b981; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px auto;">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
            <h3 style="margin: 0 0 6px 0; font-size: 1.2rem; color: var(--text-primary); font-weight: 700;">¡Estimación Oficial Generada!</h3>
            <p style="margin: 0 0 16px 0; font-size: 0.83rem; color: var(--text-secondary);">
                La cotización se ha creado y sincronizado exitosamente en la API de <strong>Alegra</strong>.
            </p>

            <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 10px; padding: 14px; margin-bottom: 18px; font-size: 0.83rem; text-align: left; display: flex; flex-direction: column; gap: 6px;">
                <div style="display: flex; justify-content: space-between;">
                    <span style="color: var(--text-muted);">N° Estimación Alegra:</span>
                    <strong style="color: var(--accent-primary);">#${estId}</strong>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span style="color: var(--text-muted);">Cliente / NIT:</span>
                    <strong>${escapeHtml(data.customer_nit)}</strong>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span style="color: var(--text-muted);">Ítems Cotizados:</span>
                    <strong>${data.items_count} productos</strong>
                </div>
                <div style="display: flex; justify-content: space-between; border-top: 1px solid var(--border-color); padding-top: 6px; margin-top: 2px;">
                    <span style="color: var(--text-muted); font-weight: 600;">Total Oferta:</span>
                    <strong style="color: var(--green-status); font-size: 1rem;">${totalNet} COP</strong>
                </div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 8px;">
                <a href="${alegraDirectUrl}" target="_blank" class="btn-primary" style="padding: 10px; font-size: 0.85rem; text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 6px;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                    <span>Abrir Estimación en Alegra</span>
                </a>
                ${pubUrl ? `
                <a href="${pubUrl}" target="_blank" class="btn-secondary" style="padding: 8px; font-size: 0.82rem; text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 6px;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                    <span>Ver Enlace Público para el Cliente</span>
                </a>
                <button type="button" class="btn-secondary" onclick="navigator.clipboard.writeText('${pubUrl}'); showToast('Enlace de la cotización copiado al portapapeles', 'info');" style="padding: 8px; font-size: 0.82rem; display: flex; align-items: center; justify-content: center; gap: 6px;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    <span>Copiar Enlace Web</span>
                </button>
                ` : ''}
                <button type="button" class="btn-secondary" onclick="document.getElementById('pq-success-modal').remove();" style="padding: 8px; font-size: 0.82rem; margin-top: 4px;">
                    Finalizar y Cerrar
                </button>
            </div>
        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', html);
    showToast(`Estimación #${estId} creada con éxito en Alegra`, 'success');
}



