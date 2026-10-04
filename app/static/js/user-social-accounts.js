/**
 * Submódulo de Gestión de Cuentas de Redes Sociales Personales (v12.65.1)
 * Permite a los usuarios autorizados vincular y verificar su token de LinkedIn personal
 * tanto desde la Administración de Empleados como desde el modal Mi Perfil.
 * Cumple con la Ley de Soberanía Modular (< 300 líneas).
 */

let _activeEmpSocialUsername = null;
let _activeProfSocialUsername = null;

function resetUserSocialAccountForm(prefix = 'emp') {
    if (prefix === 'emp') _activeEmpSocialUsername = null;
    if (prefix === 'prof') _activeProfSocialUsername = null;

    const tokenInput = document.getElementById(`${prefix}-linkedin-token`);
    const badge = document.getElementById(`${prefix}-linkedin-status-badge`);
    const unlinkBtn = document.getElementById(`btn-unlink-${prefix}-linkedin`);
    const section = document.getElementById(`${prefix}-social-accounts-section`);

    if (tokenInput) tokenInput.value = '';
    if (badge) {
        badge.style.display = 'none';
        badge.innerHTML = '';
    }
    if (unlinkBtn) unlinkBtn.style.display = 'none';
    if (section && prefix === 'emp') section.style.display = 'block';
}

async function loadUserSocialAccountInForm(username, prefix = 'emp') {
    if (prefix === 'emp') _activeEmpSocialUsername = username;
    if (prefix === 'prof') _activeProfSocialUsername = username;

    const tokenInput = document.getElementById(`${prefix}-linkedin-token`);
    const badge = document.getElementById(`${prefix}-linkedin-status-badge`);
    const unlinkBtn = document.getElementById(`btn-unlink-${prefix}-linkedin`);
    const section = document.getElementById(`${prefix}-social-accounts-section`);

    if (!username) {
        resetUserSocialAccountForm(prefix);
        return;
    }

    try {
        const res = await apiFetch(`${API_BASE}/v1/user-social-accounts/${username}`);
        if (!res.ok) {
            if (section && prefix === 'emp') section.style.display = 'none';
            return;
        }

        const data = await res.json();
        if (section) {
            section.style.display = 'block';
        }

        const accounts = data.accounts || [];
        const liAcc = accounts.find(a => (a.platform || '').toLowerCase() === 'linkedin');

        if (liAcc && liAcc.account_urn) {
            if (tokenInput) tokenInput.value = '••••••••';
            if (badge) {
                badge.style.display = 'block';
                badge.innerHTML = `
                    <span style="color:#10b981; font-weight:600; display:inline-flex; align-items:center; gap:4px;">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                        Vinculado:
                    </span>
                    <strong style="color:var(--text-primary);">${escapeHtml(liAcc.account_name || 'Perfil Personal')}</strong>
                    <code style="font-size:0.7rem; color:var(--text-muted); margin-left:4px;">(${escapeHtml(liAcc.account_urn)})</code>
                `;
            }
            if (unlinkBtn) unlinkBtn.style.display = 'inline-block';
        } else {
            if (tokenInput) tokenInput.value = '';
            if (badge) {
                badge.style.display = 'none';
                badge.innerHTML = '';
            }
            if (unlinkBtn) unlinkBtn.style.display = 'none';
        }
    } catch (e) {
        console.warn('[UserSocialAccounts] Error cargando cuentas:', e);
    }
}

async function testUserLinkedIn(prefix = 'emp') {
    const tokenInput = document.getElementById(`${prefix}-linkedin-token`);
    const btn = document.getElementById(`btn-test-${prefix}-linkedin`);
    const token = tokenInput ? tokenInput.value.trim() : '';

    if (!token) {
        showToast('Por favor ingrese un Access Token de LinkedIn antes de probar.', 'warning');
        return;
    }

    if (token === '••••••••') {
        showToast('Esta cuenta ya se encuentra verificada y conectada.', 'info');
        return;
    }

    const origBtnHtml = btn ? btn.innerHTML : '';
    if (btn) {
        btn.innerHTML = '<span class="spinner-border spinner-border-sm" style="width:12px; height:12px;"></span> Validando...';
        btn.disabled = true;
    }

    try {
        const testRes = await apiFetch(`${API_BASE}/v1/user-social-accounts/test-linkedin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ access_token: token })
        });

        if (!testRes.ok) {
            const errData = await testRes.json().catch(() => ({}));
            throw new Error(errData.detail || 'Fallo de autenticación con LinkedIn.');
        }

        const liData = await testRes.json();

        // Determinar usuario a vincular
        let username = null;
        if (prefix === 'emp') {
            username = _activeEmpSocialUsername || (typeof currentUser !== 'undefined' && currentUser ? currentUser.username : null);
        } else {
            username = _activeProfSocialUsername || localStorage.getItem('username');
        }

        if (username) {
            const saveRes = await apiFetch(`${API_BASE}/v1/user-social-accounts/${username}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    platform: 'linkedin',
                    access_token: token,
                    account_name: liData.account_name,
                    account_urn: liData.account_urn
                })
            });

            if (saveRes.ok) {
                showToast(liData.message || 'Cuenta de LinkedIn vinculada exitosamente.', 'success');
                loadUserSocialAccountInForm(username, prefix);
                // Si el otro formulario está en pantalla para el mismo usuario, refrescarlo también
                if (prefix === 'emp' && _activeProfSocialUsername === username) loadUserSocialAccountInForm(username, 'prof');
                if (prefix === 'prof' && _activeEmpSocialUsername === username) loadUserSocialAccountInForm(username, 'emp');
            } else {
                const saveErr = await saveRes.json().catch(() => ({}));
                throw new Error(saveErr.detail || 'Token válido pero no se pudo guardar en el CRM.');
            }
        }
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        if (btn) {
            btn.innerHTML = origBtnHtml;
            btn.disabled = false;
        }
    }
}

async function unlinkUserLinkedIn(prefix = 'emp') {
    let username = null;
    if (prefix === 'emp') {
        username = _activeEmpSocialUsername || (typeof currentUser !== 'undefined' && currentUser ? currentUser.username : null);
    } else {
        username = _activeProfSocialUsername || localStorage.getItem('username');
    }
    if (!username) return;

    if (!confirm('¿Deseas desvincular tu cuenta personal de LinkedIn de CORALIS?')) {
        return;
    }

    try {
        const res = await apiFetch(`${API_BASE}/v1/user-social-accounts/${username}/linkedin`, {
            method: 'DELETE'
        });

        if (res.ok) {
            showToast('Cuenta de LinkedIn desvinculada exitosamente.', 'success');
            resetUserSocialAccountForm(prefix);
            if (prefix === 'emp' && _activeProfSocialUsername === username) resetUserSocialAccountForm('prof');
            if (prefix === 'prof' && _activeEmpSocialUsername === username) resetUserSocialAccountForm('emp');
        } else {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || 'No se pudo desvincular la cuenta.');
        }
    } catch (e) {
        showToast(e.message, 'error');
    }
}

// Aliases para llamadas desde templates HTML
function testEmployeeLinkedIn() { return testUserLinkedIn('emp'); }
function unlinkEmployeeLinkedIn() { return unlinkUserLinkedIn('emp'); }
function testProfileLinkedIn() { return testUserLinkedIn('prof'); }
function unlinkProfileLinkedIn() { return unlinkUserLinkedIn('prof'); }
function loadUserSocialAccountInProfile(username) { return loadUserSocialAccountInForm(username, 'prof'); }
