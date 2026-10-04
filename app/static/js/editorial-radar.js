/**
 * editorial-radar.js
 * Controlador modular para la curaduría y gestión de temas del Editorial Radar (N8N <-> CORALIS).
 */

const radarState = {
    status: 'PENDIENTE',
    topic_domain: 'ALL',
    min_score: null,
    page: 1,
    limit: 12,
    total: 0
};

/**
 * Consulta el total de temas pendientes para alimentar el badge numérico del botón de Radar.
 */
async function checkEditorialRadarPendingCount() {
    try {
        const res = await apiFetch(`${API_BASE}/v1/editorial/topics?status=PENDIENTE&limit=1`);
        if (!res.ok) return;
        const data = await res.json();
        const badge = document.getElementById('editorial-radar-badge');
        if (badge) {
            const count = data.total || 0;
            if (count > 0) {
                badge.innerText = count > 99 ? '99+' : count;
                badge.style.display = 'inline-block';
            } else {
                badge.style.display = 'none';
            }
        }
    } catch (err) {
        console.warn('Error checking editorial radar badge:', err);
    }
}

/**
 * Carga principal de temas con filtros actuales y renderizado en el contenedor.
 */
async function loadEditorialRadarTopics() {
    const container = document.getElementById('social-radar-view');
    if (!container) return;

    container.innerHTML = `
        <div style="padding:40px; text-align:center; color:var(--text-muted);">
            <div class="spinner-border" style="margin-bottom:12px;"></div>
            <div>Sintonizando Radar de Contenidos IA...</div>
        </div>
    `;

    try {
        const offset = (radarState.page - 1) * radarState.limit;
        const params = new URLSearchParams({
            status: radarState.status,
            limit: radarState.limit,
            offset: offset
        });
        if (radarState.topic_domain && radarState.topic_domain !== 'ALL') {
            params.append('topic_domain', radarState.topic_domain);
        }
        if (radarState.min_score) {
            params.append('min_score', radarState.min_score);
        }

        const res = await apiFetch(`${API_BASE}/v1/editorial/topics?${params.toString()}`);
        if (!res.ok) {
            container.innerHTML = `<div style="padding:30px; text-align:center; color:var(--accent-red);">Error al cargar temas del radar editorial.</div>`;
            return;
        }

        const data = await res.json();
        radarState.total = data.total || 0;
        renderRadarInterface(data, container);
        checkEditorialRadarPendingCount();
    } catch (err) {
        console.error('Error in loadEditorialRadarTopics:', err);
        container.innerHTML = `<div style="padding:30px; text-align:center; color:var(--accent-red);">Error de conexión con el servicio editorial.</div>`;
    }
}

/**
 * Renderiza la vista completa del radar: barra de herramientas, filtros y grilla de temas.
 */
function renderRadarInterface(data, container) {
    const topics = data.topics || [];
    const totalPages = Math.ceil(radarState.total / radarState.limit) || 1;

    const domainLabels = {
        'ALL': 'Todos los Dominios',
        'SEGURIDAD_EPP': 'Seguridad & EPP',
        'NORMATIVA_LABORAL': 'Normativa Laboral',
        'EMERGENCIAS_AMBIENTAL': 'Emergencias & Ambiental',
        'SECTORES_INDUSTRIA': 'Sectores e Industria'
    };

    const domainColors = {
        'SEGURIDAD_EPP': { bg: 'rgba(6,182,212,0.12)', text: '#06b6d4', border: 'rgba(6,182,212,0.3)' },
        'NORMATIVA_LABORAL': { bg: 'rgba(99,102,241,0.12)', text: '#818cf8', border: 'rgba(99,102,241,0.3)' },
        'EMERGENCIAS_AMBIENTAL': { bg: 'rgba(245,158,11,0.12)', text: '#f59e0b', border: 'rgba(245,158,11,0.3)' },
        'SECTORES_INDUSTRIA': { bg: 'rgba(168,85,247,0.12)', text: '#c084fc', border: 'rgba(168,85,247,0.3)' }
    };

    let html = `
        <div class="radar-toolbar">
            <div class="radar-toolbar-header">
                <div>
                    <h4 class="radar-title" style="display:inline-flex; align-items:center; gap:8px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="2"></circle><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"></path></svg>Radar de Inteligencia de Contenidos (N8N / CORALIS)</h4>
                    <p class="radar-subtitle">Monitoreo diario de fuentes oficiales (MinTrabajo, OSHA, UNGRD) curadas con IA (Score ≥ 7.0).</p>
                </div>
                <div class="radar-toolbar-actions">
                    <button type="button" class="btn-secondary btn-sm" onclick="loadEditorialRadarTopics()" title="Recargar temas">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>
                        <span>Actualizar</span>
                    </button>
                    <span class="comms-results-badge">${radarState.total} tema(s)</span>
                </div>
            </div>

            <!-- Filtros de Estado y Dominio -->
            <div class="radar-filters-row">
                <div class="radar-filter-group">
                    <span class="comms-filter-label">Estado:</span>
                    <div class="comms-chips-wrap">
                        <button class="comms-chip ${radarState.status === 'PENDIENTE' ? 'active' : ''}" onclick="setRadarStatusFilter('PENDIENTE')">Pendientes</button>
                        <button class="comms-chip ${radarState.status === 'APROBADO' ? 'active' : ''}" onclick="setRadarStatusFilter('APROBADO')">Aprobados</button>
                        <button class="comms-chip ${radarState.status === 'CONVERTIDO_A_POST' ? 'active' : ''}" onclick="setRadarStatusFilter('CONVERTIDO_A_POST')">En Post</button>
                        <button class="comms-chip ${radarState.status === 'DESCARTADO' ? 'active' : ''}" onclick="setRadarStatusFilter('DESCARTADO')">Descartados</button>
                        <button class="comms-chip ${radarState.status === 'ALL' ? 'active' : ''}" onclick="setRadarStatusFilter('ALL')">Todos</button>
                    </div>
                </div>

                <div class="radar-filter-group" style="margin-left:auto; display:flex; gap:10px; flex-wrap:wrap;">
                    <select id="radar-domain-select" class="form-select form-select-sm" onchange="setRadarDomainFilter(this.value)">
                        ${Object.entries(domainLabels).map(([k, v]) => `
                            <option value="${k}" ${radarState.topic_domain === k ? 'selected' : ''}>${v}</option>
                        `).join('')}
                    </select>

                    <select id="radar-score-select" class="form-select form-select-sm" onchange="setRadarScoreFilter(this.value)">
                        <option value="" ${!radarState.min_score ? 'selected' : ''}>Todos los Scores</option>
                        <option value="7.0" ${radarState.min_score == 7.0 ? 'selected' : ''}>Score ≥ 7.0</option>
                        <option value="8.0" ${radarState.min_score == 8.0 ? 'selected' : ''}>Score ≥ 8.0</option>
                        <option value="9.0" ${radarState.min_score == 9.0 ? 'selected' : ''}>Score ≥ 9.0 (Top)</option>
                    </select>
                </div>
            </div>
        </div>
    `;

    if (topics.length === 0) {
        html += `
            <div class="radar-empty-state">
                <div style="margin-bottom:10px; color:var(--text-muted);"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg></div>
                <h4 style="margin:0 0 6px; color:var(--text-primary);">No hay temas con los filtros seleccionados</h4>
                <p style="margin:0; color:var(--text-muted); font-size:0.85rem;">El flujo diario N8N (<code>f6_editorial_radar0</code>) inyectará nuevos temas descubiertos.</p>
            </div>
        `;
    } else {
        html += `<div class="radar-topics-grid">`;
        topics.forEach(t => {
            const dc = domainColors[t.topic_domain] || { bg: 'rgba(255,255,255,0.06)', text: 'var(--text-primary)', border: 'var(--border-color)' };
            const scoreNum = parseFloat(t.ai_score) || 0;
            const scoreClass = scoreNum >= 8.5 ? 'score-high' : (scoreNum >= 7.5 ? 'score-mid' : 'score-normal');
            const dateStr = t.discovered_at ? new Date(t.discovered_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';

            html += `
                <div class="radar-topic-card">
                    <div class="radar-card-header">
                        <span class="radar-domain-badge" style="background:${dc.bg}; color:${dc.text}; border:1px solid ${dc.border};">
                            ${domainLabels[t.topic_domain] || t.topic_domain}
                        </span>
                        <span class="radar-score-pill ${scoreClass}" style="display:inline-flex; align-items:center; gap:4px;">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg> ${scoreNum.toFixed(1)} / 10
                        </span>
                    </div>

                    <h4 class="radar-topic-title">${escapeHtml(t.title)}</h4>

                    <div class="radar-topic-source">
                        <span>Fuente: <strong>${escapeHtml(t.source_name)}</strong></span>
                        ${t.source_url ? `
                            &middot; <a href="${escapeHtml(t.source_url)}" target="_blank" rel="noopener noreferrer" class="radar-source-link" style="display:inline-flex; align-items:center; gap:3px;">
                                Ver original <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                            </a>
                        ` : ''}
                        <span style="margin-left:auto; font-size:0.72rem; color:var(--text-muted);">${dateStr}</span>
                    </div>

                    <p class="radar-topic-summary">${escapeHtml(t.summary)}</p>

                    ${t.suggested_angle ? `
                        <div class="radar-suggested-angle">
                            <strong style="display:inline-flex; align-items:center; gap:4px;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="9" y1="18" x2="15" y2="18"></line><line x1="10" y1="22" x2="14" y2="22"></line><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5.76.76 1.23 1.52 1.41 2.5h6.18z"></path></svg> Ángulo Editorial AlaCor:</strong>
                            <div>${escapeHtml(t.suggested_angle)}</div>
                        </div>
                    ` : ''}

                    <div class="radar-card-footer">
                        <div class="radar-card-status">
                            ${t.status === 'CONVERTIDO_A_POST' ? `
                                <span class="badge-post-linked" onclick="openCreateSocialPostModal(${t.linked_post_id})" title="Abrir borrador creado" style="display:inline-flex; align-items:center; gap:4px; cursor:pointer;">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"></path><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"></path></svg> Post #${t.linked_post_id}
                                </span>
                            ` : `
                                <span class="badge-status-${t.status.toLowerCase()}">${t.status}</span>
                            `}
                        </div>

                        <div class="radar-card-actions">
                            ${t.status === 'PENDIENTE' ? `
                                <button type="button" class="action-icon-btn action-icon-success" onclick="updateRadarTopicStatus(${t.id}, 'APROBADO')" title="Aprobar para creación de contenido" aria-label="Aprobar"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg></button>
                                <button type="button" class="action-icon-btn action-icon-primary" onclick="convertRadarTopicToPost(${t.id})" title="Convertir a borrador de post" aria-label="Convertir a Post"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"></path><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"></path></svg></button>
                                <button type="button" class="action-icon-btn action-icon-danger" onclick="updateRadarTopicStatus(${t.id}, 'DESCARTADO')" title="Descartar tema de noticias" aria-label="Descartar"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
                            ` : t.status === 'APROBADO' ? `
                                <button type="button" class="action-icon-btn action-icon-primary" onclick="convertRadarTopicToPost(${t.id})" title="Convertir a borrador de post" aria-label="Convertir a Post"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"></path><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"></path></svg></button>
                                <button type="button" class="action-icon-btn action-icon-danger" onclick="updateRadarTopicStatus(${t.id}, 'DESCARTADO')" title="Descartar tema" aria-label="Descartar"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
                            ` : t.status === 'CONVERTIDO_A_POST' ? `
                                <button type="button" class="action-icon-btn" onclick="openCreateSocialPostModal(${t.linked_post_id})" title="Abrir editor de publicación #${t.linked_post_id}" aria-label="Editar Post"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>
                            ` : `
                                <button type="button" class="action-icon-btn" onclick="updateRadarTopicStatus(${t.id}, 'PENDIENTE')" title="Restaurar tema a estado pendiente" aria-label="Restaurar"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg></button>
                            `}
                        </div>
                    </div>
                </div>
            `;
        });
        html += `</div>`;

        // Paginación
        if (totalPages > 1) {
            html += `
                <div class="radar-pagination">
                    <button class="btn-secondary btn-xs" ${radarState.page <= 1 ? 'disabled' : ''} onclick="changeRadarPage(${radarState.page - 1})" style="display:inline-flex; align-items:center; gap:4px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"></polyline></svg> Anterior</button>
                    <span style="font-size:0.8rem; color:var(--text-muted); align-self:center;">Página ${radarState.page} de ${totalPages}</span>
                    <button class="btn-secondary btn-xs" ${radarState.page >= totalPages ? 'disabled' : ''} onclick="changeRadarPage(${radarState.page + 1})" style="display:inline-flex; align-items:center; gap:4px;">Siguiente <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg></button>
                </div>
            `;
        }
    }

    container.innerHTML = html;
}

// ── MANEJADORES DE FILTROS & ACCIONES ───────────────────────────────────────
function setRadarStatusFilter(status) {
    radarState.status = status;
    radarState.page = 1;
    loadEditorialRadarTopics();
}

function setRadarDomainFilter(domain) {
    radarState.topic_domain = domain;
    radarState.page = 1;
    loadEditorialRadarTopics();
}

function setRadarScoreFilter(score) {
    radarState.min_score = score ? parseFloat(score) : null;
    radarState.page = 1;
    loadEditorialRadarTopics();
}

function changeRadarPage(page) {
    radarState.page = page;
    loadEditorialRadarTopics();
}

/**
 * Actualiza el estado de curaduría de un tema (APROBADO, DESCARTADO, PENDIENTE).
 */
async function updateRadarTopicStatus(topicId, newStatus) {
    try {
        const username = (typeof getCurrentUsername === 'function' && getCurrentUsername()) || 'marketing_lead';
        const res = await apiFetch(`${API_BASE}/v1/editorial/topics/${topicId}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status: newStatus, reviewed_by: username })
        });
        if (res.ok) {
            if (typeof showToast === 'function') {
                showToast(`Tema #${topicId} marcado como ${newStatus}.`, 'success');
            }
            loadEditorialRadarTopics();
        } else {
            const err = await res.json();
            alert(err.detail || 'Error al actualizar estado.');
        }
    } catch (e) {
        console.error('Error updating radar topic status:', e);
    }
}

/**
 * Convierte un tema a borrador de social_posts y abre de inmediato el editor modal.
 */
async function convertRadarTopicToPost(topicId) {
    try {
        if (typeof showToast === 'function') {
            showToast('Generando borrador social y citación legal...', 'info');
        }
        const res = await apiFetch(`${API_BASE}/v1/editorial/topics/${topicId}/convert-to-post`, {
            method: 'POST'
        });
        if (res.ok) {
            const data = await res.json();
            if (typeof showToast === 'function') {
                showToast(`¡Borrador #${data.linked_post_id} creado en Redes Sociales!`, 'success');
            }
            loadEditorialRadarTopics();
            if (typeof openCreateSocialPostModal === 'function' && data.linked_post_id) {
                openCreateSocialPostModal(data.linked_post_id);
            }
        } else {
            const err = await res.json();
            alert(err.detail || 'Error al convertir tema a publicación.');
        }
    } catch (e) {
        console.error('Error converting topic to post:', e);
    }
}
