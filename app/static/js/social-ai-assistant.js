/**
 * social-ai-assistant.js (v12.20.0)
 * ---------------------------------
 * Módulo de Asistencia Inteligente y Guía Contextual para Publicaciones Sociales de ÁLACOR S.A.S.
 * - Tooltips dinámicos glassmorphic con instrucciones y ejemplos para cada campo.
 * - Motor Híbrido: Generación de borradores con Patrones ML locales (0 tokens) + Cascada Multi-LLM resiliente.
 * - Mejora de tono, corrección ortográfica técnica y adaptación a canales (LinkedIn / Instagram).
 */

const SOCIAL_AI_API = `${API_BASE}/v1/social-publisher/ai`;

let currentAiSuggestion = null;
let currentAiActionType = null;

// ==============================================================================
// 1. DICCIONARIO DE AYUDA CONTEXTUAL PARA CAMPOS (REQUERIMIENTO 1)
// ==============================================================================
const FIELD_HELP_GUIDE = {
    title: {
        title: "Título de la Publicación / Tema",
        purpose: "Define el asunto central, la pregunta pedagógica o la línea de producto a divulgar.",
        guide: "Sé específico y directo. Para trivias, formula la pregunta técnica. Para productos, indica la referencia o tipo de protección. Para fechas, nombra la conmemoración.",
        example: "Ej. «Trivia de Seguridad #1 — ¿Sabes cuánta fuerza de impacto soporta una línea de vida?» o «Calzado Dieléctrico con Puntera Composite: Máxima Protección»."
    },
    year: {
        title: "Año Editorial",
        purpose: "Asigna la publicación al plan estratégico anual correspondiente para control presupuestal y de archivo.",
        guide: "Permite organizar la matriz editorial multi-año y clonar calendarios completos para temporadas futuras.",
        example: "Ej. «2026» para la vigencia actual o «2027» para campañas anticipadas."
    },
    block: {
        title: "Bloque Temático",
        purpose: "Garantiza el balance de contenidos entre ventas, educación, cumplimiento legal y comunidad.",
        guide: "Selecciona el pilar que mejor represente el objetivo de la publicación para no saturar a la audiencia con un solo tipo de mensaje.",
        example: "Ej. «Engagement Comunitario» para encuestas/trivias, «Marco Legal» para normas, o «Conocimiento de Productos» para fichas técnicas."
    },
    platforms: {
        title: "Redes Sociales Destino",
        purpose: "Indica los canales de salida donde N8N despachará automáticamente el contenido.",
        guide: "Marca todas las redes donde deba difundirse. Puedes personalizar copys específicos para LinkedIn o Instagram más abajo.",
        example: "Facebook (comunidad amplia), LinkedIn (directores B2B y compras), Instagram (formato visual)."
    },
    base_content: {
        title: "Texto Principal / Copy Base",
        purpose: "Cuerpo universal del mensaje que se publicará en todas las redes seleccionadas.",
        guide: "Estructura recomendada: 1) Gancho que capture en 3 segundos, 2) Desarrollo claro en 2 párrafos, 3) Llamado a la acción (CTA) con ÁLACOR, y 4) 4 a 6 hashtags.",
        example: "Usa los botones del Asistente IA justo arriba para generar borradores, mejorar el tono o corregir ortografía en 1 clic."
    },
    sources: {
        title: "Fuentes Confiables & Cita Legal (Ley 23 de 1982)",
        purpose: "Garantiza el cumplimiento de derechos de autor y respaldo normativo de las afirmaciones técnicas.",
        guide: "Ingresa la entidad (ej. MinTrabajo, OSHA, ICONTEC) y la norma. Luego presiona «Insertar Cita Legal» para inyectar el pie de autoría al copy.",
        example: "Entidad: «OSHA / ANSI Z359» · Norma: «Resistencia de Líneas de Vida» · Cita: «OSHA 1926.502»."
    },
    custom_channels: {
        title: "Personalizar Texto por Red (Opcional)",
        purpose: "Permite enviar un copy adaptado a la dinámica propia de LinkedIn o Instagram en lugar del texto base.",
        guide: "Para LinkedIn usa un tono corporativo enfocado en tomadores de decisión. Para Instagram usa mayor espaciado visual y llamados a interactuar.",
        example: "Pulsa «Adaptar» en el Asistente IA para generar automáticamente ambas versiones desde el copy base."
    },
    media: {
        title: "Archivos Multimedia (Imágenes o Videos)",
        purpose: "Piezas visuales adjuntas que acompañarán la publicación para elevar el alcance e interacción.",
        guide: "Formatos admitidos: JPG, PNG, WebP o video MP4/MOV. Sube desde tu equipo o pega una URL pública directa.",
        example: "Recomendado: Imágenes 1080x1080 (cuadradas) o 1080x1350 (verticales para feed)."
    },
    status: {
        title: "Estado de la Publicación",
        purpose: "Controla si la pieza está en preparación o lista para que N8N la publique automáticamente.",
        guide: "«Guardar como Borrador» para continuar editando. «Programar para Despacho Automático (N8N)» para que el robot la emita en la fecha fijada.",
        example: "Si aún faltan imágenes o revisión del copy, manténla en Borrador."
    },
    scheduled: {
        title: "Fecha y Hora de Publicación",
        purpose: "Cronograma exacto en el que la publicación debe salir al aire (Hora legal de Colombia UTC-5).",
        guide: "Asegúrate de que sea una fecha y hora futura si el estado es Programado. Los mejores horarios B2B son de martes a jueves entre 8:00 AM y 10:30 AM.",
        example: "Ej. «15/09/2026 08:30 a. m.»"
    }
};

/**
 * Muestra el popover flotante de ayuda contextual
 */
function showFieldHelp(event, fieldKey) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    const info = FIELD_HELP_GUIDE[fieldKey];
    if (!info) return;

    const popover = document.getElementById('social-help-popover');
    if (!popover) return;

    popover.innerHTML = `
        <div class="help-pop-header">
            <span class="help-pop-title">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline; margin-right:4px; vertical-align:text-bottom;"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                ${escapeHtml(info.title)}
            </span>
            <button type="button" class="help-pop-close" onclick="hideFieldHelp()">&times;</button>
        </div>
        <div class="help-pop-section">
            <div class="help-pop-label">Propósito del Campo:</div>
            <div>${escapeHtml(info.purpose)}</div>
        </div>
        <div class="help-pop-section">
            <div class="help-pop-label">Guía de Uso & Buenas Prácticas:</div>
            <div>${escapeHtml(info.guide)}</div>
        </div>
        <div class="help-pop-section">
            <div class="help-pop-label">Ejemplo ÁLACOR:</div>
            <div class="help-pop-example">${escapeHtml(info.example)}</div>
        </div>
    `;

    // Posicionar popover cerca del botón clicado
    const btn = event.currentTarget || event.target;
    const rect = btn.getBoundingClientRect();
    
    let top = rect.bottom + 8;
    let left = rect.left - 140;

    // Control de desborde de pantalla
    if (left + 330 > window.innerWidth) {
        left = window.innerWidth - 340;
    }
    if (left < 10) left = 10;
    if (top + 280 > window.innerHeight) {
        top = Math.max(10, rect.top - 260);
    }

    popover.style.top = `${top}px`;
    popover.style.left = `${left}px`;
    popover.style.display = 'block';
}

function hideFieldHelp() {
    const popover = document.getElementById('social-help-popover');
    if (popover) {
        popover.style.display = 'none';
    }
}

// Cerrar popover al hacer clic fuera
document.addEventListener('click', (e) => {
    const popover = document.getElementById('social-help-popover');
    if (popover && popover.style.display !== 'none') {
        if (!popover.contains(e.target) && !e.target.closest('.field-help-btn')) {
            hideFieldHelp();
        }
    }
});


// ==============================================================================
// 2. ASISTENTE INTELIGENTE IA & MOTOR HÍBRIDO ML (REQUERIMIENTOS 2 Y 3)
// ==============================================================================

/**
 * Genera un borrador inicial desde el título y bloque temático
 */
async function generateAiDraft(forceLlm = false) {
    const title = document.getElementById('social-form-title')?.value || '';
    const block = document.getElementById('social-form-block')?.value || 'Engagement Comunitario';
    const entity = document.getElementById('social-form-source-entity')?.value || '';
    const ref = document.getElementById('social-form-source-reference')?.value || '';

    if (!title.trim()) {
        showToast('Ingresa primero el Título o Tema de la publicación', 'warning');
        document.getElementById('social-form-title')?.focus();
        return;
    }

    _setAiLoadingState('Consultando motor híbrido de patrones...');

    try {
        const res = await apiFetch(`${SOCIAL_AI_API}/draft`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: title.trim(),
                editorial_block: block,
                source_entity: entity.trim(),
                source_reference: ref.trim(),
                force_llm: forceLlm
            })
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || 'Error al generar borrador');
        }

        const data = await res.json();
        currentAiSuggestion = data.draft;
        currentAiActionType = 'draft';

        _renderAiSuggestionCard({
            badgeClass: data.cost_tokens === 0 ? 'badge-local-ml' : 'badge-llm-cascade',
            badgeText: data.cost_tokens === 0 
                ? `${data.provider} (0 Tokens IA · Score: ${data.match_score || 'Óptimo'})`
                : `${data.provider} (${data.model || 'Cascada LLM'}${data.fallback_used ? ' · Conmutación Activa' : ''})`,
            text: data.draft,
            warning: data.warning
        });

        showToast('Borrador sugerido con éxito', 'success');
    } catch (e) {
        _hideAiSuggestionCard();
        showToast(e.message, 'error');
    }
}

/**
 * Optimiza la persuasión, gancho y fluidez del copy base actual
 */
async function improveAiCopy() {
    const currentText = document.getElementById('social-form-base-content')?.value || '';
    if (!currentText.trim() || currentText.trim().length < 15) {
        showToast('Escribe primero un texto base para poder mejorarlo', 'warning');
        return;
    }

    _setAiLoadingState('Mejorando redacción y gancho con IA...');

    try {
        const res = await apiFetch(`${SOCIAL_AI_API}/improve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: currentText.trim(),
                tone: 'profesional, persuasivo y preventivo para ÁLACOR S.A.S.'
            })
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || 'Error al mejorar redacción');
        }

        const data = await res.json();
        currentAiSuggestion = data.improved_text;
        currentAiActionType = 'improve';

        _renderAiSuggestionCard({
            badgeClass: 'badge-llm-cascade',
            badgeText: `Mejorado con ${data.provider} (${data.model || 'Cascada Resiliente'})`,
            text: data.improved_text
        });

        showToast('Redacción optimizada con éxito', 'success');
    } catch (e) {
        _hideAiSuggestionCard();
        showToast(e.message, 'error');
    }
}

/**
 * Corrige ortografía, tildes y puntuación técnica
 */
async function spellcheckAiCopy() {
    const currentText = document.getElementById('social-form-base-content')?.value || '';
    if (!currentText.trim() || currentText.trim().length < 10) {
        showToast('Escribe un texto en el copy base para verificar ortografía', 'warning');
        return;
    }

    _setAiLoadingState('Verificando ortografía, tildes y gramática...');

    try {
        const res = await apiFetch(`${SOCIAL_AI_API}/spellcheck`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: currentText.trim() })
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || 'Error al verificar ortografía');
        }

        const data = await res.json();
        currentAiSuggestion = data.corrected_text;
        currentAiActionType = 'spellcheck';

        _renderAiSuggestionCard({
            badgeClass: 'badge-llm-cascade',
            badgeText: `Ortografía verificada con ${data.provider}`,
            text: data.corrected_text
        });

        showToast('Corrección ortográfica completada', 'success');
    } catch (e) {
        _hideAiSuggestionCard();
        showToast(e.message, 'error');
    }
}

/**
 * Adapta el copy base para LinkedIn e Instagram
 */
async function adaptAiChannels() {
    const currentText = document.getElementById('social-form-base-content')?.value || '';
    if (!currentText.trim() || currentText.trim().length < 15) {
        showToast('El copy base debe tener al menos una frase para adaptar a canales', 'warning');
        return;
    }

    _setAiLoadingState('Generando variantes para LinkedIn e Instagram...');

    try {
        const res = await apiFetch(`${SOCIAL_AI_API}/adapt-channels`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: currentText.trim() })
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || 'Error al adaptar canales');
        }

        const data = await res.json();
        const ch = data.channels || {};

        const liInput = document.getElementById('social-form-linkedin-content');
        const igInput = document.getElementById('social-form-instagram-content');

        if (liInput && ch.linkedin) liInput.value = ch.linkedin;
        if (igInput && ch.instagram) igInput.value = ch.instagram;

        // Abrir detalles de canales para mostrar el resultado
        const detailsEl = liInput?.closest('details');
        if (detailsEl) detailsEl.open = true;

        _hideAiSuggestionCard();
        showToast(`Variantes de canal generadas con ${data.provider}`, 'success');
    } catch (e) {
        _hideAiSuggestionCard();
        showToast(e.message, 'error');
    }
}

// ==============================================================================
// 3. RENDERIZADO Y CONTROL DE SUGERENCIAS IA
// ==============================================================================

function _setAiLoadingState(message) {
    const box = document.getElementById('social-ai-suggestion-box');
    const tag = document.getElementById('social-ai-status-tag');
    if (tag) tag.innerText = message;
    if (box) {
        box.style.display = 'block';
        box.innerHTML = `
            <div style="display:flex; align-items:center; gap:8px; color:var(--accent-cyan); font-size:0.8rem; padding:8px 0;">
                <span class="spinner" style="width:14px; height:14px; border:2px solid var(--accent-cyan); border-top-color:transparent; border-radius:50%; display:inline-block; animation:spin 0.8s linear infinite;"></span>
                <span>${escapeHtml(message)}</span>
            </div>
        `;
    }
}

function _renderAiSuggestionCard({ badgeClass, badgeText, text, warning }) {
    const box = document.getElementById('social-ai-suggestion-box');
    const tag = document.getElementById('social-ai-status-tag');
    if (tag) tag.innerText = 'Sugerencia lista';

    if (!box) return;

    box.style.display = 'block';
    box.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; flex-wrap:wrap; gap:6px;">
            <span class="suggestion-source-badge ${badgeClass}">${escapeHtml(badgeText)}</span>
            <button type="button" class="help-pop-close" onclick="_hideAiSuggestionCard()">&times;</button>
        </div>
        ${warning ? `<div style="font-size:0.72rem; color:#f59e0b; margin-bottom:4px; display:inline-flex; align-items:center; gap:4px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>${escapeHtml(warning)}</div>` : ''}
        <div class="suggestion-text-box">${escapeHtml(text)}</div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px; gap:8px;">
            <span style="font-size:0.72rem; color:var(--text-muted);">Acciones:</span>
            <div style="display:flex; gap:6px; align-items:center;">
                <button type="button" class="btn-icon-minimal" onclick="generateAiDraft(true)" title="Regenerar con IA (Cascada Resiliente Multi-LLM)" aria-label="Regenerar">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>
                </button>
                <button type="button" class="btn-icon-minimal" onclick="appendAiSuggestion()" title="Anexar sugerencia al final del copy actual" aria-label="Anexar">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
                </button>
                <button type="button" class="btn-primary-minimal" onclick="applyAiSuggestion()" title="Reemplazar texto del copy base con esta sugerencia" aria-label="Aplicar">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    <span>Aplicar</span>
                </button>
            </div>
        </div>
    `;
}

function _hideAiSuggestionCard() {
    const box = document.getElementById('social-ai-suggestion-box');
    const tag = document.getElementById('social-ai-status-tag');
    if (box) box.style.display = 'none';
    if (tag) tag.innerText = 'Híbrido ML / Cascada Resiliente';
    currentAiSuggestion = null;
}

function applyAiSuggestion() {
    if (!currentAiSuggestion) return;
    const copyInput = document.getElementById('social-form-base-content');
    if (copyInput) {
        copyInput.value = currentAiSuggestion;
        if (typeof updateSocialLivePreview === 'function') {
            updateSocialLivePreview();
        }
        showToast('Sugerencia aplicada al Copy Base', 'success');
    }
    _hideAiSuggestionCard();
}

function appendAiSuggestion() {
    if (!currentAiSuggestion) return;
    const copyInput = document.getElementById('social-form-base-content');
    if (copyInput) {
        copyInput.value = (copyInput.value.trim() + '\n\n' + currentAiSuggestion).trim();
        if (typeof updateSocialLivePreview === 'function') {
            updateSocialLivePreview();
        }
        showToast('Sugerencia anexada al Copy Base', 'success');
    }
    _hideAiSuggestionCard();
}
