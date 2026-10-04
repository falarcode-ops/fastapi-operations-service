/**
 * commercial-performance.js (v12.30.0)
 * Controlador frontend para el Cockpit de Desempeño y Supervisión Comercial.
 */
let perfTrendChartInstance = null;

async function loadCommercialPerformance() {
    const container = document.getElementById('perf-cockpit-container');
    if (!container) return;
    try {
        const res = await apiFetch(`${API_BASE}/v1/commercial-performance/summary?daily_target=8`);
        if (!res.ok) {
            container.innerHTML = `<div style="padding:20px; color:var(--text-muted); text-align:center;">No se pudieron cargar las métricas de rendimiento.</div>`;
            return;
        }
        const data = await res.json();
        renderPerformanceCockpit(data, container);
    } catch (err) {
        console.error('Error al cargar rendimiento comercial:', err);
    }
}

function renderPerformanceCockpit(data, container) {
    const k = data.kpis || {};
    const formatCommercialRole = (role) => {
        const r = (role || '').toUpperCase();
        if (r.includes('DIRECTOR')) return 'Director Comercial';
        if (r.includes('COORDINADOR')) return 'Coordinador(a) Comercial';
        if (r.includes('ANALISTA')) return 'Analista Comercial';
        if (r === 'USER' || r.includes('ASESOR')) return 'Asesor Comercial';
        return role || 'Director Comercial';
    };

    const advisors = (data.advisors_leaderboard && data.advisors_leaderboard.length > 0) 
        ? data.advisors_leaderboard 
        : [{
            username: "fabian.alarcon",
            full_name: "Fabián Andrés Alarcón Chávez",
            role: "DIRECTOR_COMERCIAL",
            acts_today: k.total_today ?? 0,
            daily_target: k.team_daily_target ?? 8,
            compliance_pct: 0,
            acts_week: k.total_week ?? 0,
            acts_month: k.total_month ?? 0,
            total_assigned_customers: 14,
            abandoned_30d: k.abandoned_accounts_30d ?? 0,
            closed_count: 0,
            closed_val: 0,
            closing_ratio: 0,
            last_activity: "Sin registro hoy",
            status_label: "Sin Actividad Hoy",
            status_class: "badge-rose"
        }];
    const trend = data.effort_trend_14d || [];

    const fmtMoney = (val) => {
        if (!val || val === 0) return '$0';
        if (val >= 1000000) return '$' + (val / 1000000).toFixed(1) + 'M';
        if (val >= 1000) return '$' + (val / 1000).toFixed(0) + 'k';
        return '$' + Number(val).toLocaleString();
    };

    // 1. KPI Cards de Pulso Diario (Defensivas contra valores undefined)
    const pulseCardsHTML = `
        <div class="perf-kpi-grid">
            <div class="perf-kpi-card ${(k.total_today ?? 0) > 0 ? 'perf-card-success' : 'perf-card-warning'}" onclick="switchTab('logs')" title="Ver bitácora de gestiones comerciales">
                <div class="perf-kpi-label">
                    <span style="display:inline-flex; align-items:center; gap:5px;">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                        Gestiones Hoy
                        <span class="kpi-info-icon" onclick="event.stopPropagation()" data-tip="Gestiones Comerciales de Hoy&#10;• Qué significa: Volumen de interacciones activas (llamadas, visitas, cotizaciones y seguimientos) registradas hoy por el equipo.&#10;• Cómo se calcula: Conteo de registros en commercial_logs con fecha de hoy vs Meta diaria del equipo (${k.team_daily_target ?? 8} gestiones).&#10;• Niveles adecuados: 🟢 Óptimo: ≥ 100% de la meta diaria | 🟡 Alerta: 50% a 99% de la meta | 🔴 Crítico: < 50% de la meta diaria.">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                        </span>
                    </span>
                    <span class="perf-kpi-target">Meta Equipo: ${k.team_daily_target ?? 8}</span>
                </div>
                <div class="perf-kpi-val">${k.total_today ?? 0}</div>
                <div class="perf-kpi-sub">${k.total_week ?? 0} en 7 días &middot; ${k.total_month ?? 0} este mes</div>
            </div>
            <div class="perf-kpi-card ${(k.inactive_advisors_today ?? 0) === 0 ? 'perf-card-success' : 'perf-card-danger'}" onclick="scrollToAdvisorLeaderboard()" title="Ver productividad de asesores">
                <div class="perf-kpi-label">
                    <span style="display:inline-flex; align-items:center; gap:5px;">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                        Asesores Activos Hoy
                        <span class="kpi-info-icon" onclick="event.stopPropagation()" data-tip="Asesores Activos Hoy&#10;• Qué significa: Proporción de asesores comerciales con al menos una gestión registrada durante la jornada.&#10;• Cómo se calcula: (Asesores con gestiones hoy / Total de asesores activos) × 100.&#10;• Niveles adecuados: 🟢 Óptimo: 100% del equipo activo (0 inactivos) | 🟡 Alerta: 1 asesor inactivo sin gestiones | 🔴 Crítico: ≥ 2 asesores inactivos o > 50% del equipo sin registrar actividad.">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                        </span>
                    </span>
                    <span class="perf-status-pill ${(k.inactive_advisors_today ?? 0) === 0 ? 'pill-green' : 'pill-red'}">
                        ${(k.inactive_advisors_today ?? 0) === 0 ? 'Equipo al 100%' : ((k.inactive_advisors_today ?? 0) === 1 ? '1 Inactivo' : `${k.inactive_advisors_today ?? 0} Inactivos`)}
                    </span>
                </div>
                <div class="perf-kpi-val">${k.active_advisors_today ?? 0} <span class="perf-unit">/ ${advisors.length || 1} activos</span></div>
                <div class="perf-kpi-sub">${(k.inactive_advisors_today ?? 0) > 0 ? '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px; margin-right:3px;"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>Hay asesores sin gestiones hoy' : 'Todos con actividad registrada'}</div>
            </div>
            <div class="perf-kpi-card ${(k.unattended_requests_24h ?? 0) > 0 ? 'perf-card-danger' : 'perf-card-neutral'}" onclick="openUnattendedRequests()" title="Ir a solicitudes sin atender (>24h)">
                <div class="perf-kpi-label">
                    <span style="display:inline-flex; align-items:center; gap:5px;">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        Solicitudes Sin Atender
                        <span class="kpi-info-icon" onclick="event.stopPropagation()" data-tip="Solicitudes Sin Atender (> 24 horas)&#10;• Qué significa: Requerimientos de cotización y diagnósticos web abiertos sin ningún contacto o gestión registrada tras 24h.&#10;• Cómo se calcula: Conteo de quote_requests abiertas con created_at > 24h sin registros en commercial_logs.&#10;• Niveles adecuados: 🟢 Óptimo: 0 solicitudes demoradas (SLA cumplido) | 🟡 Alerta: 1 a 2 solicitudes sin atender | 🔴 Crítico: ≥ 3 solicitudes demoradas (Riesgo alto de fuga de cliente).">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                        </span>
                    </span>
                    <span class="perf-status-pill ${(k.unattended_requests_24h ?? 0) > 0 ? 'pill-red' : 'pill-green'}">> 24 horas</span>
                </div>
                <div class="perf-kpi-val">${k.unattended_requests_24h ?? 0}</div>
                <div class="perf-kpi-sub">${(k.unattended_requests_24h ?? 0) > 0 ? 'Riesgo de pérdida de oportunidad &middot; Clic para ver ➔' : 'Al día, 0 demoras críticas'}</div>
            </div>
            <div class="perf-kpi-card ${(k.abandoned_accounts_30d ?? 0) > 0 ? 'perf-card-warning' : 'perf-card-success'}" onclick="openAbandonedAccountsModal(30)" title="Ver cartera desatendida (>30 días)">
                <div class="perf-kpi-label">
                    <span style="display:inline-flex; align-items:center; gap:5px;">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="5" x="2" y="3" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/></svg>
                        Cartera Desatendida
                        <span class="kpi-info-icon" onclick="event.stopPropagation()" data-tip="Cartera Desatendida (> 30 días)&#10;• Qué significa: Clientes y prospectos asignados a la cartera de asesores sin ningún contacto, llamada ni oferta en los últimos 30 días.&#10;• Cómo se calcula: Conteo de clientes en customers asignados a un asesor cuya última gestión en commercial_logs supera los 30 días.&#10;• Niveles adecuados: 🟢 Óptimo: ≤ 10% de la cartera sin gestión reciente | 🟡 Alerta: 10% a 25% de la cartera desatendida | 🔴 Crítico: > 25% de la cartera en riesgo de abandono.">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                        </span>
                    </span>
                    <span class="perf-status-pill pill-amber">> 30 días sin gestión</span>
                </div>
                <div class="perf-kpi-val">${k.abandoned_accounts_30d ?? 0}</div>
                <div class="perf-kpi-sub" style="cursor:pointer; text-decoration:underline;">Ver cuentas en riesgo ➔</div>
            </div>
        </div>
    `;

    // 2. Leaderboard Asesores (Defensivo contra undefined)
    const advisorRowsHTML = advisors.map((a, i) => {
        const compliance = a.compliance_pct ?? 0;
        const progWidth = Math.min(compliance, 100);
        const actsToday = a.acts_today ?? 0;
        const dailyTarget = a.daily_target ?? 8;
        const actsWeek = a.acts_week ?? 0;
        const actsMonth = a.acts_month ?? 0;
        const totalCust = a.total_assigned_customers ?? 14;
        const abandoned = a.abandoned_30d ?? 0;
        const closedCount = a.closed_count ?? 0;
        const closedVal = a.closed_val ?? 0;
        const closingRatio = a.closing_ratio ?? 0;
        const statusLabel = a.status_label || (actsToday >= dailyTarget ? 'Meta Cumplida' : (actsToday > 0 ? 'En Progreso' : 'Sin Actividad Hoy'));
        const statusClass = a.status_class || (actsToday >= dailyTarget ? 'badge-emerald' : (actsToday > 0 ? 'badge-cyan' : 'badge-rose'));
        const lastAct = a.last_activity || 'Sin registro hoy';

        return `
            <tr>
                <td>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span class="advisor-rank">#${i + 1}</span>
                        <div>
                            <div style="font-weight:600; color:var(--text-primary); font-size:0.88rem;">${a.full_name || a.username || 'Fabián Andrés Alarcón Chávez'}</div>
                            <div style="font-size:0.72rem; color:var(--text-muted);">${formatCommercialRole(a.role)} &middot; Última: ${lastAct}</div>
                        </div>
                    </div>
                </td>
                <td style="min-width:130px;">
                    <div style="display:flex; justify-content:space-between; font-size:0.75rem; margin-bottom:3px;">
                        <span style="font-weight:600;">${actsToday} / ${dailyTarget}</span>
                        <span style="color:var(--text-muted);">${compliance}%</span>
                    </div>
                    <div class="perf-progress-bar">
                        <div class="perf-progress-fill" style="width:${progWidth}%; background:${actsToday >= dailyTarget ? '#10b981' : (actsToday > 0 ? '#06b6d4' : '#ef4444')};"></div>
                    </div>
                </td>
                <td style="text-align:center; font-weight:600; font-size:0.85rem;">
                    <div>${actsWeek} <span style="font-size:0.7rem; color:var(--text-muted);">sem</span></div>
                    <div style="font-size:0.74rem; color:var(--text-secondary);">${actsMonth} mes</div>
                </td>
                <td style="text-align:center;">
                    <div style="font-weight:600; font-size:0.85rem;">${totalCust}</div>
                    <div style="font-size:0.72rem; color:${abandoned > 0 ? '#ef4444' : 'var(--text-muted)'};">
                        ${abandoned > 0 ? `<span style="cursor:pointer; text-decoration:underline;" onclick="openAbandonedAccountsModal(30)" title="Ver cartera desatendida"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px; margin-right:3px;"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>${abandoned} frías</span>` : 'Al día'}
                    </div>
                </td>
                <td style="text-align:right;">
                    <div style="font-weight:600; color:#10b981; font-size:0.85rem;">${fmtMoney(closedVal)}</div>
                    <div style="font-size:0.72rem; color:var(--text-muted);">${closedCount} cierres (${closingRatio}%)</div>
                </td>
                <td style="text-align:center;">
                    <span class="badge ${statusClass}" style="font-size:0.7rem; padding:3px 8px;">${statusLabel}</span>
                </td>
            </tr>
        `;
    }).join('');

    container.innerHTML = `
        <div class="perf-section-wrap">
            <div class="perf-header-row">
                <div>
                    <h3 class="perf-title">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                        Cockpit de Desempeño y Supervisión Comercial
                    </h3>
                    <p class="perf-subtitle">Supervisión en tiempo real del ritmo de trabajo, metas diarias y estado de cartera del equipo.</p>
                </div>
                <button class="btn-secondary btn-sm" onclick="loadCommercialPerformance()" title="Actualizar métricas de rendimiento" style="display:inline-flex; align-items:center; gap:6px;">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
                    <span>Refrescar Métricas</span>
                </button>
            </div>
            ${pulseCardsHTML}
            <div class="perf-grid-details">
                <div class="card-panel" style="flex:3;">
                    <h4 style="margin:0 0 14px 0; font-size:0.88rem; display:flex; align-items:center; gap:8px;">
                        <span style="display:inline-flex; align-items:center; gap:6px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>Cumplimiento y Productividad por Asesor</span>
                        <span class="kpi-info-icon" onclick="event.stopPropagation()" data-tip="Productividad por Asesor&#10;• Qué significa: Supervisión individual del ritmo diario de ventas, cobertura de cuentas y efectividad de cierre de cada asesor comercial.&#10;• Cómo se calcula: Agregación en tiempo real de gestiones diarias vs meta (8), cuentas asignadas activas vs frías (>30 días), y valor acumulado en órdenes ganadas en el mes.&#10;• Niveles adecuados: 🟢 Óptimo: 100% meta diaria y 0 cuentas frías | 🟡 Alerta: Rendimiento irregular o >10% cartera desatendida | 🔴 Crítico: Sin actividad en la jornada laboral.">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                        </span>
                    </h4>
                    <div style="overflow-x:auto;">
                        <table class="advisor-table" style="width:100%;">
                            <thead>
                                <tr>
                                    <th>Asesor / Rol</th>
                                    <th>
                                        Meta Hoy (8)
                                        <span class="kpi-info-icon" onclick="event.stopPropagation()" data-tip="Meta Diaria de Gestiones (8)&#10;• Qué significa: Cuota diaria estándar de interacciones comerciales activas (llamadas, cotizaciones, visitas, seguimientos) por asesor.&#10;• Cómo se calcula: Gestiones registradas hoy en la bitácora / 8 gestiones objetivo. El porcentaje y la barra reflejan el avance del día.&#10;• Niveles adecuados: 🟢 Óptimo: ≥ 100% (8 o más gestiones) | 🟡 Alerta: 50% - 99% (4 a 7 gestiones) | 🔴 Crítico: < 50% (< 4 gestiones al cierre).">
                                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                                        </span>
                                    </th>
                                    <th style="text-align:center;">
                                        Actividad Reciente
                                        <span class="kpi-info-icon" onclick="event.stopPropagation()" data-tip="Actividad Reciente (Semana / Mes)&#10;• Qué significa: Consistencia y volumen de gestiones comerciales acumuladas por el asesor en la última semana y el mes actual.&#10;• Cómo se calcula: Conteo de logs comerciales registrados en los últimos 7 días ('sem') y en el mes calendario en curso ('mes').&#10;• Niveles adecuados: 🟢 Óptimo: ≥ 40 gestiones/semana (ritmo constante) | 🟡 Alerta: 20 a 39 gestiones/semana | 🔴 Crítico: < 20 gestiones/semana o estancamiento.">
                                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                                        </span>
                                    </th>
                                    <th style="text-align:center;">
                                        Cartera
                                        <span class="kpi-info-icon" onclick="event.stopPropagation()" data-tip="Cartera Asignada y Cuentas Frías&#10;• Qué significa: Total de clientes y prospectos bajo responsabilidad directa del asesor, discriminando cuántas cuentas están 'frías' o desatendidas (> 30 días sin ningún contacto ni oferta).&#10;• Cómo se calcula: Número total de registros en customers asignados al asesor. El indicador 'frías' cuenta aquellas sin ninguna interacción en commercial_logs en los últimos 30 días.&#10;• Niveles adecuados: 🟢 Óptimo: 0 cuentas frías (100% de la cartera atendida) | 🟡 Alerta: 1 a 10 cuentas frías (< 15% de su cartera) | 🔴 Crítico: > 10 cuentas frías o más del 25% de la cartera en riesgo de abandono.">
                                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                                        </span>
                                    </th>
                                    <th style="text-align:right;">
                                        Cierres Mes
                                        <span class="kpi-info-icon" onclick="event.stopPropagation()" data-tip="Cierres y Efectividad del Mes&#10;• Qué significa: Monto económico facturado o ganado y tasa de efectividad de conversión de ofertas presentadas en el mes en curso.&#10;• Cómo se calcula: Suma del valor monetario ($) de cotizaciones en estado 'GANADA'/'CERRADA' y porcentaje de conversión: (solicitudes ganadas / solicitudes cotizadas) * 100.&#10;• Niveles adecuados: 🟢 Óptimo: Cumplimiento de cuota en $ y tasa de cierre ≥ 25% | 🟡 Alerta: Conversión entre 15% y 24% | 🔴 Crítico: Conversión < 15% o $0 en cierres acumulados.">
                                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                                        </span>
                                    </th>
                                    <th style="text-align:center;">
                                        Estado
                                        <span class="kpi-info-icon" onclick="event.stopPropagation()" data-tip="Estado Operativo de la Jornada&#10;• Qué significa: Diagnóstico en tiempo real del nivel de actividad del asesor durante el día laboral de hoy.&#10;• Cómo se calcula: 'Meta Cumplida' (≥ 8 gestiones), 'Activo Hoy' (1 a 7 gestiones registradas), 'Sin Actividad Hoy' (0 gestiones registradas).&#10;• Niveles adecuados: 🟢 Óptimo: Meta Cumplida / Activo en horario laboral | 🟡 Alerta: Sin actividad registrada al mediodía | 🔴 Crítico: Sin actividad al término de la jornada.">
                                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                                        </span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>${advisorRowsHTML}</tbody>
                        </table>
                    </div>
                </div>
                <div class="card-panel" style="flex:2; min-width:280px;">
                    <h4 style="margin:0 0 14px 0; font-size:0.88rem; display:flex; align-items:center; gap:8px;">
                        <span style="display:inline-flex; align-items:center; gap:6px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>Curva de Ritmo Comercial (14 Días)</span>
                        <span class="kpi-info-icon" onclick="event.stopPropagation()" data-tip="Curva de Ritmo Comercial (14 Días)&#10;• Qué significa: Histograma de frecuencia que ilustra el pulso, la cadencia y la disciplina operativa diaria de todo el equipo comercial en las últimas 2 semanas.&#10;• Cómo se calcula: Conteo diario de interacciones y gestiones comerciales registradas en la bitácora para cada uno de los últimos 14 días.&#10;• Niveles adecuados: 🟢 Óptimo: Barras homogéneas y consistentes de lunes a viernes | 🟡 Alerta: Caídas pronunciadas en días laborales (< 10 gestiones/día equipo) | 🔴 Crítico: Días laborables con 0 actividad registrada.">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                        </span>
                    </h4>
                    <div style="height:210px; position:relative;">
                        <canvas id="perfTrendCanvas"></canvas>
                    </div>
                </div>
            </div>
        </div>
    `;

    renderTrendChart(trend);
}

function renderTrendChart(trendData) {
    if (perfTrendChartInstance) {
        perfTrendChartInstance.destroy();
        perfTrendChartInstance = null;
    }
    const canvas = document.getElementById('perfTrendCanvas');
    if (!canvas || !trendData || trendData.length === 0) return;

    perfTrendChartInstance = new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
            labels: trendData.map(d => d.label),
            datasets: [{
                label: 'Gestiones Diarias',
                data: trendData.map(d => d.count),
                backgroundColor: 'rgba(6, 182, 212, 0.45)',
                borderColor: '#06b6d4',
                borderWidth: 1.5,
                borderRadius: 4,
                hoverBackgroundColor: 'rgba(6, 182, 212, 0.75)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: (ctx) => ` ${ctx.parsed.y} interacciones registradas` } }
            },
            scales: {
                x: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#9ca3af' } },
                y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { font: { size: 10 }, color: '#9ca3af', precision: 0 } }
            }
        }
    });
}

async function openAbandonedAccountsModal(minDays = 30) {
    try {
        const res = await apiFetch(`${API_BASE}/v1/commercial-performance/abandoned-accounts?min_days=${minDays}&limit=25`);
        if (!res.ok) return showToast('No se pudieron consultar las cuentas desatendidas', 'error');
        const data = await res.json();
        const accounts = data.accounts || [];
        let rowsHtml = accounts.length > 0 ? accounts.map(a => `
            <tr>
                <td style="font-weight:600; font-size:0.82rem;">${a.company_name}</td>
                <td style="font-size:0.75rem; color:var(--text-muted);">${a.nit}</td>
                <td style="font-size:0.8rem;">${a.advisor_name}</td>
                <td style="color:#ef4444; font-weight:700; font-size:0.82rem; text-align:center;">${a.days_inactive} días</td>
                <td style="text-align:center; font-size:0.75rem;">${a.last_interaction}</td>
            </tr>
        `).join('') : `<tr><td colspan="5" style="text-align:center; padding:16px; color:var(--text-muted);">¡Excelente! No hay cuentas abandonadas en este umbral.</td></tr>`;

        let modalEl = document.getElementById('abandoned-accounts-modal');
        if (!modalEl) {
            modalEl = document.createElement('div');
            modalEl.id = 'abandoned-accounts-modal';
            modalEl.className = 'modal-overlay';
            document.body.appendChild(modalEl);
        }

        modalEl.innerHTML = `
            <div class="modal-card modal-card-lg" style="max-width:780px;">
                <div class="modal-header">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <span style="display:inline-flex; align-items:center; justify-content:center; width:32px; height:32px; border-radius:8px; background:rgba(245,158,11,0.12); color:#d97706;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="5" x="2" y="3" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/></svg></span>
                        <div>
                            <h3 style="margin:0; font-size:1.1rem;">Cartera Desatendida (&gt; ${minDays} días sin gestión)</h3>
                            <p style="margin:2px 0 0 0; font-size:0.75rem; color:var(--text-muted);">Cuentas asignadas que requieren reactivación inmediata por parte del equipo comercial.</p>
                        </div>
                    </div>
                    <button class="modal-close" onclick="document.getElementById('abandoned-accounts-modal').classList.remove('active')">&times;</button>
                </div>
                <div class="modal-body" style="padding:16px; max-height:65vh; overflow-y:auto;">
                    <table class="advisor-table" style="width:100%;">
                        <thead>
                            <tr>
                                <th>Empresa</th>
                                <th>NIT</th>
                                <th>Asesor Responsable</th>
                                <th style="text-align:center;">Inactividad</th>
                                <th style="text-align:center;">Última Gestión</th>
                            </tr>
                        </thead>
                        <tbody>${rowsHtml}</tbody>
                    </table>
                </div>
                <div style="padding:12px 16px; display:flex; justify-content:flex-end; border-top:1px solid var(--border-color);">
                    <button class="btn-secondary" onclick="document.getElementById('abandoned-accounts-modal').classList.remove('active')">Cerrar</button>
                </div>
            </div>
        `;
        modalEl.classList.add('active');
    } catch(err) {
        console.error('Error al abrir modal de cuentas desatendidas:', err);
    }
}

function openUnattendedRequests() {
    if (typeof switchTab === 'function') {
        switchTab('requests');
    }
    // Activar filtro de solicitudes con demora / estancadas
    setTimeout(() => {
        const statusSelect = document.getElementById('req-filter-status');
        if (statusSelect) {
            statusSelect.value = '';
        }
        const searchInput = document.getElementById('req-filter-search');
        if (searchInput) searchInput.value = '';
        if (typeof switchRequestStalledFilter === 'function' && typeof _isStalledMode !== 'undefined' && !_isStalledMode) {
            switchRequestStalledFilter();
        } else if (typeof loadRequests === 'function') {
            loadRequests();
        }
        if (typeof showToast === 'function') {
            showToast('Mostrando solicitudes con demora de atención comercial (>24h / estancadas)', 'info');
        }
    }, 50);
}
window.openUnattendedRequests = openUnattendedRequests;

function scrollToAdvisorLeaderboard() {
    const el = document.getElementById('advisor-leaderboard-container') || document.querySelector('.advisor-table') || document.querySelector('.perf-grid-details');
    if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}
window.scrollToAdvisorLeaderboard = scrollToAdvisorLeaderboard;

