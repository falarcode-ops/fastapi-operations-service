

// ── LOGICA DE CONFIGURACION DE CUENTA / MI PERFIL (v3.3.0) ────────────────────
async function openProfileSettingsModal() {
    const username = localStorage.getItem('username');
    if (!username) return;
    
    const statusMsg = document.getElementById('profile-status-msg');
    if (statusMsg) {
        statusMsg.innerText = '';
        statusMsg.className = '';
    }
    
    try {
        const res = await apiFetch(`${API_BASE}/employees/${username}`);
        if (!res.ok) {
            throw new Error("No se pudieron cargar los datos de perfil.");
        }
        const emp = await res.json();
        
        // Poblar campos
        document.getElementById('prof-fullname').value = emp.full_name || '';
        document.getElementById('prof-email').value = emp.email || '';
        parsePhoneField(emp.phone, 'prof-phone-prefix', 'prof-phone');
        document.getElementById('prof-signature').value = emp.signature || '';
        document.getElementById('prof-password').value = '';
        document.getElementById('prof-password-confirm').value = '';
        
        const role = localStorage.getItem('role') || 'USER';
        
        // Habilitar campos editables condicionalmente para Admin/Superusuario
        const elProfUsername = document.getElementById('prof-username-input');
        if (elProfUsername) {
            elProfUsername.value = emp.username || '';
            if (role === 'USER') {
                elProfUsername.readOnly = true;
                elProfUsername.style.opacity = '0.7';
                elProfUsername.style.cursor = 'not-allowed';
            } else {
                elProfUsername.readOnly = false;
                elProfUsername.style.opacity = '1';
                elProfUsername.style.cursor = 'text';
            }
        }

        const fields = [
            { id: 'prof-fullname', isSelect: false },
            { id: 'prof-email', isSelect: false },
            { id: 'prof-phone', isSelect: false },
            { id: 'prof-phone-prefix', isSelect: true }
        ];
        fields.forEach(f => {
            const el = document.getElementById(f.id);
            if (el) {
                if (role === 'USER') {
                    if (f.isSelect) el.disabled = true;
                    else el.readOnly = true;
                    el.style.opacity = '0.7';
                    el.style.cursor = 'not-allowed';
                } else {
                    if (f.isSelect) el.disabled = false;
                    else el.readOnly = false;
                    el.style.opacity = '1';
                    el.style.cursor = 'default';
                }
            }
        });
        
        // Ocultar/Mostrar advertencia de empresa y rejilla de sólo lectura
        const readOnlyGrid = document.getElementById('prof-read-only-grid');
        if (readOnlyGrid) {
            readOnlyGrid.style.display = role === 'USER' ? 'grid' : 'none';
        }
        
        const companyWarning = document.getElementById('prof-company-warning');
        if (companyWarning) {
            companyWarning.style.display = role === 'USER' ? 'block' : 'none';
        }
        
        // Mostrar sección de integraciones para admin/superuser
        const integrationsSec = document.getElementById('prof-integrations-section');
        if (integrationsSec) {
            integrationsSec.style.display = role === 'USER' ? 'none' : 'block';
        }
        
        document.getElementById('prof-smtp-host').value = emp.smtp_host || '';
        document.getElementById('prof-smtp-port').value = emp.smtp_port !== null ? emp.smtp_port : '587';
        document.getElementById('prof-smtp-user').value = emp.smtp_user || '';
        document.getElementById('prof-smtp-password').value = emp.smtp_password || '';
        document.getElementById('prof-smtp-from').value = emp.smtp_from_email || '';
        
        if (document.getElementById('prof-telegram-token')) document.getElementById('prof-telegram-token').value = emp.telegram_bot_token || '';
        const profTelChat = document.getElementById('prof-telegram-chat');
        if (profTelChat) profTelChat.value = emp.telegram_chat_id || '';

        
        document.getElementById('prof-whatsapp-phone').value = emp.whatsapp_phone_number || '';
        document.getElementById('prof-whatsapp-token').value = emp.whatsapp_api_token || '';
        document.getElementById('prof-whatsapp-url').value = emp.whatsapp_gateway_url || '';

        if (typeof loadUserSocialAccountInProfile === 'function') {
            loadUserSocialAccountInProfile(emp.username);
        }

        // Poblar campos de lectura del perfil simplificado
        const avatarCircle = document.getElementById('prof-avatar-circle');
        if (avatarCircle) avatarCircle.innerText = (emp.username || '').slice(0, 2).toUpperCase();
        
        const fullnameDisplay = document.getElementById('prof-fullname-display');
        if (fullnameDisplay) fullnameDisplay.innerText = emp.full_name || '';
        
        const roleDisplay = document.getElementById('prof-role-display');
        if (roleDisplay) {
            const roleLabels = {
                'SUPERUSER': 'Superusuario',
                'ADMINISTRATOR': 'Administrador',
                'USER': 'Asesor Comercial'
            };
            roleDisplay.innerText = roleLabels[emp.role] || emp.role || '';
        }
        
        const emailDisplay = document.getElementById('prof-email-display');
        if (emailDisplay) emailDisplay.innerText = emp.email || 'No asignado';
        
        const phoneDisplay = document.getElementById('prof-phone-display');
        if (phoneDisplay) phoneDisplay.innerText = emp.phone || 'No asignado';
        
        // Cargar vista previa de firma
        const previewBox = document.getElementById('prof-signature-preview-box');
        if (previewBox) {
            const uName = (emp.username || '').toLowerCase();
            const pngUrl = `https://coralis.alacor.net/uploads/signatures/${uName}_signature.png`;
            const jpgUrl = `https://coralis.alacor.net/uploads/signatures/${uName}_signature.jpg`;
            const jpegUrl = `https://coralis.alacor.net/uploads/signatures/${uName}_signature.jpeg`;
            
            previewBox.innerHTML = `<img src="${pngUrl}?t=${Date.now()}" style="max-height:60px; max-width:260px; object-fit:contain;" onerror="this.onerror=null; this.src='${jpgUrl}?t=${Date.now()}'; this.onerror=function(){ this.onerror=null; this.src='${jpegUrl}?t=${Date.now()}'; this.onerror=function(){ this.parentNode.innerHTML='<span style=\\'font-size:0.78rem; color:var(--text-muted);\\'>Sin imagen de firma manuscrita cargada</span>'; }; };" alt="Firma">`;
        }

        // Abrir modal
        document.getElementById('my-profile-modal').classList.add('active');
    } catch(e) {
        console.error(e);
        alert(e.message);
    }
}

function closeProfileSettingsModal() {
    document.getElementById('my-profile-modal').classList.remove('active');
}

function showProfileStatus(msg, type) {
    const el = document.getElementById('profile-status-msg');
    if (!el) return;
    el.innerText = msg;
    el.className = 'status-msg ' + type;
    if (type === 'success') {
        setTimeout(() => { if (el.innerText === msg) el.innerText = ''; }, 5000);
    }
}

async function saveUserProfileSilent() {
    const username = localStorage.getItem('username');
    if (!username) return false;
    
    // Los campos que no se pueden editar se envían vacíos o con su valor actual (el backend solo modificará password)
    const payload = {
        username: document.getElementById('prof-username-input') ? document.getElementById('prof-username-input').value.trim() : username,
        email: document.getElementById('prof-email').value,
        phone: buildPhoneValue('prof-phone-prefix', 'prof-phone'),
        signature: document.getElementById('prof-signature').value,
        smtp_host: document.getElementById('prof-smtp-host').value,
        smtp_port: parseInt(document.getElementById('prof-smtp-port').value) || 587,
        smtp_user: document.getElementById('prof-smtp-user').value,
        smtp_password: document.getElementById('prof-smtp-password').value,
        smtp_from_email: document.getElementById('prof-smtp-from')?.value || '',
        telegram_bot_token: document.getElementById('prof-telegram-token')?.value || '',
        telegram_chat_id: document.getElementById('prof-telegram-chat')?.value || '',

        whatsapp_phone_number: document.getElementById('prof-whatsapp-phone').value,
        whatsapp_api_token: document.getElementById('prof-whatsapp-token').value,
        whatsapp_gateway_url: document.getElementById('prof-whatsapp-url').value
    };
    
    const newPwd = document.getElementById('prof-password').value;
    if (newPwd) {
        payload.password = newPwd;
        payload.must_change_password = false;
    }
    
    try {
        const res = await apiFetch(`${API_BASE}/employees/${username}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.detail || "Error al guardar el perfil.");
        }
        const updated = await res.json();
        if (updated.username && updated.username !== username) {
            localStorage.setItem('username', updated.username);
            const headerName = document.getElementById('header-user-name');
            if (headerName) headerName.innerText = updated.username;
            const avatar = document.getElementById('header-user-avatar');
            if (avatar) avatar.innerText = updated.username.slice(0, 2).toUpperCase();
        }
        if (updated.email) {
            localStorage.setItem('email', updated.email);
        }
        return true;
    } catch(e) {
        showProfileStatus("Error: " + e.message, "error");
        return false;
    }
}

async function saveUserProfile(event) {
    if (event) event.preventDefault();
    
    const newPwd = document.getElementById('prof-password').value;
    const confirmPwd = document.getElementById('prof-password-confirm').value;
    
    if (newPwd !== confirmPwd) {
        showProfileStatus("Las contraseñas no coinciden.", "error");
        return;
    }
    
    const btn = document.getElementById('prof-save-btn');
    const original = btn.innerText;
    btn.innerText = 'Guardando...';
    btn.disabled = true;
    
    showProfileStatus("Guardando configuraciones...", "info");
    
    const success = await saveUserProfileSilent();
    if (success) {
        showProfileStatus("Cambios guardados correctamente.", "success");
        document.getElementById('prof-password').value = '';
        document.getElementById('prof-password-confirm').value = '';
        
        // Actualizar vistas en tiempo real
        const newEmail = document.getElementById('prof-email').value;
        const newPhone = document.getElementById('prof-phone').value;
        const newFullname = document.getElementById('prof-fullname').value;
        
        const emailDisplay = document.getElementById('prof-email-display');
        if (emailDisplay) emailDisplay.innerText = newEmail || 'No asignado';
        const phoneDisplay = document.getElementById('prof-phone-display');
        if (phoneDisplay) phoneDisplay.innerText = newPhone || 'No asignado';
        const fullnameDisplay = document.getElementById('prof-fullname-display');
        if (fullnameDisplay) fullnameDisplay.innerText = newFullname || '';
    }
    
    btn.innerText = original;
    btn.disabled = false;
}

async function testProfileEmail() {
    const success = await saveUserProfileSilent();
    if (!success) return;
    
    const email = prompt("Ingrese el correo de destino para la prueba:", localStorage.getItem('email') || '');
    if (!email) return;
    
    showProfileStatus("Enviando correo de prueba...", "info");
    try {
        const res = await apiFetch(`${API_BASE}/integrations/test-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                to_email: email,
                subject: "Correo de Prueba - Coralis CRM",
                body_html: "<h3>¡Conexión Exitosa!</h3><p>Este es un correo de prueba enviado usando tus credenciales SMTP configuradas en Coralis.</p>"
            })
        });
        if (res.ok) {
            showProfileStatus("Correo de prueba encolado exitosamente.", "success");
        } else {
            const data = await res.json();
            showProfileStatus("Error al probar correo: " + (data.detail || "Fallo en el servidor"), "error");
        }
    } catch(e) {
        showProfileStatus("Error de red al probar correo.", "error");
    }
}

async function testProfileTelegram() {
    const success = await saveUserProfileSilent();
    if (!success) return;
    
    showProfileStatus("Enviando alerta de prueba a Telegram...", "info");
    try {
        const res = await apiFetch(`${API_BASE}/integrations/test-telegram`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: "<b>¡Conexión Exitosa!</b>\nEste es un mensaje de prueba de alertas enviado usando tus credenciales personales de Telegram en Coralis."
            })
        });
        if (res.ok) {
            showProfileStatus("Alerta de Telegram encolada exitosamente.", "success");
        } else {
            const data = await res.json();
            showProfileStatus("Error: " + (data.detail || "Fallo"), "error");
        }
    } catch(e) {
        showProfileStatus("Error de red.", "error");
    }
}

async function testProfileWhatsapp() {
    const success = await saveUserProfileSilent();
    if (!success) return;
    
    const phone = prompt("Ingrese el número de celular de prueba (ej. 573001234567, con código de país sin +):", "");
    if (!phone) return;
    
    showProfileStatus("Enviando mensaje de prueba de WhatsApp...", "info");
    try {
        const res = await apiFetch(`${API_BASE}/integrations/test-whatsapp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                to_phone: phone,
                message: "¡Conexión Exitosa!\nEste es un mensaje de prueba enviado usando tus credenciales personales de WhatsApp en Coralis."
            })
        });
        if (res.ok) {
            showProfileStatus("Mensaje de WhatsApp encolado exitosamente.", "success");
        } else {
            const data = await res.json();
            showProfileStatus("Error: " + (data.detail || "Fallo"), "error");
        }
    } catch(e) {
        showProfileStatus("Error de red.", "error");
    }
}

async function uploadSignatureImage(type) {
    const fileInput = document.getElementById(type === 'emp' ? 'emp-sig-file' : 'prof-sig-file');
    const statusDiv = document.getElementById(type === 'emp' ? 'emp-sig-upload-status' : 'prof-sig-upload-status');
    const textarea = document.getElementById(type === 'emp' ? 'emp-signature' : 'prof-signature');
    
    if (!fileInput.files || fileInput.files.length === 0) return;
    
    const file = fileInput.files[0];
    
    // Obtener nombre de usuario destino
    let username = '';
    if (type === 'emp') {
        username = window.activeEditingUsername || document.getElementById('emp-username')?.value?.trim() || document.getElementById('emp-selector')?.value;
        if (!username) {
            alert("Por favor, seleccione o cargue un empleado antes de subir una firma.");
            fileInput.value = '';
            return;
        }
    } else {
        username = localStorage.getItem('username');
    }
    
    statusDiv.innerText = "Subiendo imagen...";
    statusDiv.style.color = "var(--accent-cyan)";
    
    const formData = new FormData();
    formData.append("file", file);
    
    try {
        const res = await apiFetch(`${API_BASE}/employees/${username}/upload-signature`, {
            method: 'POST',
            body: formData
        });
        
        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.detail || "Fallo al subir archivo");
        }
        
        const data = await res.json();
        statusDiv.innerText = "Firma subida exitosamente.";
        statusDiv.style.color = "#10b981";
        
        // Actualizar textarea con la etiqueta HTML de la firma
        textarea.value = data.html;
        if (data.url) _uploadedSignatureImgUrl = data.url;
        updateSignaturePreview(type);
        
        // Limpiar el selector de archivo
        fileInput.value = '';
    } catch(e) {
        console.error(e);
        statusDiv.innerText = "Error: " + e.message;
        statusDiv.style.color = "#ef4444";
    }
}

function parsePhoneField(phoneVal, prefixId, phoneId) {
    const elPrefix = document.getElementById(prefixId);
    const elPhone = document.getElementById(phoneId);
    if (!elPrefix || !elPhone) return;

    if (!phoneVal) {
        elPrefix.value = '57'; // Default Colombia
        elPhone.value = '';
        return;
    }

    // Limpiar espacios y guiones
    let clean = phoneVal.replace(/[\s\-\(\)]/g, '');
    
    // Si empieza con +, extraer el prefijo numérico
    if (clean.startsWith('+')) {
        clean = clean.slice(1); // Quitar el +
        // Buscar si coincide con alguno de los prefijos conocidos
        const prefixes = ['593', '57', '34', '52', '54', '58', '51', '56', '55', '1'];
        let matched = false;
        for (const pref of prefixes) {
            if (clean.startsWith(pref)) {
                elPrefix.value = pref;
                elPhone.value = clean.slice(pref.length);
                matched = true;
                break;
            }
        }
        if (!matched) {
            // Si no coincide con ninguno, asumir default +57 o guardar entero
            elPrefix.value = '57';
            elPhone.value = phoneVal;
        }
    } else {
        // Si no empieza con +, pero empieza con un prefijo conocido
        const prefixes = ['593', '57', '34', '52', '54', '58', '51', '56', '55', '1'];
        let matched = false;
        for (const pref of prefixes) {
            if (clean.startsWith(pref) && clean.length > pref.length + 5) {
                elPrefix.value = pref;
                elPhone.value = clean.slice(pref.length);
                matched = true;
                break;
            }
        }
        if (!matched) {
            elPrefix.value = '57';
            elPhone.value = phoneVal;
        }
    }
}
