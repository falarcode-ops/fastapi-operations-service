/**
 * survey-admin.js
 * ---------------
 * Panel Administrativo CRUD para Encuestas y Votaciones Corporativas (Coralis CRM).
 * Permite a Administradores y Directores crear, editar, pausar y eliminar encuestas,
 * así como consultar el consolidado y exportar resultados.
 */

let surveyAdminState = {
    campaigns: [],
    editingCode: null
};

async function openSurveyAdminModal() {
    if (typeof isAdminOrSuperUser === 'function' && !isAdminOrSuperUser()) {
        showToast('Acceso restringido: Se requiere rol de Administrador o Director.', 'warning');
        return;
    }

    let modal = document.getElementById('survey-admin-modal');
    if (!modal) {
        modal = createSurveyAdminModalDOM();
        document.body.appendChild(modal);
    }

    modal.classList.add('active');
    await loadAdminCampaignsList();
}

function closeSurveyAdminModal() {
    const modal = document.getElementById('survey-admin-modal');
    if (modal) modal.classList.remove('active');
}

function createSurveyAdminModalDOM() {
    const div = document.createElement('div');
    div.id = 'survey-admin-modal';
    div.className = 'modal-overlay';
    div.innerHTML = `
        <div class="modal-card" style="max-width: 980px; width: 95%; max-height: 90vh; display: flex; flex-direction: column; background: #0c121e; border: 1px solid rgba(168, 85, 247, 0.4); border-radius: 16px; overflow: hidden; box-shadow: 0 25px 60px rgba(0,0,0,0.8);">
            <div class="modal-header" style="position: sticky; top: 0; z-index: 10; background: #080d18; border-bottom: 1px solid rgba(255,255,255,0.08); padding: 18px 24px; display:flex; justify-content:space-between; align-items:center;">
                <div class="modal-title-wrap">
                    <span class="modal-badge" style="background: linear-gradient(135deg, #a855f7, #06b6d4); color: #fff; font-size: 0.72rem; padding: 3px 10px; border-radius: 6px; font-weight: 700;">GESTIÓN ESTRATÉGICA</span>
                    <h2 style="font-size: 1.25rem; margin: 4px 0 0 0; color: #fff; display: flex; align-items: center; gap: 8px;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                        <span>Panel de Encuestas y Pulso Corporativo</span>
                    </h2>
                    <p class="modal-subtitle" style="margin:0; font-size:0.82rem; color:#94a3b8;">Crea, edita, activa o elimina campañas de votación interna para colaboradores.</p>
                </div>
                <div style="display:flex; gap:10px; align-items:center;">
                    <button class="btn-primary" onclick="openSurveyEditorModal()" style="font-size:0.82rem; padding:6px 14px; border-radius:8px; display:flex; align-items:center; gap:6px;">
                        <span>+ Nueva Encuesta</span>
                    </button>
                    <button class="modal-close" onclick="closeSurveyAdminModal()" aria-label="Cerrar" title="Cerrar" style="background: none; border: none; color: #94a3b8; cursor: pointer; display: flex; align-items: center;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18"></line></svg>
                    </button>
                </div>
            </div>
            <div id="survey-admin-campaigns-list" style="padding: 20px 24px; overflow-y: auto; flex: 1 1 auto; display: flex; flex-direction: column; gap: 12px;">
                <div style="text-align:center; padding:30px; color:#94a3b8;">Cargando listado de encuestas...</div>
            </div>
        </div>
    `;
    return div;
}

async function loadAdminCampaignsList() {
    const listContainer = document.getElementById('survey-admin-campaigns-list');
    if (!listContainer) return;

    try {
        const res = await fetch(`${API_BASE}/surveys/admin/campaigns`, {
            headers: getAuthHeaders()
        });
        if (!res.ok) throw new Error('No se pudo obtener el listado de encuestas.');
        const data = await res.json();
        surveyAdminState.campaigns = data;

        if (data.length === 0) {
            listContainer.innerHTML = `
                <div style="text-align:center; padding:40px; color:#94a3b8;">
                    <p style="font-size:1.1rem; margin-bottom:10px; display:flex; align-items:center; justify-content:center; gap:8px;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                        <span>No hay encuestas registradas.</span>
                    </p>
                    <button class="btn-primary" onclick="openSurveyEditorModal()">Crear Primera Encuesta</button>
                </div>
            `;
            return;
        }

        listContainer.innerHTML = data.map(c => `
            <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap;">
                <div style="flex: 1; min-width: 260px;">
                    <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
                        <span style="font-size:0.75rem; font-weight:700; padding:2px 8px; border-radius:999px; ${c.is_active ? 'background:rgba(16,185,129,0.2); color:#34d399; border:1px solid rgba(16,185,129,0.4);' : 'background:rgba(245,158,11,0.2); color:#fbbf24; border:1px solid rgba(245,158,11,0.4);'}">
                            ${c.is_active ? '● Activa' : '○ Pausada'}
                        </span>
                        <code style="font-size:0.75rem; color:#38bdf8; background:rgba(56,189,248,0.1); padding:2px 6px; border-radius:4px;">${c.campaign_code}</code>
                    </div>
                    <h3 style="margin: 0 0 4px 0; font-size: 1.05rem; color: #fff;">${c.title}</h3>
                    <p style="margin: 0; font-size: 0.82rem; color: #94a3b8; line-height: 1.35;">${c.description || 'Sin descripción'}</p>
                    <div style="margin-top: 8px; font-size: 0.78rem; color: #64748b; display: flex; gap: 14px; flex-wrap: wrap;">
                        <span style="display:inline-flex; align-items:center; gap:4px;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg><strong>${c.total_votes}</strong> voto(s) registrados</span>
                        <span style="display:inline-flex; align-items:center; gap:4px;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.3 8.7l-6-6a1 1 0 0 0-1.4 0l-12 12a1 1 0 0 0 0 1.4l6 6a1 1 0 0 0 1.4 0l12-12a1 1 0 0 0 0-1.4z"></path></svg>Regla: <strong>${c.min_choices === c.max_choices ? `Exactamente ${c.min_choices}` : `Entre ${c.min_choices} y ${c.max_choices}`}</strong> opción(es)</span>
                        ${c.end_date ? `<span style="display:inline-flex; align-items:center; gap:4px;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>Cierre: ${c.end_date}</span>` : ''}
                    </div>
                </div>
                <div style="display: flex; gap: 6px; align-items: center;">
                    <button class="action-icon-btn" onclick="openSurveyEditorModal('${c.campaign_code}')" title="Editar parámetros y opciones" aria-label="Editar parámetros y opciones">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    <button class="action-icon-btn" onclick="deleteSurveyCampaign('${c.campaign_code}')" style="color:#f87171;" title="Eliminar encuesta y votos" aria-label="Eliminar encuesta y votos">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </div>
            </div>
        `).join('');
    } catch (err) {
        listContainer.innerHTML = `<div style="color:#ef4444; padding:20px; text-align:center;">Error: ${err.message}</div>`;
    }
}

async function openSurveyEditorModal(campaignCode = null) {
    surveyAdminState.editingCode = campaignCode;
    let modal = document.getElementById('survey-editor-modal');
    if (!modal) {
        modal = createSurveyEditorModalDOM();
        document.body.appendChild(modal);
    }

    modal.classList.add('active');
    const titleEl = document.getElementById('survey-editor-title');
    const codeInput = document.getElementById('sed-code');
    const titleInput = document.getElementById('sed-title');
    const descInput = document.getElementById('sed-desc');
    const minInput = document.getElementById('sed-min');
    const maxInput = document.getElementById('sed-max');
    const activeInput = document.getElementById('sed-active');
    const endInput = document.getElementById('sed-end-date');
    const optionsTextarea = document.getElementById('sed-options-text');

    if (campaignCode) {
        titleEl.innerText = `Editar Encuesta: ${campaignCode}`;
        codeInput.value = campaignCode;
        codeInput.disabled = true;
        try {
            const res = await fetch(`${API_BASE}/surveys/admin/campaigns/${campaignCode}`, {
                headers: getAuthHeaders()
            });
            const d = await res.json();
            titleInput.value = d.title || '';
            descInput.value = d.description || '';
            minInput.value = d.min_choices || 1;
            maxInput.value = d.max_choices || 1;
            activeInput.checked = !!d.is_active;
            endInput.value = d.end_date || '';
            const opts = d.options_catalog || [];
            optionsTextarea.value = opts.map(o => typeof o === 'string' ? o : o.name).join('\n');
        } catch (e) {
            showToast('Error al cargar datos de la encuesta.', 'error');
        }
    } else {
        titleEl.innerText = 'Crear Nueva Encuesta Corporativa';
        codeInput.value = '';
        codeInput.disabled = false;
        titleInput.value = '';
        descInput.value = '';
        minInput.value = 1;
        maxInput.value = 1;
        activeInput.checked = true;
        endInput.value = '';
        optionsTextarea.value = '';
    }
}

function closeSurveyEditorModal() {
    const modal = document.getElementById('survey-editor-modal');
    if (modal) modal.classList.remove('active');
}

function createSurveyEditorModalDOM() {
    const div = document.createElement('div');
    div.id = 'survey-editor-modal';
    div.className = 'modal-overlay';
    div.style.zIndex = '1100';
    div.innerHTML = `
        <div class="modal-card" style="max-width: 720px; width: 92%; max-height: 88vh; display: flex; flex-direction: column; background: #0c121e; border: 1px solid rgba(56,189,248,0.4); border-radius: 14px; overflow: hidden;">
            <div class="modal-header" style="background:#080d18; border-bottom:1px solid rgba(255,255,255,0.08); padding: 16px 20px; display: flex; justify-content: space-between; align-items: center;">
                <h3 id="survey-editor-title" style="margin: 0; font-size: 1.15rem; color: #fff;">Configurar Encuesta</h3>
                <button class="modal-close" onclick="closeSurveyEditorModal()" aria-label="Cerrar" title="Cerrar" style="background: none; border: none; color: #94a3b8; cursor: pointer; display: flex; align-items: center;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18"></line></svg>
                </button>
            </div>
            <form id="survey-editor-form" onsubmit="saveSurveyCampaign(event)" style="display:flex; flex-direction:column; overflow:hidden; flex:1;">
                <div style="padding: 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; flex: 1;">
                    <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 12px;">
                        <div>
                            <label style="font-size:0.8rem; font-weight:700; color:#cbd5e1; display:block; margin-bottom:4px;">Código de Campaña:</label>
                            <input type="text" id="sed-code" required pattern="[a-zA-Z0-9_-]+" placeholder="EJ_PULSO_2026" style="width:100%; box-sizing:border-box; padding:8px 10px; border-radius:6px; background:#080d18; border:1px solid rgba(255,255,255,0.15); color:#fff; font-size:0.85rem;">
                        </div>
                        <div>
                            <label style="font-size:0.8rem; font-weight:700; color:#cbd5e1; display:block; margin-bottom:4px;">Título de la Encuesta:</label>
                            <input type="text" id="sed-title" required placeholder="Título formal de la votación..." style="width:100%; box-sizing:border-box; padding:8px 10px; border-radius:6px; background:#080d18; border:1px solid rgba(255,255,255,0.15); color:#fff; font-size:0.85rem;">
                        </div>
                    </div>

                    <div>
                        <label style="font-size:0.8rem; font-weight:700; color:#cbd5e1; display:block; margin-bottom:4px;">Instrucciones / Descripción:</label>
                        <textarea id="sed-desc" rows="2" placeholder="Indicaciones claras para los participantes..." style="width:100%; box-sizing:border-box; padding:8px 10px; border-radius:6px; background:#080d18; border:1px solid rgba(255,255,255,0.15); color:#fff; font-size:0.85rem; resize:vertical;"></textarea>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; align-items: flex-end;">
                        <div>
                            <label style="font-size:0.8rem; font-weight:700; color:#cbd5e1; display:block; margin-bottom:4px;">Mínimo Opciones:</label>
                            <input type="number" id="sed-min" min="1" max="50" value="1" required style="width:100%; box-sizing:border-box; padding:8px 10px; border-radius:6px; background:#080d18; border:1px solid rgba(255,255,255,0.15); color:#fff; font-size:0.85rem;">
                        </div>
                        <div>
                            <label style="font-size:0.8rem; font-weight:700; color:#cbd5e1; display:block; margin-bottom:4px;">Máximo Opciones:</label>
                            <input type="number" id="sed-max" min="1" max="50" value="1" required style="width:100%; box-sizing:border-box; padding:8px 10px; border-radius:6px; background:#080d18; border:1px solid rgba(255,255,255,0.15); color:#fff; font-size:0.85rem;">
                        </div>
                        <div>
                            <label style="font-size:0.8rem; font-weight:700; color:#cbd5e1; display:block; margin-bottom:4px;">Fecha Cierre (Opcional):</label>
                            <input type="date" id="sed-end-date" style="width:100%; box-sizing:border-box; padding:8px 10px; border-radius:6px; background:#080d18; border:1px solid rgba(255,255,255,0.15); color:#fff; font-size:0.85rem;">
                        </div>
                    </div>

                    <div>
                        <label style="font-size:0.8rem; font-weight:700; color:#cbd5e1; display:flex; justify-content:space-between; margin-bottom:4px;">
                            <span>Catálogo de Opciones / Candidatos:</span>
                            <span style="font-size:0.75rem; color:#94a3b8; font-weight:normal;">Un candidato/opción por línea</span>
                        </label>
                        <textarea id="sed-options-text" rows="6" placeholder="Opción A&#10;Opción B&#10;Opción C..." style="width:100%; box-sizing:border-box; padding:10px 12px; border-radius:6px; background:#080d18; border:1px solid rgba(255,255,255,0.15); color:#fff; font-size:0.85rem; font-family:monospace; resize:vertical;"></textarea>
                    </div>

                    <div style="display:flex; align-items:center; gap:8px;">
                        <input type="checkbox" id="sed-active" checked style="width:16px; height:16px; cursor:pointer;">
                        <label for="sed-active" style="font-size:0.85rem; color:#fff; cursor:pointer; font-weight:600;">Encuesta Activa (visible para colaboradores)</label>
                    </div>
                </div>

                <div style="padding: 14px 20px; background:#080d18; border-top:1px solid rgba(255,255,255,0.08); display:flex; justify-content:flex-end; gap:10px;">
                    <button type="button" class="btn-secondary" onclick="closeSurveyEditorModal()">Cancelar</button>
                    <button type="submit" class="btn-primary">Guardar Encuesta</button>
                </div>
            </form>
        </div>
    `;
    return div;
}

async function saveSurveyCampaign(event) {
    event.preventDefault();
    const isEdit = !!surveyAdminState.editingCode;
    const code = isEdit ? surveyAdminState.editingCode : document.getElementById('sed-code').value.trim();
    const title = document.getElementById('sed-title').value.trim();
    const desc = document.getElementById('sed-desc').value.trim();
    const minChoices = parseInt(document.getElementById('sed-min').value) || 1;
    const maxChoices = parseInt(document.getElementById('sed-max').value) || 1;
    const endDate = document.getElementById('sed-end-date').value || null;
    const isActive = document.getElementById('sed-active').checked;
    const lines = document.getElementById('sed-options-text').value.split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0);

    if (lines.length < maxChoices) {
        showToast(`Debes registrar al menos ${maxChoices} opciones para satisfacer el máximo de selección.`, 'warning');
        return;
    }

    const optionsCatalog = lines.map(line => ({
        name: line,
        category: "General",
        concept: line,
        origin: ""
    }));

    const payload = {
        campaign_code: code,
        title: title,
        description: desc,
        min_choices: minChoices,
        max_choices: maxChoices,
        is_active: isActive,
        end_date: endDate,
        options_catalog: optionsCatalog
    };

    try {
        const url = isEdit ? `${API_BASE}/surveys/admin/campaigns/${code}` : `${API_BASE}/surveys/admin/campaigns`;
        const method = isEdit ? 'PUT' : 'POST';
        const res = await fetch(url, {
            method: method,
            headers: getAuthHeaders(),
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Error al guardar encuesta.');

        showToast(isEdit ? 'Encuesta actualizada con éxito.' : 'Encuesta creada con éxito.', 'success');
        closeSurveyEditorModal();
        await loadAdminCampaignsList();
        if (typeof initNamingSurvey === 'function') initNamingSurvey();
    } catch (e) {
        showToast(e.message, 'error');
    }
}

async function deleteSurveyCampaign(campaignCode) {
    if (!confirm(`¿Estás seguro de eliminar la encuesta '${campaignCode}' y TODOS los votos registrados?\n\nEsta acción es irreversible.`)) {
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/surveys/admin/campaigns/${campaignCode}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Error al eliminar encuesta.');

        showToast(data.message || 'Encuesta eliminada.', 'success');
        await loadAdminCampaignsList();
        if (typeof initNamingSurvey === 'function') initNamingSurvey();
    } catch (e) {
        showToast(e.message, 'error');
    }
}
