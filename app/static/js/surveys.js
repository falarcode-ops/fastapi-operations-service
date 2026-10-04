/**
 * surveys.js
 * ----------
 * Módulo de Encuestas y Votación Interna (Coralis CRM).
 * Campaña: Votación Estratégica Naming: Marca Paraguas 2026.
 * Regla innegociable: Exactamente 5 candidatos seleccionados de los 25 disponibles.
 */

let surveyState = {
    campaignCode: 'Votacion_Naming_Holding_2026',
    data: null,
    selected: [],
    isLoading: false
};

async function initNamingSurvey() {
    const token = localStorage.getItem('crm_token') || localStorage.getItem('token');
    if (!token) return;

    try {
        const res = await fetch(`${API_BASE}/surveys/naming-holding`, {
            headers: getAuthHeaders()
        });
        if (!res.ok) return;
        const data = await res.json();
        surveyState.data = data;
        renderSurveyBanner(data);
    } catch (err) {
        console.warn('[Surveys] Error al consultar campaña:', err);
    }
}

function renderSurveyBanner(data) {
    let container = document.getElementById('naming-survey-banner-container');
    if (!container) {
        const mainView = document.getElementById('main-view');
        if (!mainView) return;
        container = document.createElement('div');
        container.id = 'naming-survey-banner-container';
        const header = mainView.querySelector('.top-header');
        if (header && header.nextSibling) {
            mainView.insertBefore(container, header.nextSibling);
        } else {
            mainView.prepend(container);
        }
    }

    if (!data || data.is_active === 0 || data.is_active === false) {
        container.innerHTML = '';
        return;
    }

    const title = data.title || 'Votación Estratégica Naming 2026';
    const firstLineDesc = data.description ? data.description.split('\n')[0] : 'Define el nombre de nuestra nueva Marca Paraguas (Holding).';
    const maxChoices = data.max_choices || 5;

    if (data.has_voted) {
        container.innerHTML = `
            <div class="survey-banner survey-banner-done">
                <div class="survey-banner-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></div>
                <div class="survey-banner-text">
                    <strong>${title}:</strong> Ya registraste tus ${maxChoices} opciones finalistas. ¡Gracias por participar!
                </div>
                <div class="survey-banner-actions">
                    <button class="btn-sm btn-secondary" onclick="openNamingSurveyModal()">Ver Mi Voto y Resultados</button>
                </div>
            </div>
        `;
    } else {
        container.innerHTML = `
            <div class="survey-banner survey-banner-pending">
                <div class="survey-banner-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a855f7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg></div>
                <div class="survey-banner-text">
                    <strong>${title}:</strong> ${firstLineDesc}
                </div>
                <div class="survey-banner-actions">
                    <button class="btn-sm btn-primary" onclick="openNamingSurveyModal()">Votar Ahora (${maxChoices} Opciones)</button>
                </div>
            </div>
        `;
    }
}

async function openNamingSurveyModal() {
    let modal = document.getElementById('naming-survey-modal');
    if (!modal) {
        modal = createSurveyModalDOM();
        document.body.appendChild(modal);
    }

    // Siempre recargar datos frescos para reflejar de inmediato cualquier edición administrativa
    await initNamingSurvey();
    renderSurveyModalContent();
    modal.classList.add('active');

    if (typeof isAdminOrSuperUser === 'function' && isAdminOrSuperUser()) {
        const admBtn = document.getElementById('survey-modal-admin-btn');
        if (admBtn) admBtn.style.display = 'inline-flex';
    }
}

function closeNamingSurveyModal() {
    const modal = document.getElementById('naming-survey-modal');
    if (modal) modal.classList.remove('active');
}

function createSurveyModalDOM() {
    const div = document.createElement('div');
    div.id = 'naming-survey-modal';
    div.className = 'modal-overlay';
    div.innerHTML = `
        <div class="modal-card survey-modal-card" style="max-width: 1050px; width: 95%; max-height: 90vh; display: flex; flex-direction: column; border-radius: 16px; overflow: hidden; background: #0b111e; border: 1px solid rgba(168, 85, 247, 0.4); box-shadow: 0 25px 60px rgba(0,0,0,0.8), 0 0 35px rgba(168,85,247,0.2);">
            <div class="modal-header" style="position: sticky; top: 0; z-index: 25; background: #0c121e; border-bottom: 1px solid rgba(255,255,255,0.1); padding: 18px 24px;">
                <div class="modal-title-wrap">
                    <span class="modal-badge" style="background: linear-gradient(135deg, #06b6d4, #a855f7); color: #fff; font-size: 0.72rem; padding: 3px 10px; border-radius: 6px; font-weight: 700; width: fit-content;">HOLDING 2026 • VOTACIÓN ESTRATÉGICA</span>
                    <h2 id="survey-modal-title" style="font-size: 1.3rem; margin: 4px 0 2px 0; color: #fff; font-weight: 700;">Votación: Elección Nombre Marca Paraguas</h2>
                    <p id="survey-modal-subtitle" class="modal-subtitle" style="margin: 0; font-size: 0.84rem; color: #94a3b8;">Selecciona obligatoriamente <strong>exactamente cinco (5) candidatos</strong> de la lista de finalistas.</p>
                </div>
                <div style="display:flex; align-items:center; gap:10px;">
                    <button type="button" id="survey-modal-admin-btn" onclick="openSurveyAdminModal()" style="display:none; background: rgba(168,85,247,0.18); color: #c084fc; border: 1px solid rgba(168,85,247,0.4); font-size: 0.74rem; font-weight:700; padding: 5px 10px; border-radius: 6px; cursor: pointer;" title="Abrir Administrador de Encuestas">Gestionar Encuestas</button>
                    <button class="modal-close" onclick="closeNamingSurveyModal()" style="font-size: 1.5rem; background: none; border: none; color: #94a3b8; cursor: pointer;">&times;</button>
                </div>
            </div>
            <div id="naming-survey-modal-body" class="survey-modal-body">
                <!-- Se llena dinámicamente -->
            </div>
            <div id="naming-survey-modal-footer" style="padding: 16px 24px; background: #080d18; border-top: 1px solid rgba(255,255,255,0.08); display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap;">
                <!-- Footer buttons se llenan dinámicamente -->
            </div>
        </div>
    `;
    return div;
}

function renderSurveyModalContent() {
    const body = document.getElementById('naming-survey-modal-body');
    const footer = document.getElementById('naming-survey-modal-footer');
    if (!body) return;
    const data = surveyState.data || {};

    const titleEl = document.getElementById('survey-modal-title');
    const subtitleEl = document.getElementById('survey-modal-subtitle');
    if (titleEl && data.title) {
        titleEl.textContent = data.title;
    }
    if (subtitleEl && data.description) {
        subtitleEl.innerHTML = data.description.replace(/\n/g, '<br>');
    }

    if (data.has_voted) {
        renderVotedState(body, footer, data);
        return;
    }

    const maxChoices = data.max_choices || 5;
    const minChoices = data.min_choices || maxChoices;
    const ruleLabel = minChoices === maxChoices ? `exactamente ${maxChoices}` : `entre ${minChoices} y ${maxChoices}`;

    // Estado para votar
    surveyState.selected = [];
    const grouped = {};
    (data.candidates || []).forEach(c => {
        if (!grouped[c.category]) grouped[c.category] = [];
        grouped[c.category].push(c);
    });

    let categoriesHtml = '';
    let catIndex = 1;
    for (const [catName, cands] of Object.entries(grouped)) {
        categoriesHtml += `
            <div class="survey-category-group">
                <div class="survey-category-title">
                    <span>${catIndex}. ${catName}</span>
                    <span style="font-size: 0.75rem; color: #94a3b8; font-weight: normal; background: rgba(255,255,255,0.06); padding: 2px 8px; border-radius: 10px;">${cands.length} opciones</span>
                </div>
                <div class="survey-cards-grid">
                    ${cands.map(c => `
                        <div class="candidate-card" id="card-${c.name}" onclick="toggleCandidate('${c.name}')">
                            <div class="candidate-header">
                                <span class="candidate-name">${c.name}</span>
                                <span class="candidate-badge-check" id="chk-${c.name}">Elegir</span>
                            </div>
                            <div class="candidate-origin"><strong>Raíz:</strong> ${c.origin}</div>
                            <div class="candidate-concept">${c.concept}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        catIndex++;
    }

    body.innerHTML = `
        <div class="survey-sticky-bar" id="survey-counter-bar">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                <div style="display:flex; align-items:center; gap:10px;">
                    <span id="survey-counter-text" class="survey-counter-badge incomplete">0 de ${maxChoices} seleccionados</span>
                    <span id="survey-counter-msg" style="font-size:0.82rem; color:#94a3b8;">Debes elegir ${ruleLabel} opciones.</span>
                </div>
                <div id="survey-selected-chips" style="display:flex; gap:6px; flex-wrap:wrap;"></div>
            </div>
            <div class="survey-progress-track">
                <div id="survey-progress-fill" class="survey-progress-fill" style="width: 0%;"></div>
            </div>
        </div>

        <div style="display:flex; flex-direction:column; gap:16px;">
            ${categoriesHtml}
        </div>

        <div class="survey-category-group" style="padding: 16px;">
            <label style="font-size: 0.88rem; font-weight: 700; display: flex; align-items: center; gap: 6px; margin-bottom: 8px; color: #e2e8f0;">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                <span>Argumentación o Comentarios Estratégicos (Opcional):</span>
            </label>
            <textarea id="survey-comments" rows="3" style="width: 100%; box-sizing: border-box; font-size: 0.86rem; padding: 10px 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.12); background: #080d18; color: #ffffff; resize: vertical;" placeholder="Comparte los motivos de tu elección o sugerencias para la proyección corporativa del holding..."></textarea>
        </div>
    `;

    if (footer) {
        footer.innerHTML = `
            <div style="font-size: 0.82rem; color: #94a3b8; display: flex; align-items: center; gap: 5px;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                <span>Regla obligatoria: ${ruleLabel} candidatos. Voto único e irreversible.</span>
            </div>
            <div style="display:flex; gap: 10px; align-items: center;">
                <button type="button" class="btn-secondary" onclick="closeNamingSurveyModal()" style="padding: 8px 16px; border-radius: 8px; background: rgba(255,255,255,0.06); color: #cbd5e1; border: 1px solid rgba(255,255,255,0.1); cursor: pointer;">Cancelar</button>
                <button type="button" id="survey-submit-btn" class="btn-primary" disabled onclick="submitNamingVote()" style="padding: 9px 20px; border-radius: 8px; font-weight: 700; cursor: pointer; transition: all 0.2s ease;">
                    Confirmar y Enviar Voto (0/${maxChoices})
                </button>
            </div>
        `;
    }
}

function toggleCandidate(name) {
    const maxChoices = surveyState.data?.max_choices || 5;
    const idx = surveyState.selected.indexOf(name);
    if (idx >= 0) {
        surveyState.selected.splice(idx, 1);
    } else {
        if (surveyState.selected.length >= maxChoices) {
            showToast(`Límite estricto: Solo puedes seleccionar hasta ${maxChoices} opciones. Deselecciona una para cambiarla.`, 'warning');
            return;
        }
        surveyState.selected.push(name);
    }
    updateSurveySelectionUI();
}

function updateSurveySelectionUI() {
    const maxChoices = surveyState.data?.max_choices || 5;
    const minChoices = surveyState.data?.min_choices || maxChoices;
    const count = surveyState.selected.length;
    const isComplete = minChoices === maxChoices ? count === maxChoices : (count >= minChoices && count <= maxChoices);

    const counterText = document.getElementById('survey-counter-text');
    const counterMsg = document.getElementById('survey-counter-msg');
    const submitBtn = document.getElementById('survey-submit-btn');
    const chipsContainer = document.getElementById('survey-selected-chips');
    const progressFill = document.getElementById('survey-progress-fill');

    (surveyState.data?.candidates || []).forEach(c => {
        const card = document.getElementById(`card-${c.name}`);
        const chk = document.getElementById(`chk-${c.name}`);
        const isSel = surveyState.selected.includes(c.name);
        if (card) card.classList.toggle('selected', isSel);
        if (chk) {
            chk.innerText = isSel ? '✓ Elegido' : 'Elegir';
        }
    });

    if (chipsContainer) {
        chipsContainer.innerHTML = surveyState.selected.map(n => `
            <span class="candidate-chip" onclick="toggleCandidate('${n}')" title="Clic para deseleccionar">${n} ✕</span>
        `).join('');
    }

    if (progressFill) {
        progressFill.style.width = `${Math.min(100, (count / maxChoices) * 100)}%`;
    }

    if (counterText) {
        counterText.innerText = `${count} de ${maxChoices} seleccionados`;
        counterText.className = `survey-counter-badge ${isComplete ? 'complete' : 'incomplete'}`;
    }

    if (counterMsg) {
        if (isComplete) {
            counterMsg.innerText = '¡Selección completa! Ya puedes registrar tu voto definitivo.';
            counterMsg.style.color = '#34d399';
        } else if (count < minChoices) {
            counterMsg.innerText = `Te faltan ${minChoices - count} candidato(s) por elegir.`;
            counterMsg.style.color = '#94a3b8';
        } else {
            counterMsg.innerText = `Puedes elegir hasta ${maxChoices} candidatos.`;
            counterMsg.style.color = '#94a3b8';
        }
    }

    if (submitBtn) {
        submitBtn.disabled = !isComplete;
        if (isComplete) {
            submitBtn.innerText = 'Confirmar y Enviar Voto Definitivo';
            submitBtn.style.opacity = '1';
            submitBtn.style.background = 'linear-gradient(135deg, #06b6d4, #8b5cf6)';
            submitBtn.style.boxShadow = '0 0 15px rgba(6, 182, 212, 0.4)';
        } else {
            submitBtn.innerText = `Confirmar y Enviar Voto (${count}/${maxChoices})`;
            submitBtn.style.opacity = '0.5';
            submitBtn.style.background = '';
            submitBtn.style.boxShadow = '';
        }
    }
}

async function submitNamingVote() {
    const maxChoices = surveyState.data?.max_choices || 5;
    const minChoices = surveyState.data?.min_choices || maxChoices;
    const count = surveyState.selected.length;

    if (count < minChoices || count > maxChoices) {
        const msg = minChoices === maxChoices ? `exactamente ${maxChoices}` : `entre ${minChoices} y ${maxChoices}`;
        showToast(`Debes seleccionar ${msg} candidatos.`, 'error');
        return;
    }

    const confirmMsg = minChoices === maxChoices
        ? `¿Confirmas el envío definitivo de tu voto con las ${maxChoices} opciones elegidas?\n\n• ${surveyState.selected.join('\n• ')}\n\nEsta decisión es única e irreversible.`
        : `¿Confirmas el envío definitivo de tu voto con las ${count} opciones elegidas?\n\n• ${surveyState.selected.join('\n• ')}\n\nEsta decisión es única e irreversible.`;

    if (!confirm(confirmMsg)) {
        return;
    }

    const comments = (document.getElementById('survey-comments')?.value || '').trim();
    const submitBtn = document.getElementById('survey-submit-btn');
    if (submitBtn) submitBtn.disabled = true;

    try {
        const res = await fetch(`${API_BASE}/surveys/naming-holding/vote`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                selected_candidates: surveyState.selected,
                comments: comments
            })
        });

        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.detail || 'Error al procesar el voto.');
        }

        showToast('¡Tu voto fue registrado y sincronizado exitosamente!', 'success');
        surveyState.data.has_voted = true;
        surveyState.data.my_vote = {
            selected_candidates: surveyState.selected,
            comments: comments,
            created_at: new Date().toISOString()
        };
        renderSurveyBanner(surveyState.data);
        renderVotedState(document.getElementById('naming-survey-modal-body'), document.getElementById('naming-survey-modal-footer'), surveyState.data);
    } catch (err) {
        showToast(err.message, 'error');
        if (submitBtn) submitBtn.disabled = false;
    }
}

async function renderVotedState(body, footer, data) {
    const myVote = data.my_vote || {};
    const selected = Array.isArray(myVote.selected_candidates) ? myVote.selected_candidates : [];

    body.innerHTML = `
        <div style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(6, 182, 212, 0.1)); border: 1px solid rgba(16, 185, 129, 0.4); border-radius: 14px; padding: 20px;">
            <div style="display:flex; align-items:center; gap: 12px; margin-bottom: 10px;">
                <div style="width: 44px; height: 44px; border-radius: 50%; background: rgba(16, 185, 129, 0.2); color: #34d399; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>
                <div>
                    <h3 style="margin: 0; color: #34d399; font-size: 1.2rem; font-weight: 700;">¡Tu Voto ha sido Registrado con Éxito!</h3>
                    <p style="margin: 2px 0 0 0; font-size: 0.85rem; color: #cbd5e1;">Tus ${selected.length} elecciones forman parte de la decisión corporativa para la nueva Marca Paraguas.</p>
                </div>
            </div>
            <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top: 14px;">
                ${selected.map(n => `<span class="candidate-chip" style="cursor:default; background: rgba(16, 185, 129, 0.25); border-color:#34d399; color:#fff; display:inline-flex; align-items:center; gap:5px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>${n}</span>`).join('')}
            </div>
            ${myVote.comments ? `<div style="margin-top:14px; padding:10px 14px; background:rgba(0,0,0,0.3); border-radius:8px; font-size:0.84rem; color:#94a3b8;"><strong>Tus comentarios:</strong> "${myVote.comments}"</div>` : ''}
        </div>

        <div id="survey-tally-container" style="margin-top: 10px;">
            <div style="text-align:center; padding:20px; color:#94a3b8;">Cargando consolidado de votos en tiempo real...</div>
        </div>
    `;

    if (footer) {
        footer.innerHTML = `
            <div style="font-size: 0.82rem; color: #94a3b8;">
                ✓ Voto archivado en base de datos y sincronizado con el equipo de estrategia.
            </div>
            <button type="button" class="btn-secondary" onclick="closeNamingSurveyModal()" style="padding: 8px 18px; border-radius: 8px; background: rgba(255,255,255,0.08); color: #fff; border: 1px solid rgba(255,255,255,0.15); cursor: pointer;">Cerrar</button>
        `;
    }

    try {
        const res = await fetch(`${API_BASE}/surveys/naming-holding/tally`, {
            headers: getAuthHeaders()
        });
        if (res.ok) {
            const tallyData = await res.json();
            renderTallyResults(tallyData);
        }
    } catch (e) {
        console.warn('No se pudo cargar el tally:', e);
    }
}

function renderTallyResults(tallyData) {
    const container = document.getElementById('survey-tally-container');
    if (!container) return;

    const summary = tallyData.tally_summary || {};
    const totalVotes = tallyData.total_votes_submitted || 0;
    const sorted = Object.entries(summary).sort((a, b) => b[1] - a[1]);

    container.innerHTML = `
        <h4 style="font-size: 1.05rem; margin: 0 0 14px 0; color: #fff; display:flex; justify-content:space-between; align-items:center;">
            <span style="display:flex; align-items:center; gap:6px;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
                <span>Consolidado de Votaciones en Tiempo Real</span>
            </span>
            <span style="font-size: 0.8rem; color: #94a3b8; font-weight: normal; background: rgba(255,255,255,0.06); padding: 4px 10px; border-radius: 20px;">${totalVotes} votos recibidos</span>
        </h4>
        <div style="display: flex; flex-direction: column; gap: 8px; max-height: 380px; overflow-y: auto; padding-right: 6px;">
            ${sorted.map(([name, count], index) => {
                const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                return `
                    <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 10px 14px;">
                        <div style="display:flex; justify-content:space-between; font-size:0.86rem; font-weight:700; color:#fff; margin-bottom:6px;">
                            <span><span style="color:#38bdf8; margin-right:6px;">#${index + 1}</span> ${name}</span>
                            <span>${count} voto(s) <span style="color:#94a3b8; font-weight:normal;">(${pct}%)</span></span>
                        </div>
                        <div style="height: 6px; background: rgba(255,255,255,0.08); border-radius: 999px; overflow: hidden;">
                            <div style="height:100%; width:${pct}%; background: linear-gradient(90deg, #06b6d4, #a855f7); transition: width 0.3s ease;"></div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initNamingSurvey, 1000);
});
