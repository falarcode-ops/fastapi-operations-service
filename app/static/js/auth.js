document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    checkAuthSession();
});

// Lógica de Autenticación y Control de Acceso (v3.2.0)
function checkAuthSession() {
    let token = localStorage.getItem('token');
    const appWrapper = document.getElementById('app-wrapper');
    const bottomNav = document.getElementById('mobile-bottom-nav');
    const loginWrapper = document.getElementById('login-wrapper');
    
    if (!token) {
        // En Portfolio CRM se inicializa la sesión ejecutiva automáticamente
        localStorage.setItem('token', 'portfolio_session_sec_2026');
        localStorage.setItem('username', 'fabian.alarcon');
        localStorage.setItem('full_name', 'Fabián Andrés Alarcón Chávez');
        localStorage.setItem('role', 'SUPERADMIN');
        token = 'portfolio_session_sec_2026';
    }
    
    // Usuario autenticado: poblar metadatos del header
    const username = localStorage.getItem('username') || '';
    const fullName = localStorage.getItem('full_name') || '';
    const avatarEl = document.getElementById('header-user-avatar');
    const nameEl = document.getElementById('header-user-name');
    
    if (avatarEl) avatarEl.innerText = username.slice(0, 2).toUpperCase();
    if (nameEl) nameEl.innerText = username.toUpperCase();
    
    // Aplicar restricciones visuales por rol (RBAC)
    applyRoleRestrictions();
    
    // Mostrar Tablero
    document.body.classList.add('logged-in');
    
    // Solo mostrar bottom navigation móvil si no está oculto por rol
    const role = localStorage.getItem('role');
    if (bottomNav && role !== 'USER') {
        bottomNav.style.display = 'flex';
    } else if (bottomNav) {
        bottomNav.style.display = 'none'; // USER no tiene pestañas que navegar
    }
    
    // Inicializar datos del CRM
    initDashboard();
}

async function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error-msg');
    const submitBtn = document.getElementById('login-btn');
    
    errorEl.style.display = 'none';
    errorEl.innerText = '';
    submitBtn.disabled = true;
    
    try {
        const response = await window.fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.detail || "Error al iniciar sesión. Compruebe sus credenciales.");
        }
        
        if (data.status === 'change_password_required') {
            // Mostrar formulario de cambio de contraseña obligatoria
            document.getElementById('login-form').style.display = 'none';
            document.getElementById('change-pwd-form').style.display = 'block';
            document.getElementById('change-pwd-username').value = data.username;
            document.getElementById('change-pwd-old').value = password;
        } else if (data.status === 'success') {
            // Guardar sesión
            localStorage.setItem('token', data.token);
            localStorage.setItem('username', data.user.username);
            localStorage.setItem('full_name', data.user.full_name);
            localStorage.setItem('role', data.user.role);
            
            checkAuthSession();
        }
    } catch (err) {
        errorEl.innerText = err.message;
        errorEl.style.display = 'block';
    } finally {
        submitBtn.disabled = false;
    }
}

async function handleChangePassword(event) {
    event.preventDefault();
    const username = document.getElementById('change-pwd-username').value;
    const oldPassword = document.getElementById('change-pwd-old').value;
    const newPassword = document.getElementById('change-pwd-new').value;
    const confirmPassword = document.getElementById('change-pwd-confirm').value;
    const errorEl = document.getElementById('change-pwd-error-msg');
    const submitBtn = document.getElementById('change-pwd-btn');
    
    errorEl.style.display = 'none';
    errorEl.innerText = '';
    
    if (newPassword !== confirmPassword) {
        errorEl.innerText = "Las contraseñas no coinciden.";
        errorEl.style.display = 'block';
        return;
    }
    
    submitBtn.disabled = true;
    
    try {
        const response = await window.fetch(`${API_BASE}/auth/change-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username,
                old_password: oldPassword,
                new_password: newPassword
            })
        });
        
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.detail || "Error al actualizar la contraseña.");
        }
        
        if (data.status === 'success') {
            localStorage.setItem('token', data.token);
            localStorage.setItem('username', data.user.username);
            localStorage.setItem('full_name', data.user.full_name);
            localStorage.setItem('role', data.user.role);
            
            // Limpiar formulario de cambio
            document.getElementById('login-form').style.display = 'block';
            document.getElementById('change-pwd-form').style.display = 'none';
            document.getElementById('change-pwd-new').value = '';
            document.getElementById('change-pwd-confirm').value = '';
            
            checkAuthSession();
        }
    } catch (err) {
        errorEl.innerText = err.message;
        errorEl.style.display = 'block';
    } finally {
        submitBtn.disabled = false;
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('full_name');
    localStorage.removeItem('role');
    
    document.body.classList.remove('logged-in');
    if (document.getElementById('mobile-bottom-nav')) document.getElementById('mobile-bottom-nav').style.display = 'none';
    
    document.getElementById('login-email').value = '';
    document.getElementById('login-password').value = '';
    document.getElementById('login-error-msg').style.display = 'none';
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('change-pwd-form').style.display = 'none';
}

function applyRoleRestrictions() {
    const isAdv = isAdvisor();
    const configGroup = document.getElementById('cmr-group-config');
    if (configGroup) {
        configGroup.style.display = isAdv ? 'none' : 'block';
    }
    // RBAC v8.0.0 — 4 roles: SUPERUSER > DIRECTOR > ADMIN (tecnico) > USER (asesor)
    const showEl = (id) => { const el = document.getElementById(id); if (el) el.style.display = 'flex'; };
    const hideEl = (id) => { const el = document.getElementById(id); if (el) el.style.display = 'none'; };

    // Panel General: Ancla principal de navegación, siempre visible
    showEl('nav-overview'); showEl('bot-nav-overview');

    // Chatbot Logs: solo Director y Superusuario
    if (isDirectorOrSuperUser()) {
        showEl('nav-chat');     showEl('bot-nav-chat');
    } else {
        hideEl('nav-chat');     hideEl('bot-nav-chat');
    }

    // Comunicaciones & Bitácora Feed (v12.13.0): Visible en el menú lateral
    showEl('nav-logs'); showEl('bot-nav-logs');

    // Marketing & Redes Sociales (v12.14.0): Visible para todos los roles autorizados
    showEl('nav-social-publisher');

    // Usuarios: Director, Admin Tecnico, Superusuario
    if (isDirectorOrSuperUser() || isAdminTecnico()) {
        showEl('nav-users'); showEl('bot-nav-users');
    } else {
        hideEl('nav-users'); hideEl('bot-nav-users');
    }

    // Configuracion del Sistema: Admin Tecnico y Superusuario
    if (isSuperUser() || isAdminTecnico()) {
        showEl('nav-config'); showEl('bot-nav-config');
    } else {
        hideEl('nav-config'); hideEl('bot-nav-config');
    }

    // CSS adicional segun rol
    const existing = document.getElementById('role-restrict-styles');
    if (existing) existing.remove();
    const style = document.createElement('style');
    style.id = 'role-restrict-styles';
    if (isAdvisor()) {
        style.innerHTML = [
            '.action-icon-btn.delete { display: none !important; }',
            '#delete-customer-btn { display: none !important; }',
            '#modal-cust-type { pointer-events: none !important; }',
            '.director-only-action { display: none !important; }',
            '#cmr-tab-packages { display: none !important; }',
            '#cmr-tab-rates { display: none !important; }',
            '#cmr-tab-zones { display: none !important; }'
        ].join(' ');
    } else {
        style.innerHTML = '';
    }
    document.head.appendChild(style);

    // Bottom nav visible para todos los roles
    const bottomNav = document.getElementById('mobile-bottom-nav');
    if (bottomNav) bottomNav.style.display = 'flex';
}

