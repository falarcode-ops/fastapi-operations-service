/**
 * Coralis CRM — Chat & Bot Assistant Module (v12.1.0)
 * Handles real-time bot sessions, advisor replies, audio notifications & batch operations.
 */

// Module State
let activeChatSessionId = null;
let activeChatSessionStatus = 'OPEN';
let chatPollInterval = null;
let knownBotSessionIds = new Set();
let isChatSelectionMode = false;
let selectedChatSessionIds = new Set();

/**
 * Play dual-tone chime notification on incoming chat requests (Web Audio API)
 */
function playNotificationSound() {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const now = ctx.currentTime;
        
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(523.25, now); // C5
        gain1.gain.setValueAtTime(0.12, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.25);
        
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(783.99, now + 0.12); // G5
        gain2.gain.setValueAtTime(0.18, now + 0.12);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.12);
        osc2.stop(now + 0.45);
    } catch (e) {
        console.warn('Audio notification failed:', e);
    }
}

/**
 * Toggle multi-select mode for batch actions
 */
function toggleChatSelectionMode() {
    isChatSelectionMode = !isChatSelectionMode;
    selectedChatSessionIds.clear();
    
    const btn = document.getElementById('btn-toggle-chat-select');
    const batchBar = document.getElementById('chat-batch-action-bar');
    const selectAllChk = document.getElementById('chk-select-all-chats');
    
    if (btn) {
        btn.innerText = isChatSelectionMode ? 'Cancelar' : 'Seleccionar';
        btn.style.color = isChatSelectionMode ? '#ef4444' : 'var(--accent-cyan)';
    }
    if (batchBar) {
        batchBar.style.display = isChatSelectionMode ? 'flex' : 'none';
    }
    if (selectAllChk) selectAllChk.checked = false;
    
    updateSelectedChatsCount();
    renderBotSessionsList();
}

function updateSelectedChatsCount() {
    const cntEl = document.getElementById('selected-chats-count');
    if (cntEl) cntEl.innerText = selectedChatSessionIds.size;
}

function toggleSelectAllChats(checked) {
    if (checked) {
        (window.sessionsList || []).forEach(s => selectedChatSessionIds.add(s.session_id));
    } else {
        selectedChatSessionIds.clear();
    }
    updateSelectedChatsCount();
    renderBotSessionsList();
}

function toggleChatSelection(sessionId, event) {
    if (event) event.stopPropagation();
    if (selectedChatSessionIds.has(sessionId)) {
        selectedChatSessionIds.delete(sessionId);
    } else {
        selectedChatSessionIds.add(sessionId);
    }
    updateSelectedChatsCount();
    
    const selectAllChk = document.getElementById('chk-select-all-chats');
    if (selectAllChk) {
        const total = (window.sessionsList || []).length;
        selectAllChk.checked = total > 0 && selectedChatSessionIds.size === total;
    }
    
    renderBotSessionsList();
}

/**
 * Batch delete selected chat sessions
 */
async function executeBatchDeleteChats() {
    if (selectedChatSessionIds.size === 0) {
        showToast('Seleccione al menos una sesión para eliminar.', 'warning');
        return;
    }
    
    const ids = Array.from(selectedChatSessionIds);
    if (!confirm(`¿Está seguro de eliminar las ${ids.length} sesiones seleccionadas? Se borrarán sus mensajes permanentemente.`)) return;
    
    try {
        const res = await apiFetch(`${API_BASE}/bot-sessions/batch-delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_ids: ids })
        });
        
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.detail || 'Error al eliminar las sesiones seleccionadas');
        }
        
        const data = await res.json();
        showToast(`Eliminadas ${data.deleted_count} sesiones con éxito.`, 'success');
        
        if (ids.includes(activeChatSessionId)) {
            activeChatSessionId = null;
            const headerBar = document.getElementById('chat-header-bar');
            if (headerBar) headerBar.style.display = 'none';
            const replyBar = document.getElementById('chat-reply-bar');
            if (replyBar) replyBar.style.display = 'none';
            const container = document.getElementById('chat-messages-container');
            if (container) {
                container.innerHTML = '<div class="chat-empty-state"><span class="empty-icon"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg></span><p>Seleccione una conversación para ver los mensajes.</p></div>';
            }
        }
        
        toggleChatSelectionMode();
        loadBotSessions();
    } catch (error) {
        console.error('Error in batch delete:', error);
        showToast(error.message, 'error');
    }
}

/**
 * Render list of bot conversation sessions in sidebar
 */
function renderBotSessionsList() {
    const container = document.getElementById('session-list-container');
    if (!container) return;
    container.innerHTML = '';
    
    const list = window.sessionsList || [];
    list.forEach(sess => {
        const div = document.createElement('div');
        div.className = 'session-item' + (activeChatSessionId === sess.session_id ? ' active' : '');
        div.id = `sess-item-${sess.session_id}`;
        
        const dateStr = sess.started_at ? new Date(sess.started_at).toLocaleString() : '';
        const isChecked = selectedChatSessionIds.has(sess.session_id);
        const checkboxHtml = isChatSelectionMode 
            ? `<input type="checkbox" ${isChecked ? 'checked' : ''} style="margin-right:8px; cursor:pointer;" onclick="toggleChatSelection('${sess.session_id}', event)">`
            : '';
            
        const isClosed = (sess.status || '').toUpperCase() === 'CLOSED';
        const isUnhandled = !isClosed && (sess.agent_reply_count === 0 || sess.agent_reply_count === '0' || sess.agent_reply_count == null);
        
        let statusIconHtml = '';
        let borderStyle = '';
        
        if (isClosed) {
            statusIconHtml = `<span class="comm-dot comm-dot-slate" title="Conversación Cerrada" style="margin-left:auto;"></span>`;
            borderStyle = 'border-left: 3px solid #64748b; opacity: 0.8;';
        } else if (isUnhandled) {
            statusIconHtml = `<span class="comm-dot comm-dot-red" title="Nueva Solicitud - Sin Atender" style="margin-left:auto;"></span>`;
            borderStyle = 'border-left: 3px solid #ef4444; background: rgba(239, 68, 68, 0.04);';
        } else {
            statusIconHtml = `<span class="comm-dot comm-dot-green" title="Atendida por Asesor" style="margin-left:auto;"></span>`;
            borderStyle = 'border-left: 3px solid #10b981;';
        }

        div.style.cssText = borderStyle;

        const lastMsgSnippet = sess.last_message ? `<div style="font-size:0.68rem; color:var(--text-muted); text-overflow:ellipsis; overflow:hidden; white-space:nowrap; margin-top:2px;">${sess.last_message}</div>` : '';

        div.innerHTML = `
            <div style="display:flex; align-items:center;">
                ${checkboxHtml}
                <div style="flex:1; overflow:hidden;">
                    <div style="display:flex; align-items:center; gap:6px;">
                        <h4 style="margin:0; text-overflow:ellipsis; overflow:hidden; white-space:nowrap; flex:1;">${sess.visitor_name || 'Visitante'}</h4>
                        ${statusIconHtml}
                    </div>
                    <span style="font-size:0.7rem; color:var(--text-secondary);">${dateStr}</span>
                    ${lastMsgSnippet}
                </div>
            </div>
        `;
        div.onclick = (e) => {
            if (isChatSelectionMode) {
                toggleChatSelection(sess.session_id, e);
            } else {
                loadSessionDetails(sess.session_id, sess.visitor_name);
            }
        };
        container.appendChild(div);
    });
}

/**
 * Fetch bot sessions from server and update list
 */
async function loadBotSessions(silent = false) {
    try {
        const res = await apiFetch(`${API_BASE}/bot-sessions?limit=50`);
        if (!res.ok) return;
        const data = await res.json();
        
        // Audio chime on newly arrived chat sessions
        if (knownBotSessionIds.size > 0 && Array.isArray(data)) {
            const hasNewSession = data.some(s => s.session_id && !knownBotSessionIds.has(s.session_id));
            if (hasNewSession) {
                playNotificationSound();
            }
        }
        
        if (Array.isArray(data)) {
            data.forEach(s => { if (s.session_id) knownBotSessionIds.add(s.session_id); });
        }
        
        window.sessionsList = data || [];
        renderBotSessionsList();
        if (typeof updateStats === 'function') updateStats();
        
        if (activeChatSessionId) {
            await loadSessionDetails(activeChatSessionId, null, true);
        }
    } catch (e) {
        if (!silent) console.error('Error cargando sesiones del chatbot:', e);
    }
}

/**
 * Setup polling interval for real-time conversation updates
 */
function initChatPolling() {
    if (chatPollInterval) clearInterval(chatPollInterval);
    chatPollInterval = setInterval(() => {
        const chatTab = document.getElementById('tab-chat');
        if (chatTab && chatTab.classList.contains('active')) {
            loadBotSessions(true);
        }
    }, 4000);
}

/**
 * Load conversation message thread for a selected session
 */
async function loadSessionDetails(sessionId, visitorName, silent = false) {
    activeChatSessionId = sessionId;
    document.querySelectorAll('.session-item').forEach(el => el.classList.remove('active'));
    const activeItem = document.getElementById(`sess-item-${sessionId}`);
    if (activeItem) activeItem.classList.add('active');

    const container = document.getElementById('chat-messages-container');
    if (!container) return;
    if (!silent) container.innerHTML = 'Cargando mensajes...';

    const headerBar = document.getElementById('chat-header-bar');
    const headerVisitor = document.getElementById('chat-header-visitor');
    if (headerBar) {
        headerBar.style.display = 'flex';
        if (visitorName && headerVisitor) headerVisitor.innerText = visitorName;
    }

    const replyBar = document.getElementById('chat-reply-bar');
    if (replyBar) replyBar.style.display = 'flex';

    try {
        const res = await apiFetch(`${API_BASE}/bot-sessions/${sessionId}`);
        if (!res.ok) return;
        const data = await res.json();
        
        if (headerVisitor) headerVisitor.innerText = visitorName || data.visitor_name || `Sesión ${sessionId}`;
        
        const chatStatus = (data.status || data.chat_status || 'OPEN').toUpperCase();
        activeChatSessionStatus = chatStatus;
        const isClosed = chatStatus === 'CLOSED';
        
        const statusBadge = document.getElementById('chat-header-status-badge');
        const toggleBtn = document.getElementById('btn-toggle-session-status');
        
        if (statusBadge) {
            statusBadge.innerHTML = isClosed 
                ? '<span class="comm-dot comm-dot-red"></span> Cerrada' 
                : '<span class="comm-dot comm-dot-green"></span> Abierta';
            statusBadge.className = `status-pill ${isClosed ? 'prospecto' : 'cliente'}`;
            statusBadge.style.color = isClosed ? '#ef4444' : '#10b981';
            statusBadge.style.background = isClosed ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)';
        }
        
        if (toggleBtn) {
            toggleBtn.innerText = isClosed ? 'Reabrir Conversación' : 'Cerrar Conversación';
            toggleBtn.style.color = isClosed ? '#10b981' : 'var(--text-primary)';
        }
        
        const replyInput = document.getElementById('chat-reply-input');
        const replyBtn = document.getElementById('btn-send-reply');
        
        if (replyInput) {
            replyInput.disabled = isClosed;
            if (!silent && !isClosed) replyInput.value = '';
            replyInput.placeholder = isClosed 
                ? 'Conversación cerrada. Haz clic en "Reabrir Conversación" para responder.'
                : 'Escriba su respuesta al cliente...';
        }
        if (replyBtn) {
            replyBtn.disabled = isClosed;
            replyBtn.innerHTML = isClosed ? 'Cerrada' : '<span>Enviar</span> <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>';
        }
        
        const isScrolledToBottom = container.scrollHeight - container.clientHeight <= container.scrollTop + 50;
        
        container.innerHTML = '';
        
        if (data.messages && data.messages.length > 0) {
            data.messages.forEach(msg => {
                const msgDiv = document.createElement('div');
                const sender = (msg.sender_name || '').toLowerCase();
                const isUser = !sender.includes('bot') && !sender.includes('asesor');
                msgDiv.className = `msg ${isUser ? 'user' : 'bot'}`;
                
                const timeStr = msg.sent_at ? new Date(msg.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                msgDiv.innerHTML = `
                    <p>${msg.message_text}</p>
                    <span class="msg-meta">${msg.sender_name} • ${timeStr}</span>
                `;
                container.appendChild(msgDiv);
            });
            
            if (!silent || isScrolledToBottom) {
                container.scrollTop = container.scrollHeight;
            }
        } else {
            container.innerHTML = '<div class="chat-empty-state"><p>No hay mensajes en esta sesión.</p></div>';
        }

    } catch (error) {
        if (!silent) {
            console.error('Error al cargar mensajes:', error);
            container.innerHTML = 'Error al cargar mensajes.';
        }
    }
}

/**
 * Toggle session OPEN / CLOSED status
 */
async function toggleCurrentSessionStatus() {
    if (!activeChatSessionId) return;
    
    const targetStatus = activeChatSessionStatus === 'CLOSED' ? 'OPEN' : 'CLOSED';
    const actionLabel = targetStatus === 'CLOSED' ? 'cerrar' : 'reabrir';
    
    if (!confirm(`¿Desea ${actionLabel} esta conversación?`)) return;
    
    try {
        const res = await apiFetch(`${API_BASE}/bot-sessions/${activeChatSessionId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: targetStatus })
        });
        
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.detail || 'Error al actualizar el estado de la sesión');
        }
        
        showToast(`Conversación ${targetStatus === 'CLOSED' ? 'cerrada' : 'reabierta'} con éxito.`, 'success');
        
        const sessObj = (window.sessionsList || []).find(s => s.session_id === activeChatSessionId);
        if (sessObj) sessObj.status = targetStatus;
        
        await loadSessionDetails(activeChatSessionId, null, false);
        renderBotSessionsList();
    } catch (error) {
        console.error('Error toggling session status:', error);
        showToast(error.message, 'error');
    }
}

/**
 * Delete active single conversation session
 */
async function deleteCurrentSession() {
    if (!activeChatSessionId) return;
    if (!confirm(`¿Está seguro de eliminar la sesión ${activeChatSessionId}? Se borrarán todos sus mensajes.`)) return;

    try {
        const res = await apiFetch(`${API_BASE}/bot-sessions/${activeChatSessionId}`, { method: 'DELETE' });
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.detail || 'Error al eliminar la sesión');
        }

        showToast('Sesión eliminada con éxito', 'success');
        activeChatSessionId = null;
        
        const headerBar = document.getElementById('chat-header-bar');
        if (headerBar) headerBar.style.display = 'none';
        const replyBar = document.getElementById('chat-reply-bar');
        if (replyBar) replyBar.style.display = 'none';

        const container = document.getElementById('chat-messages-container');
        if (container) {
            container.innerHTML = '<div class="chat-empty-state"><span class="empty-icon"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity:0.4;"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg></span><p>Seleccione una conversación para ver los mensajes.</p></div>';
        }

        loadBotSessions();

    } catch (error) {
        console.error('Error deleting session:', error);
        showToast(error.message, 'error');
    }
}

/**
 * Cleanup inactive empty sessions older than 15 days
 */
async function cleanupInactiveSessions() {
    if (!confirm('¿Desea depurar las sesiones inactivas o sin mensajes de usuario mayores a 15 días?')) return;

    try {
        const res = await apiFetch(`${API_BASE}/bot-sessions/cleanup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ max_age_days: 15 })
        });
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.detail || 'Error al ejecutar la depuración');
        }

        const data = await res.json();
        showToast(`Depuración completada: ${data.deleted_sessions} sesiones eliminadas.`, 'success');

        activeChatSessionId = null;
        const headerBar = document.getElementById('chat-header-bar');
        if (headerBar) headerBar.style.display = 'none';
        const replyBar = document.getElementById('chat-reply-bar');
        if (replyBar) replyBar.style.display = 'none';

        const container = document.getElementById('chat-messages-container');
        if (container) {
            container.innerHTML = '<div class="chat-empty-state"><span class="empty-icon"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity:0.4;"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg></span><p>Seleccione una conversación para ver los mensajes.</p></div>';
        }

        loadBotSessions();

    } catch (error) {
        console.error('Error in cleanup:', error);
        showToast(error.message, 'error');
    }
}

/**
 * Dispatch real-time advisor reply to visitor
 */
async function sendAgentReply() {
    if (!activeChatSessionId) {
        showToast('Seleccione una conversación primero.', 'error');
        return;
    }

    if (activeChatSessionStatus === 'CLOSED') {
        showToast('La conversación está cerrada. Reábrala para responder.', 'warning');
        return;
    }

    const input = document.getElementById('chat-reply-input');
    const text = input ? input.value.trim() : '';
    if (!text) return;

    const btn = document.getElementById('btn-send-reply');
    if (btn) { btn.disabled = true; btn.innerText = 'Enviando...'; }

    const agentName = localStorage.getItem('user_full_name') || localStorage.getItem('username') || 'Asesor Comercial ALACOR';

    try {
        const res = await apiFetch(`${API_BASE}/bot-sessions/agent-reply`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId: activeChatSessionId,
                text: text,
                agentName: agentName
            })
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.detail || `HTTP ${res.status}`);
        }

        const data = await res.json().catch(() => ({}));

        if (input) input.value = '';

        if (data.status === 'client_disconnected' || data.deliveredToClient === false) {
            showToast(data.detail || 'El visitante se desconectó de la web. El mensaje se guardó en el CRM.', 'info');
        } else {
            showToast('Respuesta enviada al cliente', 'success');
        }

        // Refresh conversation messages and status
        await loadSessionDetails(activeChatSessionId);
        loadBotSessions(true);

    } catch (error) {
        console.error('Error al enviar respuesta:', error);
        showToast(error.message || 'Error al enviar respuesta', 'error');
    } finally {
        if (btn && btn.innerText === 'Enviando...') {
            btn.disabled = activeChatSessionStatus === 'CLOSED';
            btn.innerHTML = activeChatSessionStatus === 'CLOSED' ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:5px;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>Cerrada' : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:5px;"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>Enviar';
        }
    }
}

// Global Window Bindings for 100% Backward Compatibility
window.playNotificationSound = playNotificationSound;
window.toggleChatSelectionMode = toggleChatSelectionMode;
window.updateSelectedChatsCount = updateSelectedChatsCount;
window.toggleSelectAllChats = toggleSelectAllChats;
window.toggleChatSelection = toggleChatSelection;
window.executeBatchDeleteChats = executeBatchDeleteChats;
window.renderBotSessionsList = renderBotSessionsList;
window.loadBotSessions = loadBotSessions;
window.initChatPolling = initChatPolling;
window.loadSessionDetails = loadSessionDetails;
window.toggleCurrentSessionStatus = toggleCurrentSessionStatus;
window.deleteCurrentSession = deleteCurrentSession;
window.cleanupInactiveSessions = cleanupInactiveSessions;
window.sendAgentReply = sendAgentReply;
