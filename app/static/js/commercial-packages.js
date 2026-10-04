async function loadPackages() {
    const grid = document.getElementById('packages-grid');
    if (!grid) return;
    grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:40px; color:var(--text-muted);"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin" style="vertical-align:text-bottom; margin-right:6px;"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>Cargando paquetes...</div>';
    try {
        const pkgs = await apiRequest(`${CMR_API}/packages`);
        if (!pkgs || pkgs.length === 0) {
            grid.innerHTML = `
                <div style="grid-column:1/-1; text-align:center; padding:60px; color:var(--text-muted);">
                    <div style="display:flex; justify-content:center; margin-bottom:12px; color:var(--text-muted);"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"></line><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg></div>
                    <p>No hay paquetes configurados aún.</p>
                    <button class="btn-primary" onclick="openPackageModal(null)" style="margin-top:8px;">+ Crear primer paquete</button>
                </div>`;
            return;
        }
        grid.innerHTML = pkgs.map(pkg => {
            const scopeHtml = (pkg.scope || []).slice(0,5).map(s =>
                `<li style="margin:3px 0; font-size:0.82rem; display:flex; align-items:center; gap:6px;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" style="flex-shrink:0;"><polyline points="20 6 9 17 4 12"></polyline></svg><span>${escapeHtml(s.item || s)}</span></li>`
            ).join('');
            const moreCount = (pkg.scope || []).length - 5;
            const activeColor = pkg.is_active ? '#4caf50' : '#9e9e9e';
            return `
            <div style="background:var(--card-bg); border:1px solid var(--border-color); border-radius:12px; padding:20px; position:relative; display:flex; flex-direction:column; gap:10px;">
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <div>
                        <h4 style="margin:0; color:var(--text-primary); font-size:1rem;">${pkg.name}</h4>
                        <code style="font-size:0.75rem; color:var(--accent-primary);">${pkg.code}</code>
                    </div>
                    <span style="background:${activeColor}22; color:${activeColor}; border:1px solid ${activeColor}55; padding:2px 8px; border-radius:12px; font-size:0.72rem; font-weight:700;">${pkg.is_active ? 'ACTIVO' : 'INACTIVO'}</span>
                </div>
                <p style="margin:0; font-size:0.83rem; color:var(--text-secondary);">${pkg.description || ''}</p>
                <div style="display:flex; gap:16px; font-size:0.8rem; color:var(--text-muted); flex-wrap:wrap;">
                    <span style="display:inline-flex; align-items:center; gap:4px;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>${pkg.min_employees}–${pkg.max_employees === 9999 ? '∞' : pkg.max_employees} emp.</span>
                    <span style="display:inline-flex; align-items:center; gap:4px;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>${pkg.standards_count} estándares</span>
                    <span style="display:inline-flex; align-items:center; gap:4px;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>${pkg.duration_months} meses</span>
                </div>
                ${scopeHtml ? `<ul style="margin:0; padding-left:0; list-style:none; color:var(--text-secondary);">${scopeHtml}${moreCount > 0 ? `<li style="color:var(--text-muted); font-size:0.8rem; padding-left:19px;">...y ${moreCount} más</li>` : ''}</ul>` : ''}
                <div style="display:flex; gap:8px; justify-content:flex-end; margin-top:6px; border-top:1px solid var(--border-color); padding-top:10px;">
                    <button class="action-icon-btn" onclick='openPackageModal(${JSON.stringify(pkg)})' title="Editar Paquete" aria-label="Editar Paquete">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    <button class="action-icon-btn" onclick="archivePackage(${pkg.id}, '${pkg.code}')" title="Archivar Paquete" aria-label="Archivar Paquete" style="color:var(--danger);">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>
                    </button>
                </div>
            </div>`;
        }).join('');
    } catch(e) {
        console.error("Error al cargar paquetes SG-SST:", e);
        grid.innerHTML = `
            <div style="grid-column:1/-1; text-align:center; padding:40px; color:#f44336;">
                <div style="display:flex; justify-content:center; margin-bottom:8px;"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg></div>
                <p style="margin:0 0 12px; font-weight:500;">Error de comunicación al obtener paquetes: ${e.message}</p>
                <button class="btn-secondary btn-compact" onclick="loadPackages()" title="Reintentar conexión con el servidor" style="display:inline-flex; align-items:center; gap:5px;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>Reintentar</button>
            </div>`;
    }
}

let _editingPackage = null;
function openPackageModal(pkg) {
    _editingPackage = pkg;
    const isNew = !pkg;
    const scope = (pkg?.scope || []).map(s => `${s.category}::${s.item}`).join('\n');
    const html = `
    <div class="modal-overlay active" id="pkg-modal" onclick="if(event.target===this)closePkgModal()">
        <div class="modal-card" style="max-width:580px;" onclick="event.stopPropagation()">
            <div class="modal-header">
                <h3>${isNew ? 'Nuevo Paquete' : 'Editar Paquete'}</h3>
                <button class="modal-close" onclick="closePkgModal()" aria-label="Cerrar" title="Cerrar">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18"></line></svg>
                </button>
            </div>
            <div style="padding:20px; display:flex; flex-direction:column; gap:12px;">
                <div class="form-group" style="margin:0;">
                    <label>Código único (ej: EMPRENDE, CRECE)</label>
                    <input type="text" id="pkg-code" value="${pkg?.code||''}" placeholder="EMPRENDE" ${!isNew?'disabled':''} style="text-transform:uppercase;">
                </div>
                <div class="form-group" style="margin:0;">
                    <label>Nombre del paquete</label>
                    <input type="text" id="pkg-name" value="${pkg?.name||''}" placeholder="Plan Emprende SG-SST">
                </div>
                <div class="form-group" style="margin:0;">
                    <label>Descripción breve</label>
                    <textarea id="pkg-desc" rows="2" style="width:100%; resize:vertical;">${pkg?.description||''}</textarea>
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px;">
                    <div class="form-group" style="margin:0;"><label>Min. empleados</label><input type="number" id="pkg-min-emp" value="${pkg?.min_employees||1}" min="1"></div>
                    <div class="form-group" style="margin:0;"><label>Máx. empleados</label><input type="number" id="pkg-max-emp" value="${pkg?.max_employees===9999?'':pkg?.max_employees||''}" placeholder="∞"></div>
                    <div class="form-group" style="margin:0;"><label>Estándares (Res.0312)</label><input type="number" id="pkg-standards" value="${pkg?.standards_count||7}"></div>
                </div>
                <div class="form-group" style="margin:0;">
                    <label>Alcance (una línea por ítem — formato: Categoría::Descripción del ítem)</label>
                    <textarea id="pkg-scope" rows="8" placeholder="Diagnóstico y Evaluación::Diagnóstico inicial Resolución 0312 de 2019\nDocumentación::Política de Seguridad y Salud en el Trabajo\nCapacitaciones::Plan anual de capacitaciones (4 sesiones)" style="width:100%; resize:vertical; font-size:0.8rem;">${scope}</textarea>
                </div>
                <div style="display:flex; gap:8px; justify-content:flex-end; margin-top:8px;">
                    <button class="btn-secondary" onclick="closePkgModal()">Cancelar</button>
                    <button class="btn-primary" onclick="savePackage()" style="display:inline-flex; align-items:center; gap:6px;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                        <span>Guardar</span>
                    </button>
                </div>
            </div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
}

function closePkgModal() {
    const m = document.getElementById('pkg-modal');
    if (m) m.remove();
}

async function savePackage() {
    const code = (document.getElementById('pkg-code')?.value||'').toUpperCase().trim();
    const name = document.getElementById('pkg-name')?.value?.trim();
    const maxEmp = parseInt(document.getElementById('pkg-max-emp')?.value) || 9999;
    if (!code || !name) return alert('Código y nombre son obligatorios.');

    const scopeRaw = (document.getElementById('pkg-scope')?.value || '').split('\n').filter(l => l.trim());
    const scope = scopeRaw.map(l => {
        const [cat, ...rest] = l.split('::');
        return { category: cat?.trim() || 'General', item: rest.join('::').trim() || cat.trim() };
    });

    const payload = {
        code, name,
        description: document.getElementById('pkg-desc')?.value?.trim(),
        min_employees: parseInt(document.getElementById('pkg-min-emp')?.value) || 1,
        max_employees: maxEmp,
        standards_count: parseInt(document.getElementById('pkg-standards')?.value) || 7,
        scope
    };

    try {
        if (_editingPackage) {
            payload.code = _editingPackage.code;
            await apiRequest(`${CMR_API}/packages/${_editingPackage.id}`, 'PUT', payload);
            showToast('Paquete actualizado.', 'success');
        } else {
            await apiRequest(`${CMR_API}/packages`, 'POST', payload);
            showToast('Paquete creado.', 'success');
        }
        closePkgModal();
        loadPackages();
    } catch(e) {
        alert('Error: ' + e.message);
    }
}

async function archivePackage(id, code) {
    if (!confirm(`¿Archivar el paquete "${code}"? Dejará de aparecer en cotizaciones nuevas.`)) return;
    await apiRequest(`${CMR_API}/packages/${id}`, 'DELETE');
    showToast('Paquete archivado.', 'info');
    loadPackages();
}

// ─── 2. INTERNAL PRICING ──────────────────────────────────────────────────


