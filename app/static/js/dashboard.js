const THEME_SUN_SVG = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>';
const THEME_MOON_SVG = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>';

function initTheme() {
    const currentTheme = localStorage.getItem('theme') || 'dark';
    const themeIcon = document.getElementById('theme-icon');
    if (currentTheme === 'light') {
        document.documentElement.classList.add('light-mode');
        if (themeIcon) themeIcon.innerHTML = THEME_SUN_SVG;
    } else {
        document.documentElement.classList.remove('light-mode');
        if (themeIcon) themeIcon.innerHTML = THEME_MOON_SVG;
    }
}

function toggleTheme() {
    const isLight = document.documentElement.classList.toggle('light-mode');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    const themeIcon = document.getElementById('theme-icon');
    if (themeIcon) themeIcon.innerHTML = isLight ? THEME_SUN_SVG : THEME_MOON_SVG;
    
    // Redraw charts with new theme text/grid colors if visible
    if (document.getElementById('tab-overview').classList.contains('active')) {
        renderOverview();
    }
}

async function initDashboard() {
    try {
        // Fetch inicial de datos en paralelo
        const fetches = [
            fetchAllCustomers(),
            fetchAllLogs(),
            apiFetch(`${API_BASE}/bot-sessions?limit=50`).then(res => res.json()).catch(() => [])
        ];

        // Fetch pipeline summary & marketing metrics for overview
        fetches.push(
            apiFetch(`${REQ_API}/pipeline/summary`).then(r => r.ok ? r.json() : null).catch(() => null)
        );
        fetches.push(
            apiFetch(`${API_BASE}/v1/marketing/metrics`).then(r => r.ok ? r.json() : null).catch(() => null)
        );

        const [customers, logs, sessRes, pipelineSummary, marketingMetrics] = await Promise.all(fetches);

        customersList = customers || [];
        logsList = logs || [];
        sessionsList = sessRes || [];
        window.customersList = customersList;
        window.logsList = logsList;
        window.sessionsList = sessionsList;
        if (pipelineSummary) window._pipelineSummary = pipelineSummary;
        if (marketingMetrics) window._marketingMetrics = marketingMetrics;

        // Renderizado Inicial
        updateStats();
        renderOverview();
        if (typeof renderCustomersTable === 'function') renderCustomersTable(customersList);
        if (typeof renderLogsTable === 'function') renderLogsTable(logsList);
        if (typeof renderBotSessionsList === 'function') renderBotSessionsList();
        initChatPolling();
        if (typeof initNamingSurvey === 'function') initNamingSurvey();
        
        // Obtener última fecha de actualización
        try {
            const syncRes = await apiFetch(`${API_BASE}/health`);
            const badge = document.getElementById('sync-time-badge');
            if (badge) {
                if (syncRes.ok) {
                    const syncData = await syncRes.json();
                    badge.innerText = syncData.status === 'online' ? 'Servidor Activo' : 'Offline';
                } else {
                    badge.innerText = 'Servidor Activo';
                }
            }
        } catch(e) {}

    } catch (error) {
        console.error('Error al inicializar dashboard:', error);
    }
}

function updateStats() {
    const cVal = document.getElementById('stat-customers-val');
    const lVal = document.getElementById('stat-logs-val');
    const chVal = document.getElementById('stat-chats-val');
    if (cVal) cVal.innerText = (customersList || []).length;
    if (lVal) lVal.innerText = (logsList || []).length;
    if (chVal) chVal.innerText = (sessionsList || []).length;
}

function toggleMobileSidebar(open) {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (!sidebar || !backdrop) return;
    
    if (typeof open === 'boolean') {
        if (open) {
            sidebar.classList.add('open');
            backdrop.classList.add('active');
        } else {
            sidebar.classList.remove('open');
            backdrop.classList.remove('active');
        }
    } else {
        sidebar.classList.toggle('open');
        backdrop.classList.toggle('active');
    }
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-pane').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-btn, .bottom-nav-btn, .rail-item, #bottom-rail button').forEach(el => el.classList.remove('active'));
    
    const targetPane = document.getElementById(`tab-${tabId}`);
    if (targetPane) targetPane.classList.add('active');
    
    const targetNav = document.getElementById(`nav-${tabId}`);
    if (targetNav) targetNav.classList.add('active');
    
    const botNavEl = document.getElementById(`bot-nav-${tabId}`);
    if (botNavEl) botNavEl.classList.add('active');
    
    toggleMobileSidebar(false);
    
    // Cambiar títulos del Header con respaldo defensivo
    const titles = {
        overview:   ['Panel Comercial', 'Metricas de salud comercial, pipeline y rendimiento del equipo.'],
        requests:   ['Solicitudes de Cotización', isAdvisor() ? 'Sus solicitudes y cotizaciones asignadas.' : 'Bandeja central de requerimientos y cotizaciones comerciales.'],
        commercial: ['Gestion Comercial', isAdvisor() ? 'Pre-Ofertas y propuestas de su gestion.' : 'Catalogo de paquetes, tarifario y propuestas comerciales.'],
        customers:  ['Clientes', isAdvisor() ? 'Clientes asignados a su gestion.' : 'Listado de clientes y contactos de ALACOR.'],
        logs:             ['Comunicaciones & Bitácora', 'Buscador inteligente y trazabilidad de correos N8N, cotizaciones y gestiones.'],
        'social-publisher': ['Marketing & Redes Sociales', 'Estudio de contenidos multicanal, programación editorial y sincronización con N8N.'],
        chat:             ['Historial del Chatbot', 'Conversaciones e intenciones detectadas.'],
        users:            ['Gestion de Usuarios', 'Administracion de usuarios, asesores comerciales, credenciales y permisos.'],
        config:           ['Configuracion del Sistema', 'Parametros de integraciones, credenciales de API, logo ALACOR y condiciones comerciales.']
    };
    
    const titlePair = titles[tabId] || ['Coralis CRM', 'Gestión Comercial ALACOR'];
    const titleEl = document.getElementById('view-title');
    const subtitleEl = document.getElementById('view-subtitle');
    if (titleEl) titleEl.innerText = titlePair[0];
    if (subtitleEl) subtitleEl.innerText = titlePair[1];

    // Comunicaciones & Bitácora Feed (v12.13.0)
    if (tabId === 'logs') {
        if (typeof loadCommunicationsFeed === 'function') {
            loadCommunicationsFeed();
        }
    }

    // Marketing & Redes Sociales (v12.14.0)
    if (tabId === 'social-publisher') {
        if (typeof loadSocialPosts === 'function') {
            loadSocialPosts();
        }
        if (typeof checkEditorialRadarPendingCount === 'function') {
            checkEditorialRadarPendingCount();
        }
    }
    // Configuracion: Admin Tecnico y Superusuario
    if (tabId === 'config' && !(isSuperUser() || isAdminTecnico())) {
        showToast('Acceso denegado: Solo el Administrador Tecnico o el Superusuario pueden acceder a Configuracion.', 'error');
        return switchTab('customers');
    }
    // Usuarios: Director, Admin Tecnico, Superusuario
    if (tabId === 'users' && !(isDirectorOrSuperUser() || isAdminTecnico())) {
        showToast('Acceso denegado: Solo el Director Comercial o Administrador pueden acceder a Usuarios.', 'error');
        return switchTab('customers');
    }
    // Panel Comercial: Director y Superusuario
    if (tabId === 'overview' && !isDirectorOrSuperUser()) {
        showToast('El Panel Comercial es exclusivo del Director Comercial.', 'error');
        return switchTab('customers');
    }
    if (tabId === 'config') {
        loadConfiguration();
        if (typeof loadAllConditions === 'function') loadAllConditions();
        if (typeof checkCorporateLogoStatus === 'function') checkCorporateLogoStatus();
        loadCompanyHeaderConfig();
    } else if (tabId === 'users') {
        loadEmployeeSelector();
        if (typeof loadPermissionsMatrix === 'function') loadPermissionsMatrix();
    } else if (tabId === 'commercial') {
        if (typeof switchCommercialTab === 'function') {
            // Asesores van directo a Pre-Ofertas; directores ven Paquetes
            const defaultCommTab = isAdvisor() ? 'pre-offer' : 'packages';
            switchCommercialTab(defaultCommTab);
        } else if (typeof loadPackages === 'function') {
            loadPackages();
        }
        // Ocultar pestanas de config comercial para asesores
        setTimeout(() => {
            const configTabs = ['cmr-tab-packages', 'cmr-tab-rates', 'cmr-tab-zones'];
            configTabs.forEach(id => {
                const btn = document.getElementById(id);
                if (btn) btn.style.display = isAdvisor() ? 'none' : '';
            });
        }, 80);
    } else if (tabId === 'requests') {
        if (typeof loadRequests === 'function') {
            loadRequests();
        }
    }
}

function renderOverview() {
    const container = document.getElementById('tab-overview');
    if (!container) return;

    const cs = getComputedStyle(document.documentElement);
    const textSec = cs.getPropertyValue('--text-secondary').trim() || '#9ca3af';
    const borderCol = cs.getPropertyValue('--border-color').trim() || 'rgba(255,255,255,0.05)';

    // Metrics from logs
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    const allLogs = window.logsList || logsList || [];
    const logsThisMonth = allLogs.filter(l => {
        const d = new Date(l.date || l.created_at || l.occurred_at);
        return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    });
    const offersThisMonth = logsThisMonth.filter(l => (l.offer_number && l.offer_number !== '') || l.action === 'DIAGNOSTICO_AGENDADO' || l.action === 'OFERTA_EMITIDA');
    const ordersThisMonth = logsThisMonth.filter(l => (l.order_number && l.order_number !== '') || l.action === 'VENTA_CERRADA');

    // Pipeline summary from API window._pipelineSummary
    const ps = window._pipelineSummary || {};
    const stages = ps.stages || {};
    const advisors = ps.advisors || [];
    const pipelineStageLabels = {
        'NUEVO': { label: 'Nuevo', color: '#64748b' },
        'ASIGNADO': { label: 'Asignado', color: '#06b6d4' },
        'VISITA_AGENDADA': { label: 'Visita Agendada', color: '#3b82f6' },
        'PRE_OFERTA_ENVIADA': { label: 'Pre-Oferta Enviada', color: '#f59e0b' },
        'NEGOCIACION': { label: 'En Negociación', color: '#8b5cf6' },
        'CONTRATO': { label: 'Contrato Firmado', color: '#10b981' },
        'GANADO': { label: 'Ganado', color: '#06b6d4' },
        'PERDIDO': { label: 'Perdido', color: '#ef4444' },
    };

    const totalProspects = Object.values(stages).reduce((a,b) => a+b, 0) || 0;
    const convertedCount = (stages['GANADO'] || 0) + (stages['CONTRATO'] || 0);
    const conversionRate = totalProspects > 0 ? ((convertedCount / totalProspects) * 100).toFixed(1) : '0.0';
    const activeCount = totalProspects - (stages['GANADO'] || 0) - (stages['PERDIDO'] || 0);

    // Category chart data
    const catCounts = {};
    (window.logsList || []).forEach(log => {
        if (log.interests) {
            log.interests.forEach(cat => { catCounts[cat] = (catCounts[cat] || 0) + 1; });
        }
    });
    const catLabels = Object.keys(catCounts);
    const catData = Object.values(catCounts);

    // Pipeline stage bars HTML
    const maxStageCount = Math.max(...Object.values(stages), 1);
    const pipelineBarsHTML = Object.entries(pipelineStageLabels).map(([key, info]) => {
        const count = stages[key] || 0;
        const pct = Math.round((count / maxStageCount) * 100);
        return `
        <div class="pipeline-stage-row" onclick="openPipelineStage('${key}')" title="Clic para ver solicitudes en etapa: ${info.label}">
            <div class="pipeline-stage-label"><span class="stage-dot" style="background:${info.color};"></span>${info.label}</div>
            <div class="pipeline-stage-bar-wrap">
                <div class="pipeline-stage-bar" style="width:${pct}%;background:${info.color};"></div>
            </div>
            <div class="pipeline-stage-count" style="font-weight:700;">${count}</div>
        </div>`;
    }).join('');

    // Advisor rows HTML
    const advisorRowsHTML = advisors.length > 0 ? advisors.map((a, i) => `
        <tr>
            <td><span class="advisor-rank">#${i+1}</span> ${a.name || 'Sin asignar'}</td>
            <td style="text-align:center; font-weight:600;">${a.count}</td>
        </tr>`).join('') : `<tr><td colspan="2" style="text-align:center;color:var(--text-muted);padding:10px;">Sin prospectos asignados aún</td></tr>`;

    // Marketing & Attribution Data (Cálculo dinámico con datos reales de Portfolio)
    const mkt = window._marketingMetrics || {};
    const kpis = mkt.kpis || {};
    const custList = window.customersList || customersList || [];
    const botCount = custList.filter(c => (c.observations || '').includes('B2B') || (c.observations || '').includes('Radar') || (c.observations || '').includes('pers_radar')).length;
    const webCount = custList.filter(c => (c.observations || '').includes('INBOUND') || (c.observations || '').includes('DIAGNOSTICO') || (c.status === 'PROSPECTO_AGENDADO')).length;
    const directCount = Math.max(0, custList.length - botCount - webCount);

    const channels = mkt.channel_attribution || {
        "OUTBOUND_BOT": botCount,
        "WEB_FORM": webCount,
        "WHATSAPP": 0,
        "META_ADS": 0,
        "DIRECTO": directCount
    };
    const totalMql = kpis.total_prospects_mql !== undefined ? kpis.total_prospects_mql : custList.filter(c => c.status === 'PROSPECTO' || c.status === 'PROSPECTO_AGENDADO').length;
    const hotMql = kpis.hot_leads_mql || (window.customersList || []).filter(c => (c.lead_score || 0) >= 50).length || 0;
    const totalSql = kpis.total_requests_sql || totalProspects || 0;
    const wonCount = kpis.won_deals || convertedCount || 0;
    const mqlSqlRate = kpis.mql_to_sql_conversion_rate || (totalMql > 0 ? ((totalSql / totalMql) * 100).toFixed(1) : '0.0');
    const sqlWonRate = kpis.sql_to_won_conversion_rate || (totalSql > 0 ? ((wonCount / totalSql) * 100).toFixed(1) : '0.0');

    const channelLabels = Object.keys(channels).map(k => {
        if (k === 'OUTBOUND_BOT') return 'Outbound Scraping';
        if (k === 'WEB_FORM') return 'Formulario Web';
        if (k === 'WHATSAPP') return 'WhatsApp Inbound';
        if (k === 'META_ADS') return 'Meta Ads';
        return 'Directo / Referidos';
    });
    const channelData = Object.values(channels);

    // Inject complete pipeline dashboard HTML
    container.innerHTML = `
    <div class="pipeline-dashboard">
        <!-- Cockpit de Desempeño y Supervisión Comercial (v12.30.0) -->
        <div id="perf-cockpit-container"></div>

        <!-- KPI Cards Row -->
        <div class="kpi-grid">
            <div class="kpi-card" onclick="switchTab('customers')" title="Ver listado de prospectos y clientes">
                <div class="kpi-header">
                    <span style="display:inline-flex; align-items:center; gap:4px;">
                        <span class="kpi-label">Prospectos Totales</span>
                        <span class="kpi-info-icon" onclick="event.stopPropagation()" data-tip="Prospectos Totales&#10;• Qué significa: Total acumulado de empresas prospecto en estado PROSPECTO en la base maestra.&#10;• Cómo se calcula: Conteo de registros en la tabla customers con status = 'PROSPECTO'.&#10;• Niveles adecuados: 🟢 Óptimo: Pipeline creciente con constante alimentación Outbound/Inbound | 🟡 Alerta: Crecimiento plano | 🔴 Crítico: Pipeline agotado sin nuevos prospectos.">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                        </span>
                    </span>
                    <span class="kpi-icon"><svg class="kpi-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg></span>
                </div>
                <div class="kpi-value">${totalProspects}</div>
            </div>
            <div class="kpi-card" onclick="switchTab('commercial')" title="Ir a Gestión Comercial">
                <div class="kpi-header">
                    <span style="display:inline-flex; align-items:center; gap:4px;">
                        <span class="kpi-label">En Gestión Activa</span>
                        <span class="kpi-info-icon" onclick="event.stopPropagation()" data-tip="En Gestión Activa&#10;• Qué significa: Empresas y prospectos que tienen negociaciones, llamadas o propuestas abiertas en curso.&#10;• Cómo se calcula: Clientes con registros en commercial_logs en los últimos 30 días o solicitudes en estado EN_GESTION.&#10;• Niveles adecuados: 🟢 Óptimo: ≥ 40% de los prospectos asignados en gestión activa | 🟡 Alerta: 20% a 39% | 🔴 Crítico: < 20% (Estancamiento comercial).">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                        </span>
                    </span>
                    <span class="kpi-icon"><svg class="kpi-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></span>
                </div>
                <div class="kpi-value">${activeCount}</div>
            </div>
            <div class="kpi-card" onclick="switchTab('requests')" title="Ver solicitudes de cotización del mes">
                <div class="kpi-header">
                    <span style="display:inline-flex; align-items:center; gap:4px;">
                        <span class="kpi-label">Ofertas Este Mes</span>
                        <span class="kpi-info-icon" onclick="event.stopPropagation()" data-tip="Ofertas Este Mes&#10;• Qué significa: Cantidad de propuestas y cotizaciones formales emitidas hacia clientes durante el mes corriente.&#10;• Cómo se calcula: Conteo de quote_requests con status 'COTIZADA' generadas en el mes calendario actual.&#10;• Niveles adecuados: 🟢 Óptimo: Cumplimiento de cuota mensual de cotizaciones | 🟡 Alerta: 70% a 90% de la meta | 🔴 Crítico: < 70% de propuestas emitidas.">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                        </span>
                    </span>
                    <span class="kpi-icon"><svg class="kpi-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg></span>
                </div>
                <div class="kpi-value">${offersThisMonth.length}</div>
            </div>
            <div class="kpi-card" onclick="document.querySelector('.card-panel')?.scrollIntoView({ behavior: 'smooth' })" title="Ver embudo de maduración">
                <div class="kpi-header">
                    <span style="display:inline-flex; align-items:center; gap:4px;">
                        <span class="kpi-label">Tasa de Conversión</span>
                        <span class="kpi-info-icon" onclick="event.stopPropagation()" data-tip="Tasa de Conversión (MQL ➔ Cierre)&#10;• Qué significa: Eficiencia comercial del embudo desde lead calificado hasta cierre de venta ganado.&#10;• Cómo se calcula: (Cierres Ganados / Total de Solicitudes Cotizadas) × 100 en el período actual.&#10;• Niveles adecuados: 🟢 Óptimo: ≥ 20% de conversión en B2B industrial | 🟡 Alerta: 10% a 19% | 🔴 Crítico: < 10% (Fuga de oportunidades o problemas de precio/propuesta).">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                        </span>
                    </span>
                    <span class="kpi-icon"><svg class="kpi-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 4.24 4.24"/><path d="m14.83 9.17 4.24-4.24"/><path d="m14.83 14.83 4.24 4.24"/><path d="m9.17 14.83-4.24 4.24"/><circle cx="12" cy="12" r="4"/></svg></span>
                </div>
                <div class="kpi-value">${conversionRate}%</div>
            </div>
            <div class="kpi-card" onclick="switchTab('commercial')" title="Ver órdenes y pedidos comerciales">
                <div class="kpi-header">
                    <span style="display:inline-flex; align-items:center; gap:4px;">
                        <span class="kpi-label">Pedidos Este Mes</span>
                        <span class="kpi-info-icon" onclick="event.stopPropagation()" data-tip="Pedidos Este Mes&#10;• Qué significa: Número de órdenes de compra, contratos u órdenes de servicio cerradas exitosamente en el mes.&#10;• Cómo se calcula: Conteo de solicitudes y cotizaciones ganadas con orden confirmada en el mes actual.&#10;• Niveles adecuados: 🟢 Óptimo: Cumplimiento o superación del objetivo de ventas | 🟡 Alerta: 80% a 99% de la meta | 🔴 Crítico: < 80% de la cuota mensual.">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                        </span>
                    </span>
                    <span class="kpi-icon"><svg class="kpi-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg></span>
                </div>
                <div class="kpi-value">${ordersThisMonth.length}</div>
            </div>
            <div class="kpi-card" onclick="switchTab('customers')" title="Ver todos los clientes registrados">
                <div class="kpi-header">
                    <span style="display:inline-flex; align-items:center; gap:4px;">
                        <span class="kpi-label">Clientes Registrados</span>
                        <span class="kpi-info-icon" onclick="event.stopPropagation()" data-tip="Clientes Registrados&#10;• Qué significa: Padrón total de empresas con NIT/cédula registradas formalmente en la plataforma Coralis CRM.&#10;• Cómo se calcula: Total de registros únicos en la tabla customers de PostgreSQL.&#10;• Niveles adecuados: 🟢 Óptimo: Base de datos consolidada, enriquecida y libre de duplicados (Deduplicación activa).">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                        </span>
                    </span>
                    <span class="kpi-icon"><svg class="kpi-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></span>
                </div>
                <div class="kpi-value">${(window.customersList || customersList || []).length}</div>
            </div>
        </div>

        <!-- OMNICHANNEL MARKETING & ATTRIBUTION ROW (v12.18.1) -->
        <div style="margin-bottom:24px;">
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(340px, 1fr)); gap:16px;">
                <!-- Funnel Maduración MQL -> SQL -->
                <div class="card-panel">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
                        <h3 class="panel-title" style="margin:0; font-size:0.82rem; display:flex; align-items:center; gap:8px;">
                            <svg class="nav-svg" style="width:15px;height:15px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
                            Embudo de Maduración (MQL ➔ SQL)
                            <span class="kpi-info-icon" onclick="event.stopPropagation()" data-tip="Embudo de Maduración (MQL ➔ SQL)&#10;• Qué significa: Ciclo de vida comercial omnicanal desde la prospección fría y campañas de marketing (MQL) hasta la cotización activa (SQL) y cierre comercial.&#10;• Cómo se calcula: Trazabilidad de 4 etapas secuenciales: Leads en maduración, Leads calientes (≥50 pts), Solicitudes de cotización activas y Cuentas cerradas.&#10;• Niveles adecuados: 🟢 Óptimo: Tasa MQL➔SQL ≥ 0.5% y Cierre SQL ≥ 30% | 🟡 Alerta: Estancamiento en MQL sin pasar a cotizaciones | 🔴 Crítico: Embudo seco sin nuevos leads o 0 cierres.">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                            </span>
                        </h3>
                        <span style="font-size:0.68rem; color:var(--text-muted); border:1px solid var(--border-color); padding:2px 8px; border-radius:100px; font-weight:500;">
                            Motor N8N &middot; CORALIS
                        </span>
                    </div>
                    
                    <div style="display:flex; flex-direction:column; gap:8px;">
                        <div class="funnel-step" onclick="openFunnelCategory('MQL')" title="Clic para ver lista de prospectos en maduración">
                            <div>
                                <div class="funnel-step-label">
                                    <span>1. Leads en Maduración (MQL Outbound / Inbound)</span>
                                    <span class="kpi-info-icon" onclick="event.stopPropagation()" data-tip="Leads en Maduración (MQL)&#10;• Qué significa: Empresas prospecto registradas en la base maestra que están siendo nutridas con campañas automatizadas de N8N/Brevo.&#10;• Cómo se calcula: Conteo de registros en customers con status = 'PROSPECTO'.&#10;• Niveles adecuados: 🟢 Óptimo: Base activa y creciente con alimentación constante | 🟡 Alerta: Prospectos sin interacción > 60 días | 🔴 Crítico: 0 prospectos en maduración.">
                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                                    </span>
                                </div>
                                <div class="funnel-step-val">${totalMql} <span class="funnel-unit">empresas &middot; Clic para filtrar ➔</span></div>
                            </div>
                            <span class="funnel-badge badge-neutral">Madurando</span>
                        </div>

                        <div class="funnel-step" onclick="openFunnelCategory('HOT_LEADS')" title="Clic para ver leads calientes prioritarios">
                            <div>
                                <div class="funnel-step-label">
                                    <span>2. Leads Calientes / Hand-Raisers (&ge;50 pts)</span>
                                    <span class="kpi-info-icon" onclick="event.stopPropagation()" data-tip="Leads Calientes / Hand-Raisers (≥50 pts)&#10;• Qué significa: Prospectos con alto interés que han interactuado repetidamente (aperturas, clics, respuestas), alcanzando el puntaje prioritario para contacto comercial inmediato.&#10;• Cómo se calcula: Clientes con lead_score ≥ 50 puntos según eventos sincronizados de N8N.&#10;• Niveles adecuados: 🟢 Óptimo: Contacto comercial en < 2 horas tras alcanzar los 50 pts | 🟡 Alerta: Demora de contacto > 24 horas | 🔴 Crítico: Leads calientes sin gestión comercial.">
                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                                    </span>
                                </div>
                                <div class="funnel-step-val">${hotMql} <span class="funnel-unit">listos para contacto &middot; Clic para filtrar ➔</span></div>
                            </div>
                            <span class="funnel-badge badge-amber">Prioritario</span>
                        </div>

                        <div class="funnel-step" onclick="openFunnelCategory('SQL')" title="Clic para ver solicitudes de cotización activas">
                            <div>
                                <div class="funnel-step-label">
                                    <span>3. Solicitudes de Cotización Activas (SQL)</span>
                                    <span class="kpi-info-icon" onclick="event.stopPropagation()" data-tip="Solicitudes de Cotización Activas (SQL)&#10;• Qué significa: Oportunidades calificadas por ventas que han solicitado cotización formal de productos o servicios.&#10;• Cómo se calcula: Conteo total de registros en quote_requests activos en el pipeline.&#10;• Niveles adecuados: 🟢 Óptimo: Cotización emitida en < 24 horas | 🟡 Alerta: Demora entre 24 y 48 horas | 🔴 Crítico: Solicitudes estancadas > 72 horas.">
                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                                    </span>
                                </div>
                                <div class="funnel-step-val">${totalSql} <span class="funnel-unit">cotizaciones activas &middot; Clic para ver ➔</span></div>
                            </div>
                            <span class="funnel-badge badge-cyan">Conv. MQL: ${mqlSqlRate}%</span>
                        </div>

                        <div class="funnel-step" onclick="openFunnelCategory('WON')" title="Clic para ver clientes ganados / facturados">
                            <div>
                                <div class="funnel-step-label">
                                    <span>4. Clientes Ganados / Facturados</span>
                                    <span class="kpi-info-icon" onclick="event.stopPropagation()" data-tip="Clientes Ganados / Facturados&#10;• Qué significa: Cuentas convertidas exitosamente en clientes de AlaCor con contrato o facturación activa.&#10;• Cómo se calcula: Clientes con status = 'CLIENTE' en la base maestra o solicitudes en estado 'GANADO'/'CONTRATO'.&#10;• Niveles adecuados: 🟢 Óptimo: Crecimiento constante de cartera activa | 🟡 Alerta: Pérdida o fuga de clientes | 🔴 Crítico: 0 cierres en el mes.">
                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                                    </span>
                                </div>
                                <div class="funnel-step-val">${wonCount} <span class="funnel-unit">cuentas cerradas &middot; Clic para filtrar ➔</span></div>
                            </div>
                            <span class="funnel-badge badge-emerald">Cierre SQL: ${sqlWonRate}%</span>
                        </div>
                    </div>
                </div>

                <!-- Atribución por Canal (Chart) -->
                <div class="card-panel">
                    <h3 class="panel-title" style="margin:0 0 14px; font-size:0.82rem; display:flex; align-items:center; gap:8px;">
                        <svg class="nav-svg" style="width:15px;height:15px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
                        Atribución por Canal de Origen
                    </h3>
                    <div style="height:190px; position:relative;">
                        <canvas id="mktAttributionChart"></canvas>
                    </div>
                </div>
            </div>
        </div>

        <!-- Pipeline + Category + Advisor Row -->
        <div class="overview-main-grid">
            <!-- Pipeline Funnel -->
            <div class="card-panel">
                <h3 class="panel-title" style="display:flex; align-items:center; gap:8px;">
                    <svg class="nav-svg" style="width:15px;height:15px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" x2="12" y1="20" y2="10"/><line x1="18" x2="18" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="16"/></svg>
                    Pipeline Comercial por Etapa
                    <span class="kpi-info-icon" onclick="event.stopPropagation()" data-tip="Pipeline Comercial por Etapa&#10;• Qué significa: Distribución activa de las solicitudes y cotizaciones a lo largo de las 8 fases del ciclo de venta consultiva de AlaCor.&#10;• Cómo se calcula: Conteo en tiempo real de registros en quote_requests agrupados por su campo pipeline_stage.&#10;• Niveles adecuados: 🟢 Óptimo: Flujo continuo con avance progresivo hacia Ganado | 🟡 Alerta: Acumulación de solicitudes en etapas intermedias por más de 15 días | 🔴 Crítico: Embudo estancado sin avance hacia cierre o contrato.">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                    </span>
                </h3>
                <div class="pipeline-stages-list">${pipelineBarsHTML}</div>
            </div>

            <!-- Category Chart -->
            <div class="card-panel">
                <h3 class="panel-title" style="display:flex; align-items:center; gap:8px;">
                    <svg class="nav-svg" style="width:15px;height:15px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
                    Intereses por Categoría
                </h3>
                <div style="height:220px;position:relative;">
                    <canvas id="categoriesChart"></canvas>
                </div>
            </div>

            <!-- Advisor Ranking -->
            <div class="card-panel">
                <h3 class="panel-title" style="display:flex; align-items:center; gap:8px;">
                    <svg class="nav-svg" style="width:15px;height:15px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                    Rendimiento por Asesor
                </h3>
                <table class="advisor-table">
                    <thead><tr><th>Asesor</th><th style="text-align:center;">Prospectos</th></tr></thead>
                    <tbody>${advisorRowsHTML}</tbody>
                </table>
            </div>
        </div>
    </div>`;

    // Render Categories Chart
    if (chartInstance) chartInstance.destroy();
    const chartCanvas = document.getElementById('categoriesChart');
    if (chartCanvas && catLabels.length > 0) {
        chartInstance = new Chart(chartCanvas.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: catLabels,
                datasets: [{
                    data: catData,
                    backgroundColor: [
                        '#06b6d4','#3b82f6','#10b981','#8b5cf6','#f59e0b',
                        '#0ea5e9','#6366f1','#ef4444','#14b8a6','#64748b'
                    ],
                    borderWidth: 1,
                    borderColor: borderCol
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                cutout: '72%',
                plugins: { legend: { position: 'right', labels: { color: textSec, font: { family: 'Inter', size: 11 } } } }
            }
        });
    } else if (chartCanvas) {
        chartCanvas.parentElement.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding-top:60px;">Sin datos de gestiones aún.</p>';
    }

    // Render Marketing Attribution Chart
    const mktCanvas = document.getElementById('mktAttributionChart');
    if (mktCanvas && channelLabels.length > 0) {
        new Chart(mktCanvas.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: channelLabels,
                datasets: [{
                    data: channelData,
                    backgroundColor: [
                        '#06b6d4', // Outbound
                        '#3b82f6', // Web Form
                        '#10b981', // WhatsApp
                        '#8b5cf6', // Meta Ads
                        '#64748b'  // Direct
                    ],
                    borderWidth: 1,
                    borderColor: borderCol
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                cutout: '72%',
                plugins: { legend: { position: 'right', labels: { color: textSec, font: { family: 'Inter', size: 11 } } } }
            }
        });
    }

    // Cargar Cockpit de Desempeño y Supervisión Comercial (v12.30.0)
    if (typeof loadCommercialPerformance === 'function') {
        loadCommercialPerformance();
    }
}

// ── CUSTOMERS TABLE ENGINE ───────────────────────────────────────────────────
function renderCustomersTable(data) {
    // Augment with derived sort key for contacts count
    const enriched = data.map(c => ({ ...c, _contacts: (c.contacts || []).length }));
    custTableState.filtered = enriched;
    custTableState.page = 1;
    _drawCustomersTable();
}

function _drawCustomersTable() {
    const state = custTableState;
    const sorted = sortData(state.filtered, state.sortKey, state.sortDir, CUST_COLS.find(c=>c.key===state.sortKey)?.type);
    const start = (state.page - 1) * state.pageSize;
    const page = sorted.slice(start, start + state.pageSize);

    // Rebuild sortable header
    const thead = document.querySelector('#customers-table thead tr');
    if (thead) {
        thead.innerHTML = CUST_COLS.map((col, i) => {
            if (!col.key) return `<th>${col.label}</th>`;
            const cls = state.sortKey === col.key ? 'th-sortable th-active' : 'th-sortable';
            return `<th class="${cls}" onclick="custSortBy('${col.key}')">${col.label}${sortIndicator(col.key, state)}</th>`;
        }).join('');
    }

    const tbody = document.getElementById('customers-table-body');
    tbody.innerHTML = '';
    page.forEach(cust => {
        const tr = document.createElement('tr');
        tr.setAttribute('onclick', `openCustomerModal('${cust.nit}')`);
        const contactNames = cust.contacts.map(c => `${c.name} (${c.contact_type})`).join(', ') || 'Sin contactos';
        const badgeHtml = renderPhaseBadge(cust.status);
        const isNatural = (cust.customer_type || 'JURIDICA') === 'NATURAL';
        const typeBadge = isNatural
            ? '<span class="type-pill natural">P. Natural</span>'
            : '<span class="type-pill juridica">Empresa</span>';
        
        const score = parseInt(cust.lead_score || 0);
        let scoreBadge = '';
        if (score >= 50) {
            scoreBadge = `<span class="score-pill hot" title="Lead Caliente (MQL listo para SQL)">${score} pts</span>`;
        } else if (score > 0) {
            scoreBadge = `<span class="score-pill warm" title="Lead Score acumulado">${score} pts</span>`;
        }

        tr.innerHTML = `
            <td><strong>${cust.nit}</strong></td>
            <td>
                <div style="font-weight:600; color:var(--text-primary); display:flex; align-items:center; flex-wrap:wrap; gap:4px;">
                    ${cust.company_name}
                    ${scoreBadge}
                </div>
            </td>
            <td>${typeBadge}</td>
            <td>${badgeHtml}</td>
            <td>${cust.city || '-'}</td>
            <td>${cust.sector || '-'}</td>
            <td style="max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${contactNames}">${cust._contacts} contacto${cust._contacts !== 1 ? 's' : ''}</td>
            <td onclick="event.stopPropagation()">
                <div style="display:flex;gap:4px;align-items:center;">
                    <button class="action-icon-btn" onclick="openCompanyFormModal('${cust.nit}')" title="Editar Empresa/Cliente">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    <button class="action-icon-btn delete" onclick="deleteCustomer('${cust.nit}')" title="Eliminar Empresa/Cliente">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
    renderPagination(state, state.filtered.length, 'cust-pagination', 'custPageCtrl');
}

function custSortBy(key) {
    if (custTableState.sortKey === key) custTableState.sortDir *= -1;
    else { custTableState.sortKey = key; custTableState.sortDir = 1; }
    custTableState.page = 1;
    _drawCustomersTable();
}

function custPageCtrl(size, delta) {
    if (size !== null) { custTableState.pageSize = parseInt(size); custTableState.page = 1; }
    else custTableState.page = Math.max(1, Math.min(custTableState.page + delta, Math.ceil(custTableState.filtered.length / custTableState.pageSize)));
    _drawCustomersTable();
}

function filterCustomers() {
    const searchVal = (document.getElementById('customer-search')?.value || '').toLowerCase().trim();
    const statusVal = document.getElementById('customer-status-filter')?.value || '';
    const typeVal = document.getElementById('customer-type-filter')?.value || '';
    const filtered = (customersList || []).filter(cust => {
        const matchesSearch = (cust.company_name || '').toLowerCase().includes(searchVal) || (cust.nit || '').toLowerCase().includes(searchVal);
        let matchesStatus = true;
        if (statusVal === 'HOT') {
            matchesStatus = (parseInt(cust.lead_score || 0)) >= 50;
        } else if (statusVal !== '') {
            matchesStatus = cust.status === statusVal;
        }
        const matchesType = typeVal === '' || (cust.customer_type || 'JURIDICA') === typeVal;
        return matchesSearch && matchesStatus && matchesType;
    });
    renderCustomersTable(filtered);
}

async function openFunnelCategory(category) {
    if (category === 'SQL') {
        if (typeof switchTab === 'function') switchTab('requests');
        if (typeof _isStalledMode !== 'undefined') _isStalledMode = false;
        const stalledBtn = document.getElementById('req-tab-stalled');
        if (stalledBtn) stalledBtn.classList.remove('active');
        const statusFilter = document.getElementById('req-filter-status');
        const searchInput = document.getElementById('req-filter-search');
        if (statusFilter) statusFilter.value = '';
        if (searchInput) searchInput.value = '';
        if (typeof loadRequests === 'function') await loadRequests();
        if (typeof showToast === 'function') showToast('Mostrando Solicitudes de Cotización Activas (SQL)', 'info');
    } else {
        if (typeof switchTab === 'function') switchTab('customers');
        if (!window.customersList || window.customersList.length === 0) {
            if (typeof loadCustomers === 'function') await loadCustomers();
        }
        const statusFilter = document.getElementById('customer-status-filter');
        const searchInput = document.getElementById('customer-search');
        const typeFilter = document.getElementById('customer-type-filter');
        if (searchInput) searchInput.value = '';
        if (typeFilter) typeFilter.value = '';
        
        if (category === 'MQL') {
            if (statusFilter) statusFilter.value = 'PROSPECTO';
            if (typeof filterCustomers === 'function') filterCustomers();
            if (typeof showToast === 'function') showToast('Filtrando: Leads en Maduración (MQL)', 'info');
        } else if (category === 'HOT_LEADS') {
            if (statusFilter) statusFilter.value = 'HOT';
            if (typeof filterCustomers === 'function') filterCustomers();
            if (typeof showToast === 'function') showToast('Filtrando: Leads Calientes / Hand-Raisers (≥50 pts)', 'info');
        } else if (category === 'WON') {
            if (statusFilter) statusFilter.value = 'CLIENTE';
            if (typeof filterCustomers === 'function') filterCustomers();
            if (typeof showToast === 'function') showToast('Filtrando: Clientes Ganados / Facturados', 'info');
        }
    }
}

async function openPipelineStage(stageKey) {
    if (typeof switchTab === 'function') {
        switchTab('requests');
    }
    if (typeof _isStalledMode !== 'undefined') _isStalledMode = false;
    const stalledBtn = document.getElementById('req-tab-stalled');
    if (stalledBtn) stalledBtn.classList.remove('active');
    
    const stageSelect = document.getElementById('req-filter-stage');
    const statusSelect = document.getElementById('req-filter-status');
    const searchInput = document.getElementById('req-filter-search');
    if (stageSelect) stageSelect.value = stageKey;
    if (statusSelect) statusSelect.value = '';
    if (searchInput) searchInput.value = '';
    
    if (typeof loadRequests === 'function') {
        await loadRequests();
    }
    
    const stageLabels = {
        'NUEVO': 'Nuevo',
        'ASIGNADO': 'Asignado',
        'VISITA_AGENDADA': 'Visita Agendada',
        'PRE_OFERTA_ENVIADA': 'Pre-Oferta Enviada',
        'NEGOCIACION': 'En Negociación',
        'CONTRATO': 'Contrato Firmado',
        'GANADO': 'Ganado',
        'PERDIDO': 'Perdido'
    };
    const stageName = stageLabels[stageKey] || stageKey;
    if (typeof showToast === 'function') {
        showToast(`Filtrando pipeline: Etapa ${stageName}`, 'info');
    }
}

// ── COMMERCIAL LOGS TABLE ENGINE ─────────────────────────────────────────────
function renderLogsTable(data) {
    logsTableState.filtered = data;
    logsTableState.page = 1;
    _drawLogsTable();
}

async function _drawLogsTable() {
    const state = logsTableState;
    const sorted = sortData(state.filtered, state.sortKey, state.sortDir, LOGS_COLS.find(c=>c.key===state.sortKey)?.type);
    const start = (state.page - 1) * state.pageSize;
    const page = sorted.slice(start, start + state.pageSize);

    // Dynamic on-demand customer lookup for missing names on the current page
    const missingNits = [...new Set(page.map(log => log.customer_nit))]
        .filter(nit => nit && !customersList.some(c => c.nit === nit));

    if (missingNits.length > 0) {
        try {
            const fetched = await Promise.all(
                missingNits.map(nit => 
                    apiFetch(`${API_BASE}/customers/${nit}`)
                        .then(res => res.ok ? res.json() : null)
                )
            );
            fetched.forEach(cust => {
                if (cust && cust.nit) {
                    if (!customersList.some(c => c.nit === cust.nit)) {
                        customersList.push(cust);
                    }
                }
            });
        } catch (e) {
            console.error('Error al resolver nombres de clientes bajo demanda:', e);
        }
    }

    // Rebuild sortable header
    const thead = document.querySelector('#logs-table thead tr');
    if (thead) {
        thead.innerHTML = LOGS_COLS.map(col => {
            if (!col.key) return `<th>${col.label}</th>`;
            const cls = state.sortKey === col.key ? 'th-sortable th-active' : 'th-sortable';
            return `<th class="${cls}" onclick="logsSortBy('${col.key}')">${col.label}${sortIndicator(col.key, state)}</th>`;
        }).join('');
    }

    const tbody = document.getElementById('logs-table-body');
    tbody.innerHTML = '';
    page.forEach(log => {
        const tr = document.createElement('tr');
        const dateStr = log.occurred_at ? new Date(log.occurred_at).toLocaleDateString('es-CO') : '-';
        // Resolve NIT → company name from in-memory customersList
        const custRecord = customersList.find(c => String(c.nit).trim() === String(log.customer_nit).trim());
        if (!custRecord) {
            console.warn(`[Coralis Lookup] NIT ${log.customer_nit} no encontrado en customersList de tamaño ${customersList.length}`);
        }
        const clientName = custRecord ? custRecord.company_name : log.customer_nit;
        const clientCell = `<span class="log-client-name" title="NIT: ${log.customer_nit}">${clientName}</span>`;
        const phaseBadge = renderPhaseBadge(log.status);
        tr.innerHTML = `
            <td>${dateStr}</td>
            <td>${clientCell}</td>
            <td>${log.contact_method || '-'}</td>
            <td>${log.interaction_type || '-'}</td>
            <td>${log.salesperson || '-'}</td>
            <td>${phaseBadge}</td>
            <td style="max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${log.observations || ''}">${log.observations || '-'}</td>
            <td onclick="event.stopPropagation()">
                <div style="display:flex;gap:4px;align-items:center;">
                    <button class="action-icon-btn" onclick="openLogFormModal(${log.id})" title="Editar Gestión">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    <button class="action-icon-btn delete" onclick="deleteCommercialLog(${log.id})" title="Eliminar Gestión">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
    renderPagination(state, state.filtered.length, 'logs-pagination', 'logsPageCtrl');
}

function logsSortBy(key) {
    if (logsTableState.sortKey === key) logsTableState.sortDir *= -1;
    else { logsTableState.sortKey = key; logsTableState.sortDir = 1; }
    logsTableState.page = 1;
    _drawLogsTable();
}

function logsPageCtrl(size, delta) {
    if (size !== null) { logsTableState.pageSize = parseInt(size); logsTableState.page = 1; }
    else logsTableState.page = Math.max(1, Math.min(logsTableState.page + delta, Math.ceil(logsTableState.filtered.length / logsTableState.pageSize)));
    _drawLogsTable();
}

function filterLogs() {
    const searchVal = document.getElementById('logs-search').value.toLowerCase();
    const typeVal   = document.getElementById('logs-type-filter')?.value || '';
    const dateFrom  = document.getElementById('logs-date-from')?.value  || '';
    const dateTo    = document.getElementById('logs-date-to')?.value    || '';

    const fromTs = dateFrom ? new Date(dateFrom).setHours(0, 0, 0, 0)    : null;
    const toTs   = dateTo   ? new Date(dateTo).setHours(23, 59, 59, 999)  : null;

    const filtered = logsList.filter(log => {
        if (searchVal && !log.customer_nit.toLowerCase().includes(searchVal)) return false;
        if (typeVal && (log.interaction_type || '').toUpperCase() !== typeVal.toUpperCase()) return false;
        if (fromTs || toTs) {
            if (!log.occurred_at) return false;
            const logTs = new Date(log.occurred_at).getTime();
            if (fromTs && logTs < fromTs) return false;
            if (toTs   && logTs > toTs)   return false;
        }
        return true;
    });
    renderLogsTable(filtered);
}

function clearLogsDateFilter() {
    const from = document.getElementById('logs-date-from');
    const to   = document.getElementById('logs-date-to');
    if (from) from.value = '';
    if (to)   to.value   = '';
    filterLogs();
}

function exportCustomers() {
    const searchVal = document.getElementById('customer-search').value.trim();
    const statusVal = document.getElementById('customer-status-filter').value;
    const typeVal = document.getElementById('customer-type-filter').value;
    
    const params = new URLSearchParams();
    if (searchVal) params.append('search', searchVal);
    if (statusVal) params.append('status', statusVal);
    if (typeVal) params.append('customer_type', typeVal);
    
    const url = `${API_BASE}/reports/customers/export?${params.toString()}`;
    window.open(url, '_blank');
}


function exportLogs() {
    const searchVal = document.getElementById('logs-search').value.trim();
    
    const params = new URLSearchParams();
    if (searchVal) params.append('search', searchVal);
    
    const url = `${API_BASE}/reports/commercial-logs/export?${params.toString()}`;
    window.open(url, '_blank');
}

// --- Bot Sessions & Live Chat Logic is now encapsulated in js/chat.js (v12.1.0) ---

// --- Configuration Management v1.6.0 ---
async function loadConfiguration() {
    const statusMsg = document.getElementById('config-status-msg');
    if (statusMsg) statusMsg.innerText = 'Cargando configuraciones...';

    try {
        const res = await apiFetch(`${API_BASE}/config`);
        if (!res.ok) throw new Error('Failed to fetch config');
        
        const data = await res.json();
        
        // Mapear claves a los inputs correspondientes del HTML
        for (const [key, value] of Object.entries(data)) {
            const input = document.getElementById(`cfg-${key}`);
            if (input) {
                input.value = value || '';
            }
        }
        if (statusMsg) statusMsg.innerText = '';
    } catch (error) {
        console.error('Error loading config:', error);
        showStatusMsg('Error al cargar configuraciones de la API.', 'error');
    }
}

async function saveConfiguration(event) {
    if (event) event.preventDefault();
    
    const saveBtn = document.getElementById('save-config-btn');
    const originalText = saveBtn ? saveBtn.innerHTML : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px;"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>Guardar Configuración del Sistema';
    if (saveBtn) {
        saveBtn.innerHTML = '<svg class="spin-anim" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px;"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line><line x1="19.07" y1="4.93" x2="4.93" y2="19.07"></line></svg>Guardando configuraciones...';
        saveBtn.disabled = true;
    }
    
    // Armar payload dinámico del formulario
    const payload = {};
    const inputs = document.querySelectorAll('[id^="cfg-"]');
    inputs.forEach(input => {
        const key = input.id.replace('cfg-', '');
        payload[key] = input.value;
    });

    try {
        const res = await apiFetch(`${API_BASE}/config`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (res.ok && data.status === 'success') {
            if (typeof showToast === 'function') {
                showToast(data.message || 'Configuración del sistema guardada exitosamente.', 'success');
            }
            showStatusMsg(data.message || 'Configuración guardada.', 'success');
            // Recargar para refrescar campos con sus máscaras
            await loadConfiguration();
        } else {
            const err = data.detail || data.message || 'Fallo al guardar configuración.';
            if (typeof showToast === 'function') showToast(err, 'error');
            showStatusMsg(err, 'error');
        }
    } catch (error) {
        console.error('Error saving config:', error);
        if (typeof showToast === 'function') showToast('Error de red al guardar la configuración.', 'error');
        showStatusMsg('Error de red al guardar la configuración.', 'error');
    } finally {
        if (saveBtn) {
            saveBtn.innerHTML = originalText;
            saveBtn.disabled = false;
        }
    }
}

async function testTelegramAlert() {
    const message = prompt("Ingrese un mensaje de prueba para enviar a Telegram:", "Mensaje de prueba desde Coralis CRM");
    if (!message) return;

    try {
        const res = await apiFetch(`${API_BASE}/integrations/test-telegram`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: message })
        });
        const data = await res.json();
        alert(data.message || "Solicitud de prueba enviada.");
    } catch (error) {
        alert("Error de red al enviar la prueba de Telegram.");
    }
}

async function testEmailAlert() {
    const toEmail = prompt("Ingrese el correo electrónico de destino para la prueba:");
    if (!toEmail) return;

    try {
        const res = await apiFetch(`${API_BASE}/integrations/test-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                to_email: toEmail,
                subject: "Prueba de Integración SMTP - Coralis CRM",
                body_html: "<h3>¡Conexión SMTP Exitosa!</h3><p>Este es un correo de diagnóstico automático enviado por Coralis CRM.</p>"
            })
        });
        const data = await res.json();
        alert(data.message || "Solicitud de prueba enviada.");
    } catch (error) {
        alert("Error de red al enviar la prueba SMTP.");
    }
}

function showStatusMsg(text, type) {
    const el = document.getElementById('config-status-msg');
    if (!el) return;
    el.innerText = text;
    el.className = `status-msg ${type}`;
    setTimeout(() => {
        if (el.innerText === text) el.innerText = '';
    }, 4000);
}

// --- Customer Profile Modal & Communications v1.7.0 ---
let activeCustomerNit = null;
let activeCustomerDetails = null;
let activeCustomerLogs = [];

async function openCustomerModal(nit) {
    activeCustomerNit = nit;
    try {
        // Fetch paralelo del cliente y su historial de gestiones
        const [custRes, logsRes] = await Promise.all([
            apiFetch(`${API_BASE}/customers/${nit}`),
            apiFetch(`${API_BASE}/commercial-logs?customer_nit=${nit}&limit=150`)
        ]);

        if (!custRes.ok) throw new Error("Fallo al obtener datos del cliente");
        
        const customer = await custRes.json();
        const logs = await logsRes.json();
        activeCustomerDetails = customer;
        activeCustomerLogs = logs;

        // Rellenar Hoja de Vida
        document.getElementById('modal-cust-name').innerText = customer.company_name;
        document.getElementById('modal-cust-nit').innerText = `NIT: ${customer.nit}`;
        
        const badge = document.getElementById('modal-cust-status');
        badge.innerText = customer.status;
        badge.className = `modal-badge ${customer.status.toLowerCase()}`;

        // Customer type badge — clickable to reclassify
        const typeBadge = document.getElementById('modal-cust-type');
        const isNatural = (customer.customer_type || 'JURIDICA') === 'NATURAL';
        typeBadge.innerText = isNatural ? 'Persona Natural' : 'Empresa';
        typeBadge.className = `modal-badge customer-type-badge ${isNatural ? 'natural' : 'juridica'}`;
        typeBadge.dataset.currentType = customer.customer_type || 'JURIDICA';

        // Lead Score & Nurturing Subscription
        const score = parseInt(customer.lead_score || 0);
        const scoreBadgeEl = document.getElementById('modal-cust-score');
        if (scoreBadgeEl) {
            scoreBadgeEl.innerText = score >= 50 ? `${score} pts (Caliente)` : `${score} pts`;
            scoreBadgeEl.style.background = score >= 50 ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)';
            scoreBadgeEl.style.color = score >= 50 ? '#ef4444' : '#d97706';
            scoreBadgeEl.style.borderColor = score >= 50 ? 'rgba(239,68,68,0.4)' : 'rgba(245,158,11,0.4)';
        }

        const scoreDetailEl = document.getElementById('modal-cust-score-detail');
        if (scoreDetailEl) {
            scoreDetailEl.innerText = `${score} pts`;
            scoreDetailEl.style.color = score >= 50 ? '#ef4444' : '#d97706';
        }

        const subEl = document.getElementById('modal-cust-subscribed');
        if (subEl) {
            const isSub = customer.is_subscribed !== false && customer.is_subscribed !== 0;
            subEl.innerHTML = isSub 
                ? '<span style="color:#10b981; font-weight:600; display:inline-flex; align-items:center; gap:5px;"><span class="comm-dot comm-dot-green"></span> Activo (Suscrito)</span>' 
                : '<span style="color:#ef4444; font-weight:600; display:inline-flex; align-items:center; gap:5px;"><span class="comm-dot comm-dot-red"></span> Desuscrito (Anti-Spam)</span>';
        }

        document.getElementById('modal-cust-city').innerText = customer.city || '-';
        document.getElementById('modal-cust-sector').innerText = customer.sector || '-';
        document.getElementById('modal-cust-address').innerText = customer.address || '-';
        document.getElementById('modal-cust-obs').innerText = customer.observations || 'Sin observaciones.';

        // Segmentar y renderizar contactos
        const commContainer = document.getElementById('contact-seg-commercial');
        const operContainer = document.getElementById('contact-seg-operative');
        const finContainer = document.getElementById('contact-seg-financial');

        commContainer.innerHTML = '';
        operContainer.innerHTML = '';
        finContainer.innerHTML = '';

        if (customer.contacts && customer.contacts.length > 0) {
            customer.contacts.forEach(c => {
                const card = document.createElement('div');
                card.className = 'contact-item-card';
                
                const cleanPhone = c.phone ? c.phone.replace(/[^0-9]/g, '') : '';
                const waLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent('Hola ' + c.name + ', te escribo de ALACOR...')}`;
                // Telegram direct profile link or search by username/phone
                const tgLink = c.phone ? `https://t.me/+${cleanPhone}` : 'https://t.me/';

                const isPriority = c.is_priority === true;
                const wasNotifiedRecently = c.last_notified_at && (new Date() - new Date(c.last_notified_at)) < 86400000;

                card.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px;">
                        <div style="display:flex; flex-direction:column; gap:2px;">
                            <h5 style="margin: 0; font-size: 0.95rem; color: var(--text-main); font-family: 'Outfit'; font-weight: 500;">${c.name}</h5>
                            <div style="display:flex; align-items:center; gap:6px; margin-top:2px;">
                                <button type="button" class="contact-priority-btn ${isPriority ? 'is-priority' : ''}" onclick="toggleContactPriority('${activeCustomerNit}', ${c.id}, event)" title="Priorizar este contacto para el siguiente envío de correos N8N">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="${isPriority ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                                    <span>${isPriority ? 'Prioritario' : 'Priorizar'}</span>
                                </button>
                                ${wasNotifiedRecently ? '<span class="contact-notified-badge" title="Notificado a la CCO en las últimas 24h"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px; margin-right:3px;"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>Notificado hoy</span>' : ''}
                            </div>
                        </div>
                        <div class="contact-actions-menu" onclick="event.stopPropagation()" style="display: flex; gap: 4px;">
                            <button class="action-icon-btn" onclick="openEditContactModal(${c.id})" title="Editar Contacto">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            </button>
                            <button class="action-icon-btn delete" onclick="deleteContact(${c.id})" title="Eliminar Contacto">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            </button>
                        </div>
                    </div>
                    ${c.role ? `<span style="display:flex; align-items:center; gap:5px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--text-muted); flex-shrink:0;"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg> ${c.role}</span>` : ''}
                    ${c.phone ? `<span style="display:flex; align-items:center; gap:5px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--text-muted); flex-shrink:0;"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg> ${c.phone}</span>` : ''}
                    ${c.email ? `<span style="display:flex; align-items:center; gap:5px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--text-muted); flex-shrink:0;"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg> ${c.email}</span>` : ''}
                    <div class="contact-actions" onclick="event.stopPropagation()" style="display:flex; gap:6px; margin-top:8px;">
                        ${c.email ? `<button class="contact-action-btn" onclick="openEmailCompose('${c.email}')" title="Enviar correo a ${c.email}" aria-label="Enviar correo"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg></button>` : ''}
                        ${c.phone ? `<a class="contact-action-btn" href="${waLink}" target="_blank" title="Abrir chat en WhatsApp (${c.phone})" aria-label="WhatsApp"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="color:#25d366;"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg></a>` : ''}
                        ${c.phone ? `<a class="contact-action-btn" href="${tgLink}" target="_blank" title="Abrir chat en Telegram (${c.phone})" aria-label="Telegram"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="color:#229ed9;"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/></svg></a>` : ''}
                    </div>
                `;

                // Clasificar por tipo
                const type = c.contact_type.toUpperCase();
                if (type === 'COMMERCIAL') {
                    commContainer.appendChild(card);
                } else if (type === 'OPERATIVE' || type === 'OPERATIONAL') {
                    operContainer.appendChild(card);
                } else if (type === 'FINANCIAL') {
                    finContainer.appendChild(card);
                } else {
                    commContainer.appendChild(card);
                }
            });
        }

        // Si algún segmento quedó vacío, mostrar mensaje
        if (commContainer.innerHTML === '') commContainer.innerHTML = '<span class="section-tip">Ninguno</span>';
        if (operContainer.innerHTML === '') operContainer.innerHTML = '<span class="section-tip">Ninguno</span>';
        if (finContainer.innerHTML === '') finContainer.innerHTML = '<span class="section-tip">Ninguno</span>';

        // Renderizar Historial/Timeline
        const timeline = document.getElementById('modal-timeline');
        timeline.innerHTML = '';

        if (logs && logs.length > 0) {
            logs.forEach(log => {
                const item = document.createElement('div');
                item.className = 'timeline-item';
                const dateStr = log.occurred_at ? new Date(log.occurred_at).toLocaleDateString() : '-';
                
                item.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <span class="timeline-date">${dateStr} • Por: ${log.salesperson || 'Sistema'}</span>
                        <div class="timeline-log-actions" onclick="event.stopPropagation()" style="display: flex; gap: 4px;">
                            <button class="action-icon-btn" onclick="openLogFormModal(${log.id})" title="Editar Gestión">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            </button>
                            <button class="action-icon-btn delete" onclick="deleteCommercialLog(${log.id})" title="Eliminar Gestión">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                            </button>
                        </div>
                    </div>
                    <span class="timeline-title">${log.interaction_type || 'Gestión'} (${log.contact_method || 'Canal indefinido'})</span>
                    ${log.offer_value ? `<span class="timeline-desc"><b>Oferta:</b> $${parseFloat(log.offer_value).toLocaleString()} (${log.offer_status || 'Pendiente'})</span>` : ''}
                    <p class="timeline-desc">${log.observations || 'Sin observaciones de gestión.'}</p>
                `;
                timeline.appendChild(item);
            });
        } else {
            timeline.innerHTML = '<p class="section-tip">No se han registrado gestiones para este cliente.</p>';
        }

        // Mostrar modal
        document.getElementById('customer-modal').classList.add('active');

    } catch (error) {
        console.error("Error al cargar detalles de cliente:", error);
        alert("Ocurrió un error al cargar la hoja de vida del cliente.");
    }
}

function closeCustomerModal() {
    document.getElementById('customer-modal').classList.remove('active');
}

async function reclassifyCustomer() {
    if (!activeCustomerNit) return;
    const typeBadge = document.getElementById('modal-cust-type');
    const currentType = typeBadge.dataset.currentType || 'JURIDICA';
    const newType = currentType === 'JURIDICA' ? 'NATURAL' : 'JURIDICA';

    const confirmMsg = newType === 'NATURAL'
        ? `¿Reclasificar este registro como Persona Natural?`
        : `¿Reclasificar este registro como Empresa (Persona Jurídica)?`;
    if (!confirm(confirmMsg)) return;

    try {
        const res = await apiFetch(`${API_BASE}/customers/${activeCustomerNit}/type?customer_type=${newType}`, {
            method: 'PATCH'
        });
        if (!res.ok) throw new Error('Error al reclasificar');
        const updated = await res.json();

        // Update badge in modal immediately
        const isNatural = updated.customer_type === 'NATURAL';
        typeBadge.innerText = isNatural ? 'Persona Natural' : 'Empresa';
        typeBadge.className = `modal-badge customer-type-badge ${isNatural ? 'natural' : 'juridica'}`;
        typeBadge.dataset.currentType = updated.customer_type;

        // Update local cache so the table filter reflects the change
        const idx = customersList.findIndex(c => c.nit === activeCustomerNit);
        if (idx !== -1) {
            customersList[idx].customer_type = updated.customer_type;
            renderCustomersTable(customersList);
        }
    } catch (e) {
        console.error('Error reclassifying customer:', e);
        alert('No se pudo cambiar la clasificación. Intente de nuevo.');
    }
}

function openEmailCompose(email) {
    document.getElementById('email-to-field').value = email;
    document.getElementById('email-subject-field').value = '';
    document.getElementById('email-message-field').value = '';

    // Populate sender dropdown dynamically from employees API
    const senderSelect = document.getElementById('email-sender-field');
    apiFetch(`${API_BASE}/employees`)
        .then(r => r.json())
        .then(employees => {
            senderSelect.innerHTML = '';
            employees.forEach(emp => {
                const opt = document.createElement('option');
                opt.value = emp.username;
                opt.textContent = `${emp.full_name} (${emp.role || 'Empleado'})`;
                senderSelect.appendChild(opt);
            });
        })
        .catch(() => {
            senderSelect.innerHTML = '<option value="">Error al cargar empleados</option>';
        });

    document.getElementById('email-compose-modal').classList.add('active');
}

function closeEmailModal() {
    document.getElementById('email-compose-modal').classList.remove('active');
}

async function sendCustomEmail(event) {
    if (event) event.preventDefault();

    const sendBtn = document.getElementById('send-email-btn');
    const originalText = sendBtn.innerText;
    sendBtn.innerText = 'Enviando...';
    sendBtn.disabled = true;

    const payload = {
        to_email: document.getElementById('email-to-field').value,
        sender_key: document.getElementById('email-sender-field').value,
        subject: document.getElementById('email-subject-field').value,
        message_body: document.getElementById('email-message-field').value
    };

    try {
        const res = await apiFetch(`${API_BASE}/integrations/send-custom-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (res.ok && data.status === 'success') {
            alert('¡Correo enviado con éxito!');
            closeEmailModal();
        } else {
            alert('Error al enviar el correo: ' + (data.detail || 'Fallo de envío.'));
        }
    } catch (error) {
        console.error('Error sending email:', error);
        alert('Error de red al enviar el correo.');
    } finally {
        sendBtn.innerText = originalText;
        sendBtn.disabled = false;
    }
}

// --- Contact CRUD Modal v1.8.0 ---
let editContactId = null;

function openAddContactModal() {
    editContactId = null;
    document.getElementById('contact-name-field').value = '';
    document.getElementById('contact-role-field').value = '';
    document.getElementById('contact-type-field').value = 'COMMERCIAL';
    document.getElementById('contact-phone-field').value = '';
    document.getElementById('contact-email-field').value = '';
    
    document.getElementById('add-contact-submit-btn').innerText = 'Registrar Contacto';
    document.querySelector('#add-contact-modal h3').innerText = 'Agregar Nuevo Contacto';
    document.getElementById('add-contact-modal').classList.add('active');
}

function openEditContactModal(contactId) {
    if (!activeCustomerDetails) return;
    const c = activeCustomerDetails.contacts.find(con => con.id === contactId);
    if (!c) return;

    editContactId = contactId;
    document.getElementById('contact-name-field').value = c.name || '';
    document.getElementById('contact-role-field').value = c.role || '';
    document.getElementById('contact-type-field').value = c.contact_type || 'COMMERCIAL';
    document.getElementById('contact-phone-field').value = c.phone || '';
    document.getElementById('contact-email-field').value = c.email || '';

    document.getElementById('add-contact-submit-btn').innerText = 'Guardar Cambios';
    document.querySelector('#add-contact-modal h3').innerText = 'Editar Contacto';
    document.getElementById('add-contact-modal').classList.add('active');
}

function closeAddContactModal() {
    document.getElementById('add-contact-modal').classList.remove('active');
}

async function submitAddContact(event) {
    if (event) event.preventDefault();
    if (!activeCustomerNit) return;

    const submitBtn = document.getElementById('add-contact-submit-btn');
    const originalText = submitBtn.innerText;
    submitBtn.innerText = 'Guardando...';
    submitBtn.disabled = true;

    const payload = {
        name: document.getElementById('contact-name-field').value,
        role: document.getElementById('contact-role-field').value || null,
        contact_type: document.getElementById('contact-type-field').value,
        phone: document.getElementById('contact-phone-field').value || null,
        email: document.getElementById('contact-email-field').value || null
    };

    const isEdit = editContactId !== null;
    const url = isEdit 
        ? `${API_BASE}/customers/${activeCustomerNit}/contacts/${editContactId}`
        : `${API_BASE}/customers/${activeCustomerNit}/contacts`;
    const method = isEdit ? 'PUT' : 'POST';

    try {
        const res = await apiFetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        let data = {};
        try {
            data = await res.json();
        } catch (jsonErr) {
            data = { detail: res.statusText || 'Error en servidor' };
        }

        if (res.ok && data.id) {
            closeAddContactModal();
            await openCustomerModal(activeCustomerNit);
            
            // Reload global cache
            await loadCustomers();
        } else {
            alert('Error al guardar el contacto: ' + (data.detail || JSON.stringify(data) || 'Fallo de registro.'));
        }
    } catch (error) {
        console.error('Error saving contact:', error);
        alert('Error de red al guardar el contacto: ' + (error.message || 'Sin conexión'));
    } finally {
        submitBtn.innerText = originalText;
        submitBtn.disabled = false;
    }
}

async function deleteContact(contactId) {
    if (!activeCustomerNit) return;
    if (!confirm('¿Está seguro de eliminar este contacto? (Paso 1/2)')) return;
    const secondConfirm = prompt('Para confirmar, escriba "ELIMINAR" en mayúsculas (Paso 2/2):');
    if (secondConfirm !== 'ELIMINAR') {
        alert('Eliminación cancelada. Confirmación incorrecta.');
        return;
    }

    try {
        const res = await apiFetch(`${API_BASE}/customers/${activeCustomerNit}/contacts/${contactId}`, {
            method: 'DELETE'
        });
        if (!res.ok) throw new Error('Fallo al eliminar contacto');
        
        // Refresh details & list
        await openCustomerModal(activeCustomerNit);
        await loadCustomers();
    } catch (e) {
        alert(e.message);
    }
}

async function toggleContactPriority(nit, contactId, event) {
    if (event) event.stopPropagation();
    if (!nit || !contactId) return;

    const btn = event ? event.currentTarget : null;
    if (btn) {
        btn.disabled = true;
        btn.style.opacity = '0.5';
    }

    try {
        const res = await apiFetch(`${API_BASE}/customers/${nit}/contacts/${contactId}/priority`, {
            method: 'PATCH'
        });
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.detail || 'No se pudo alternar la prioridad');
        }

        const updatedContact = await res.json().catch(() => ({}));
        const isNowPriority = updatedContact.is_priority === true;

        if (btn) {
            if (isNowPriority) {
                btn.classList.add('is-priority');
                btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" style="margin-right:4px;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>Prioritario';
            } else {
                btn.classList.remove('is-priority');
                btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:4px;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>Priorizar';
            }
        }

        if (typeof showToast === 'function') {
            showToast(isNowPriority ? 'Contacto marcado como Prioritario para N8N' : 'Prioridad retirada del contacto', 'success');
        }

        // Recargar modal de cliente y listado para reflejar estado
        await openCustomerModal(nit);
    } catch (err) {
        console.error('Error toggling contact priority:', err);
        alert('Error al actualizar prioridad: ' + err.message);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.style.opacity = '1';
        }
    }
}

// ──────────────────────────────────────────────────────────
// Employee & Signature Management v1.9.0
// ──────────────────────────────────────────────────────────

let employeesList = [];


// ── USERS MATRIX & SPECIAL PERMISSIONS ENGINE (v8.5.0) ────────────────────────
async function loadEmployeeSelector() {
    try {
        const res = await apiFetch(`${API_BASE}/employees`);
        if (!res.ok) return;
        employeesList = await res.json();
        _allEmployeesData = employeesList;

        // Render Users Matrix Table
        renderUsersMatrixTable(employeesList);

        // Also trigger standalone Roles Matrix for Superuser
        const rolesCard = document.getElementById('card-roles-matrix-standalone');
        if (rolesCard) rolesCard.style.display = isSuperUser() ? 'block' : 'none';
        if (isSuperUser() && typeof loadPermissionsMatrix === 'function') {
            loadPermissionsMatrix();
        }
    } catch (e) {
        console.error('Error loading employees:', e);
    }
}

function renderUsersMatrixTable(employees) {
    const tbody = document.getElementById('employees-table-body') || document.getElementById('users-matrix-tbody');
    if (!tbody) return;

    const badgeTotal = document.getElementById('badge-total-employees');
    if (badgeTotal && Array.isArray(employees)) {
        badgeTotal.innerText = `${employees.length} usuario${employees.length === 1 ? '' : 's'}`;
    }

    if (!employees || employees.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:30px; color:var(--text-muted);">No hay usuarios registrados.</td></tr>';
        return;
    }

    const roleBadges = {
        'SUPERUSER': '<span class="status-pill cerrada" style="font-weight:700;"><span class="comm-dot comm-dot-violet"></span> Superuser</span>',
        'DIRECTOR': '<span class="status-pill cotizada" style="font-weight:700;"><span class="comm-dot comm-dot-blue"></span> Director</span>',
        'DIRECTOR_COMERCIAL': '<span class="status-pill cotizada" style="font-weight:700;"><span class="comm-dot comm-dot-blue"></span> Director</span>',
        'ADMIN': '<span class="status-pill ganada" style="font-weight:700;"><span class="comm-dot comm-dot-cyan"></span> Admin</span>',
        'ADMINISTRATOR': '<span class="status-pill ganada" style="font-weight:700;"><span class="comm-dot comm-dot-cyan"></span> Admin</span>',
        'USER': '<span class="status-pill nueva"><span class="comm-dot comm-dot-slate"></span> Asesor</span>'
    };

    tbody.innerHTML = employees.map(emp => {
        const u = emp.username || '';
        const role = (emp.role || 'USER').toUpperCase();
        const badge = roleBadges[role] || `<span class="type-pill natural">${role}</span>`;
        const cargo = emp.position || emp.cargo || '—';
        const email = emp.email || '—';
        const phone = emp.phone || '—';
        const isActive = emp.is_active !== false;
        const statusDot = isActive 
            ? '<span class="comm-dot comm-dot-green" title="Activo"></span>' 
            : '<span class="comm-dot comm-dot-red" title="Inactivo"></span>';

        const statusBtn = isSuperUser() && u.toLowerCase() !== 'falarcon' ? `
            <button type="button" class="action-icon-btn" onclick="toggleUserStatus('${u}', ${isActive})" title="${isActive ? 'Desactivar Usuario' : 'Activar Usuario'}">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path><line x1="12" y1="2" x2="12" y2="12"></line></svg>
            </button>` : '';

        return `
        <tr style="${!isActive ? 'opacity:0.65; background:rgba(239,68,68,0.04);' : ''}">
            <td style="padding:10px 14px;"><strong>${u}</strong> ${!isActive ? '<span style="font-size:0.7rem; color:#ef4444; font-weight:700; margin-left:4px;">[INACTIVO]</span>' : ''}</td>
            <td style="padding:10px 14px;">${emp.full_name || '—'}</td>
            <td style="padding:10px 14px;">${badge}</td>
            <td style="padding:10px 14px; font-size:0.8rem; color:var(--text-secondary);">${cargo}</td>
            <td style="padding:10px 14px; font-size:0.8rem;">${email}</td>
            <td style="padding:10px 14px; font-size:0.8rem;">${phone}</td>
            <td style="padding:10px 14px;">${statusDot} ${isActive ? 'Activo' : 'Inactivo'}</td>
            <td style="padding:10px 14px; text-align:center;">
                <div style="display:inline-flex; gap:6px; align-items:center;">
                    ${isSuperUser() ? `
                    <button type="button" class="action-icon-btn" onclick="openUserSpecialPermsModal('${u}')" title="Permisos Especiales">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                    </button>` : ''}
                    ${statusBtn}
                    <button type="button" class="action-icon-btn" onclick="editUserFromTable('${u}')" title="Editar Perfil">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    ${isSuperUser() && u.toLowerCase() !== 'falarcon' ? `
                    <button type="button" class="action-icon-btn delete" onclick="deleteUserFromTable('${u}')" title="Eliminar Usuario">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>` : ''}
                </div>
            </td>
        </tr>`;
    }).join('');
}

function filterUsersMatrixTable() {
    const q = document.getElementById('users-search-input')?.value?.toLowerCase() || '';
    const filtered = _allEmployeesData.filter(e => 
        (e.username || '').toLowerCase().includes(q) ||
        (e.full_name || '').toLowerCase().includes(q) ||
        (e.email || '').toLowerCase().includes(q)
    );
    renderUsersMatrixTable(filtered);
}

function editUserFromTable(username) {
    loadEmployeeData(username);
}

async function deleteUserFromTable(username) {
    if (!confirm(`¿Está seguro de eliminar al usuario ${username}?`)) return;
    try {
        const res = await apiFetch(`${API_BASE}/employees/${username}`, { method: 'DELETE' });
        if (res.ok) {
            showToast('Usuario eliminado correctamente.', 'success');
            loadEmployeeSelector();
        } else {
            const err = await res.json();
            showToast(err.detail || 'Error al eliminar usuario.', 'error');
        }
    } catch(e) {
        showToast(e.message, 'error');
    }
}

