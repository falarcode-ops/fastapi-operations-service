function switchPermTab(tab) {
    const btnRoles = document.getElementById('perm-tab-roles');
    const btnUsers = document.getElementById('perm-tab-users');
    const panelRoles = document.getElementById('perm-panel-roles');
    const panelUsers = document.getElementById('perm-panel-users');
    if (!btnRoles || !btnUsers) return;

    if (tab === 'roles') {
        btnRoles.classList.add('active');
        btnUsers.classList.remove('active');
        panelRoles.style.display = 'block';
        panelUsers.style.display = 'none';
    } else {
        btnUsers.classList.add('active');
        btnRoles.classList.remove('active');
        panelRoles.style.display = 'none';
        panelUsers.style.display = 'block';
        loadUsersListForPerms();
    }
}

async function loadPermissionsMatrix() {
    const container = document.getElementById('roles-matrix-table-container');
    const card = document.getElementById('card-permissions-matrix');
    if (card) card.style.display = isSuperUser() ? 'block' : 'none';
    if (!isSuperUser() || !container) return;

    try {
        const res = await apiFetch(`${PERM_API}/roles`);
        if (!res.ok) throw new Error('No se pudo cargar la matriz de roles.');
        const roles = await res.json();
        _permissionsMatrixData = roles;
        renderPermissionsMatrix(roles);
    } catch(e) {
        container.innerHTML = `<div style="color:#f44336; padding:15px; font-size:0.85rem;">Error: ${e.message}</div>`;
    }
}

function renderPermissionsMatrix(roles) {
    const container = document.getElementById('roles-matrix-table-container');
    if (!container) return;

    const modules = [
        { key: 'overview', label: 'Panel Comercial' },
        { key: 'requests', label: 'Prospectos & Solicitudes' },
        { key: 'commercial_config', label: 'Gestión Comercial (Tarifas/Paquetes)' },
        { key: 'commercial_oper', label: 'Pre-Ofertas y Contratos' },
        { key: 'customers', label: 'Clientes & Contactos' },
        { key: 'chat', label: 'Chatbot Logs' },
        { key: 'users', label: 'Usuarios & Permisos' },
        { key: 'config', label: 'Configuración del Sistema' }
    ];

    const actions = [
        { key: 'view', label: 'Ver' },
        { key: 'create', label: 'Crear' },
        { key: 'edit', label: 'Editar' },
        { key: 'delete', label: 'Eliminar' }
    ];

    let html = `
    <table class="advisor-table" style="min-width:640px; font-size:0.8rem; margin-top:8px;">
        <thead>
            <tr>
                <th style="width:200px;">Módulo / Área</th>
                ${roles.map(r => `<th style="text-align:center;">${r.name}</th>`).join('')}
            </tr>
        </thead>
        <tbody>
    `;

    modules.forEach(mod => {
        html += `
        <tr style="background:rgba(255,255,255,0.02);">
            <td colspan="${roles.length + 1}" style="font-weight:700; color:var(--accent-cyan); padding-top:10px; font-size:0.82rem;">
                ${mod.label}
            </td>
        </tr>`;

        actions.forEach(act => {
            html += `
            <tr>
                <td style="padding-left:20px; color:var(--text-secondary);">${act.label}</td>
                ${roles.map(r => {
                    let perms = r.permissions || {};
                    let isChecked = false;
                    const permKey = `${mod.key}.${act.key}`;
                    if (Array.isArray(perms)) {
                        isChecked = perms.includes('*') || perms.includes(permKey) || perms.includes(`${mod.key}.*`);
                    } else if (typeof perms === 'object') {
                        isChecked = perms['*'] === true || perms[permKey] === true || perms[`${mod.key}.*`] === true;
                    }
                    if (r.name === 'SUPERUSER') isChecked = true;
                    const isDisabled = r.name === 'SUPERUSER' ? 'disabled' : '';
                    return `
                    <td style="text-align:center;">
                        <input type="checkbox" ${isChecked ? 'checked' : ''} ${isDisabled}
                               onchange="toggleRolePermission(${r.id}, '${permKey}', this.checked)">
                    </td>`;
                }).join('')}
            </tr>`;
        });
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
}

async function toggleRolePermission(roleId, permKey, isChecked) {
    try {
        const role = _permissionsMatrixData.find(r => r.id === roleId);
        if (!role) return;
        const perms = role.permissions || {};
        perms[permKey] = isChecked;
        
        const res = await apiRequest(`${PERM_API}/roles/${roleId}`, 'PUT', {
            name: role.name,
            description: role.description,
            permissions: perms
        });
        showToast('Permiso del rol actualizado.', 'success');
    } catch(e) {
        showToast(e.message, 'error');
    }
}

async function loadUsersListForPerms() {
    const sel = document.getElementById('perm-user-select');
    if (!sel || sel.options.length > 1) return;
    try {
        const res = await apiFetch(`${API_BASE}/employees`);
        if (res.ok) {
            const emps = await res.json();
            sel.innerHTML = '<option value="">-- Seleccionar Asesor / Usuario --</option>';
            emps.forEach(e => {
                sel.innerHTML += `<option value="${e.username}">${e.full_name} (${e.username} - ${e.role || 'USER'})</option>`;
            });
        }
    } catch(e) {}
}

async function loadUserPermissionOverrides() {
    const username = document.getElementById('perm-user-select')?.value;
    const container = document.getElementById('user-override-container');
    if (!container) return;
    if (!username) {
        container.innerHTML = '<p style="font-size:0.8rem; color:var(--text-muted);">Selecciona un usuario para otorgar o revocar permisos específicos.</p>';
        return;
    }
    container.innerHTML = '<div style="color:var(--text-muted); font-size:0.8rem;">Cargando excepciones de permisos...</div>';

    try {
        const res = await apiFetch(`${PERM_API}/users/${username}`);
        const overrides = res.ok ? await res.json() : [];
        
        const commonPerms = [
            { key: 'commercial_config.view', label: 'Ver Tarifario Interno y Paquetes SG-SST' },
            { key: 'commercial_config.edit', label: 'Editar Tarifario y Zonas de Visita' },
            { key: 'customers.delete', label: 'Eliminar Clientes' },
            { key: 'overview.view', label: 'Ver Panel Comercial de Metricas' },
            { key: 'requests.assign', label: 'Reasignar Prospectos a Asesores' }
        ];

        let html = `
        <div style="background:var(--card-bg); border:1px solid var(--border-color); border-radius:8px; padding:12px; margin-top:10px;">
            <h5 style="margin:0 0 10px; color:var(--text-primary); font-size:0.85rem;">Excepciones Individuales para <strong>${username}</strong>:</h5>
            <div style="display:flex; flex-direction:column; gap:8px;">
        `;

        commonPerms.forEach(p => {
            const match = overrides.find(o => o.permission_key === p.key);
            const status = match ? (match.granted ? 'granted' : 'denied') : 'default';
            html += `
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.8rem; border-bottom:1px solid var(--border-color); padding-bottom:6px;">
                <span>${p.label} (<code>${p.key}</code>)</span>
                <select onchange="saveUserOverride('${username}', '${p.key}', this.value)" style="font-size:0.75rem; padding:2px 6px;">
                    <option value="default" ${status==='default'?'selected':''}>Según Rol Base</option>
                    <option value="allow" ${status==='granted'?'selected':''}>Permitir (Explícito)</option>
                    <option value="deny" ${status==='denied'?'selected':''}>Denegar (Explícito)</option>
                </select>
            </div>`;
        });

        html += `</div></div>`;
        container.innerHTML = html;

    } catch(e) {
        container.innerHTML = `<div style="color:#f44336; font-size:0.8rem;">Error: ${e.message}</div>`;
    }
}

async function saveUserOverride(username, permKey, choice) {
    try {
        const isGranted = choice === 'allow' ? true : (choice === 'deny' ? false : null);
        await apiRequest(`${PERM_API}/users/${username}`, 'PUT', {
            permission_key: permKey,
            granted: isGranted
        });
        showToast('Excepcion de permiso guardada correctamente.', 'success');
    } catch(e) {
        showToast(e.message, 'error');
    }
}

async function openCreateRoleModal() {
    const roleName = prompt('Nombre del nuevo rol personalizado (ej. COORDINADOR_SST):');
    if (!roleName) return;
    const desc = prompt('Descripción del rol:');
    try {
        await apiRequest(`${PERM_API}/roles`, 'POST', {
            name: roleName.toUpperCase().trim().replace(/\s+/g, '_'),
            description: desc || '',
            permissions: {}
        });
        showToast('Rol creado exitosamente.', 'success');
        loadPermissionsMatrix();
    } catch(e) {
        showToast(e.message, 'error');
    }
}


async function toggleUserStatus(username, isCurrentlyActive) {
    const actionStr = isCurrentlyActive ? 'desactivar' : 'activar';
    if (!confirm(`¿Está seguro de ${actionStr} la cuenta del usuario ${username}?`)) return;
    try {
        const res = await apiFetch(`${API_BASE}/employees/${username}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_active: !isCurrentlyActive })
        });
        if (res.ok) {
            showToast(`Usuario ${!isCurrentlyActive ? 'activado' : 'desactivado'} correctamente.`, 'success');
            loadEmployeeSelector();
        } else {
            const err = await res.json();
            showToast(err.detail || 'Error al cambiar estado del usuario.', 'error');
        }
    } catch(e) {
        showToast(e.message, 'error');
    }
}


function updateSignaturePreview(type) {
    const textarea = document.getElementById(type === 'emp' ? 'emp-signature' : 'prof-signature');
    const preview = document.getElementById(type === 'emp' ? 'emp-signature-preview' : 'prof-signature-preview');
    if (!textarea || !preview) return;

    const val = (textarea.value || '').trim();
    if (!val) {
        preview.innerHTML = '<span style="color:#999; font-style:italic;">Sin firma registrada aún.</span>';
    } else {
        preview.innerHTML = val;
    }
}


// ── VISUAL SIGNATURE BUILDER ENGINE ──────────────────────────────────────────
function switchSignatureEditorMode(mode) {
    const visualBox = document.getElementById('sig-visual-fields');
    const htmlBox = document.getElementById('sig-html-fields');
    const btnVisual = document.getElementById('btn-sig-mode-visual');
    const btnHtml = document.getElementById('btn-sig-mode-html');

    if (mode === 'visual') {
        if (visualBox) visualBox.style.display = 'block';
        if (htmlBox) htmlBox.style.display = 'none';
        if (btnVisual) btnVisual.className = 'type-pill natural active';
        if (btnHtml) btnHtml.className = 'type-pill natural';
    } else {
        if (visualBox) visualBox.style.display = 'none';
        if (htmlBox) htmlBox.style.display = 'block';
        if (btnVisual) btnVisual.className = 'type-pill natural';
        if (btnHtml) btnHtml.className = 'type-pill natural active';
    }
}

function buildVisualSignatureHTML() {
    const fullName = document.getElementById('emp-fullname')?.value?.trim() || 'Nombre de Usuario';
    const title = document.getElementById('emp-sig-title')?.value?.trim() || '';
    const company = document.getElementById('emp-sig-company')?.value?.trim() || '';
    const website = document.getElementById('emp-sig-website')?.value?.trim() || '';

    let subLine = [];
    if (title) subLine.push(title);
    if (company) subLine.push(company);
    const subText = subLine.join(' - ');

    let webHtml = '';
    if (website) {
        const webUrl = website.startsWith('http') ? website : `https://${website}`;
        webHtml = `<div style="margin-top:3px;"><a href="${webUrl}" target="_blank" style="color:#0088cc; text-decoration:none; font-size:12px;">${website}</a></div>`;
    }

    let imgHtml = '';
    if (_uploadedSignatureImgUrl) {
        imgHtml = `<div style="margin-top:8px;"><img src="${_uploadedSignatureImgUrl}" alt="Firma" style="max-height:60px; max-width:200px; object-fit:contain;"></div>`;
    }

    const generatedHTML = `<br/><br/><div style="font-family:Arial,sans-serif; font-size:13px; color:#444; border-top:1px solid #ddd; padding-top:12px; margin-top:20px;">
    <strong style="color:#111; font-size:14px;">${fullName}</strong>${subText ? `<br/><span style="color:#666; font-size:12px;">${subText}</span>` : ''}
    ${webHtml}
    ${imgHtml}
</div>`;

    const textarea = document.getElementById('emp-signature');
    if (textarea) textarea.value = generatedHTML;
    
    updateSignaturePreview('emp');
}

function parseSignatureToVisualFields(sigHtml) {
    _uploadedSignatureImgUrl = '';
    if (!sigHtml) {
        document.getElementById('emp-sig-title').value = '';
        document.getElementById('emp-sig-company').value = '';
        document.getElementById('emp-sig-website').value = '';
        return;
    }

    // Try to extract image src if present
    const imgMatch = sigHtml.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (imgMatch) {
        _uploadedSignatureImgUrl = imgMatch[1];
    }
}

