/**
 * prompt-studio-guide.js (v12.56.0)
 * -----------------------------------
 * Submódulo Pedagógico e Interactivo: Guía de Uso del Estudio Visual IA.
 * Explica cómo seleccionar herramientas, calibrar prompts y evitar errores de generación.
 * Totalmente desacoplado con clases CSS de alto contraste para Light/Dark mode.
 */

(function (window) {
    'use strict';

    function togglePromptStudioGuide(forceState) {
        let modal = document.getElementById('prompt-studio-guide-modal');
        if (!modal) {
            modal = createGuideModalElement();
            document.body.appendChild(modal);
        }

        const shouldOpen = typeof forceState === 'boolean' ? forceState : !modal.classList.contains('active');

        if (shouldOpen) {
            modal.style.display = 'flex';
            modal.classList.add('active');
        } else {
            modal.classList.remove('active');
            modal.style.display = 'none';
        }
    }

    function createGuideModalElement() {
        const modal = document.createElement('div');
        modal.id = 'prompt-studio-guide-modal';
        modal.className = 'modal-overlay';
        modal.style.zIndex = '10080';

        modal.innerHTML = `
            <div class="modal-card guide-modal-container">
                <div class="modal-header guide-modal-header">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <span class="guide-badge-cyan">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg> Manual de Buenas Prácticas
                        </span>
                        <div>
                            <h3 class="guide-modal-title">Guía de Uso: Generador de Prompts IA</h3>
                            <p class="guide-modal-subtitle">Calibración por herramienta, mejores prácticas y mandamientos anti-errores para marketing industrial.</p>
                        </div>
                    </div>
                    <button type="button" class="modal-close" onclick="togglePromptStudioGuide(false)" aria-label="Cerrar guía">&times;</button>
                </div>

                <div class="modal-body guide-modal-body">
                    <!-- Sección 1: ¿Imagen o Video? -->
                    <div class="guide-section-box">
                        <h4 class="guide-section-heading guide-heading-blue">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg> 1. ¿Cuándo elegir Modo Imagen vs Modo Video?
                        </h4>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 14px;">
                            <div class="guide-subcard">
                                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                                    <span class="guide-badge-cyan">MODO IMAGEN</span>
                                    <strong class="guide-subcard-title">Infografías y Catálogo</strong>
                                </div>
                                <p class="guide-subcard-desc">Fichas de producto, infografías técnicas, marcos normativos, checklists de auditoría y publicaciones de catálogo en LinkedIn e Instagram.</p>
                            </div>
                            <div class="guide-subcard">
                                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                                    <span class="guide-badge-violet">MODO VIDEO FLOW</span>
                                    <strong class="guide-subcard-title">Demostraciones en Acción</strong>
                                </div>
                                <p class="guide-subcard-desc">Demostraciones de resistencia de EPP (arneses, líneas de vida, calzado en uso), clips de cultura preventiva y Reels/TikTok para máxima retención.</p>
                            </div>
                        </div>
                    </div>

                    <!-- Sección 2: ¿Qué herramienta usar según tu suscripción? -->
                    <div class="guide-section-box">
                        <h4 class="guide-section-heading guide-heading-amber">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg> 2. ¿Qué herramienta de IA seleccionar?
                        </h4>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 12px;">
                            <div class="guide-subcard">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <strong class="guide-subcard-title">ChatGPT (DALL-E 3)</strong>
                                    <span class="guide-badge-blue">Plus</span>
                                </div>
                                <span class="guide-subcard-desc">Genera prosa descriptiva pura sin banderas CLI que evitan que la IA pinte palabras no deseadas en la imagen.</span>
                            </div>
                            <div class="guide-subcard">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <strong class="guide-subcard-title">Google Flow</strong>
                                    <span class="guide-badge-emerald">Gratuito/Beta</span>
                                </div>
                                <span class="guide-subcard-desc">Genera video cinemático 4K (Veo 3) e imágenes (Imagen 3). Soporta <em>Image-to-Video</em> para animar fotos reales.</span>
                            </div>
                            <div class="guide-subcard">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <strong class="guide-subcard-title">Midjourney v6.1</strong>
                                    <span class="guide-badge-violet">Estética</span>
                                </div>
                                <span class="guide-subcard-desc">Para máxima estética fotorrealista. El CRM inyecta automáticamente parámetros CLI obligatorios: <code class="guide-code-pill">--v 6.1 --style raw --ar --no</code>.</span>
                            </div>
                            <div class="guide-subcard">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <strong class="guide-subcard-title">Runway / Luma</strong>
                                    <span class="guide-badge-amber">Cinemática</span>
                                </div>
                                <span class="guide-subcard-desc">Para creadores avanzados de video con directivas de cámara cinematográfica estructurada (Dolly, Pan, Tracking).</span>
                            </div>
                        </div>
                    </div>

                    <!-- Sección 3: Los 4 Mandamientos Anti-Errores -->
                    <div class="guide-section-box">
                        <h4 class="guide-section-heading guide-heading-green">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg> 3. Los 4 Mandamientos Anti-Errores de IA
                        </h4>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px;">
                            <div class="guide-subcard">
                                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 2px;">
                                    <span class="guide-num-badge">1.</span>
                                    <strong class="guide-subcard-title">Cero texto dentro de la imagen</strong>
                                </div>
                                <span class="guide-subcard-desc">Las IAs visuales distorsionan la ortografía. Monta los títulos, precios y logos corporativos posteriormente en Canva o Illustrator.</span>
                            </div>
                            <div class="guide-subcard">
                                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 2px;">
                                    <span class="guide-num-badge">2.</span>
                                    <strong class="guide-subcard-title">Cero emojis en los prompts</strong>
                                </div>
                                <span class="guide-subcard-desc">Los emojis confunden los tokenizadores CLIP/T5 produciendo calcomanías flotantes. El CRM los limpia automáticamente.</span>
                            </div>
                            <div class="guide-subcard">
                                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 2px;">
                                    <span class="guide-num-badge">3.</span>
                                    <strong class="guide-subcard-title">Fidelidad con Image-to-Video</strong>
                                </div>
                                <span class="guide-subcard-desc">En Google Flow, arrastra la foto real de tu producto y selecciona "Animar en Video" para preservar costuras y hebillas normativas.</span>
                            </div>
                            <div class="guide-subcard">
                                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 2px;">
                                    <span class="guide-num-badge">4.</span>
                                    <strong class="guide-subcard-title">Anatomía y EPP Certificado</strong>
                                </div>
                                <span class="guide-subcard-desc">Todos los prompts ya incorporan directivas de anatomía estricta (5 dedos exactos) y especificaciones técnicas normativas ANSI/OSHA.</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="modal-footer guide-modal-footer">
                    <button type="button" class="btn-primary" onclick="togglePromptStudioGuide(false)" style="padding: 9px 26px; font-weight: 600; font-size: 0.88rem;">Entendido</button>
                </div>
            </div>
        `;

        // Cerrar al pulsar Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('active')) {
                togglePromptStudioGuide(false);
            }
        });

        // Cerrar al hacer clic en el backdrop
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                togglePromptStudioGuide(false);
            }
        });

        return modal;
    }

    window.togglePromptStudioGuide = togglePromptStudioGuide;

})(window);
