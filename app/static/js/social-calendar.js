/**
 * social-calendar.js (v12.22.0)
 * -----------------------------
 * Módulo de Vista de Calendario Interactivo (estilo Google Calendar).
 * - Navegación mensual (Anterior, Siguiente, Hoy).
 * - Mapeo de publicaciones por día con soporte Drag & Drop nativo.
 * - Reprogramación instantánea de publicaciones con persistencia en PostgreSQL.
 * - Resaltado visual de borradores de alta prioridad / próximos a vencer.
 */

// Inicializar fecha del calendario
if (!socialState.calendarDate) {
    // Si estamos en 2026, posicionar en el mes actual o septiembre
    const now = new Date();
    socialState.calendarDate = new Date(now.getFullYear() === 2026 ? now : new Date(2026, 8, 1));
}
if (!socialState.viewMode) {
    socialState.viewMode = 'feed';
}

/**
 * Alterna entre la vista de tarjetas y la vista de calendario
 */
function switchSocialView(mode) {
    socialState.viewMode = mode;
    const btnFeed = document.getElementById('btn-social-view-feed');
    const btnCal = document.getElementById('btn-social-view-calendar');
    const btnRadar = document.getElementById('btn-social-view-radar');
    const grid = document.getElementById('social-posts-grid');
    const pag = document.getElementById('social-posts-pagination');
    const calContainer = document.getElementById('social-calendar-view');
    const radarContainer = document.getElementById('social-radar-view');
    const regFilters = document.getElementById('social-regular-filters');

    if (btnFeed) btnFeed.classList.toggle('active', mode === 'feed');
    if (btnCal) btnCal.classList.toggle('active', mode === 'calendar');
    if (btnRadar) btnRadar.classList.toggle('active', mode === 'radar');

    if (mode === 'calendar') {
        if (grid) grid.style.display = 'none';
        if (pag) pag.style.display = 'none';
        if (calContainer) calContainer.style.display = 'block';
        if (radarContainer) radarContainer.style.display = 'none';
        if (regFilters) regFilters.style.display = 'block';

        // En modo calendario aseguramos traer el total del plan para ubicar en los días
        socialState.limit = 200;
        loadSocialPosts(false);
    } else if (mode === 'radar') {
        if (grid) grid.style.display = 'none';
        if (pag) pag.style.display = 'none';
        if (calContainer) calContainer.style.display = 'none';
        if (radarContainer) radarContainer.style.display = 'block';
        if (regFilters) regFilters.style.display = 'none';

        if (typeof loadEditorialRadarTopics === 'function') {
            loadEditorialRadarTopics();
        }
    } else {
        if (grid) grid.style.display = 'grid';
        if (pag) pag.style.display = 'flex';
        if (calContainer) calContainer.style.display = 'none';
        if (radarContainer) radarContainer.style.display = 'none';
        if (regFilters) regFilters.style.display = 'block';

        socialState.limit = 20;
        loadSocialPosts(true);
    }
}

/**
 * Navegación de mes (+1 o -1)
 */
function changeCalendarMonth(delta) {
    const d = new Date(socialState.calendarDate);
    d.setMonth(d.getMonth() + delta);
    socialState.calendarDate = d;
    renderSocialCalendar();
}

/**
 * Ir al mes y día actual
 */
function goToCalendarToday() {
    socialState.calendarDate = new Date();
    renderSocialCalendar();
}

/**
 * Renderiza la cuadrícula completa del calendario mensual
 */
function renderSocialCalendar() {
    const container = document.getElementById('social-calendar-view');
    if (!container) return;

    const calDate = socialState.calendarDate || new Date();
    const currentYear = calDate.getFullYear();
    const currentMonth = calDate.getMonth(); // 0-11

    const monthNames = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    // Primer día del mes y total de días
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const totalDays = lastDay.getDate();

    // Offset para iniciar en Lunes (0 = Lun, 6 = Dom)
    let startDayIndex = firstDay.getDay() - 1;
    if (startDayIndex < 0) startDayIndex = 6;

    // Días del mes anterior para relleno inicial
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();

    // Agrupar publicaciones por fecha 'YYYY-MM-DD'
    const postsByDay = {};
    const now = new Date();
    const nowTime = now.getTime();
    const sevenDaysLater = nowTime + (7 * 24 * 60 * 60 * 1000);

    let monthPostsCount = 0;

    (socialState.posts || []).forEach(p => {
        const rawDate = p.scheduled_at || p.created_at;
        if (!rawDate) return;
        const d = new Date(rawDate);
        if (isNaN(d.getTime())) return;

        const dayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (!postsByDay[dayKey]) postsByDay[dayKey] = [];
        postsByDay[dayKey].push(p);

        if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
            monthPostsCount++;
        }
    });

    // Construir celdas de días
    let cellsHtml = '';
    const totalCells = Math.ceil((startDayIndex + totalDays) / 7) * 7;

    for (let i = 0; i < totalCells; i++) {
        let dayNum = 0;
        let cellMonth = currentMonth;
        let cellYear = currentYear;
        let isOtherMonth = false;

        if (i < startDayIndex) {
            // Días del mes anterior
            dayNum = prevMonthLastDay - (startDayIndex - 1 - i);
            cellMonth = currentMonth - 1;
            if (cellMonth < 0) {
                cellMonth = 11;
                cellYear--;
            }
            isOtherMonth = true;
        } else if (i >= startDayIndex + totalDays) {
            // Días del mes siguiente
            dayNum = i - (startDayIndex + totalDays) + 1;
            cellMonth = currentMonth + 1;
            if (cellMonth > 11) {
                cellMonth = 0;
                cellYear++;
            }
            isOtherMonth = true;
        } else {
            // Días del mes actual
            dayNum = i - startDayIndex + 1;
        }

        const dateStr = `${cellYear}-${String(cellMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
        const isToday = (cellYear === now.getFullYear() && cellMonth === now.getMonth() && dayNum === now.getDate());

        const dayPosts = postsByDay[dateStr] || [];

        // Generar items de posts para el día
        const postsHtml = dayPosts.map(p => {
            const isDraft = p.status === 'BORRADOR';
            const isScheduled = p.status === 'PROGRAMADO';
            const isPublished = p.status === 'PUBLICADO';

            // Detectar urgencia: si es borrador y su fecha es menor o igual a 7 días en el futuro
            let isUrgent = false;
            if (isDraft && p.scheduled_at) {
                const postTime = new Date(p.scheduled_at).getTime();
                if (postTime <= sevenDaysLater) {
                    isUrgent = true;
                }
            }

            let statusDotClass = 'comm-dot-slate';
            if (isScheduled) statusDotClass = 'comm-dot-amber';
            if (isPublished) statusDotClass = 'comm-dot-green';
            if (p.status === 'FALLIDO') statusDotClass = 'comm-dot-red';

            const statusClass = isPublished ? 'published' : (isScheduled ? 'scheduled' : (isUrgent ? 'urgent-draft' : ''));
            const cleanTitle = escapeHtml(p.title || 'Sin título');

            return `
                <div class="cal-post-item ${statusClass}" 
                     draggable="true" 
                     ondragstart="handleCalDragStart(event, ${p.id})"
                     onclick="openCreateSocialPostModal(${p.id})"
                     title="Clic para editar · Arrastra para cambiar de fecha\n#${p.id}: ${cleanTitle}">
                    <span class="comm-dot ${statusDotClass}" style="width:5px; height:5px; flex-shrink:0;"></span>
                    <span class="cal-post-id">#${p.id}</span>
                    <span class="cal-post-title">${cleanTitle}</span>
                </div>
            `;
        }).join('');

        cellsHtml += `
            <div class="cal-day-cell ${isOtherMonth ? 'other-month' : ''} ${isToday ? 'is-today' : ''}"
                 data-date="${dateStr}"
                 ondragover="handleCalDragOver(event)"
                 ondragleave="handleCalDragLeave(event)"
                 ondrop="handleCalDrop(event, '${dateStr}')">
                <div class="cal-day-top">
                    <span class="cal-day-num">${dayNum}</span>
                    ${dayPosts.length > 0 ? `<span class="cal-day-count">${dayPosts.length} post${dayPosts.length > 1 ? 's' : ''}</span>` : ''}
                </div>
                <div style="display:flex; flex-direction:column; gap:3px; overflow-y:auto; max-height:100px;">
                    ${postsHtml}
                </div>
            </div>
        `;
    }

    container.innerHTML = `
        <div class="social-calendar-wrap">
            <div class="calendar-nav-bar">
                <div style="display:flex; align-items:center; gap:12px;">
                    <h3 class="calendar-month-title">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent-cyan);"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                        <span>${monthNames[currentMonth]} ${currentYear}</span>
                    </h3>
                    <span style="font-size:0.75rem; color:var(--text-muted); font-weight:600; padding:2px 8px; background:var(--bg-secondary); border-radius:12px; border:1px solid var(--border-color);">
                        ${monthPostsCount} en este mes
                    </span>
                </div>
                <div class="calendar-nav-btns">
                    <button type="button" class="cal-nav-btn" onclick="changeCalendarMonth(-1)" title="Mes Anterior">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
                        <span>Anterior</span>
                    </button>
                    <button type="button" class="cal-nav-btn" onclick="goToCalendarToday()" title="Ir a la fecha actual">
                        Hoy
                    </button>
                    <button type="button" class="cal-nav-btn" onclick="changeCalendarMonth(1)" title="Mes Siguiente">
                        <span>Siguiente</span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                    </button>
                </div>
            </div>

            <!-- Días de la semana -->
            <div class="calendar-days-header">
                <div class="cal-header-day">Lun</div>
                <div class="cal-header-day">Mar</div>
                <div class="cal-header-day">Mié</div>
                <div class="cal-header-day">Jue</div>
                <div class="cal-header-day">Vie</div>
                <div class="cal-header-day">Sáb</div>
                <div class="cal-header-day">Dom</div>
            </div>

            <!-- Cuadrícula de celdas -->
            <div class="calendar-month-grid">
                ${cellsHtml}
            </div>
        </div>
    `;
}

// ==============================================================================
// MANEJADORES DE ARRASTRAR Y SOLTAR (DRAG & DROP)
// ==============================================================================

function handleCalDragStart(e, postId) {
    e.stopPropagation();
    e.dataTransfer.setData('text/plain', String(postId));
    e.dataTransfer.effectAllowed = 'move';
    if (e.target) e.target.classList.add('is-dragging');
}

function handleCalDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const cell = e.currentTarget;
    if (cell && !cell.classList.contains('drag-over')) {
        cell.classList.add('drag-over');
    }
}

function handleCalDragLeave(e) {
    const cell = e.currentTarget;
    if (cell) {
        cell.classList.remove('drag-over');
    }
}

async function handleCalDrop(e, targetDateStr) {
    e.preventDefault();
    const cell = e.currentTarget;
    if (cell) cell.classList.remove('drag-over');

    const postIdStr = e.dataTransfer.getData('text/plain');
    const postId = parseInt(postIdStr, 10);
    if (!postId || !targetDateStr) return;

    // Horario por defecto: 09:00:00 hora de Colombia
    const newScheduledIso = `${targetDateStr}T09:00:00-05:00`;

    // 1. Actualización optimista local
    const p = (socialState.posts || []).find(x => x.id === postId);
    const oldScheduled = p ? p.scheduled_at : null;
    if (p) {
        p.scheduled_at = newScheduledIso;
    }
    renderSocialCalendar();

    // 2. Persistir en el backend
    try {
        const res = await apiFetch(`${SOCIAL_API}/posts/${postId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scheduled_at: newScheduledIso })
        });

        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }

        if (typeof showToast === 'function') {
            showToast(`Publicación #${postId} movida al ${targetDateStr}`, 'success');
        }
    } catch (err) {
        console.error('Error rescheduling post:', err);
        // Revertir en caso de fallo
        if (p) p.scheduled_at = oldScheduled;
        renderSocialCalendar();
        if (typeof showToast === 'function') {
            showToast(`No se pudo mover la fecha de #${postId}: ${err.message}`, 'error');
        }
    }
}
