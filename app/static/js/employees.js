// ── USER SPECIAL PERMISSIONS MODAL ──────────────────────────────────────────
async function openUserSpecialPermsModal(username) {
    const emp = _allEmployeesData.find(e => e.username === username) || { username, full_name: username };
    
    // Fetch active overrides for user
    let overrides = [];
    try {
        const res = await apiFetch(`${PERM_API}/users/${username}`);
        if (res.ok) overrides = await res.json();
    } catch(e) {}

    const commonPerms = [
        { key: 'overview.view', label: 'Ver Panel Comercial de Métricas' },
        { key: 'requests.assign', label: 'Reasignar Prospectos a Asesores' },
        { key: 'commercial_config.view', label: 'Ver Tarifario Interno y Paquetes' },
        { key: 'commercial_config.edit', label: 'Editar Tarifario, Paquetes y Zonas' },
        { key: 'customers.delete', label: 'Eliminar Clientes de la Base de Datos' },
        { key: 'users.edit', label: 'Editar Usuarios y Credenciales' },
        { key: 'social.personal_publish', label: 'Publicar en Redes Sociales Personales (LinkedIn)' }
    ];

    const rowsHtml = commonPerms.map(p => {
        const match = overrides.find(o => o.permission_key === p.key);
        const status = match ? (match.granted ? 'allow' : 'deny') : 'default';
        return `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--border-color); font-size:0.82rem;">
            <div>
                <div style="font-weight:600; color:var(--text-primary);">${p.label}</div>
                <code style="font-size:0.72rem; color:var(--text-muted);">${p.key}</code>
            </div>
            <select onchange="saveUserOverride('${username}', '${p.key}', this.value)" style="font-size:0.78rem; padding:4px 8px; border-radius:6px; background:var(--card-bg); color:var(--text-primary); border:1px solid var(--border-color);">
                <option value="default" ${status==='default'?'selected':''}>Según Rol Base</option>
                <option value="allow" ${status==='allow'?'selected':''}>Permitir (Explícito)</option>
                <option value="deny" ${status==='deny'?'selected':''}>Denegar (Explícito)</option>
            </select>
        </div>`;
    }).join('');

    const modalHtml = `
    <div class="modal-overlay active" id="user-special-perms-modal" onclick="if(event.target===this)closeUserSpecialPermsModal()">
        <div class="modal-card" style="max-width:520px;" onclick="event.stopPropagation()">
            <div class="modal-header">
                <h3>Permisos Especiales: ${emp.full_name} (${username})</h3>
                <button class="modal-close" onclick="closeUserSpecialPermsModal()">✕</button>
            </div>
            <div style="padding:20px;">
                <p style="margin:0 0 14px 0; font-size:0.8rem; color:var(--text-muted);">
                    Configura excepciones directas para este usuario. Las excepciones 'Permitir' o 'Denegar' anulan la regla por defecto de su rol base.
                </p>
                <div style="display:flex; flex-direction:column; gap:4px; max-height:360px; overflow-y:auto; padding-right:4px;">
                    ${rowsHtml}
                </div>
                <div style="display:flex; justify-content:flex-end; margin-top:16px;">
                    <button class="btn-primary" onclick="closeUserSpecialPermsModal()">Listo / Cerrar</button>
                </div>
            </div>
        </div>
    </div>`;

    const existing = document.getElementById('user-special-perms-modal');
    if (existing) existing.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function closeUserSpecialPermsModal() {
    const m = document.getElementById('user-special-perms-modal');
    if (m) m.remove();
}
function cancelEmployeeEdit() {
    const editor = document.getElementById('card-employee-form') || document.getElementById('emp-editor');
    if (editor) editor.style.display = 'none';
    window.activeEditingUsername = null;
    const sel = document.getElementById('emp-selector');
    if (sel) sel.value = '';
}

let employeeEditorMode = 'edit'; // 'edit' o 'create'

function openNewEmployeeForm() {
    employeeEditorMode = 'create';
    const sel = document.getElementById('emp-selector');
    if (sel) sel.value = '';
    
    // Configurar campos de creación
    const elUsername = document.getElementById('emp-username');
    if (elUsername) {
        elUsername.value = '';
        elUsername.readOnly = false;
    }
    const elPwdLabel = document.getElementById('emp-password-label');
    if (elPwdLabel) elPwdLabel.innerText = 'Contraseña Temporal (Obligatoria):';
    const elPwd = document.getElementById('emp-password');
    if (elPwd) {
        elPwd.value = '';
        elPwd.placeholder = 'Ej. Temp123';
    }
    const elStatus = document.getElementById('emp-status');
    if (elStatus) elStatus.value = 'true';
    
    // Limpiar campos comunes
    const elFullname = document.getElementById('emp-fullname');
    if (elFullname) elFullname.value = '';
    const elRole = document.getElementById('emp-role');
    if (elRole) elRole.value = 'USER';
    const elEmail = document.getElementById('emp-email');
    if (elEmail) elEmail.value = '';
    if (document.getElementById('emp-phone-prefix')) {
        document.getElementById('emp-phone-prefix').value = '57';
    }
    const elPhone = document.getElementById('emp-phone');
    if (elPhone) elPhone.value = '';
    const elSig = document.getElementById('emp-signature');
    if (elSig) elSig.value = '';
    
    // Limpiar integraciones
    const elSmtpHost = document.getElementById('emp-smtp-host');
    if (elSmtpHost) elSmtpHost.value = '';
    const elSmtpPort = document.getElementById('emp-smtp-port');
    if (elSmtpPort) elSmtpPort.value = '587';
    const elSmtpUser = document.getElementById('emp-smtp-user');
    if (elSmtpUser) elSmtpUser.value = '';
    const elSmtpPwd = document.getElementById('emp-smtp-password');
    if (elSmtpPwd) elSmtpPwd.value = '';
    const elSmtpFrom = document.getElementById('emp-smtp-from');
    if (elSmtpFrom) elSmtpFrom.value = '';
    
    if (document.getElementById('emp-telegram-token')) document.getElementById('emp-telegram-token').value = '';
    const empTelChat = document.getElementById('emp-telegram-chat');
    if (empTelChat) empTelChat.value = '';

    const elWaPhone = document.getElementById('emp-whatsapp-phone');
    if (elWaPhone) elWaPhone.value = '';
    const elWaTok = document.getElementById('emp-whatsapp-token');
    if (elWaTok) elWaTok.value = '';
    const elWaUrl = document.getElementById('emp-whatsapp-url');
    if (elWaUrl) elWaUrl.value = '';
    if (typeof resetUserSocialAccountForm === 'function') resetUserSocialAccountForm();
    
    // Mostrar editor y ajustar textos del botón
    const editor = document.getElementById('card-employee-form') || document.getElementById('emp-editor');
    if (editor) {
        editor.style.display = 'block';
        editor.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    const shareSec = document.getElementById('emp-credentials-share-block') || document.getElementById('emp-share-section');
    if (shareSec) shareSec.style.display = 'none';
    const saveBtn = document.getElementById('emp-save-btn');
    if (saveBtn) saveBtn.innerText = 'Crear Usuario';
    
    const statusMsg = document.getElementById('emp-status-msg');
    if (statusMsg) statusMsg.innerText = '';
}

function loadEmployeeData(targetUsername) {
    try {
        employeeEditorMode = 'edit';
        const username = targetUsername || document.getElementById('emp-selector')?.value;
        const editor = document.getElementById('card-employee-form') || document.getElementById('emp-editor');
        if (!username) {
            if (editor) editor.style.display = 'none';
            return;
        }
        
        const emp = (typeof employeesList !== 'undefined' && employeesList ? employeesList.find(e => e.username === username) : null) 
                 || (typeof _allEmployeesData !== 'undefined' && _allEmployeesData ? _allEmployeesData.find(e => e.username === username) : null);
        if (!emp) return;

        if (editor) {
            editor.style.display = 'block';
            editor.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        // Configurar campos en modo edición
        const elUsername = document.getElementById('emp-username');

        if (elUsername) {
            elUsername.value = emp.username || '';
            elUsername.readOnly = false;
        }
        
        const elPwdLabel = document.getElementById('emp-password-label');
        if (elPwdLabel) {
            elPwdLabel.innerText = 'Restablecer Contraseña (dejar vacío para no cambiar):';
        }
        
        const elPwd = document.getElementById('emp-password');
        if (elPwd) {
            elPwd.value = '';
            elPwd.placeholder = 'Nueva contraseña para el usuario';
        }
        
        const elStatus = document.getElementById('emp-status');
        if (elStatus) {
            elStatus.value = emp.is_active !== false ? 'true' : 'false';
        }

        window.activeEditingUsername = emp.username;
        document.getElementById('emp-fullname').value = emp.full_name || '';
        document.getElementById('emp-role').value = emp.role || 'USER';
        document.getElementById('emp-email').value = emp.email || '';
        const phoneEl = document.getElementById('emp-phone');
        if (phoneEl) phoneEl.value = emp.phone || '';
        if (document.getElementById('emp-phone-prefix')) {
            parsePhoneField(emp.phone, 'emp-phone-prefix', 'emp-phone');
        }
        const sigEl = document.getElementById('emp-signature');
        if (sigEl) {
            sigEl.value = emp.signature || '';
            parseSignatureToVisualFields(emp.signature);
            updateSignaturePreview('emp');
        }
        
        // Poblar integraciones
        document.getElementById('emp-smtp-host').value = emp.smtp_host || '';
        document.getElementById('emp-smtp-port').value = emp.smtp_port !== null ? emp.smtp_port : '587';
        document.getElementById('emp-smtp-user').value = emp.smtp_user || '';
        document.getElementById('emp-smtp-password').value = emp.smtp_password || '';
        document.getElementById('emp-smtp-from').value = emp.smtp_from_email || '';
        
        if (document.getElementById('emp-telegram-token')) document.getElementById('emp-telegram-token').value = emp.telegram_bot_token || '';
        const empTelChatPop = document.getElementById('emp-telegram-chat');
        if (empTelChatPop) empTelChatPop.value = emp.telegram_chat_id || '';

        
        document.getElementById('emp-whatsapp-phone').value = emp.whatsapp_phone_number || '';
        document.getElementById('emp-whatsapp-token').value = emp.whatsapp_api_token || '';
        document.getElementById('emp-whatsapp-url').value = emp.whatsapp_gateway_url || '';
        if (typeof loadUserSocialAccountInForm === 'function') loadUserSocialAccountInForm(emp.username);
        
        document.getElementById('emp-save-btn').innerText = 'Guardar Datos del Usuario';
        
        const shareSection = document.getElementById('emp-share-section');
        if (shareSection) shareSection.style.display = 'block';
        
        const shareStatus = document.getElementById('emp-share-status');
        if (shareStatus) shareStatus.innerText = '';
        
        editor.style.display = 'block';
        setTimeout(() => {
            editor.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 50);

        const statusMsg = document.getElementById('emp-status-msg');
        if (statusMsg) statusMsg.innerText = '';
    } catch (e) {
        console.error('Error inside loadEmployeeData:', e);
        alert('Error al cargar datos de empleado: ' + e.message + '\n\nPor favor, intente recargar la página con Ctrl + F5 para limpiar la caché de su navegador.');
    }
}

async function saveEmployeeData(closeOnSuccess = true) {
    const btn = document.getElementById('emp-save-btn');
    const original = btn ? btn.innerText : '';
    
    if (btn) {
        btn.innerText = 'Procesando...';
        btn.disabled = true;
    }
    
    try {
        const phoneField = document.getElementById('emp-phone');
        const phoneVal = (document.getElementById('emp-phone-prefix') && typeof buildPhoneValue === 'function') 
            ? buildPhoneValue('emp-phone-prefix', 'emp-phone') 
            : (phoneField ? phoneField.value : '');

        let payload = {
            full_name: document.getElementById('emp-fullname')?.value || '',
            role: document.getElementById('emp-role')?.value || 'USER',
            email: document.getElementById('emp-email')?.value || '',
            phone: phoneVal,
            signature: document.getElementById('emp-signature')?.value || '',
            is_active: document.getElementById('emp-status')?.value === 'true',
            
            // Integraciones
            smtp_host: document.getElementById('emp-smtp-host')?.value || '',
            smtp_port: parseInt(document.getElementById('emp-smtp-port')?.value) || null,
            smtp_user: document.getElementById('emp-smtp-user')?.value || '',
            smtp_password: document.getElementById('emp-smtp-password')?.value || '',
            smtp_from_email: document.getElementById('emp-smtp-from')?.value || '',
            telegram_bot_token: document.getElementById('emp-telegram-token')?.value || '',
            telegram_chat_id: document.getElementById('emp-telegram-chat')?.value || '',
            whatsapp_phone_number: document.getElementById('emp-whatsapp-phone')?.value || '',
            whatsapp_api_token: document.getElementById('emp-whatsapp-token')?.value || '',
            whatsapp_gateway_url: document.getElementById('emp-whatsapp-url')?.value || ''
        };

        let targetUser = (window.activeEditingUsername || document.getElementById('emp-username')?.value || '').trim();
        let url = '';
        let method = 'PUT';

        if (employeeEditorMode === 'create') {
            targetUser = document.getElementById('emp-username')?.value?.trim();
            const password = document.getElementById('emp-password')?.value?.trim();
            
            if (!targetUser || !password) {
                showToast('El usuario y la contraseña temporal son obligatorios.', 'error');
                return false;
            }
            
            payload.username = targetUser;
            payload.password = password;
            url = `${API_BASE}/employees`;
            method = 'POST';
        } else {
            if (!targetUser) {
                showToast('Seleccione un usuario válido para editar.', 'error');
                return false;
            }
            
            const newUsername = document.getElementById('emp-username')?.value?.trim() || targetUser;
            payload.username = newUsername;
            
            const password = document.getElementById('emp-password')?.value?.trim();
            if (password) {
                payload.password = password;
            }
            
            url = `${API_BASE}/employees/${targetUser}`;
            method = 'PUT';
        }

        const res = await apiFetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (res.ok) {
            if (closeOnSuccess) {
                showToast(employeeEditorMode === 'create' ? 'Usuario creado exitosamente.' : 'Datos del usuario actualizados.', 'success');
                await loadEmployeeSelector();
                const editor = document.getElementById('card-employee-form') || document.getElementById('emp-editor');
                if (editor) editor.style.display = 'none';
            }
            return true;
        } else {
            const err = await res.json();
            showToast(err.detail || 'Error al guardar los datos del usuario.', 'error');
            return false;
        }
    } catch(e) {
        showToast(e.message, 'error');
        return false;
    } finally {
        if (btn) {
            btn.innerText = original;
            btn.disabled = false;
        }
    }
}

async function sendEmployeeCredentials(method) {
    const statusDiv = document.getElementById('emp-share-status');
    if (!statusDiv) return;
    statusDiv.className = 'status-msg';
    statusDiv.innerText = 'Guardando datos del empleado primero...';
    
    // 1. Guardar primero
    const saveSuccess = await saveEmployeeData();
    if (!saveSuccess) {
        statusDiv.className = 'status-msg error';
        statusDiv.innerText = 'No se pudo enviar porque no se pudieron guardar los cambios.';
        return;
    }
    
    const username = document.getElementById('emp-username').value.trim();
    const password = document.getElementById('emp-password').value.trim();
    
    statusDiv.className = 'status-msg';
    statusDiv.innerText = `Enviando credenciales por ${method}...`;
    
    try {
        const res = await apiFetch(`${API_BASE}/employees/${username}/send-credentials`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                method: method,
                password: password || null
            })
        });
        const data = await res.json();
        if (res.ok) {
            statusDiv.className = 'status-msg success';
            statusDiv.innerText = `Credenciales enviadas correctamente por ${method}.`;
        } else {
            statusDiv.className = 'status-msg error';
            statusDiv.innerText = `Error: ${data.detail || 'No se pudo enviar.'}`;
        }
    } catch (e) {
        console.error('Error sending credentials:', e);
        statusDiv.className = 'status-msg error';
        statusDiv.innerText = 'Error de red al enviar credenciales.';
    }
    
    setTimeout(() => { statusDiv.innerText = ''; }, 6000);
}

async function testEmployeeEmail() {
    const username = window.activeEditingUsername || document.getElementById('emp-username')?.value?.trim();
    if (!username) {
        showToast("Por favor cargue o edite un usuario antes de realizar la prueba.", "error");
        return;
    }
    
    // Guardar cambios sin cerrar el editor
    const saved = await saveEmployeeData(false);
    if (!saved) return;
    
    const emailInput = document.getElementById('emp-email')?.value || '';
    const email = prompt("Ingrese el correo de destino para la prueba:", emailInput);
    if (!email) return;
    
    const statusMsg = document.getElementById('emp-status-msg');
    if (statusMsg) {
        statusMsg.innerText = 'Enviando correo de prueba...';
        statusMsg.className = 'status-msg info';
    }
    showToast('Enviando correo de prueba SMTP...', 'info');
    
    try {
        const res = await apiFetch(`${API_BASE}/integrations/test-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                to_email: email,
                subject: "Correo de Prueba - Coralis CRM",
                body_html: "<h3>¡Conexión Exitosa!</h3><p>Este es un correo de prueba enviado usando tus credenciales SMTP corporativas configuradas en Coralis CRM.</p>",
                username: username
            })
        });
        if (res.ok) {
            showToast('Correo de prueba encolado exitosamente.', 'success');
            if (statusMsg) {
                statusMsg.innerText = 'Correo de prueba encolado exitosamente.';
                statusMsg.className = 'status-msg success';
            }
        } else {
            const data = await res.json();
            const errMsg = data.detail || 'Fallo al enviar correo';
            showToast(errMsg, 'error');
            if (statusMsg) {
                statusMsg.innerText = 'Error: ' + errMsg;
                statusMsg.className = 'status-msg error';
            }
        }
    } catch(e) {
        showToast('Error de red al probar correo.', 'error');
        if (statusMsg) {
            statusMsg.innerText = 'Error de red.';
            statusMsg.className = 'status-msg error';
        }
    }
}

async function testEmployeeTelegram() {
    const username = window.activeEditingUsername || document.getElementById('emp-username')?.value?.trim();
    if (!username) {
        showToast("Por favor cargue o edite un usuario antes de realizar la prueba.", "error");
        return;
    }
    
    const chatId = document.getElementById('emp-telegram-chat')?.value?.trim();
    if (!chatId) {
        showToast("Ingrese el ID de Chat de Telegram antes de realizar la prueba.", "error");
        return;
    }
    
    // Guardar cambios sin cerrar el editor
    const saved = await saveEmployeeData(false);
    if (!saved) return;
    
    const statusMsg = document.getElementById('emp-status-msg');
    if (statusMsg) {
        statusMsg.innerText = 'Enviando alerta de prueba a Telegram...';
        statusMsg.className = 'status-msg info';
    }
    showToast('Enviando alerta de prueba a Telegram...', 'info');
    
    try {
        const res = await apiFetch(`${API_BASE}/integrations/test-telegram`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: `<b>¡Conexión Exitosa con Coralis CRM!</b>\n\nHola, esta es una alerta de prueba enviada desde el Bot Central corporativo al Chat ID <code>${chatId}</code> para el usuario <b>${username}</b>.`,
                username: username,
                chat_id: chatId
            })
        });
        
        if (res.ok) {
            const data = await res.json();
            const okMsg = data.message || 'Alerta de Telegram enviada exitosamente.';
            showToast(okMsg, 'success');
            if (statusMsg) {
                statusMsg.innerText = okMsg;
                statusMsg.className = 'status-msg success';
            }
        } else {
            const data = await res.json();
            const errMsg = data.detail || 'Fallo al enviar alerta de Telegram';
            showToast(errMsg, 'error');
            if (statusMsg) {
                statusMsg.innerText = 'Error: ' + errMsg;
                statusMsg.className = 'status-msg error';
            }
        }
    } catch(e) {
        showToast('Error de red al probar Telegram.', 'error');
        if (statusMsg) {
            statusMsg.innerText = 'Error de red.';
            statusMsg.className = 'status-msg error';
        }
    }
}

async function testEmployeeWhatsapp() {
    const username = window.activeEditingUsername || document.getElementById('emp-username')?.value?.trim();
    if (!username) {
        showToast("Por favor cargue o edite un usuario antes de realizar la prueba.", "error");
        return;
    }
    
    const saved = await saveEmployeeData(false);
    if (!saved) return;
    
    const phone = prompt("Ingrese el número de celular de prueba (ej. 573001234567, con código de país sin +):", "");
    if (!phone) return;

    
    const statusMsg = document.getElementById('emp-status-msg');
    if (statusMsg) {
        statusMsg.innerText = 'Enviando mensaje de prueba de WhatsApp...';
        statusMsg.className = 'status-msg info';
    }
    
    try {
        const res = await apiFetch(`${API_BASE}/integrations/test-whatsapp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                to_phone: phone,
                message: "¡Conexión Exitosa!\nEste es un mensaje de prueba enviado usando tus credenciales de WhatsApp en Coralis.",
                username: username
            })
        });
        if (res.ok) {
            statusMsg.innerText = 'Mensaje de WhatsApp encolado exitosamente.';
            statusMsg.className = 'status-msg success';
        } else {
            const data = await res.json();
            statusMsg.innerText = 'Error: ' + (data.detail || 'Fallo');
            statusMsg.className = 'status-msg error';
        }
    } catch(e) {
        statusMsg.innerText = 'Error de red.';
        statusMsg.className = 'status-msg error';
    }
}



