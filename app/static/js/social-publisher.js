/**
 * social-publisher.js (v12.28.3)
 * ------------------------------
 * Hub de Contenidos y Calendario Editorial Multicanal (Facebook, Instagram, LinkedIn).
 * - Soporte para Plan Editorial Anual Multi-Año y Bloques Temáticos.
 * - Registro de Fuentes Confiables y Citas de Derechos de Autor (Ley 23 de 1982).
 * - Protocolo de Mantenimiento y Depuración Periódica de Almacenamiento (Bajo Demanda).
 * - Bitácora y Relación Histórica Inmutable de Publicaciones Depuradas para Auditoría.
 * - Conexión con N8N para publicación programada y reporte de enlaces.
 */

const SOCIAL_API = `${API_BASE}/v1/social-publisher`;

let currentEditPostId = null;
let socialSearchDebounce = null;
let archiveSearchDebounce = null;
let currentPostMediaList = [];
let socialMediaUploadInFlight = 0;

function sanitizePersistentMediaUrls(urls) {
    if (!Array.isArray(urls)) return [];
    return urls.filter(u => typeof u === 'string' && u.trim() && !u.trim().toLowerCase().startsWith('blob:'));
}

const socialState = {
    status: 'ALL',
    platform: 'all',
    editorialYear: 2026,
    editorialBlock: 'ALL',
    search: '',
    limit: 20,
    offset: 0,
    total: 0,
    posts: [],
    years: [],
    viewMode: 'feed',
    calendarDate: null
};

const archiveState = {
    search: '',
    year: 'ALL',
    limit: 50,
    offset: 0,
    total: 0,
    items: []
};

/**
 * Carga los años editoriales disponibles
 */
async function loadSocialEditorialYears() {
    try {
        const res = await apiFetch(`${SOCIAL_API}/editorial/years`);
        if (res.ok) {
            const data = await res.json();
            socialState.years = data.years || [];
            renderEditorialYearSelector();
        }
    } catch (e) {
        console.error('Error loading editorial years:', e);
    }
}

function renderEditorialYearSelector() {
    const sel = document.getElementById('social-editorial-year-select');
    if (!sel) return;
    const currentVal = sel.value || (socialState.editorialYear ? String(socialState.editorialYear) : '2026');
    
    let html = '';
    const years = socialState.years.length > 0 ? socialState.years.map(y => y.year) : [2026];
    if (!years.includes(2026)) years.unshift(2026);
    
    years.sort((a, b) => b - a);

    years.forEach(y => {
        html += `<option value="${y}">Plan ${y} - ${y + 1}</option>`;
    });
    html += `<option value="ALL">Todos los años</option>`;
    sel.innerHTML = html;
    sel.value = currentVal;
}

/**
 * Carga el listado de publicaciones sociales desde el backend
 */
async function loadSocialPosts(resetPage = false) {
    if (resetPage) socialState.offset = 0;
    const grid = document.getElementById('social-posts-grid');
    const badge = document.getElementById('social-posts-count-badge');
    if (grid) {
        grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:40px; color:var(--text-muted);">Consultando publicaciones sociales...</div>';
    }

    try {
        const params = new URLSearchParams();
        if (socialState.status && socialState.status !== 'ALL') params.append('status', socialState.status);
        if (socialState.platform && socialState.platform !== 'all') params.append('platform', socialState.platform);
        if (socialState.editorialYear && socialState.editorialYear !== 'ALL') params.append('editorial_year', socialState.editorialYear);
        if (socialState.editorialBlock && socialState.editorialBlock !== 'ALL') params.append('editorial_block', socialState.editorialBlock);
        if (socialState.search && socialState.search.trim()) params.append('search', socialState.search.trim());
        params.append('limit', socialState.limit);
        params.append('offset', socialState.offset);

        const res = await apiFetch(`${SOCIAL_API}/posts?${params.toString()}`);
        if (!res.ok) {
            let errDetail = `Error HTTP ${res.status}`;
            try {
                const errData = await res.json();
                errDetail = errData.detail || errData.message || errDetail;
            } catch(e) {}
            throw new Error(errDetail);
        }
        const data = await res.json();

        socialState.total = data.total || 0;
        socialState.posts = data.posts || [];

        if (socialState.viewMode === 'calendar' && typeof renderSocialCalendar === 'function') {
            renderSocialCalendar();
        } else {
            renderSocialPostsFeed(socialState.posts);
            renderSocialPagination();
        }

        if (badge) {
            badge.innerText = `${socialState.posts.length} de ${socialState.total} publicaciones`;
        }
    } catch (e) {
        console.error('Error in loadSocialPosts:', e);
        if (grid) {
            grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:40px; color:#ef4444;">Error: ${escapeHtml(e.message)}</div>`;
        }
    }
}

/**
 * Filtro por Año Editorial
 */
function setSocialYearFilter(yearVal) {
    socialState.editorialYear = yearVal === 'ALL' ? 'ALL' : parseInt(yearVal, 10);
    loadSocialPosts(true);
}

/**
 * Filtro por Bloque Temático
 */
function setSocialBlockFilter(blockName) {
    socialState.editorialBlock = blockName;
    const chips = ['all', 'fechas', 'productos', 'legal', 'cultura', 'tendencias', 'empresa', 'engagement'];
    chips.forEach(c => {
        const btn = document.getElementById(`chip-social-block-${c}`);
        if (btn) btn.classList.remove('active');
    });

    const map = {
        'ALL': 'all',
        'Fechas Especiales': 'fechas',
        'Conocimiento de Productos': 'productos',
        'Marco Legal y Normativo': 'legal',
        'Educación y Cultura Preventiva': 'cultura',
        'Tendencias e Industria': 'tendencias',
        'ÁLACOR como Empresa': 'empresa',
        'Engagement Comunitario': 'engagement'
    };
    const activeKey = map[blockName] || 'all';
    const activeBtn = document.getElementById(`chip-social-block-${activeKey}`);
    if (activeBtn) activeBtn.classList.add('active');

    loadSocialPosts(true);
}

/**
 * Filtro por Estado (Borrador, Programado, Publicado, Archivados, Fallido)
 */
function setSocialStatusFilter(status) {
    socialState.status = status;
    const chips = ['all', 'programado', 'borrador', 'publicado', 'archivado', 'fallido'];
    chips.forEach(c => {
        const btn = document.getElementById(`chip-social-status-${c}`);
        if (btn) btn.classList.remove('active');
    });
    const activeBtn = document.getElementById(`chip-social-status-${status.toLowerCase()}`);
    if (activeBtn) activeBtn.classList.add('active');

    loadSocialPosts(true);
}

/**
 * Filtro por Red Social (Facebook, Instagram, LinkedIn)
 */
function setSocialPlatformFilter(platform) {
    socialState.platform = platform;
    const chips = ['all', 'facebook', 'instagram', 'linkedin'];
    chips.forEach(c => {
        const btn = document.getElementById(`chip-social-plat-${c}`);
        if (btn) btn.classList.remove('active');
    });
    const activeBtn = document.getElementById(`chip-social-plat-${platform.toLowerCase()}`);
    if (activeBtn) activeBtn.classList.add('active');

    loadSocialPosts(true);
}

function debounceSocialSearch() {
    clearTimeout(socialSearchDebounce);
    socialSearchDebounce = setTimeout(() => {
        const val = document.getElementById('social-search-input')?.value || '';
        socialState.search = val;
        loadSocialPosts(true);
    }, 300);
}

/**
 * Mapeo de colores para Bloques Temáticos
 */
function getBlockBadgeHtml(blockName) {
    if (!blockName) return '';
    const shortLabel = {
        'Fechas Especiales': 'Fechas Especiales',
        'Conocimiento de Productos': 'Productos',
        'Marco Legal y Normativo': 'Marco Legal',
        'Educación y Cultura Preventiva': 'Cultura Preventiva',
        'Tendencias e Industria': 'Tendencias',
        'ÁLACOR como Empresa': 'ÁLACOR',
        'Engagement Comunitario': 'Engagement'
    };
    const label = shortLabel[blockName] || blockName;
    return `<span class="social-block-label">${label}</span>`;
}

/**
 * Renderiza las tarjetas de publicaciones en el Feed
 */
function renderSocialPostsFeed(posts) {
    const grid = document.getElementById('social-posts-grid');
    if (!grid) return;

    if (!posts || posts.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align:center; padding:50px 20px; background:var(--bg-card); border-radius:var(--radius-md); border:1px dashed var(--border-color);">
                <div style="display:flex; justify-content:center; margin-bottom:12px; color:var(--text-muted);">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m3 11 18-5v12L3 13v-2z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>
                </div>
                <h3 style="margin:0 0 6px; color:var(--text-primary); font-family:var(--font-heading);">No hay publicaciones registradas con estos filtros</h3>
                <p style="margin:0 0 16px; font-size:0.85rem; color:var(--text-muted);">Crea tu primera publicación o ajusta los filtros de año, bloque y estado.</p>
                <button class="btn-primary" onclick="openCreateSocialPostModal()" style="font-size:0.85rem;">+ Crear Publicación</button>
            </div>
        `;
        return;
    }

    grid.innerHTML = posts.map(p => {
        const statusMap = {
            BORRADOR: { label: '<span class="comm-dot comm-dot-slate"></span> Borrador', class: 'status-draft' },
            PROGRAMADO: { label: '<span class="comm-dot comm-dot-amber"></span> Programado', class: 'status-scheduled' },
            PUBLICANDO: { label: '<span class="comm-dot comm-dot-cyan"></span> Publicando...', class: 'status-publishing' },
            PUBLICADO: { label: '<span class="comm-dot comm-dot-green"></span> Publicado', class: 'status-published' },
            ARCHIVADO: { label: '<span class="comm-dot comm-dot-slate"></span> Archivada', class: 'status-draft' },
            FALLIDO: { label: '<span class="comm-dot comm-dot-red"></span> Fallido', class: 'status-failed' }
        };
        const st = statusMap[p.status] || { label: p.status, class: 'status-draft' };

        // Badges de plataformas (iconos SVG minimalistas con tooltip)
        const plats = p.target_platforms || [];
        const platBadges = plats.map(plat => {
            const pLower = (plat || '').toLowerCase();
            if (pLower === 'facebook') {
                return `<span class="social-plat-mini-badge badge-fb" title="Facebook">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
                </span>`;
            }
            if (pLower === 'instagram') {
                return `<span class="social-plat-mini-badge badge-ig" title="Instagram">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                </span>`;
            }
            if (pLower === 'linkedin') {
                return `<span class="social-plat-mini-badge badge-in" title="LinkedIn">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
                </span>`;
            }
            return `<span class="social-plat-mini-badge badge-gen" title="${escapeHtml(plat)}">${escapeHtml(plat.substring(0, 2).toUpperCase())}</span>`;
        }).join('');

        // Badge de Bloque Temático y Año
        const blockBadge = getBlockBadgeHtml(p.editorial_block);
        const yearTag = p.editorial_year ? `<span style="font-size:0.7rem; color:var(--text-muted); font-weight:600; margin-right:4px;">[${p.editorial_year}]</span>` : '';

        // Badge de Canal Emisor (Corporativo vs Personal)
        const isPersonal = (p.channel_type || '').toUpperCase() === 'PERSONAL';
        const channelBadge = isPersonal 
            ? `<span class="social-channel-badge badge-personal" title="Publicación en Perfil Personal de ${escapeHtml(p.author_username || p.created_by || 'Usuario')}" style="display:inline-flex; align-items:center; gap:4px; padding:2px 7px; border-radius:12px; font-size:0.68rem; font-weight:600; background:rgba(59,130,246,0.15); color:#60a5fa; border:1px solid rgba(59,130,246,0.3);">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                Personal: ${escapeHtml(p.author_username || p.created_by || '')}
              </span>`
            : `<span class="social-channel-badge badge-corp" title="Publicación Corporativa ÁLACOR" style="display:inline-flex; align-items:center; gap:4px; padding:2px 7px; border-radius:12px; font-size:0.68rem; font-weight:500; background:rgba(255,255,255,0.04); color:var(--text-muted); border:1px solid rgba(255,255,255,0.08);">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/></svg>
                ÁLACOR
              </span>`;

        // Multimedia preview thumbnail e indicador compacto
        const mediaUrls = sanitizePersistentMediaUrls(p.media_urls);
        const firstMedia = mediaUrls.length > 0 ? mediaUrls[0] : null;
        let mediaThumbHtml = '';
        let mediaIndicatorHtml = '';
        if (firstMedia) {
            const isVideo = firstMedia.endsWith('.mp4') || firstMedia.endsWith('.mov');
            mediaIndicatorHtml = `<span class="social-media-indicator" title="${isVideo ? 'Contiene video' : 'Contiene imagen'}">
                ${isVideo 
                    ? '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>' 
                    : '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>'}
            </span>`;
            mediaThumbHtml = isVideo
                ? `<div class="social-card-thumb" onclick="openSocialQuickPreviewModal(${p.id})" style="cursor:pointer;" title="Clic para ver vista previa"><video src="${firstMedia}" muted></video><span class="video-indicator"><svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" stroke="none" style="vertical-align:middle; margin-right:2px;"><polygon points="5 3 19 12 5 21 5 3"/></svg>Video</span></div>`
                : `<div class="social-card-thumb" onclick="openSocialQuickPreviewModal(${p.id})" style="cursor:pointer;" title="Clic para ver vista previa"><img src="${firstMedia}" alt="Media" onerror="this.style.display='none'"></div>`;
        }

        // Pill si la multimedia fue purgada por mantenimiento
        let purgedPill = '';
        if (p.media_purged_at || p.status === 'ARCHIVADO') {
            purgedPill = `<div style="margin-top:6px; font-size:0.72rem; color:var(--accent-cyan); background:rgba(6,182,212,0.06); padding:3px 8px; border-radius:4px; border:1px solid rgba(6,182,212,0.15); display:inline-flex; align-items:center; gap:4px;">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                Archivada en bitácora histórica
            </div>`;
        }

        // Links publicados en vivo
        let linksHtml = '';
        if ((p.status === 'PUBLICADO' || p.status === 'ARCHIVADO') && p.published_links && typeof p.published_links === 'object') {
            const validEntries = Object.entries(p.published_links).filter(([k, url]) => url && typeof url === 'string' && url.trim().length > 0);
            if (validEntries.length > 0) {
                linksHtml = '<div class="social-published-links">' + validEntries.map(([k, url]) => `
                    <a href="${url}" target="_blank" rel="noopener noreferrer" class="social-pub-link">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle; margin-right:3px;"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>Ver en ${k}
                    </a>
                `).join('') + '</div>';
            }
        }

        // Fuente Confiable — texto plano sin pill coloreado
        let sourceHtml = '';
        if (p.source_entity || p.source_reference) {
            sourceHtml = `
                <div class="social-source-label">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                    ${escapeHtml(p.source_entity || '')}${p.source_reference ? ' — ' + escapeHtml(p.source_reference) : ''}
                </div>
            `;
        }

        // Fecha de programación / publicación
        let dateInfoHtml = '';
        if (p.status === 'PROGRAMADO' && p.scheduled_at) {
            const d = new Date(p.scheduled_at);
            dateInfoHtml = `<div class="social-card-date">Programado: <strong>${d.toLocaleString()}</strong></div>`;
        } else if ((p.status === 'PUBLICADO' || p.status === 'ARCHIVADO') && p.published_at) {
            const d = new Date(p.published_at);
            dateInfoHtml = `<div class="social-card-date">Publicado: <strong>${d.toLocaleString()}</strong></div>`;
        } else {
            const d = new Date(p.created_at);
            dateInfoHtml = `<div class="social-card-date">Creado: <strong>${d.toLocaleDateString()}</strong></div>`;
        }

        const errorHtml = p.error_message ? `<div class="social-card-error">${p.error_message}</div>` : '';
        const displayTitle = escapeHtml(p.title || 'Publicación sin título');
        const displayContent = escapeHtml(p.base_content || 'Sin contenido de texto.');

        return `
            <div class="social-card" tabindex="0">
                <div class="social-card-header">
                    <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                        <span class="social-status-tag ${st.class}">${st.label} · #${p.id}</span>
                        ${yearTag}
                        ${blockBadge}
                        ${channelBadge}
                        ${p.show_title ? '<span class="social-block-label" style="background:rgba(56,189,248,0.12); color:#38bdf8; border:1px solid rgba(56,189,248,0.3);" title="El título se incluye en la publicación">Título Activo</span>' : ''}
                        ${mediaIndicatorHtml}
                    </div>
                    <div class="social-card-actions">
                        <button class="action-icon-btn" onclick="openSocialQuickPreviewModal(${p.id})" title="Ver Vista Previa del Post">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                        </button>
                        ${p.status === 'BORRADOR' || p.status === 'FALLIDO' ? `
                            <button class="action-icon-btn action-trigger-btn" onclick="triggerSocialPostNow(${p.id})" title="Publicar Ahora">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
                            </button>
                        ` : ''}
                        <button class="action-icon-btn" onclick="openCreateSocialPostModal(${p.id})" title="Editar">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                        <button class="action-icon-btn delete" onclick="deleteSocialPost(${p.id})" title="Eliminar">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                    </div>
                </div>
                <div class="social-card-main">
                    <div class="social-card-headline">
                        <h4 class="social-card-title" onclick="openSocialQuickPreviewModal(${p.id})" style="cursor:pointer;" title="Clic para ver vista previa">${displayTitle}</h4>
                        <div class="social-card-plats">${platBadges}</div>
                    </div>
                </div>
                <div class="social-card-expandable">
                    ${mediaThumbHtml}
                    <div class="social-card-expandable-body">
                        <p class="social-card-content">${displayContent}</p>
                        ${sourceHtml}
                        ${purgedPill}
                        ${linksHtml}
                        ${errorHtml}
                    </div>
                    <div class="social-card-footer">
                        ${dateInfoHtml}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function renderSocialPagination() {
    const container = document.getElementById('social-posts-pagination');
    if (!container) return;
    const totalPages = Math.ceil(socialState.total / socialState.limit) || 1;
    const currentPage = Math.floor(socialState.offset / socialState.limit) + 1;

    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = `
        <div style="display:flex; align-items:center; gap:8px; font-size:0.82rem;">
            <button class="btn-secondary" ${currentPage === 1 ? 'disabled' : ''} onclick="changeSocialPage(${currentPage - 1})" style="padding:4px 10px; display:inline-flex; align-items:center; gap:4px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"></polyline></svg> Anterior</button>
            <span style="color:var(--text-muted); font-weight:600;">Página ${currentPage} de ${totalPages}</span>
            <button class="btn-secondary" ${currentPage === totalPages ? 'disabled' : ''} onclick="changeSocialPage(${currentPage + 1})" style="padding:4px 10px; display:inline-flex; align-items:center; gap:4px;">Siguiente <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg></button>
        </div>
    `;
}

function changeSocialPage(page) {
    socialState.offset = (page - 1) * socialState.limit;
    loadSocialPosts(false);
}

/**
 * Modal de Vista Previa Rápida (Mockup Simulator)
 */
function openSocialQuickPreviewModal(postId) {
    const post = (socialState.posts || []).find(p => p.id === postId);
    if (!post) return;

    const titleEl = document.getElementById('social-quick-preview-title');
    const bodyEl = document.getElementById('social-quick-preview-body');
    if (titleEl) titleEl.innerText = post.title || 'Vista Previa de la Publicación';

    const plats = post.target_platforms || [];
    const platBadges = plats.map(plat => {
        const pLower = (plat || '').toLowerCase();
        if (pLower === 'facebook') return '<span class="social-plat-mini-badge badge-fb" title="Facebook"><svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg></span>';
        if (pLower === 'instagram') return '<span class="social-plat-mini-badge badge-ig" title="Instagram"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg></span>';
        if (pLower === 'linkedin') return '<span class="social-plat-mini-badge badge-in" title="LinkedIn"><svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg></span>';
        return `<span class="social-plat-mini-badge badge-gen" title="${plat}">${plat.substring(0, 2).toUpperCase()}</span>`;
    }).join(' ');

    const mediaUrls = sanitizePersistentMediaUrls(post.media_urls);
    const firstMedia = mediaUrls.length > 0 ? mediaUrls[0] : null;
    let mediaPreviewHtml = '';
    if (firstMedia) {
        const isVideo = firstMedia.endsWith('.mp4') || firstMedia.endsWith('.mov');
        mediaPreviewHtml = isVideo
            ? `<video src="${firstMedia}" controls style="max-height:260px; width:100%; border-radius:8px; margin:12px 0;"></video>`
            : `<img src="${firstMedia}" alt="Media" style="max-height:260px; width:100%; object-fit:cover; border-radius:8px; margin:12px 0;">`;
    }

    const content = post.base_content || 'Sin contenido de texto.';

    let sourceCardHtml = '';
    if (post.source_entity || post.source_reference || post.source_citation) {
        sourceCardHtml = `
            <div style="margin-top:14px; background:rgba(6,182,212,0.06); border:1px solid rgba(6,182,212,0.25); border-radius:8px; padding:10px 14px;">
                <div style="font-size:0.76rem; font-weight:700; color:var(--accent-cyan); margin-bottom:4px; display:flex; align-items:center; gap:5px;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10"/><path d="M6 10h10"/></svg>
                    Fuente Oficial & Reconocimiento Legal (Ley 23 de 1982)
                </div>
                <div style="font-size:0.8rem; color:var(--text-primary); font-weight:600;">${escapeHtml(post.source_entity || '')} — ${escapeHtml(post.source_reference || '')}</div>
                ${post.source_citation ? `<div style="font-size:0.75rem; color:var(--text-secondary); margin-top:3px; font-style:italic;">"${escapeHtml(post.source_citation)}"</div>` : ''}
                ${post.source_url ? `<div style="margin-top:4px;"><a href="${post.source_url}" target="_blank" rel="noopener noreferrer" style="font-size:0.72rem; color:var(--accent-cyan); text-decoration:underline;">Ver Enlace Oficial</a></div>` : ''}
            </div>
        `;
    }

    let customCopiesHtml = '';
    if (post.custom_content && Object.keys(post.custom_content).length > 0) {
        const entries = Object.entries(post.custom_content).filter(([k]) => k !== 'bloque' && k !== 'mes_referencia');
        if (entries.length > 0) {
            customCopiesHtml = '<div style="margin-top:14px; border-top:1px dashed var(--border-color); padding-top:10px;">' + entries.map(([k, text]) => `
                <div style="margin-bottom:8px;">
                    <span style="font-size:0.75rem; font-weight:700; color:var(--accent-primary); text-transform:uppercase;">Adaptación para ${k}:</span>
                    <p style="font-size:0.8rem; color:var(--text-secondary); margin:3px 0 0; line-height:1.4;">${escapeHtml(text)}</p>
                </div>
            `).join('') + '</div>';
        }
    }

    const isPersonal = (post.channel_type || '').toUpperCase() === 'PERSONAL';
    const authorName = isPersonal ? (post.author_username || 'Perfil Personal') : 'ÁLACOR S.A.S.';
    const authorSub = isPersonal ? 'Perfil Personal · LinkedIn' : 'Publicidad Oficial · Global';
    const authorBg = isPersonal ? '#0a66c2' : 'var(--accent-primary)';
    const authorInitials = isPersonal ? (authorName.replace(/[^a-zA-Z0-9 ]/g, '').trim().split(/\s+/).map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'FA') : 'Á';

    if (bodyEl) {
        bodyEl.innerHTML = `
            <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:10px; padding:16px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <div style="width:34px; height:34px; border-radius:50%; background:${authorBg}; display:flex; align-items:center; justify-content:center; color:#fff; font-size:0.85rem; font-weight:bold;">${authorInitials}</div>
                        <div>
                            <div style="font-size:0.88rem; font-weight:700; color:var(--text-primary);">${escapeHtml(authorName)}</div>
                            <div style="font-size:0.72rem; color:var(--text-muted);">${authorSub}</div>
                        </div>
                    </div>
                    <div>${platBadges}</div>
                </div>
                ${post.show_title && post.title ? `<div style="font-size:0.92rem; font-weight:700; color:var(--text-primary); margin-bottom:8px; line-height:1.35;">${escapeHtml(post.title)}</div>` : ''}
                <p style="font-size:0.86rem; color:var(--text-primary); line-height:1.45; margin:0; white-space:pre-wrap;">${escapeHtml(content)}</p>
                ${mediaPreviewHtml}
                ${sourceCardHtml}
                ${customCopiesHtml}
            </div>
        `;
    }

    const modal = document.getElementById('social-preview-modal');
    if (modal) modal.classList.add('active');
}

function closeSocialQuickPreviewModal() {
    const modal = document.getElementById('social-preview-modal');
    if (modal) modal.classList.remove('active');
}

/**
 * Modal de Creación / Edición
 */
let currentEditPostDetail = null;
let _cachedPersonalPublishEligibility = null;

/**
 * Consulta si el usuario actual cuenta con permisos (social.personal_publish)
 * y una cuenta activa de LinkedIn configurada con token válido.
 */
async function checkUserPersonalPublishEligibility(username) {
    if (!username) return { eligible: false, accountName: '' };
    try {
        const res = await apiFetch(`${API_BASE}/v1/user-social-accounts/${encodeURIComponent(username)}`);
        if (!res.ok) return { eligible: false, accountName: '' };
        const data = await res.json();
        const hasPerm = !!data.can_publish_personal;
        const accounts = data.accounts || [];
        const liAcc = accounts.find(a => (a.platform || '').toLowerCase() === 'linkedin' && a.account_urn && a.is_active);
        if (hasPerm && liAcc) {
            return {
                eligible: true,
                accountName: liAcc.account_name || username,
                accountUrn: liAcc.account_urn
            };
        }
    } catch (e) {
        console.warn('Error verificando elegibilidad de publicación personal:', e);
    }
    return { eligible: false, accountName: '' };
}

async function openCreateSocialPostModal(postId = null) {
    currentEditPostId = postId;
    currentEditPostDetail = null;
    currentPostMediaList = [];

    const titleEl = document.getElementById('social-modal-title');
    const formTitle = document.getElementById('social-form-title');
    const formShowTitle = document.getElementById('social-form-show-title');
    const formBase = document.getElementById('social-form-base-content');
    const formLinkedin = document.getElementById('social-form-linkedin-content');
    const formInstagram = document.getElementById('social-form-instagram-content');
    const formStatus = document.getElementById('social-form-status');
    const formScheduled = document.getElementById('social-form-scheduled');
    const formYear = document.getElementById('social-form-year');
    const formBlock = document.getElementById('social-form-block');
    const formSourceEntity = document.getElementById('social-form-source-entity');
    const formSourceRef = document.getElementById('social-form-source-reference');
    const formSourceUrl = document.getElementById('social-form-source-url');
    const formSourceCit = document.getElementById('social-form-source-citation');
    const formChannelType = document.getElementById('social-form-channel-type');

    document.querySelectorAll('.social-plat-chk').forEach(chk => chk.checked = true);

    if (postId) {
        if (titleEl) titleEl.innerText = 'Editar Publicación';
        try {
            const res = await apiFetch(`${SOCIAL_API}/posts/${postId}`);
            if (res.ok) {
                const post = await res.json();
                currentEditPostDetail = post;
                if (formTitle) formTitle.value = post.title || '';
                if (formShowTitle) formShowTitle.checked = !!post.show_title;
                if (formBase) formBase.value = post.base_content || '';
                if (formLinkedin) formLinkedin.value = (post.custom_content && post.custom_content.linkedin) || '';
                if (formInstagram) formInstagram.value = (post.custom_content && post.custom_content.instagram) || '';
                if (formStatus) formStatus.value = post.status || 'BORRADOR';
                if (formYear) formYear.value = post.editorial_year || 2026;
                if (formBlock) formBlock.value = post.editorial_block || 'Conocimiento de Productos';
                if (formSourceEntity) formSourceEntity.value = post.source_entity || '';
                if (formSourceRef) formSourceRef.value = post.source_reference || '';
                if (formSourceUrl) formSourceUrl.value = post.source_url || '';
                if (formSourceCit) formSourceCit.value = post.source_citation || '';
                if (formChannelType) formChannelType.value = (post.channel_type || 'ORGANIZATION').toUpperCase();

                if (formScheduled && post.scheduled_at) {
                    const d = new Date(post.scheduled_at);
                    const offset = d.getTimezoneOffset();
                    const localD = new Date(d.getTime() - (offset * 60 * 1000));
                    formScheduled.value = localD.toISOString().slice(0, 16);
                } else if (formScheduled) {
                    formScheduled.value = '';
                }
                currentPostMediaList = sanitizePersistentMediaUrls(post.media_urls);

                const plats = post.target_platforms || [];
                document.querySelectorAll('.social-plat-chk').forEach(chk => {
                    chk.checked = plats.includes(chk.value);
                });
            }
        } catch (e) {
            console.error('Error fetching post detail:', e);
        }
    } else {
        if (titleEl) titleEl.innerText = 'Nueva Publicación para Redes Sociales';
        if (formTitle) formTitle.value = '';
        if (formShowTitle) formShowTitle.checked = false;
        if (formBase) formBase.value = '';
        if (formLinkedin) formLinkedin.value = '';
        if (formInstagram) formInstagram.value = '';
        if (formStatus) formStatus.value = 'PROGRAMADO';
        if (formYear) formYear.value = socialState.editorialYear && socialState.editorialYear !== 'ALL' ? socialState.editorialYear : 2026;
        if (formBlock) formBlock.value = socialState.editorialBlock && socialState.editorialBlock !== 'ALL' ? socialState.editorialBlock : 'Conocimiento de Productos';
        if (formSourceEntity) formSourceEntity.value = '';
        if (formSourceRef) formSourceRef.value = '';
        if (formSourceUrl) formSourceUrl.value = '';
        if (formSourceCit) formSourceCit.value = '';
        if (formChannelType) formChannelType.value = 'ORGANIZATION';

        if (formScheduled) {
            const d = new Date(Date.now() + 3600 * 1000);
            const offset = d.getTimezoneOffset();
            const localD = new Date(d.getTime() - (offset * 60 * 1000));
            formScheduled.value = localD.toISOString().slice(0, 16);
        }
    }

    // Verificar elegibilidad de emisión personal (permiso RBAC + token activo de LinkedIn)
    const currentUsername = (localStorage.getItem('username') || '').trim();
    const eligibility = await checkUserPersonalPublishEligibility(currentUsername);
    _cachedPersonalPublishEligibility = eligibility;

    const channelGroup = document.getElementById('social-channel-type-group');
    const optPersonal = document.getElementById('social-opt-personal');
    const isExistingPersonal = currentEditPostDetail && (currentEditPostDetail.channel_type || '').toUpperCase() === 'PERSONAL';

    if (eligibility && eligibility.eligible) {
        if (channelGroup) channelGroup.style.display = 'block';
        if (optPersonal) {
            optPersonal.style.display = '';
            optPersonal.innerText = `👤 Mi Perfil Personal (LinkedIn - ${eligibility.accountName})`;
        }
        if (formChannelType) {
            formChannelType.value = isExistingPersonal ? 'PERSONAL' : (currentEditPostDetail ? (currentEditPostDetail.channel_type || 'ORGANIZATION').toUpperCase() : 'ORGANIZATION');
        }
    } else if (isExistingPersonal) {
        // Si el post existente ya fue emitido por un autor personal, conservar su trazabilidad
        if (channelGroup) channelGroup.style.display = 'block';
        if (optPersonal) {
            optPersonal.style.display = '';
            optPersonal.innerText = `👤 Perfil Personal (${currentEditPostDetail.author_username || 'Autor'})`;
        }
        if (formChannelType) {
            formChannelType.value = 'PERSONAL';
        }
    } else {
        // Usuario no autorizado o sin token: forzar ORGANIZATION y ocultar el selector
        if (channelGroup) channelGroup.style.display = 'none';
        if (optPersonal) optPersonal.style.display = 'none';
        if (formChannelType) formChannelType.value = 'ORGANIZATION';
    }

    onSocialChannelTypeChange();
    renderSocialMediaPreviewList();
    updateSocialLivePreview();

    const modal = document.getElementById('social-post-modal');
    if (modal) modal.classList.add('active');
}

function onSocialChannelTypeChange() {
    const channelType = document.getElementById('social-form-channel-type')?.value || 'ORGANIZATION';
    const hint = document.getElementById('social-channel-hint');
    const fbChk = document.querySelector('.social-plat-chk[value="facebook"]');
    const igChk = document.querySelector('.social-plat-chk[value="instagram"]');
    const liChk = document.querySelector('.social-plat-chk[value="linkedin"]');

    if (channelType === 'PERSONAL') {
        if (hint) hint.innerText = 'Emisión personal autorizada';
        if (fbChk) {
            fbChk.checked = false;
            fbChk.disabled = true;
        }
        if (igChk) {
            igChk.checked = false;
            igChk.disabled = true;
        }
        if (liChk) {
            liChk.checked = true;
            liChk.disabled = false;
        }
    } else {
        if (hint) hint.innerText = 'Canal corporativo oficial';
        if (fbChk) fbChk.disabled = false;
        if (igChk) igChk.disabled = false;
        if (liChk) liChk.disabled = false;
    }
    updateSocialLivePreview();
}

function closeSocialPostModal() {
    if (typeof _hideAiSuggestionCard === 'function') _hideAiSuggestionCard();
    if (typeof hideFieldHelp === 'function') hideFieldHelp();
    toggleSocialPreviewFullscreen(false);
    const modal = document.getElementById('social-post-modal');
    if (modal) modal.classList.remove('active');
}

/**
 * Inserta la cita legal formateada en el copy base
 */
function insertCitationIntoCopy() {
    const formBase = document.getElementById('social-form-base-content');
    const entity = document.getElementById('social-form-source-entity')?.value || '';
    const ref = document.getElementById('social-form-source-reference')?.value || '';
    const url = document.getElementById('social-form-source-url')?.value || '';
    const cit = document.getElementById('social-form-source-citation')?.value || '';

    if (!entity && !ref && !cit) {
        showToast('Completa primero la entidad o referencia de la fuente', 'warning');
        return;
    }

    let citationBlock = '\n\n───────────────\n';
    if (entity || ref) {
        citationBlock += `Fuente oficial: ${entity}${ref ? ' — ' + ref : ''}\n`;
    }
    if (cit) {
        citationBlock += `Marco Legal: ${cit}\n`;
    }
    if (url) {
        // Inyectar parámetros UTM automáticos para trazabilidad y lead scoring
        const block = document.getElementById('social-form-block')?.value || 'comunicacion';
        const cleanCampaign = block.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 30);
        const postRef = currentEditPostId ? `post_${currentEditPostId}` : 'new_post';
        
        let finalUrl = url.trim();
        try {
            const parsedUrl = new URL(finalUrl);
            if (!parsedUrl.searchParams.has('utm_source')) {
                parsedUrl.searchParams.set('utm_source', 'social_coralis');
                parsedUrl.searchParams.set('utm_medium', 'social_organic');
                parsedUrl.searchParams.set('utm_campaign', cleanCampaign);
                parsedUrl.searchParams.set('utm_content', postRef);
                finalUrl = parsedUrl.toString();
            }
        } catch (e) {
            // Si la URL no es estándar, mantenerla intacta
        }

        citationBlock += `Consulta oficial: ${finalUrl}`;
    }

    if (formBase) {
        formBase.value = formBase.value.trim() + citationBlock;
        updateSocialLivePreview();
        showToast('Cita legal y fuente con UTMs agregada al copy', 'success');
    }
}

/**
 * Subida de archivos multimedia
 * - Crea un blob URL local de forma inmediata para mostrar la vista previa
 *   sin esperar que el servidor responda.
 * - Sustituye el blob URL por la URL del servidor al completarse la subida.
 */
async function handleSocialMediaUpload(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Limpiar cualquier blob URL huérfano previo antes de adjuntar el nuevo recurso
    currentPostMediaList = sanitizePersistentMediaUrls(currentPostMediaList);

    const submitBtn = document.querySelector('#social-post-modal button[type="submit"]');
    const originalBtnText = submitBtn ? submitBtn.innerHTML : null;

    for (let i = 0; i < files.length; i++) {
        const file    = files[i];
        const blobUrl = URL.createObjectURL(file);

        // Si es una subida individual para el post, reemplazamos la pieza principal para que la vista previa refleje inmediatamente la nueva imagen
        if (files.length === 1) {
            currentPostMediaList = [blobUrl];
        } else {
            currentPostMediaList.push(blobUrl);
        }
        const blobIdx = currentPostMediaList.indexOf(blobUrl);

        renderSocialMediaPreviewList();
        updateSocialLivePreview();

        const formData = new FormData();
        formData.append('file', file);

        socialMediaUploadInFlight++;
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = 'Subiendo imagen...';
        }

        try {
            showToast('Subiendo archivo multimedia...', 'info');
            const res = await apiFetch(`${SOCIAL_API}/upload-media`, {
                method: 'POST',
                body:   formData
            });
            if (!res.ok) throw new Error('Error al subir archivo');
            const data = await res.json();
            if (data.url) {
                URL.revokeObjectURL(blobUrl);
                const currentIdx = currentPostMediaList.indexOf(blobUrl);
                if (currentIdx !== -1) {
                    currentPostMediaList[currentIdx] = data.url;
                } else if (blobIdx !== -1 && blobIdx < currentPostMediaList.length) {
                    currentPostMediaList[blobIdx] = data.url;
                } else {
                    currentPostMediaList.push(data.url);
                }
                showToast('Archivo subido con éxito', 'success');
            }
        } catch (e) {
            URL.revokeObjectURL(blobUrl);
            currentPostMediaList = currentPostMediaList.filter(u => u !== blobUrl);
            showToast(`${e.message} — Por favor intenta subir la imagen nuevamente.`, 'error');
        } finally {
            socialMediaUploadInFlight = Math.max(0, socialMediaUploadInFlight - 1);
            if (submitBtn && socialMediaUploadInFlight === 0 && originalBtnText !== null) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
            }
        }
    }
    event.target.value = '';
    renderSocialMediaPreviewList();
    updateSocialLivePreview();
}


function addExternalMediaUrl() {
    const url = prompt('Ingresa la URL pública de la imagen o video:');
    if (url && url.trim()) {
        currentPostMediaList.push(url.trim());
        renderSocialMediaPreviewList();
        updateSocialLivePreview();
    }
}

function removeSocialMediaUrl(index) {
    currentPostMediaList.splice(index, 1);
    renderSocialMediaPreviewList();
    updateSocialLivePreview();
}

function renderSocialMediaPreviewList() {
    const list = document.getElementById('social-media-preview-list');
    if (!list) return;
    if (currentPostMediaList.length === 0) {
        list.innerHTML = '<span style="font-size:0.75rem; color:var(--text-muted); font-style:italic;">No hay multimedia adjunta</span>';
        return;
    }
    list.innerHTML = currentPostMediaList.map((url, idx) => `
        <div style="display:flex; align-items:center; justify-content:space-between; background:var(--bg-card); padding:5px 8px; border-radius:4px; border:1px solid var(--border-color); font-size:0.75rem; gap:6px;">
            <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:210px; color:var(--text-secondary);" title="${escapeHtml(url)}">${escapeHtml(url)}</span>
            <div style="display:flex; align-items:center; gap:4px; flex-shrink:0;">
                <button type="button" class="media-ref-icon-btn" onclick="openVisualStudioWithReference(${idx})" title="Usar esta imagen como referencia en el Estudio Visual IA / Google Flow" aria-label="Referencia IA">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><line x1="12" y1="3" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="21"/><line x1="3" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="21" y2="12"/></svg>
                </button>
                <button type="button" class="media-delete-icon-btn" onclick="removeSocialMediaUrl(${idx})" title="Eliminar archivo multimedia" aria-label="Eliminar">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </div>
        </div>
    `).join('');
}

function openVisualStudioWithReference(mediaIdx) {
    if (!currentPostMediaList || !currentPostMediaList[mediaIdx]) return;
    const url = currentPostMediaList[mediaIdx];
    if (typeof window.setReferenceImage === 'function') {
        window.setReferenceImage(url, 'ANIMATE_STILL');
    }
    if (typeof window.openImagePromptModal === 'function') {
        window.openImagePromptModal();
    }
    if (typeof showToast === 'function') {
        showToast('Imagen cargada como referencia para Google Flow', 'info');
    }
}
window.openVisualStudioWithReference = openVisualStudioWithReference;

function updateSocialLivePreview() {
    const textEl     = document.getElementById('social-preview-text');
    const mediaEl    = document.getElementById('social-preview-media');
    const citationEl = document.getElementById('social-preview-citation');
    const formBase   = document.getElementById('social-form-base-content');
    const formTitle  = document.getElementById('social-form-title');
    const formShowTitle = document.getElementById('social-form-show-title');

    // ── Channel Header (ÁLACOR vs Perfil Personal) ────────────────────────
    const avatarEl     = document.getElementById('social-preview-avatar');
    const authorNameEl = document.getElementById('social-preview-author-name');
    const authorSubEl  = document.getElementById('social-preview-author-sub');
    const channelType  = document.getElementById('social-form-channel-type')?.value || 'ORGANIZATION';

    if (authorNameEl && authorSubEl && avatarEl) {
        if (channelType === 'PERSONAL') {
            const rawAuthor = (_cachedPersonalPublishEligibility && _cachedPersonalPublishEligibility.accountName)
                || localStorage.getItem('full_name')
                || (currentEditPostDetail && currentEditPostDetail.author_username)
                || localStorage.getItem('username')
                || 'Fabián Alarcón';
            const authorDisplayName = /falarcon|fabian|fabián/i.test(rawAuthor) ? 'Fabián Alarcón' : rawAuthor;
            const initials = authorDisplayName.replace(/[^a-zA-Z0-9 ]/g, '').trim().split(/\s+/).map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'FA';
            avatarEl.innerText = initials;
            avatarEl.style.background = '#0a66c2';
            authorNameEl.innerText = authorDisplayName;
            authorSubEl.innerText = 'CEO & Cofundador · Ingeniero Industrial';
        } else {
            avatarEl.innerText = 'Á';
            avatarEl.style.background = 'var(--accent-primary)';
            authorNameEl.innerText = 'ÁLACOR S.A.S.';
            authorSubEl.innerText = 'Publicidad Oficial · Global';
        }
    }

    // ── Text ──────────────────────────────────────────────────────────────
    if (textEl && formBase) {
        const shouldShowTitle = !!(formShowTitle && formShowTitle.checked);
        const titleVal = (formTitle?.value || '').trim();
        const baseVal = formBase.value.trim();

        if (shouldShowTitle && titleVal) {
            textEl.innerHTML = `<span style="font-weight:700; display:block; margin-bottom:8px; font-size:0.92rem; color:var(--text-primary); line-height:1.35;">${escapeHtml(titleVal)}</span>${escapeHtml(baseVal || 'Vista previa del texto de tu publicación aquí...')}`;
        } else {
            textEl.innerText = baseVal || 'Vista previa del texto de tu publicación aquí...';
        }
    }

    // ── Media (server URL or local blob URL) ──────────────────────────────
    if (mediaEl) {
        if (currentPostMediaList.length > 0) {
            const activeMedia = currentPostMediaList[currentPostMediaList.length - 1];
            const isVideo = /\.(mp4|mov)(\?|$)/i.test(activeMedia);
            mediaEl.style.display = 'block';
            mediaEl.innerHTML = isVideo
                ? `<video src="${activeMedia}" controls style="width:100%; max-height:220px; border-radius:6px; object-fit:contain; background:rgba(15,23,42,0.4);"></video>`
                : `<img src="${activeMedia}" alt="Vista previa de imagen" style="width:100%; max-height:220px; border-radius:6px; object-fit:contain; background:rgba(15,23,42,0.4);">`;
        } else {
            mediaEl.style.display = 'none';
            mediaEl.innerHTML = '';
        }
    }

    // ── Citation (Fuentes & Cita Legal) ───────────────────────────────────
    if (citationEl) {
        const entity = (document.getElementById('social-form-source-entity')?.value   || '').trim();
        const ref    = (document.getElementById('social-form-source-reference')?.value || '').trim();
        const url    = (document.getElementById('social-form-source-url')?.value       || '').trim();
        const cit    = (document.getElementById('social-form-source-citation')?.value  || '').trim();

        if (entity || ref || cit) {
            const linkHtml = url
                ? `<div style="margin-top:4px;"><a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" style="font-size:0.7rem; color:var(--accent-cyan); text-decoration:underline; word-break:break-all;">${escapeHtml(url)}</a></div>`
                : '';
            citationEl.style.display = 'block';
            citationEl.innerHTML = `
                <div style="font-size:0.7rem; font-weight:700; color:var(--accent-cyan); margin-bottom:4px; display:flex; align-items:center; gap:4px;">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10"/><path d="M6 10h10"/></svg>
                    Fuente Oficial · Ley 23 de 1982
                </div>
                ${(entity || ref) ? `<div style="font-size:0.75rem; color:var(--text-primary); font-weight:600;">${escapeHtml(entity)}${entity && ref ? ' — ' : ''}${escapeHtml(ref)}</div>` : ''}
                ${cit ? `<div style="font-size:0.72rem; color:var(--text-secondary); margin-top:3px; font-style:italic;">"${escapeHtml(cit)}"</div>` : ''}
                ${linkHtml}
            `;
        } else {
            citationEl.style.display = 'none';
            citationEl.innerHTML = '';
        }
    }
}

/**
 * Alternar vista en pantalla completa del bloque de vista previa (v12.22.3)
 * Utiliza un modal independiente a nivel de body (#social-live-fullscreen-modal)
 * para evitar el recorte provocado por el containing block del modal padre.
 * @param {boolean} [forceState] - Forzar true/false opcionalmente
 */
function toggleSocialPreviewFullscreen(forceState = null) {
    const fsModal = document.getElementById('social-live-fullscreen-modal');
    const fsContent = document.getElementById('social-live-fullscreen-content');
    const sourceCard = document.getElementById('social-preview-card');
    if (!fsModal || !fsContent) return;

    const isActive = fsModal.classList.contains('active');
    const shouldOpen = (forceState !== null) ? forceState : !isActive;

    if (shouldOpen) {
        // Clonar fielmente el contenido actual del preview card
        if (sourceCard) {
            fsContent.innerHTML = sourceCard.outerHTML;
            // Asegurar que el clon no herede estilos restrictivos
            const clonedCard = fsContent.querySelector('#social-preview-card');
            if (clonedCard) {
                clonedCard.id = 'social-preview-card-fullscreen';
                clonedCard.style.maxHeight = 'none';
                clonedCard.style.overflow = 'visible';
            }
        }
        fsModal.classList.add('active');

        // Listener de teclado para salir con ESC
        const escHandler = (e) => {
            if (e.key === 'Escape' || e.key === 'Esc') {
                toggleSocialPreviewFullscreen(false);
                document.removeEventListener('keydown', escHandler);
            }
        };
        fsModal._escHandler = escHandler;
        document.addEventListener('keydown', escHandler);
    } else {
        fsModal.classList.remove('active');
        fsContent.innerHTML = '';
        if (fsModal._escHandler) {
            document.removeEventListener('keydown', fsModal._escHandler);
            delete fsModal._escHandler;
        }
    }
}


/**
 * Enviar formulario de guardado / edición
 */
async function submitSocialPost(event) {
    event.preventDefault();
    if (socialMediaUploadInFlight > 0) {
        showToast('Espera unos segundos a que termine de subir la imagen al servidor antes de guardar.', 'warning');
        return;
    }
    const formTitle = document.getElementById('social-form-title')?.value || '';
    const formShowTitle = document.getElementById('social-form-show-title')?.checked ?? false;
    const formBase = document.getElementById('social-form-base-content')?.value || '';
    const formLinkedin = document.getElementById('social-form-linkedin-content')?.value || '';
    const formInstagram = document.getElementById('social-form-instagram-content')?.value || '';
    const formStatus = document.getElementById('social-form-status')?.value || 'BORRADOR';
    const formScheduled = document.getElementById('social-form-scheduled')?.value || null;
    const formYear = document.getElementById('social-form-year')?.value || '2026';
    const formBlock = document.getElementById('social-form-block')?.value || 'Conocimiento de Productos';
    const formSourceEntity = document.getElementById('social-form-source-entity')?.value || '';
    const formSourceRef = document.getElementById('social-form-source-reference')?.value || '';
    const formSourceUrl = document.getElementById('social-form-source-url')?.value || '';
    const formSourceCit = document.getElementById('social-form-source-citation')?.value || '';
    const formChannelType = document.getElementById('social-form-channel-type')?.value || 'ORGANIZATION';
    const currentUsername = (localStorage.getItem('username') || '').trim();
    const postAuthor = formChannelType === 'PERSONAL' 
        ? ((currentEditPostDetail && currentEditPostDetail.author_username) || (typeof currentUser !== 'undefined' && currentUser ? currentUser.username : null) || currentUsername)
        : null;

    const plats = [];
    document.querySelectorAll('.social-plat-chk:checked').forEach(chk => plats.push(chk.value));
    if (plats.length === 0) {
        showToast('Debes seleccionar al menos una red social destino', 'warning');
        return;
    }

    const customContent = {};
    if (formLinkedin.trim()) customContent.linkedin = formLinkedin.trim();
    if (formInstagram.trim()) customContent.instagram = formInstagram.trim();

    let scheduledUtc = null;
    if (formScheduled) {
        scheduledUtc = new Date(formScheduled).toISOString();
    }

    const cleanMediaUrls = sanitizePersistentMediaUrls(currentPostMediaList);

    const payload = {
        title: formTitle,
        show_title: formShowTitle,
        base_content: formBase,
        target_platforms: plats,
        media_urls: cleanMediaUrls,
        custom_content: customContent,
        status: formStatus,
        scheduled_at: scheduledUtc,
        editorial_year: parseInt(formYear, 10),
        editorial_block: formBlock,
        source_entity: formSourceEntity,
        source_reference: formSourceRef,
        source_url: formSourceUrl,
        source_citation: formSourceCit,
        channel_type: formChannelType,
        author_username: postAuthor
    };

    try {
        let res;
        if (currentEditPostId) {
            res = await apiFetch(`${SOCIAL_API}/posts/${currentEditPostId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } else {
            res = await apiFetch(`${SOCIAL_API}/posts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        }

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || 'Error al guardar la publicación');
        }

        showToast('Publicación guardada exitosamente', 'success');
        closeSocialPostModal();
        loadSocialPosts(false);
    } catch (e) {
        showToast(e.message, 'error');
    }
}

/**
 * Forzar publicación inmediata
 */
async function triggerSocialPostNow(postId) {
    if (!confirm('¿Deseas activar esta publicación para despacho inmediato a través de N8N?')) return;
    try {
        const res = await apiFetch(`${SOCIAL_API}/posts/${postId}/trigger-now`, {
            method: 'POST'
        });
        if (!res.ok) throw new Error('Error al programar publicación');
        showToast('Publicación programada para despacho inmediato', 'success');
        loadSocialPosts(false);
    } catch (e) {
        showToast(e.message, 'error');
    }
}

/**
 * Eliminar publicación
 */
async function deleteSocialPost(postId) {
    if (!confirm('¿Estás seguro de eliminar esta publicación? Esta acción no se puede deshacer.')) return;
    try {
        const res = await apiFetch(`${SOCIAL_API}/posts/${postId}`, {
            method: 'DELETE'
        });
        if (!res.ok) throw new Error('Error al eliminar');
        showToast('Publicación eliminada correctamente', 'success');
        loadSocialPosts(false);
    } catch (e) {
        showToast(e.message, 'error');
    }
}

// ==============================================================================
// MODAL DE CLONACIÓN DEL PLAN EDITORIAL ANUAL
// ==============================================================================

function openClonePlanModal() {
    const fromSelect = document.getElementById('clone-from-year-select');
    const toSelect = document.getElementById('clone-to-year-input');
    const resultBox = document.getElementById('clone-result-box');
    if (resultBox) resultBox.style.display = 'none';

    if (fromSelect) {
        fromSelect.value = socialState.editorialYear && socialState.editorialYear !== 'ALL' ? String(socialState.editorialYear) : '2026';
    }
    if (toSelect) {
        const nextY = (parseInt(fromSelect?.value || '2026', 10)) + 1;
        toSelect.value = nextY;
    }

    const modal = document.getElementById('social-clone-modal');
    if (modal) modal.classList.add('active');
}

function closeClonePlanModal() {
    const modal = document.getElementById('social-clone-modal');
    if (modal) modal.classList.remove('active');
}

async function submitClonePlan(event) {
    event.preventDefault();
    const fromYear = parseInt(document.getElementById('clone-from-year-select')?.value || '2026', 10);
    const toYear = parseInt(document.getElementById('clone-to-year-input')?.value || '2027', 10);
    const weeksOffset = parseInt(document.getElementById('clone-weeks-offset')?.value || '52', 10);

    if (fromYear === toYear) {
        showToast('El año origen y destino deben ser diferentes', 'warning');
        return;
    }

    const btn = document.getElementById('btn-submit-clone-plan');
    if (btn) {
        btn.disabled = true;
        btn.innerText = 'Clonando plan...';
    }

    try {
        const res = await apiFetch(`${SOCIAL_API}/editorial/clone`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                from_year: fromYear,
                to_year: toYear,
                weeks_offset: weeksOffset
            })
        });

        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.detail || data.message || 'Error al clonar el plan');
        }

        showToast(data.message, 'success');
        closeClonePlanModal();
        await loadSocialEditorialYears();
        setSocialYearFilter(toYear);
    } catch (e) {
        showToast(e.message, 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerText = 'Clonar Plan Completo';
        }
    }
}

// ==============================================================================
// MODAL DE MANTENIMIENTO Y ALMACENAMIENTO (BAJO DEMANDA)
// ==============================================================================

async function openStorageMaintenanceModal() {
    const modal = document.getElementById('social-storage-modal');
    if (modal) modal.classList.add('active');
    await loadStorageStats();
}

function closeStorageMaintenanceModal() {
    const modal = document.getElementById('social-storage-modal');
    if (modal) modal.classList.remove('active');
}

async function loadStorageStats() {
    const diskMbEl = document.getElementById('storage-stat-disk-mb');
    const diskFilesEl = document.getElementById('storage-stat-files-count');
    const postsMediaEl = document.getElementById('storage-stat-posts-media');
    const postsPurgedEl = document.getElementById('storage-stat-posts-purged');
    const candidates45El = document.getElementById('storage-stat-cand-45');
    const resultBox = document.getElementById('storage-purge-result-box');
    if (resultBox) resultBox.style.display = 'none';

    try {
        const res = await apiFetch(`${SOCIAL_API}/maintenance/storage-stats`);
        if (res.ok) {
            const data = await res.json();
            const s = data.stats || {};
            if (diskMbEl) diskMbEl.innerText = `${s.disk_mb || 0} MB`;
            if (diskFilesEl) diskFilesEl.innerText = `${s.disk_files_count || 0} archivos`;
            if (postsMediaEl) postsMediaEl.innerText = `${s.posts_with_media || 0} publicaciones`;
            if (postsPurgedEl) postsPurgedEl.innerText = `${s.posts_purged || 0} publicaciones`;
            if (candidates45El) candidates45El.innerText = `${s.published_candidates_45d || 0} publicaciones`;
        }
    } catch (e) {
        console.error('Error loading storage stats:', e);
    }
}

async function runStoragePurge(isDryRun = false) {
    const thresholdVal = parseInt(document.getElementById('storage-purge-threshold')?.value || '45', 10);
    const purgeDrafts = document.getElementById('storage-purge-abandoned')?.checked || false;
    const resultBox = document.getElementById('storage-purge-result-box');
    const resultContent = document.getElementById('storage-purge-result-content');

    if (!isDryRun) {
        const confirmMsg = `¿Confirmas ejecutar la depuración física de multimedia en el servidor?\n\n- Se registrará un snapshot inmutable en la Relación Histórica de Publicaciones.\n- Se eliminarán archivos multimedia físicos de publicaciones con más de ${thresholdVal} días.\n- La bitácora, textos, enlaces y fuentes permanecerán intactos y auditables.\n- No se puede deshacer.`;
        if (!confirm(confirmMsg)) return;
    }

    try {
        showToast(isDryRun ? 'Simulando depuración...' : 'Ejecutando depuración física...', 'info');
        const res = await apiFetch(`${SOCIAL_API}/maintenance/purge-storage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                days_threshold: thresholdVal,
                purge_abandoned_drafts: purgeDrafts,
                dry_run: isDryRun
            })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Error al ejecutar mantenimiento de almacenamiento');

        if (resultBox && resultContent) {
            resultBox.style.display = 'block';
            if (isDryRun) {
                resultContent.innerHTML = `
                    <div style="color:var(--accent-cyan); font-weight:700; margin-bottom:4px; display:inline-flex; align-items:center; gap:6px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 2v7.31L4.54 19A2 2 0 0 0 6.27 22h11.46a2 2 0 0 0 1.73-3L14 9.31V2h-4z"></path></svg> Simulación Completada (No se borró nada):</div>
                    <div>- Publicaciones candidatas a archivar y purgar: <strong>${data.posts_affected_count}</strong></div>
                    <div>- Archivos que se eliminarían: <strong>${data.files_deleted}</strong></div>
                    <div>- Espacio que se liberaría en disco: <strong style="color:#10b981;">${data.mb_freed} MB (${data.bytes_freed} bytes)</strong></div>
                `;
            } else {
                resultContent.innerHTML = `
                    <div style="color:#10b981; font-weight:700; margin-bottom:4px; display:inline-flex; align-items:center; gap:6px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Depuración y Archivo Histórico Completados:</div>
                    <div>- Publicaciones registradas en la Relación Histórica: <strong>${data.posts_affected_count}</strong></div>
                    <div>- Archivos físicos borrados de disco: <strong>${data.files_deleted}</strong></div>
                    <div>- Espacio real liberado en disco: <strong style="color:#10b981;">${data.mb_freed} MB</strong></div>
                `;
                showToast(`Depuración completada: ${data.mb_freed} MB liberados. Registro histórico archivado.`, 'success');
                await loadStorageStats();
                loadSocialPosts(false);
            }
        }
    } catch (e) {
        showToast(e.message, 'error');
    }
}

// ==============================================================================
// MODAL DE RELACIÓN HISTÓRICA DE PUBLICACIONES DEPURADAS
// ==============================================================================

async function openSocialArchiveModal() {
    const modal = document.getElementById('social-archive-modal');
    if (modal) modal.classList.add('active');
    archiveState.offset = 0;
    await loadArchivedPosts();
}

function closeSocialArchiveModal() {
    const modal = document.getElementById('social-archive-modal');
    if (modal) modal.classList.remove('active');
}

function debounceArchiveSearch() {
    clearTimeout(archiveSearchDebounce);
    archiveSearchDebounce = setTimeout(() => {
        const val = document.getElementById('social-archive-search-input')?.value || '';
        archiveState.search = val;
        loadArchivedPosts(true);
    }, 300);
}

function setArchiveYearFilter(yearVal) {
    archiveState.year = yearVal;
    loadArchivedPosts(true);
}

async function loadArchivedPosts(resetPage = false) {
    if (resetPage) archiveState.offset = 0;
    const tbody = document.getElementById('social-archive-table-body');
    const countBadge = document.getElementById('social-archive-count-badge');
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:30px; color:var(--text-muted);">Consultando relación histórica...</td></tr>';
    }

    try {
        const params = new URLSearchParams();
        if (archiveState.search && archiveState.search.trim()) params.append('search', archiveState.search.trim());
        if (archiveState.year && archiveState.year !== 'ALL') params.append('year', archiveState.year);
        params.append('limit', archiveState.limit);
        params.append('offset', archiveState.offset);

        const res = await apiFetch(`${SOCIAL_API}/archive?${params.toString()}`);
        if (!res.ok) throw new Error(`Error HTTP ${res.status}`);
        const data = await res.json();

        archiveState.total = data.total || 0;
        archiveState.items = data.archived_posts || [];

        renderArchivedPostsTable(archiveState.items);
        if (countBadge) countBadge.innerText = `${archiveState.total} publicaciones archivadas`;
    } catch (e) {
        console.error('Error loading archive posts:', e);
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px; color:#ef4444;">Error: ${escapeHtml(e.message)}</td></tr>`;
        }
    }
}

function renderArchivedPostsTable(items) {
    const tbody = document.getElementById('social-archive-table-body');
    if (!tbody) return;

    if (!items || items.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align:center; padding:40px 20px; color:var(--text-muted);">
                    <div style="margin-bottom:8px; color:var(--text-muted);"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg></div>
                    <div>No hay publicaciones en el archivo histórico que coincidan con la búsqueda.</div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = items.map(it => {
        const pubDate = it.published_at ? new Date(it.published_at).toLocaleString() : 'Fecha no registrada';
        const archDate = it.archived_at ? new Date(it.archived_at).toLocaleDateString() : '';

        // Links directos
        const links = it.published_links || {};
        let linksHtml = '';
        if (typeof links === 'object' && Object.keys(links).length > 0) {
            linksHtml = Object.entries(links).map(([plat, url]) => `
                <a href="${url}" target="_blank" rel="noopener noreferrer" style="display:inline-flex; align-items:center; gap:3px; font-size:0.72rem; color:var(--accent-cyan); text-decoration:underline; margin-right:6px;">
                    ${plat} <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                </a>
            `).join('');
        } else {
            linksHtml = '<span style="font-size:0.72rem; color:var(--text-muted); font-style:italic;">Sin enlaces directos</span>';
        }

        const sourceInfo = (it.source_entity || it.source_reference) ? `${it.source_entity || ''} — ${it.source_reference || ''}` : 'Sin norma específica';
        const blockHtml = getBlockBadgeHtml(it.editorial_block);

        return `
            <tr style="border-bottom:1px solid rgba(255,255,255,0.05); font-size:0.82rem;">
                <td style="padding:10px 12px; color:var(--text-secondary); white-space:nowrap;">
                    <strong>${pubDate}</strong>
                    <div style="font-size:0.7rem; color:var(--text-muted);">Depurado: ${archDate}</div>
                </td>
                <td style="padding:10px 12px;">
                    <div style="font-weight:600; color:var(--text-primary); cursor:pointer;" onclick="openArchivedDetailModal(${it.id})" title="Ver ficha completa">${escapeHtml(it.title)}</div>
                    <div style="font-size:0.72rem; color:var(--text-muted); margin-top:2px; max-width:340px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                        ${escapeHtml(it.base_content || '')}
                    </div>
                </td>
                <td style="padding:10px 12px; white-space:nowrap;">
                    ${blockHtml}
                    <div style="font-size:0.7rem; color:var(--text-muted); margin-top:2px;">Año: ${it.editorial_year || 2026}</div>
                </td>
                <td style="padding:10px 12px;">
                    ${linksHtml}
                </td>
                <td style="padding:10px 12px; max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${escapeHtml(sourceInfo)}">
                    <span style="font-size:0.75rem; color:var(--text-secondary); display:inline-flex; align-items:center; gap:4px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>${escapeHtml(sourceInfo)}</span>
                </td>
                <td style="padding:10px 12px; text-align:right; white-space:nowrap;">
                    <button class="action-icon-btn" onclick="openArchivedDetailModal(${it.id})" title="Ver Ficha Histórica Completa" aria-label="Ver Ficha Histórica Completa">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * Ver ficha completa de un registro histórico archivado
 */
async function openArchivedDetailModal(archiveId) {
    try {
        const res = await apiFetch(`${SOCIAL_API}/archive/${archiveId}`);
        if (!res.ok) throw new Error('No se pudo cargar el registro histórico');
        const it = await res.json();

        const contentEl = document.getElementById('social-archive-detail-content');
        if (contentEl) {
            const pubDate = it.published_at ? new Date(it.published_at).toLocaleString() : 'No registrada';
            const archDate = it.archived_at ? new Date(it.archived_at).toLocaleString() : 'No registrada';
            const links = it.published_links || {};
            const linksList = Object.entries(links).map(([k, u]) => `<li><a href="${u}" target="_blank" style="color:var(--accent-cyan); text-decoration:underline;">${k}: ${u}</a></li>`).join('') || '<li>Sin enlaces de redes guardados</li>';

            contentEl.innerHTML = `
                <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:8px; padding:16px;">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px; flex-wrap:wrap; gap:10px;">
                        <div>
                            <h3 style="margin:0 0 4px; font-size:1.05rem; color:var(--text-primary);">${escapeHtml(it.title)}</h3>
                            <div style="font-size:0.78rem; color:var(--text-muted);">
                                Publicado el: <strong style="color:var(--text-primary);">${pubDate}</strong> · Depurado el: ${archDate}
                            </div>
                        </div>
                        <div>
                            ${getBlockBadgeHtml(it.editorial_block)}
                            <span style="font-size:0.75rem; color:var(--text-muted); margin-left:6px;">[Plan ${it.editorial_year || 2026}]</span>
                        </div>
                    </div>

                    <div style="margin-bottom:14px;">
                        <label style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase; font-weight:700;">Copy Base Original Publicado:</label>
                        <div style="background:var(--bg-secondary); border:1px solid var(--border-color); border-radius:6px; padding:10px; font-size:0.84rem; color:var(--text-primary); line-height:1.45; white-space:pre-wrap; margin-top:4px;">${escapeHtml(it.base_content || '')}</div>
                    </div>

                    ${(it.source_entity || it.source_reference || it.source_citation) ? `
                        <div style="margin-bottom:14px; background:rgba(6,182,212,0.06); border:1px solid rgba(6,182,212,0.25); border-radius:6px; padding:10px;">
                            <div style="font-size:0.76rem; font-weight:700; color:var(--accent-cyan); margin-bottom:4px; display:inline-flex; align-items:center; gap:4px;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>Fuente Confiable y Cita Legal de Derechos de Autor:</div>
                            <div style="font-size:0.8rem; color:var(--text-primary); font-weight:600;">${escapeHtml(it.source_entity || '')} — ${escapeHtml(it.source_reference || '')}</div>
                            ${it.source_citation ? `<div style="font-size:0.75rem; color:var(--text-secondary); margin-top:3px; font-style:italic;">"${escapeHtml(it.source_citation)}"</div>` : ''}
                            ${it.source_url ? `<div style="margin-top:4px;"><a href="${it.source_url}" target="_blank" style="font-size:0.72rem; color:var(--accent-cyan); text-decoration:underline;">${it.source_url}</a></div>` : ''}
                        </div>
                    ` : ''}

                    <div style="margin-bottom:14px;">
                        <label style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase; font-weight:700;">Enlaces Publicados en Redes Sociales:</label>
                        <ul style="margin:4px 0 0 16px; font-size:0.8rem; color:var(--text-secondary);">
                            ${linksList}
                        </ul>
                    </div>

                    <div style="font-size:0.72rem; color:var(--text-muted); border-top:1px solid var(--border-color); padding-top:8px;">
                        ID de Post Original: #${it.original_post_id || 'N/A'} · Archivos liberados: ${JSON.stringify(it.original_media_names || [])} · Espacio liberado: ${Math.round((it.bytes_freed || 0)/1024)} KB
                    </div>
                </div>
            `;
        }

        const modal = document.getElementById('social-archive-detail-modal');
        if (modal) modal.classList.add('active');
    } catch (e) {
        showToast(e.message, 'error');
    }
}

function closeArchivedDetailModal() {
    const modal = document.getElementById('social-archive-detail-modal');
    if (modal) modal.classList.remove('active');
}

/**
 * Descargar CSV con la relación histórica completa para Excel
 */
function downloadArchiveCsv() {
    const yearVal = document.getElementById('social-archive-year-select')?.value || '';
    const param = (yearVal && yearVal !== 'ALL') ? `?year=${yearVal}` : '';
    const url = `${SOCIAL_API}/archive/export/csv${param}`;
    window.open(url, '_blank');
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('tab-social-publisher')) {
        loadSocialEditorialYears();
    }
});
