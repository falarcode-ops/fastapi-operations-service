function isSuperUser() {
    const u = (localStorage.getItem('username') || '').toLowerCase();
    const r = (localStorage.getItem('role') || '').toUpperCase();
    return u === 'fabian.alarcon' || u === 'falarcon' || u === 'admin' || 
           r === 'SUPERUSER' || r === 'SUPER_USER' || r === 'SUPERADMIN' || r === 'ADMIN';
}

// Director Comercial: define tarifas/paquetes, supervisa equipo, ve todo lo comercial
function isDirectorOrSuperUser() {
    if (isSuperUser()) return true;
    const r = (localStorage.getItem('role') || '').toUpperCase();
    return r === 'DIRECTOR' || r === 'DIRECTOR_COMERCIAL' || r === 'DIRECTOR COMERCIAL';
}

// Administrador Tecnico: acceso a Config del sistema y Usuarios, sin modulos comerciales
function isAdminTecnico() {
    if (isSuperUser()) return true;
    const r = (localStorage.getItem('role') || '').toUpperCase();
    return r === 'ADMINISTRATOR' || r === 'ADMIN';
}

// Cualquier privilegiado (Director, Admin Tecnico, Superuser)
function isAdminOrSuperUser() {
    return isSuperUser() || isDirectorOrSuperUser() || isAdminTecnico();
}

// Asesor Comercial (rol USER / asesor): solo sus propios datos
function isAdvisor() {
    return !isSuperUser() && !isDirectorOrSuperUser() && !isAdminTecnico();
}


async function loadCompanyHeaderConfig() {
    try {
        const res = await fetch(`${CMR_API}/config`);
        if (res.ok) {
            const data = await res.json();
            const setIf = (id, val, def) => {
                const el = document.getElementById(id);
                if (el) el.value = val !== undefined && val !== null ? val : def;
            };
            setIf('cfg-company-name', data.company_name, 'ÁLACOR S.A.S.');
            setIf('cfg-company-nit', data.company_nit, '901198755-0');
            setIf('cfg-company-phone', data.company_phone, '+573502608925');
            setIf('cfg-company-website', data.company_website, 'www.alacor.com.co');
            setIf('cfg-company-email', data.company_email, 'facturacion@alacor.com.co');
            setIf('cfg-company-address', data.company_address, 'www.alacor.com.co - Bogotá, D.C.');
        }
    } catch(e) {}
}

async function saveCompanyHeaderConfig() {
    if (!isSuperUser()) return showToast('Acceso denegado: Solo el Superusuario puede modificar datos corporativos.', 'error');
    
    const getVal = id => (document.getElementById(id) ? document.getElementById(id).value.trim() : '');
    
    const payload = {
        company_name: getVal('cfg-company-name') || 'ÁLACOR S.A.S.',
        company_nit: getVal('cfg-company-nit') || '901198755-0',
        company_phone: getVal('cfg-company-phone') || '+573502608925',
        company_website: getVal('cfg-company-website') || 'www.alacor.com.co',
        company_email: getVal('cfg-company-email') || 'facturacion@alacor.com.co',
        company_address: getVal('cfg-company-address') || 'www.alacor.com.co - Bogotá, D.C.'
    };

    try {
        const token = localStorage.getItem('crm_token') || localStorage.getItem('token');
        const res = await fetch(`${CMR_API}/config`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            showToast('Datos corporativos de la empresa guardados correctamente.', 'success');
        } else {
            const err = await res.json();
            showToast(err.detail || 'Error al guardar datos corporativos.', 'error');
        }
    } catch(e) {
        showToast(e.message, 'error');
    }
}


async function loadAllConditions() {
    const grid = document.getElementById('conditions-grid');
    if (!grid) return;
    grid.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-muted);">Cargando condiciones comerciales...</div>';
    
    try {
        const token = localStorage.getItem('crm_token') || localStorage.getItem('token');
        const res = await fetch(`${CMR_API}/conditions`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Error al consultar condiciones comerciales.');
        const list = await res.json();
        
        if (!list || list.length === 0) {
            grid.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-muted);">No se encontraron condiciones comerciales registradas.</div>';
            return;
        }

        grid.innerHTML = list.map(item => `
            <div style="background:var(--bg-secondary); border:1px solid var(--border-color); padding:12px; border-radius:8px;">
                <label style="font-size:0.82rem; font-weight:600; color:var(--text-primary); display:block; margin-bottom:4px;">
                    ${item.label || item.key}
                </label>
                <p style="font-size:0.75rem; color:var(--text-muted); margin:0 0 8px 0;">${item.description || ''}</p>
                <input type="text" data-condition-key="${item.key}" value="${(item.value || '').replace(/"/g, '&quot;')}" style="width:100%; font-size:0.82rem; padding:6px 10px; border:1px solid var(--border-color); border-radius:6px; background:var(--card-bg); color:var(--text-primary);">
            </div>
        `).join('');
    } catch(e) {
        grid.innerHTML = `<div style="text-align:center; padding:20px; color:#f44336;">Error: ${e.message}</div>`;
    }
}

async function saveAllConditions() {
    const inputs = document.querySelectorAll('[data-condition-key]');
    if (!inputs || inputs.length === 0) return showToast('No hay condiciones para guardar.', 'info');
    
    const token = localStorage.getItem('crm_token') || localStorage.getItem('token');
    let successCount = 0;
    
    for (const input of inputs) {
        const key = input.getAttribute('data-condition-key');
        const val = input.value.trim();
        try {
            const res = await fetch(`${CMR_API}/conditions/${key}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ value: val })
            });
            if (res.ok) successCount++;
        } catch(e) {}
    }
    
    showToast(`Condiciones comerciales actualizadas correctamente (${successCount}/${inputs.length}).`, 'success');
}


