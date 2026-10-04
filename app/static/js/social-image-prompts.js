/**
 * social-image-prompts.js (v12.54.0)
 * -----------------------------------
 * Fullscreen Studio Workspace: Generador Inteligente de Prompts de Imágenes IA.
 * Optimizado para ChatGPT (DALL-E 3), Google Flow (Imagen 3), Midjourney v6.1 y Flux 1.1.
 * Arquitectura modular conectada con prompt-engine-core.js y prompt-studio-guide.js.
 */

let activePromptStyle = 'FOTOGRAFIA_REALISTA';
let activePromptRatio = '1:1';
let activeImageEngine = 'CHATGPT_DALLE'; // 'CHATGPT_DALLE' | 'GOOGLE_IMAGEN' | 'MIDJOURNEY' | 'FLUX'
let currentPromptContext = {};
let activeVisualMode = 'IMAGE'; // 'IMAGE' | 'VIDEO'
let activeRecommendation = null;

const PROMPT_STYLES = {
    FOTOGRAFIA_REALISTA: {
        id: 'FOTOGRAFIA_REALISTA',
        name: 'Foto Realista en Faena',
        desc: 'Escena en faena/planta con trabajadores reales y EPP normativo.',
        badge: 'Operativo & Faena'
    },
    PRODUCTO_ESTUDIO: {
        id: 'PRODUCTO_ESTUDIO',
        name: 'Producto en Estudio',
        desc: 'Toma comercial de catálogo con fondo neutro y detalle de materiales.',
        badge: 'Catálogo & Ficha'
    },
    INFOGRAFIA_TECNICA: {
        id: 'INFOGRAFIA_TECNICA',
        name: 'Infografía Técnica',
        desc: 'Diagrama isométrico o vectorial con desglose de normas y pasos.',
        badge: 'Normativa & Legal'
    },
    RENDER_3D: {
        id: 'RENDER_3D',
        name: '3D Conceptual Corporativo',
        desc: 'Render moderno minimalista de alta tecnología para marca.',
        badge: 'Marca & Innovación'
    }
};

const PROMPT_RATIOS = {
    '1:1': { label: '1:1 Cuadrado', desc: 'Feed Universal (1080x1080)', ar: '--ar 1:1' },
    '4:5': { label: '4:5 Vertical', desc: 'Instagram Óptimo (1080x1350)', ar: '--ar 4:5' },
    '16:9': { label: '16:9 Horizontal', desc: 'LinkedIn / Web (1920x1080)', ar: '--ar 16:9' }
};

/**
 * Heurística de detección inteligente para sugerir estilo, formato y recomendar Imagen vs Video.
 * - Por defecto prioriza el formato IMAGEN para el ecosistema B2B (fotografía de producto, faena, infografía).
 * - Solo sugiere VIDEO cuando existe una intención explícita en el copy (video, reel, clip, animación).
 * - Protege los bloques normativos, legales y corporativos forzando infografías estáticas.
 */
function detectOptimalPromptSettings(title, block, baseText, channelType = 'ORGANIZATION') {
    const combined = `${title || ''} ${block || ''} ${baseText || ''}`.toLowerCase();
    const isPersonal = (channelType || '').toUpperCase() === 'PERSONAL';

    const igChecked = document.querySelector('.social-plat-chk[value="instagram"]')?.checked;
    const liChecked = document.querySelector('.social-plat-chk[value="linkedin"]')?.checked;
    const fbChecked = document.querySelector('.social-plat-chk[value="facebook"]')?.checked;

    // Detección estricta de intención de video: solo cuando hay requerimientos explícitos audiovisuales
    const hasExplicitVideoIntent = /\b(video|clip|reels?|tiktok|animaci[oó]n|animar|cinem[aá]tic[oa]?|c[aá]mara lenta|slow motion|timelapse|movimiento din[aá]mico|guion de video|demostraci[oó]n en video)\b/i.test(combined);

    let recommendedFormat = 'IMAGE';
    let commercialReason = '';
    let suggestedStyle = 'FOTOGRAFIA_REALISTA';
    let reason = isPersonal ? 'Composición ejecutiva y profesional moderna.' : 'Escenario operativo y cultura de prevención en faena.';

    // Evaluación semántica por tipo de contenido y bloque temático
    const isLegalNormative = block === 'Marco Legal y Normativo' ||
                             /resoluci[oó]n|circular|decreto|ley|estatuto|tributari|norma|art[ií]culo|sanci[oó]n|auditor[íi]a|multa|0312|1072|mintrabajo|osha|ansi|est[aá]ndar/i.test(combined);

    const isHumanCulture = block === 'Educación y Cultura Preventiva' ||
                           block === 'Engagement Comunitario' ||
                           block === 'Fechas Especiales' ||
                           /cultura|autocuidado|compañer|familia|equipo|trabajador|operari|regreso|retorno|hogar|vida|h[aá]bito|prevenci[oó]n|liderazgo/i.test(combined);

    const isBrandInnovation = block === 'ÁLACOR como Empresa' ||
                              block === 'Tendencias e Industria' ||
                              /innovaci[oó]n|futuro|liderazgo|tecnolog[íi]a|sostenib|calidad|visi[oó]n|inteligencia/i.test(combined);

    const isCatalogProduct = block === 'Conocimiento de Productos' ||
                             /ficha\s+t[eé]cnica|especificaciones|cat[aá]logo|nuevo\s+lanzamiento|material\s+de\s+fabricaci[oó]n|referencia\s+[a-z0-9]/i.test(combined);

    // 1. Prioridad semántica para Estilo Visual y Razón
    if (isLegalNormative) {
        suggestedStyle = 'INFOGRAFIA_TECNICA';
        reason = isPersonal ? 'Estructuración técnica y síntesis esquemática de conceptos clave.' : 'Detectado contenido normativo, legal o regulatorio.';
        commercialReason = isPersonal
            ? 'Formato infográfico conceptual recomendado: Diagramación clara, esquemas y estructuración analítica para LinkedIn.'
            : 'Formato infográfico recomendado: El contenido normativo y legal requiere diagramación clara, esquemas y retención técnica.';
    } else if (isHumanCulture) {
        suggestedStyle = 'FOTOGRAFIA_REALISTA';
        reason = isPersonal ? 'Cultura empresarial, factor humano y liderazgo auténtico.' : 'Cultura de autocuidado, factor humano y trabajadores en faena.';
        commercialReason = isPersonal
            ? 'Fotografía editorial recomendada: El liderazgo auténtico, el factor humano y la cultura de equipo generan alta credibilidad y conexión profesional.'
            : 'Fotografía realista en faena recomendada: El factor humano y la cultura preventiva conectan con trabajadores reales en un entorno operativo.';
    } else if (isBrandInnovation) {
        suggestedStyle = 'RENDER_3D';
        reason = isPersonal ? 'Visión ejecutiva, innovación y tecnología de vanguardia.' : 'Contenido corporativo de marca, tecnología o innovación.';
        commercialReason = isPersonal
            ? 'Render 3D conceptual recomendado: Proyecta visión estratégica, modernidad y vanguardia tecnológica con alto impacto visual.'
            : 'Render 3D corporativo recomendado: La visión de futuro e innovación de marca se proyecta con mayor impacto en un entorno tecnológico tridimensional.';
    } else if (isCatalogProduct) {
        suggestedStyle = 'PRODUCTO_ESTUDIO';
        reason = isPersonal ? 'Presentación de concepto físico o diseño de producto.' : 'Toma comercial de catálogo de producto o equipo de protección.';
        commercialReason = isPersonal
            ? 'Fotografía de estudio recomendada: Un fondo neutro e iluminación softbox maximizan el detalle y diseño de la solución.'
            : 'Fotografía de producto en estudio recomendada: Un fondo neutro y enfoque macro maximizan el detalle técnico del equipo.';
    } else {
        suggestedStyle = 'FOTOGRAFIA_REALISTA';
        reason = isPersonal ? 'Composición editorial ejecutiva y profesional moderna.' : 'Escena operativa realista en planta industrial.';
        commercialReason = isPersonal
            ? 'Fotografía editorial profesional recomendada: Una escena auténtica y moderna potencia la marca personal y el alcance en LinkedIn.'
            : 'Composición fotográfica en faena recomendada: Una escena realista de alta fidelidad optimiza el impacto y alcance en el feed.';
    }

    // 2. Determinación de Formato Audiovisual (Imagen vs Video)
    if (hasExplicitVideoIntent && !isLegalNormative) {
        recommendedFormat = 'VIDEO';
        commercialReason = 'Detección de formato audiovisual: El copy contiene requerimientos explícitos de video, animación o clip dinámico.';
    } else {
        recommendedFormat = 'IMAGE';
    }

    // 3. Proporción de Aspecto según Canales Activos
    let suggestedRatio = '1:1';
    if (igChecked && !liChecked && !fbChecked) {
        suggestedRatio = recommendedFormat === 'VIDEO' ? '9:16' : '4:5';
    } else if (liChecked && !igChecked && !fbChecked) {
        suggestedRatio = '16:9';
    } else if (isPersonal) {
        suggestedRatio = '16:9';
    }

    return { 
        suggestedStyle, 
        suggestedRatio, 
        reason,
        recommendedFormat,
        commercialReason
    };
}

/**
 * Alterna entre el Estudio de Imagen y el Estudio de Video Google Flow
 */
function switchVisualPromptMode(mode) {
    activeVisualMode = mode;
    updateModeSwitcherUI();
    const body = document.getElementById('social-image-prompt-body');
    if (!body) return;

    if (mode === 'VIDEO' && typeof window.renderVideoStudioContent === 'function') {
        window.renderVideoStudioContent(body, currentPromptContext, activeRecommendation?.commercialReason || '');
    } else {
        renderPromptModalContent(activeRecommendation?.commercialReason || activeRecommendation?.reason || '');
    }
}

function updateModeSwitcherUI() {
    const btnImg = document.getElementById('btn-mode-image');
    const btnVid = document.getElementById('btn-mode-video');
    const copyLabel = document.getElementById('btn-copy-prompt-label');

    if (btnImg && btnVid) {
        if (activeVisualMode === 'VIDEO') {
            btnVid.classList.add('active');
            btnImg.classList.remove('active');
            if (copyLabel) {
                const vidTool = window.PromptEngineCore?.AI_VIDEO_TOOLS?.[window.activeVideoTool || 'GOOGLE_FLOW_VEO'];
                copyLabel.textContent = vidTool?.copyLabel || 'Copiar Prompt de Video';
            }
        } else {
            btnImg.classList.add('active');
            btnVid.classList.remove('active');
            if (copyLabel) {
                const imgTool = window.PromptEngineCore?.AI_IMAGE_TOOLS?.[activeImageEngine];
                copyLabel.textContent = imgTool?.copyLabel || 'Copiar Prompt de Imagen';
            }
        }
    }
}

/**
 * Abre el modal del generador de prompts extrayendo el contexto del formulario.
 */
function openImagePromptModal() {
    try {
        const title = document.getElementById('social-form-title')?.value.trim() || '';
        const block = document.getElementById('social-form-block')?.value || 'Conocimiento de Productos';
        const baseText = document.getElementById('social-form-base-content')?.value.trim() || '';
        const sourceEntity = document.getElementById('social-form-source-entity')?.value.trim() || '';
        const sourceRef = document.getElementById('social-form-source-reference')?.value.trim() || '';
        const channelType = document.getElementById('social-form-channel-type')?.value || 'ORGANIZATION';
        const isPersonal = channelType.toUpperCase() === 'PERSONAL';
        const rawAuthor = (window._cachedPersonalPublishEligibility && window._cachedPersonalPublishEligibility.accountName)
            || localStorage.getItem('full_name')
            || (window.currentEditPostDetail && window.currentEditPostDetail.author_username)
            || localStorage.getItem('username')
            || 'Fabián Alarcón';
        const authorName = isPersonal
            ? (/falarcon|fabian|fabián/i.test(rawAuthor) ? 'Fabián Alarcón' : rawAuthor)
            : 'ÁLACOR S.A.S.';

        currentPromptContext = { title, block, baseText, sourceEntity, sourceRef, channelType, authorName };
        window.currentPromptContext = currentPromptContext;

        const persona = window.PromptEngineCore?.EditorialPersonaProvider?.getPersona(channelType, authorName) || {
            badgeLabel: isPersonal ? `Perfil Personal (${authorName})` : 'ÁLACOR Studio'
        };

        const badgeEl = document.getElementById('social-prompt-modal-badge');
        if (badgeEl) {
            badgeEl.innerHTML = isPersonal
                ? `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg> Estudio Visual IA · ${persona.badgeLabel}`
                : `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg> Estudio Visual IA · ÁLACOR Studio`;
        }

        const detected = detectOptimalPromptSettings(title, block, baseText, channelType);
        activeRecommendation = detected;
        activePromptStyle = detected.suggestedStyle;
        activePromptRatio = detected.suggestedRatio;
        activeVisualMode = detected.recommendedFormat;

        updateModeSwitcherUI();
        const body = document.getElementById('social-image-prompt-body');
        if (activeVisualMode === 'VIDEO' && typeof window.renderVideoStudioContent === 'function') {
            window.renderVideoStudioContent(body, currentPromptContext, detected.commercialReason);
        } else {
            renderPromptModalContent(detected.commercialReason || detected.reason);
        }

        const modal = document.getElementById('social-image-prompt-modal');
        if (modal) {
            modal.style.display = 'flex';
            modal.classList.add('active');
        }
    } catch (err) {
        console.error('[social-image-prompts] Error opening modal:', err);
    }
}

function closeImagePromptModal() {
    const modal = document.getElementById('social-image-prompt-modal');
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
    }
}

function selectPromptStyle(styleKey) {
    if (PROMPT_STYLES[styleKey]) {
        activePromptStyle = styleKey;
        updatePromptModalView();
    }
}

function selectPromptRatio(ratioKey) {
    if (PROMPT_RATIOS[ratioKey]) {
        activePromptRatio = ratioKey;
        updatePromptModalView();
    }
}

function selectImageEngine(engineKey) {
    const tools = window.PromptEngineCore?.AI_IMAGE_TOOLS || {};
    if (tools[engineKey]) {
        activeImageEngine = engineKey;
        updatePromptModalView();
        updateModeSwitcherUI();
    }
}

/**
 * Construye el prompt técnico mediante el motor desacoplado prompt-engine-core.js.
 */
function buildImagePromptText() {
    const ctx = currentPromptContext || {};
    const core = window.PromptEngineCore;

    if (core && typeof core.formatImagePrompt === 'function') {
        const enginePrompt = core.formatImagePrompt(activeImageEngine, {
            topic: ctx.title,
            block: ctx.block,
            baseText: ctx.baseText,
            style: activePromptStyle,
            ratio: activePromptRatio,
            channelType: ctx.channelType,
            authorName: ctx.authorName
        });

        const tools = core.AI_IMAGE_TOOLS || {};
        const toolMeta = tools[activeImageEngine] || tools.CHATGPT_DALLE || { label: 'Motor IA' };

        const isPersonal = (ctx.channelType || '').toUpperCase() === 'PERSONAL';
        const persona = core.EditorialPersonaProvider?.getPersona(ctx.channelType, ctx.authorName);
        const introText = persona?.roleIntro
            ? persona.roleIntro(toolMeta.label)
            : `Actúa como director de arte para la empresa ÁLACOR S.A.S. Genera una imagen visual de alta calidad basada en la siguiente especificación técnica optimizada para ${toolMeta.label}.`;
        const postTitle = ctx.title || 'Publicación en edición';
        const postSummary = (ctx.baseText || '').replace(/\s+/g, ' ').trim().slice(0, 180);

        const ratioLabel = isPersonal
            ? (PROMPT_RATIOS[activePromptRatio]?.label || '16:9')
            : (PROMPT_RATIOS[activePromptRatio]?.label || '1:1');

        return `${introText}

CONTEXTO DE LA PUBLICACIÓN:
- Título: "${postTitle}"
- Bloque Temático: ${ctx.block || 'General'}${postSummary ? `\n- Mensaje Clave del Copy: "${postSummary}..."` : ''}

PROMPT EN INGLÉS PARA ${toolMeta.label.toUpperCase()}:
${enginePrompt}

Formato: ${ratioLabel}`;
    }

    const topic = ctx.title || 'Equipos de Protección Personal y Seguridad Industrial';
    return `High-end industrial photography illustrating ${topic}. Professional worker in certified PPE. Zero text, no watermarks, perfect hands.`;
}

/**
 * Renderiza el contenido interno del modal con controles y vista previa.
 */
function renderPromptModalContent(suggestionReason) {
    const container = document.getElementById('social-image-prompt-body');
    if (!container) return;

    const topicTitle = currentPromptContext.title || 'Publicación sin título';
    const topicBlock = currentPromptContext.block || 'Seguridad Industrial';
    const promptText = buildImagePromptText();
    const tools = window.PromptEngineCore?.AI_IMAGE_TOOLS || {};
    const activeTool = tools[activeImageEngine] || tools.CHATGPT_DALLE || { label: 'IA', url: 'https://chatgpt.com' };

    container.innerHTML = `
        <div class="prompt-modal-header-info">
            <div>
                <div style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.05em; font-weight:600;">Tema Activo en Edición</div>
                <div style="font-size:1.05rem; font-weight:700; color:var(--text-primary); margin-top:2px;">${escapeHtml(topicTitle)}</div>
                <div style="font-size:0.78rem; color:var(--text-secondary); margin-top:2px;">Bloque Temático: <strong>${escapeHtml(topicBlock)}</strong></div>
            </div>
            ${suggestionReason ? `
                <div class="prompt-suggestion-badge">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0; color:#fbbf24;"><line x1="9" y1="18" x2="15" y2="18"></line><line x1="10" y1="22" x2="14" y2="22"></line><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5.76.76 1.23 1.52 1.41 2.5h6.18z"></path></svg>
                    <div>
                        <strong style="display:block; font-size:0.72rem; text-transform:uppercase; letter-spacing:0.04em;">Sugerencia Inteligente Aplicada</strong>
                        <span>${escapeHtml(suggestionReason)}</span>
                    </div>
                </div>
            ` : ''}
        </div>

        <!-- WORKSPACE 2 COLUMNAS STUDIO -->
        <div class="prompt-studio-grid">
            <!-- Columna Izquierda: Parámetros de Dirección de Arte -->
            <div class="prompt-col-controls">
                <div>
                    <label style="font-size:0.85rem; font-weight:700; color:var(--text-primary); margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
                        <span>1. Selecciona el Estilo Visual de la Imagen:</span>
                        <span style="font-size:0.72rem; color:var(--text-muted); font-weight:normal;">4 estilos optimizados</span>
                    </label>
                    <div class="prompt-styles-grid">
                        ${Object.values(PROMPT_STYLES).map(st => `
                            <div class="prompt-style-card ${activePromptStyle === st.id ? 'active' : ''}" onclick="selectPromptStyle('${st.id}')">
                                <div class="prompt-style-title">${st.name}</div>
                                <div class="prompt-style-desc">${st.desc}</div>
                                <span class="prompt-style-tag">${st.badge}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div>
                    <label style="font-size:0.85rem; font-weight:700; color:var(--text-primary); margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
                        <span>2. Herramienta de IA que vas a usar:</span>
                        <span style="font-size:0.72rem; color:var(--accent-cyan); font-weight:600;">Sintaxis calibrada</span>
                    </label>
                    <div class="prompt-ratios-bar">
                        ${Object.entries(tools).map(([key, eng]) => `
                            <button type="button" class="prompt-ratio-btn ${activeImageEngine === key ? 'active' : ''}" onclick="selectImageEngine('${key}')">
                                <strong>${eng.label}</strong>
                                <span style="font-size:0.70rem; opacity:0.85;">${eng.desc}</span>
                            </button>
                        `).join('')}
                    </div>
                </div>

                <div>
                    <label style="font-size:0.85rem; font-weight:700; color:var(--text-primary); margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
                        <span>3. Proporción de Aspecto (Formato):</span>
                        <span style="font-size:0.72rem; color:var(--text-muted); font-weight:normal;">Dimensiones por canal</span>
                    </label>
                    <div class="prompt-ratios-bar">
                        ${Object.entries(PROMPT_RATIOS).map(([key, r]) => `
                            <button type="button" class="prompt-ratio-btn ${activePromptRatio === key ? 'active' : ''}" onclick="selectPromptRatio('${key}')">
                                <strong>${r.label}</strong>
                                <span style="font-size:0.72rem; opacity:0.85;">${r.desc}</span>
                            </button>
                        `).join('')}
                    </div>
                </div>

                <!-- Guardrails y Protección Visual -->
                <div>
                    <label style="font-size:0.78rem; font-weight:600; color:var(--text-muted); margin-bottom:6px; display:inline-flex; align-items:center; gap:5px;">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg> Blindajes de Calidad Integrados:
                    </label>
                    <div class="prompt-guardrails-row">
                        <span class="prompt-guardrail-pill">Sin texto / sin letras deformadas</span>
                        <span class="prompt-guardrail-pill">Anatomía humana estricta (5 dedos)</span>
                        <span class="prompt-guardrail-pill">EPP normativo certificado ANSI</span>
                        <span class="prompt-guardrail-pill">Sanitización anti-emojis activa</span>
                    </div>
                </div>
            </div>

            <!-- Columna Derecha: Estudio del Prompt -->
            <div class="prompt-col-editor">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; flex-wrap:wrap; gap:6px;">
                    <label style="font-size:0.85rem; font-weight:700; color:var(--text-primary);">
                        4. Prompt Listo para ${activeTool.label}:
                    </label>
                    <div style="display:flex; gap:6px;">
                        <a href="${activeTool.url}" target="_blank" rel="noopener noreferrer" class="btn-xs btn-outline-secondary" title="Abrir ${activeTool.label} en nueva pestaña" style="display:inline-flex; align-items:center; gap:4px; font-size:0.72rem; padding:3px 8px; border-radius:4px; text-decoration:none;">
                            <span>Abrir ${activeTool.label.split(' ')[0]}</span>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                        </a>
                        <button type="button" class="btn-xs btn-outline-info" onclick="enrichImagePromptWithAi()" id="btn-enrich-prompt" title="Enriquecer detalles creativos con Cascada Multi-LLM" style="display:inline-flex; align-items:center; gap:5px;">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"></path></svg> Enriquecer con IA
                        </button>
                    </div>
                </div>
                <textarea id="generated-image-prompt-textarea" class="prompt-output-textarea" readonly spellcheck="false">${escapeHtml(promptText)}</textarea>
                <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.74rem; color:var(--text-muted); padding:0 2px;">
                    <span>Calibrado para: <strong>${activeTool.label}</strong></span>
                    <span>1 clic para copiar al portapapeles</span>
                </div>
            </div>
        </div>
    `;
}

function updatePromptModalView() {
    renderPromptModalContent('');
}

/**
 * Copia el prompt al portapapeles con un solo clic y retroalimentación visual.
 */
async function copyImagePromptToClipboard() {
    const textarea = document.getElementById('generated-image-prompt-textarea');
    if (!textarea || !textarea.value) return;

    const isVideo = activeVisualMode === 'VIDEO';
    const toolMeta = isVideo 
        ? window.PromptEngineCore?.AI_VIDEO_TOOLS?.[window.activeVideoTool || 'GOOGLE_FLOW_VEO']
        : window.PromptEngineCore?.AI_IMAGE_TOOLS?.[activeImageEngine];

    const msg = `¡Prompt copiado! Pégalo en ${toolMeta?.label || 'tu herramienta de IA'} para generar.`;

    try {
        await navigator.clipboard.writeText(textarea.value);
        if (typeof showToast === 'function') {
            showToast(msg, 'success');
        } else {
            alert(msg);
        }
        closeImagePromptModal();
    } catch (err) {
        textarea.select();
        document.execCommand('copy');
        if (typeof showToast === 'function') showToast(msg, 'success');
        closeImagePromptModal();
    }
}

/**
 * Enriquecimiento opcional mediante el backend con Cascada Multi-LLM / Gemini.
 */
async function enrichImagePromptWithAi() {
    const btn = document.getElementById('btn-enrich-prompt');
    const textarea = document.getElementById('generated-image-prompt-textarea');
    if (!textarea) return;

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span style="display:inline-flex; align-items:center; gap:5px;"><svg class="spin-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg> Enriqueciendo...</span>';
    }

    try {
        const res = await apiFetch(`${API_BASE}/v1/social-publisher/ai/image-prompt`, {
            method: 'POST',
            body: JSON.stringify({
                title: currentPromptContext.title || '',
                editorial_block: currentPromptContext.block || '',
                base_content: currentPromptContext.baseText || '',
                style: activePromptStyle,
                ratio: activePromptRatio,
                engine: activeImageEngine
            })
        });

        if (res.ok) {
            const data = await res.json();
            if (data.prompt) {
                textarea.value = data.prompt;
                if (typeof showToast === 'function') {
                    showToast('¡Prompt enriquecido con creatividad de IA!', 'success');
                }
            }
        }
    } catch (e) {
        console.warn('No se pudo conectar con enriquecimiento IA:', e);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<span style="display:inline-flex; align-items:center; gap:5px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"></path></svg> Enriquecer con IA</span>';
        }
    }
}

// Cierre al presionar Escape o clic en backdrop
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const modal = document.getElementById('social-image-prompt-modal');
        if (modal && modal.classList.contains('active')) {
            closeImagePromptModal();
        }
    }
});

document.addEventListener('click', (e) => {
    const modal = document.getElementById('social-image-prompt-modal');
    if (modal && modal.classList.contains('active') && e.target === modal) {
        closeImagePromptModal();
    }
});

// Exposición global explícita
window.openImagePromptModal = openImagePromptModal;
window.closeImagePromptModal = closeImagePromptModal;
window.selectPromptStyle = selectPromptStyle;
window.selectPromptRatio = selectPromptRatio;
window.selectImageEngine = selectImageEngine;
window.copyImagePromptToClipboard = copyImagePromptToClipboard;
window.enrichImagePromptWithAi = enrichImagePromptWithAi;
window.switchVisualPromptMode = switchVisualPromptMode;
window.updateModeSwitcherUI = updateModeSwitcherUI;
