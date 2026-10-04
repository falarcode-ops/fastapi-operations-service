/**
 * social-video-prompts.js (v12.54.0)
 * -----------------------------------
 * Fullscreen Studio Workspace: Generador Inteligente de Prompts de Video & Multimodal IA.
 * Optimizado para Google Flow (Veo 3), Runway Gen-3, Luma Dream Machine y Kling AI.
 * Arquitectura modular conectada con prompt-engine-core.js y prompt-studio-guide.js.
 */

const VIDEO_PROMPT_STYLES = {
    BROLL_OPERATIVO: {
        id: 'BROLL_OPERATIVO',
        name: 'B-Roll en Faena Real',
        desc: 'Metraje cinematográfico 4K de trabajadores reales ejecutando labores seguras con EPP normativo.',
        badge: 'Operativo & Faena'
    },
    DEMOSTRACION_PRODUCTO: {
        id: 'DEMOSTRACION_PRODUCTO',
        name: 'Demostración de Producto en Acción',
        desc: 'Plano detalle dinámico probando resistencia, ergonomía y ajuste del equipo de protección en uso.',
        badge: 'Catálogo & Conversión'
    },
    CINEMATICA_EMOCIONAL: {
        id: 'CINEMATICA_EMOCIONAL',
        name: 'Cinematográfica & Cultura Preventiva',
        desc: 'Narrativa visual inspiradora: retorno seguro a casa con la familia y liderazgo en prevención.',
        badge: 'Cultura & Marca'
    },
    MOTION_CORPORATIVO: {
        id: 'MOTION_CORPORATIVO',
        name: 'Motion Design & 3D Tech',
        desc: 'Animación 3D moderna con partículas, iluminación volumétrica y visualización de conceptos SG-SST.',
        badge: 'Innovación & Tech'
    }
};

const FLOW_ENVIRONMENTS = {
    FAENA_PESADA: { label: 'Planta Industrial', desc: 'Manufactura y maquinaria pesada' },
    TRABAJO_ALTURAS: { label: 'Alturas & Andamios', desc: 'Líneas de vida, torres y arneses' },
    LOGISTICA: { label: 'Bodega Logística', desc: 'Montacargas y estanterías seguras' },
    ESTUDIO_NEUTRO: { label: 'Estudio Neutro', desc: 'Fondo minimalista de catálogo' }
};

const FLOW_LIGHTINGS = {
    NATURAL_DIURNO: { label: 'Luz Diurna', desc: 'Iluminación solar realista en obra' },
    GOLDEN_HOUR: { label: 'Golden Hour', desc: 'Atardecer cálido y emotivo' },
    REFLECTORES: { label: 'Reflectores', desc: 'Luz industrial de seguridad' },
    ESTUDIO_3P: { label: 'Comercial 3P', desc: 'Estudio suave de 3 puntos' }
};

const VIDEO_PROMPT_RATIOS = {
    '9:16': { label: '9:16 Vertical', desc: 'Reels / Stories (1080x1920)', tag: 'Vertical 9:16' },
    '1:1': { label: '1:1 Cuadrado', desc: 'Feed Universal (1080x1080)', tag: 'Square 1:1' },
    '16:9': { label: '16:9 Horizontal', desc: 'LinkedIn / Web (1920x1080)', tag: 'Widescreen 16:9' }
};

const VIDEO_DURATIONS = {
    '6s': { label: '6 seg', desc: 'Hook de impacto' },
    '8s': { label: '8 seg', desc: 'Loop ideal para feed' },
    '15s': { label: '15 seg', desc: 'Mini-secuencia narrativa' }
};

const VIDEO_CAMERAS = {
    SLOW_DOLLY: { label: 'Dolly In Suave', desc: 'Acercamiento lento y elegante' },
    DYNAMIC_TRACKING: { label: 'Tracking Shot', desc: 'Seguimiento dinámico de acción' },
    AERIAL_DRONE: { label: 'Drone Panorámico', desc: 'Vista aérea en faena exterior' },
    STATIC_MACRO: { label: 'Macro Fijo', desc: 'Enfoque cerrado en materiales y costuras' }
};

// Estados reactivos
let activeVideoStyle = 'BROLL_OPERATIVO';
let activeVideoRatio = '9:16';
let activeVideoDuration = '8s';
let activeVideoCamera = 'SLOW_DOLLY';
let activeEnvironment = 'FAENA_PESADA';
let activeLighting = 'NATURAL_DIURNO';
let activeVideoTool = 'GOOGLE_FLOW_VEO'; // 'GOOGLE_FLOW_VEO' | 'RUNWAY_GEN3' | 'LUMA_DREAM' | 'KLING_AI'
let activeReferenceImage = null;
let activeReferenceRole = 'PRODUCT_IDENTITY'; // 'PRODUCT_IDENTITY' | 'ANIMATE_STILL'
let activeFlowMode = 'TEXT_TO_VIDEO'; // 'TEXT_TO_VIDEO' | 'IMAGE_TO_VIDEO'

function selectVideoStyle(styleId) {
    if (VIDEO_PROMPT_STYLES[styleId]) {
        activeVideoStyle = styleId;
        renderVideoStudioContent();
    }
}

function selectVideoRatio(ratioId) {
    if (VIDEO_PROMPT_RATIOS[ratioId]) {
        activeVideoRatio = ratioId;
        renderVideoStudioContent();
    }
}

function selectVideoDuration(durId) {
    if (VIDEO_DURATIONS[durId]) {
        activeVideoDuration = durId;
        renderVideoStudioContent();
    }
}

function selectVideoCamera(camId) {
    if (VIDEO_CAMERAS[camId]) {
        activeVideoCamera = camId;
        renderVideoStudioContent();
    }
}

function selectEnvironment(envId) {
    if (FLOW_ENVIRONMENTS[envId]) {
        activeEnvironment = envId;
        renderVideoStudioContent();
    }
}

function selectLighting(lightId) {
    if (FLOW_LIGHTINGS[lightId]) {
        activeLighting = lightId;
        renderVideoStudioContent();
    }
}

function selectVideoTool(toolKey) {
    const tools = window.PromptEngineCore?.AI_VIDEO_TOOLS || {};
    if (tools[toolKey]) {
        activeVideoTool = toolKey;
        window.activeVideoTool = toolKey;
        renderVideoStudioContent();
        if (typeof updateModeSwitcherUI === 'function') updateModeSwitcherUI();
    }
}

function setReferenceImage(imageUrl, role = 'PRODUCT_IDENTITY') {
    activeReferenceImage = imageUrl;
    activeReferenceRole = role;
    if (role === 'ANIMATE_STILL') {
        activeFlowMode = 'IMAGE_TO_VIDEO';
    }
}

function selectReferenceRole(role) {
    activeReferenceRole = role;
    if (role === 'ANIMATE_STILL') {
        activeFlowMode = 'IMAGE_TO_VIDEO';
    } else {
        activeFlowMode = 'TEXT_TO_VIDEO';
    }
    renderVideoStudioContent();
}

function removeReferenceImage() {
    activeReferenceImage = null;
    activeFlowMode = 'TEXT_TO_VIDEO';
    renderVideoStudioContent();
}

/**
 * Construye el prompt técnico para la herramienta de video seleccionada.
 */
function buildVideoPromptText(ctx) {
    const context = ctx || (window.currentPromptContext || {});
    const core = window.PromptEngineCore;

    if (core && typeof core.formatVideoPrompt === 'function') {
        const flowPrompt = core.formatVideoPrompt({
            topic: context.title,
            block: context.block,
            baseText: context.baseText,
            style: activeVideoStyle,
            ratio: activeVideoRatio,
            duration: activeVideoDuration,
            camera: activeVideoCamera,
            env: activeEnvironment,
            light: activeLighting,
            flowMode: activeFlowMode,
            hasRef: !!activeReferenceImage,
            refRole: activeReferenceRole,
            tool: activeVideoTool
        });

        const durInfo = VIDEO_DURATIONS[activeVideoDuration] || VIDEO_DURATIONS['8s'];
        const ratioInfo = VIDEO_PROMPT_RATIOS[activeVideoRatio] || VIDEO_PROMPT_RATIOS['9:16'];
        const tools = core.AI_VIDEO_TOOLS || {};
        const toolMeta = tools[activeVideoTool] || tools.GOOGLE_FLOW_VEO || { label: 'Video IA' };

        const isPersonal = (ctx.channelType || '').toUpperCase() === 'PERSONAL';
        const persona = core.EditorialPersonaProvider?.getPersona(ctx.channelType, ctx.authorName);
        const directorLine = persona?.directorClause || (isPersonal
            ? `Actúa como Director Audiovisual para el perfil profesional en LinkedIn de ${persona?.displayName || 'Fabián Alarcón'} (Ingeniero Industrial, CEO y Cofundador de ÁLACOR, con experiencia en SG-SST).`
            : `Actúa como Director Audiovisual para ÁLACOR S.A.S.`);

        if (activeFlowMode === 'IMAGE_TO_VIDEO' && activeReferenceImage) {
            return `${directorLine}
Genera un video animando la imagen de referencia (Image-to-Video) en ${toolMeta.label}.

INSTRUCCIONES:
1. Entra a ${toolMeta.label} y selecciona el modo Image-to-Video.
2. Carga la imagen de referencia actual del post.
3. Pega el siguiente prompt en inglés para controlar cámara y física de movimiento:

PROMPT PARA ${toolMeta.label.toUpperCase()} (IMAGE-TO-VIDEO):
${flowPrompt}`;
        }

        if (activeReferenceImage && activeReferenceRole === 'PRODUCT_IDENTITY') {
            return `${directorLine}
Genera una pieza guiada por imagen de referencia (Subject Guidance) en ${toolMeta.label}.

INSTRUCCIONES:
1. Arrastra la imagen de referencia a la casilla de acondicionamiento de ${toolMeta.label}.
2. Selecciona "Subject Reference" (Fidelidad de Producto).
3. Pega el siguiente prompt en inglés:

PROMPT PARA ${toolMeta.label.toUpperCase()} (SUBJECT GUIDANCE):
${flowPrompt}`;
        }

        const postTitle = ctx.title || 'Publicación en edición';
        const postSummary = (ctx.baseText || '').replace(/\s+/g, ' ').trim().slice(0, 180);
        const contextHeader = `\n\nCONTEXTO DE LA PUBLICACIÓN:\n- Título: "${postTitle}"\n- Bloque Temático: ${ctx.block || 'General'}${postSummary ? `\n- Mensaje Clave del Copy: "${postSummary}..."` : ''}`;

        const mainIntro = persona?.videoRoleIntro
            ? persona.videoRoleIntro(toolMeta.label)
            : `${directorLine} Genera un video cinematográfico usando ${toolMeta.label}.`;

        return `${mainIntro}${contextHeader}

INSTRUCCIONES:
1. Pega el prompt en inglés en la caja de texto de ${toolMeta.label}.
2. Selecciona la duración (${durInfo.label}) y formato (${ratioInfo.label}).
3. Verifica que no existan distorsiones en el movimiento corporal antes de exportar.

PROMPT EN INGLÉS PARA ${toolMeta.label.toUpperCase()}:
${flowPrompt}`;
    }

    return `Cinematic 4K video clip for industrial safety. Workers wearing authentic certified PPE in an industrial facility. No on-screen text, perfectly formed hands.`;
}

function renderVideoStudioContent(container, ctx, recommendation) {
    const target = container || document.getElementById('social-image-prompt-body');
    if (!target) return;
    const context = ctx || (window.currentPromptContext || {});
    const topicTitle = context?.title || 'Publicación sin título';
    const topicBlock = context?.block || 'Seguridad Industrial';
    const promptText = buildVideoPromptText(context);
    const tools = window.PromptEngineCore?.AI_VIDEO_TOOLS || {};
    const activeTool = tools[activeVideoTool] || tools.GOOGLE_FLOW_VEO || { label: 'Video IA', url: 'https://labs.google/flow' };

    if (!activeReferenceImage && Array.isArray(window.currentPostMediaList) && window.currentPostMediaList.length > 0) {
        activeReferenceImage = window.currentPostMediaList[0];
    }

    target.innerHTML = `
        <div class="prompt-modal-header-info">
            <div>
                <div style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.05em; font-weight:600;">Tema Activo en Edición</div>
                <div style="font-size:1.05rem; font-weight:700; color:var(--text-primary); margin-top:2px;">${escapeHtml(topicTitle)}</div>
                <div style="font-size:0.78rem; color:var(--text-secondary); margin-top:2px;">Bloque Temático: <strong>${escapeHtml(topicBlock)}</strong> · Suite: <span style="color:#f59e0b; font-weight:700;">${activeTool.label}</span></div>
            </div>
            ${recommendation ? `
                <div class="prompt-suggestion-badge prompt-suggestion-video">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0; color:#f59e0b;"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
                    <div>
                        <strong style="display:block; font-size:0.72rem; text-transform:uppercase; letter-spacing:0.04em; color:#f59e0b;">Recomendación Estratégica IA</strong>
                        <span>${escapeHtml(recommendation)}</span>
                    </div>
                </div>
            ` : ''}
        </div>

        <!-- WORKSPACE 2 COLUMNAS STUDIO VIDEO -->
        <div class="prompt-studio-grid">
            <!-- Columna Izquierda: Parámetros de Dirección de Video -->
            <div class="prompt-col-controls">

                <!-- TARJETA DE IMAGEN DE REFERENCIA -->
                <div class="prompt-ref-card ${activeReferenceImage ? 'has-ref' : ''}">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                        <span style="font-size:0.8rem; font-weight:700; color:${activeReferenceImage ? 'var(--accent-cyan)' : 'var(--text-muted)'}; display:flex; align-items:center; gap:6px;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg> Acondicionamiento con Imagen de Referencia
                        </span>
                        ${activeReferenceImage ? `
                            <button type="button" class="btn-xs" onclick="removeReferenceImage()" style="background:none; border:none; color:#ef4444; cursor:pointer; font-size:0.72rem; text-decoration:underline;">Quitar</button>
                        ` : ''}
                    </div>
                    ${activeReferenceImage ? `
                        <div style="display:flex; gap:10px; align-items:center; background:rgba(255,255,255,0.02); padding:6px; border-radius:6px; border:1px solid rgba(6,182,212,0.2);">
                            <img src="${activeReferenceImage}" alt="Ref" style="width:48px; height:48px; object-fit:cover; border-radius:4px; border:1px solid var(--border-color);" onerror="this.style.display='none'">
                            <div style="flex:1;">
                                <div style="font-size:0.72rem; color:var(--text-muted); margin-bottom:4px;">Rol de la Referencia en Video:</div>
                                <div style="display:flex; gap:6px; flex-wrap:wrap;">
                                    <button type="button" class="prompt-ref-role-btn ${activeReferenceRole === 'PRODUCT_IDENTITY' ? 'active' : ''}" onclick="selectReferenceRole('PRODUCT_IDENTITY')" style="display:inline-flex; align-items:center; gap:4px;">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg> Fidelidad Producto 1:1
                                    </button>
                                    <button type="button" class="prompt-ref-role-btn ${activeReferenceRole === 'ANIMATE_STILL' ? 'active' : ''}" onclick="selectReferenceRole('ANIMATE_STILL')" style="display:inline-flex; align-items:center; gap:4px;">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg> Animar en Video (Image-to-Video)
                                    </button>
                                </div>
                            </div>
                        </div>
                    ` : `
                        <div style="font-size:0.74rem; color:var(--text-muted); font-style:italic;">
                            No hay imagen de referencia adjunta. Puedes adjuntar fotos en el editor para animar el producto.
                        </div>
                    `}
                </div>

                <div>
                    <label style="font-size:0.85rem; font-weight:700; color:var(--text-primary); margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
                        <span>1. Herramienta de Video que vas a usar:</span>
                        <span style="font-size:0.72rem; color:#f59e0b; font-weight:600;">Sintaxis calibrada</span>
                    </label>
                    <div class="prompt-ratios-bar">
                        ${Object.entries(tools).map(([key, t]) => `
                            <button type="button" class="prompt-ratio-btn ${activeVideoTool === key ? 'active' : ''}" onclick="selectVideoTool('${key}')">
                                <strong>${t.label}</strong>
                                <span style="font-size:0.70rem; opacity:0.85;">${t.desc}</span>
                            </button>
                        `).join('')}
                    </div>
                </div>

                <div>
                    <label style="font-size:0.85rem; font-weight:700; color:var(--text-primary); margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
                        <span>2. Estilo y Enfoque Cinematográfico:</span>
                        <span style="font-size:0.72rem; color:var(--text-muted); font-weight:normal;">4 estilos visuales</span>
                    </label>
                    <div class="prompt-styles-grid">
                        ${Object.values(VIDEO_PROMPT_STYLES).map(st => `
                            <div class="prompt-style-card prompt-style-card-video ${activeVideoStyle === st.id ? 'active' : ''}" onclick="selectVideoStyle('${st.id}')">
                                <div class="prompt-style-title">${st.name}</div>
                                <div class="prompt-style-desc">${st.desc}</div>
                                <span class="prompt-style-tag prompt-style-tag-video">${st.badge}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Entorno e Iluminación -->
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                    <div>
                        <label style="font-size:0.82rem; font-weight:700; color:var(--text-primary); margin-bottom:6px; display:block;">
                            3. Entorno Operativo:
                        </label>
                        <select onchange="selectEnvironment(this.value)" style="width:100%; font-size:0.78rem; padding:6px 8px; border-radius:6px; background:var(--bg-secondary); color:var(--text-primary); border:1px solid var(--border-color);">
                            ${Object.entries(FLOW_ENVIRONMENTS).map(([k, v]) => `
                                <option value="${k}" ${activeEnvironment === k ? 'selected' : ''}>${v.label}</option>
                            `).join('')}
                        </select>
                    </div>
                    <div>
                        <label style="font-size:0.82rem; font-weight:700; color:var(--text-primary); margin-bottom:6px; display:block;">
                            4. Iluminación & Atmósfera:
                        </label>
                        <select onchange="selectLighting(this.value)" style="width:100%; font-size:0.78rem; padding:6px 8px; border-radius:6px; background:var(--bg-secondary); color:var(--text-primary); border:1px solid var(--border-color);">
                            ${Object.entries(FLOW_LIGHTINGS).map(([k, v]) => `
                                <option value="${k}" ${activeLighting === k ? 'selected' : ''}>${v.label}</option>
                            `).join('')}
                        </select>
                    </div>
                </div>

                <!-- Ratios y Duración -->
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                    <div>
                        <label style="font-size:0.82rem; font-weight:700; color:var(--text-primary); margin-bottom:6px; display:block;">
                            5. Formato de Video:
                        </label>
                        <div class="prompt-video-compact-bar">
                            ${Object.entries(VIDEO_PROMPT_RATIOS).map(([key, r]) => `
                                <button type="button" class="prompt-ratio-btn ${activeVideoRatio === key ? 'active' : ''}" onclick="selectVideoRatio('${key}')">
                                    <strong>${r.label}</strong>
                                    <span style="font-size:0.70rem; opacity:0.85;">${r.desc}</span>
                                </button>
                            `).join('')}
                        </div>
                    </div>
                    <div>
                        <label style="font-size:0.82rem; font-weight:700; color:var(--text-primary); margin-bottom:6px; display:block;">
                            6. Duración del Clip:
                        </label>
                        <div class="prompt-video-compact-bar">
                            ${Object.entries(VIDEO_DURATIONS).map(([key, d]) => `
                                <button type="button" class="prompt-ratio-btn ${activeVideoDuration === key ? 'active' : ''}" onclick="selectVideoDuration('${key}')">
                                    <strong>${d.label}</strong>
                                    <span style="font-size:0.70rem; opacity:0.85;">${d.desc}</span>
                                </button>
                            `).join('')}
                        </div>
                    </div>
                </div>

                <div>
                    <label style="font-size:0.82rem; font-weight:700; color:var(--text-primary); margin-bottom:6px; display:block;">
                        7. Movimiento de Cámara:
                    </label>
                    <div class="prompt-cameras-grid">
                        ${Object.entries(VIDEO_CAMERAS).map(([key, c]) => `
                            <button type="button" class="prompt-camera-btn ${activeVideoCamera === key ? 'active' : ''}" onclick="selectVideoCamera('${key}')">
                                <strong>${c.label}</strong>
                                <span style="font-size:0.70rem; opacity:0.8;">${c.desc}</span>
                            </button>
                        `).join('')}
                    </div>
                </div>
            </div>

            <!-- Columna Derecha: Estudio del Prompt Video -->
            <div class="prompt-col-editor">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; flex-wrap:wrap; gap:6px;">
                    <label style="font-size:0.85rem; font-weight:700; color:var(--text-primary);">
                        8. Prompt Listo para ${activeTool.label}:
                    </label>
                    <a href="${activeTool.url}" target="_blank" rel="noopener noreferrer" class="btn-flow-direct" title="Abrir ${activeTool.label} en una nueva pestaña" style="display:inline-flex; align-items:center; gap:5px;">
                        <span>Abrir ${activeTool.label.split(' ')[0]}</span>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                    </a>
                </div>
                <textarea id="generated-image-prompt-textarea" class="prompt-output-textarea prompt-output-textarea-video" readonly spellcheck="false">${escapeHtml(promptText)}</textarea>
                <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.74rem; color:var(--text-muted); padding:0 2px;">
                    <span>Calibrado para: <strong>${activeTool.label}</strong></span>
                    <span>1 clic para copiar y pegar</span>
                </div>
            </div>
        </div>
    `;
}

// Exposición global
window.VIDEO_PROMPT_STYLES = VIDEO_PROMPT_STYLES;
window.FLOW_ENVIRONMENTS = FLOW_ENVIRONMENTS;
window.FLOW_LIGHTINGS = FLOW_LIGHTINGS;
window.VIDEO_PROMPT_RATIOS = VIDEO_PROMPT_RATIOS;
window.VIDEO_DURATIONS = VIDEO_DURATIONS;
window.VIDEO_CAMERAS = VIDEO_CAMERAS;
window.activeVideoTool = activeVideoTool;
window.selectVideoStyle = selectVideoStyle;
window.selectVideoRatio = selectVideoRatio;
window.selectVideoDuration = selectVideoDuration;
window.selectVideoCamera = selectVideoCamera;
window.selectEnvironment = selectEnvironment;
window.selectLighting = selectLighting;
window.selectVideoTool = selectVideoTool;
window.setReferenceImage = setReferenceImage;
window.selectReferenceRole = selectReferenceRole;
window.removeReferenceImage = removeReferenceImage;
window.buildVideoPromptText = buildVideoPromptText;
window.renderVideoStudioContent = renderVideoStudioContent;
