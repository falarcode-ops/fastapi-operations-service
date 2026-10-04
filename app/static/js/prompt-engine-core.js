/**
 * prompt-engine-core.js (v12.60.0)
 * -----------------------------------
 * Motor Modular y Desacoplado de Ingeniería de Prompts IA para ÁLACOR S.A.S.
 * y Perfil Personal LinkedIn (Fabián Alarcón - CEO, Cofundador & Ingeniero Industrial).
 * Proporciona sanitización universal anti-emojis, mapeo semántico desacoplado,
 * eliminación de sesgos temáticos artificiales para perfiles profesionales,
 * y adaptadores por motor para Imagen (ChatGPT, Google Flow, Midjourney, Flux)
 * y Video (Google Flow Veo 3, Runway Gen-3, Luma Dream Machine, Kling AI).
 */

(function (window) {
    'use strict';

    const AI_IMAGE_TOOLS = {
        CHATGPT_DALLE: {
            id: 'CHATGPT_DALLE',
            label: 'ChatGPT (DALL-E 3)',
            desc: 'Lenguaje natural y directivas directas',
            badge: 'Recomendado',
            url: 'https://chatgpt.com',
            copyLabel: 'Copiar Prompt para ChatGPT'
        },
        GOOGLE_IMAGEN: {
            id: 'GOOGLE_IMAGEN',
            label: 'Google Flow (Imagen 3)',
            desc: 'Fotorrealismo y alta fidelidad técnica',
            badge: 'Gratuito Labs',
            url: 'https://labs.google/flow',
            copyLabel: 'Copiar Prompt para Google Flow'
        },
        MIDJOURNEY: {
            id: 'MIDJOURNEY',
            label: 'Midjourney v6.1',
            desc: 'Parámetros CLI (--v 6.1 --style raw --no)',
            badge: 'Alta Estética',
            url: 'https://midjourney.com',
            copyLabel: 'Copiar Prompt para Midjourney'
        },
        FLUX: {
            id: 'FLUX',
            label: 'Flux 1.1 / SDXL',
            desc: 'Texturas ultra-detalladas y composición',
            badge: 'Open Weights',
            url: 'https://fal.ai',
            copyLabel: 'Copiar Prompt para Flux'
        }
    };

    const AI_VIDEO_TOOLS = {
        GOOGLE_FLOW_VEO: {
            id: 'GOOGLE_FLOW_VEO',
            label: 'Google Flow (Veo 3)',
            desc: 'Video cinemático con soporte Image-to-Video',
            badge: 'Gratuito Labs',
            url: 'https://labs.google/flow',
            copyLabel: 'Copiar Prompt para Google Flow'
        },
        RUNWAY_GEN3: {
            id: 'RUNWAY_GEN3',
            label: 'Runway Gen-3',
            desc: 'Control cinemático de cámara y movimiento',
            badge: 'Estándar Cine',
            url: 'https://runwayml.com',
            copyLabel: 'Copiar Prompt para Runway'
        },
        LUMA_DREAM: {
            id: 'LUMA_DREAM',
            label: 'Luma Dream Machine',
            desc: 'Física dinámica y transiciones fluidas',
            badge: 'Física Rápida',
            url: 'https://lumalabs.ai/dream-machine',
            copyLabel: 'Copiar Prompt para Luma'
        },
        KLING_AI: {
            id: 'KLING_AI',
            label: 'Kling AI 1.5',
            desc: 'Simulación realista de movimiento y gestos',
            badge: 'Alta Coherencia',
            url: 'https://klingai.com',
            copyLabel: 'Copiar Prompt para Kling'
        }
    };

    /**
     * Proveedor Desacoplado de Identidad Editorial (Persona Strategy Pattern)
     * Desacopla la identidad emisora (Corporativo ÁLACOR vs Perfil Personal de Autor)
     * de la sintaxis y plantillas de los motores de generación de imagen y video.
     */
    const EditorialPersonaProvider = {
        getPersona(channelType, authorName) {
            const isPersonal = (channelType || '').toUpperCase() === 'PERSONAL';
            if (isPersonal) {
                const clean = (authorName || '').trim();
                const isFabian = /falarcon|fabian|fabián/i.test(clean) || clean.length === 0;

                const displayName = isFabian ? 'Fabián Alarcón' : clean;
                const authorCredentials = isFabian
                    ? 'Ingeniero Industrial, CEO y Cofundador de ÁLACOR'
                    : 'Ingeniero Industrial';

                return {
                    id: 'PERSONAL',
                    isPersonal: true,
                    displayName: displayName,
                    badgeLabel: `Perfil Personal (${displayName})`,
                    directorClause: `Actúa como Director Audiovisual para el perfil profesional en LinkedIn de ${displayName} (${authorCredentials}).`,
                    roleIntro: (toolLabel) =>
                        `Actúa como director de arte para una publicación profesional en el perfil personal de LinkedIn de ${displayName} (${authorCredentials}). Genera una imagen visual de alta calidad que refuerce su marca personal, liderazgo empresarial y visión estratégica, basada en la siguiente especificación técnica optimizada para ${toolLabel}.`,
                    videoRoleIntro: (toolLabel) =>
                        `Actúa como Director Audiovisual para el perfil profesional en LinkedIn de ${displayName} (${authorCredentials}). Genera un video cinematográfico que potencie su liderazgo empresarial y visión estratégica usando ${toolLabel}.`,
                    aestheticDirective:
                        `- Style aesthetic: Professional LinkedIn executive thought-leadership by an Industrial Engineer & CEO. Authentic, clean, modern, editorial composition directly illustrating the topic. Strict exclusion of corporate logos, brand watermarks, or commercial slogans.`
                };
            }
            return {
                id: 'ORGANIZATION',
                isPersonal: false,
                displayName: 'ÁLACOR S.A.S.',
                badgeLabel: 'ÁLACOR Studio',
                directorClause: 'Actúa como Director Audiovisual para ÁLACOR S.A.S.',
                roleIntro: (toolLabel) =>
                    `Actúa como director de arte para la empresa ÁLACOR S.A.S. Genera una imagen visual de alta calidad basada en la siguiente especificación técnica optimizada para ${toolLabel}.`,
                videoRoleIntro: (toolLabel) =>
                    `Actúa como Director Audiovisual para ÁLACOR S.A.S. Genera un video cinematográfico usando ${toolLabel}.`,
                aestheticDirective:
                    `- Style aesthetic: Official corporate standard, high-impact industrial engineering photography, certified equipment compliance.`
            };
        }
    };

    /**
     * Sanitiza el texto de entrada eliminando emojis, caracteres especiales,
     * comillas innecesarias y normalizando espacios.
     */
    function sanitizePromptTopic(rawText) {
        if (!rawText || typeof rawText !== 'string') {
            return 'Liderazgo y Estrategia Empresarial';
        }

        // 1. Erradicar emojis (Extended Pictographic, Emoticons, Miscellaneous Symbols, Variation Selectors)
        let cleaned = rawText.replace(/[\p{Extended_Pictographic}\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\uFE00-\uFE0F\u200D\u200B]/gu, '');

        // 2. Erradicar comillas, barras y caracteres que confunden a tokenizadores
        cleaned = cleaned.replace(/["“”«»'`]/g, ' ');
        cleaned = cleaned.replace(/[#@*~^]/g, '');

        // 3. Normalizar espacios en blanco
        cleaned = cleaned.replace(/\s+/g, ' ').trim();

        if (cleaned.length < 3) {
            return 'Liderazgo y Estrategia Empresarial';
        }

        return cleaned;
    }

    /**
     * Mapeo semántico desacoplado del contexto temático a descriptores en inglés.
     * Si isPersonal === true: Interpreta temáticas ejecutivas, empresariales, tecnológicas,
     * de ingeniería o liderazgo SIN sesgo de EPP ni cascos/obreros a menos que se hable de SST.
     * Si isPersonal === false (ÁLACOR Corporativo): Mantiene fidelidad al catálogo técnico de EPP.
     */
    function mapTopicToVisualConcept(topic, block, baseText, isPersonal = false) {
        const full = `${topic || ''} ${block || ''} ${baseText || ''}`.toLowerCase();
        const cleanTopic = sanitizePromptTopic(topic);

        if (isPersonal) {
            let descriptor = '';
            // 1. Liderazgo, Dirección Ejecutiva, Estrategia y Toma de Decisiones
            if (/lider|direcci[oó]n|estrateg|ceo|geren|decisi|visi[oó]n|directiv|ejecutiv|gobernanza/i.test(full)) {
                descriptor = 'strategic executive leadership, visionary business management, and high-level decision making in a modern sophisticated workspace';
            }
            // 2. Ingeniería Industrial, Procesos, Operaciones y Optimización
            else if (/ingenier|proceso|operaci|productiv|eficienc|mejora continua|lean|cadena.*suministr|log[ií]stic|optimiz/i.test(full)) {
                descriptor = 'industrial engineering excellence, process optimization, workflow efficiency, and modern operational systems';
            }
            // 3. Innovación, Tecnología, IA y Transformación Digital
            else if (/tecnolog|inteligencia artificial|\bia\b|digital|innovaci|automatiz|software|data|futuro/i.test(full)) {
                descriptor = 'technological innovation, digital transformation, and modern intelligent enterprise systems';
            }
            // 4. Cultura Empresarial, Equipos, Personas y Colaboración
            else if (/cultura|equipo|colabora|talento|persona|comunicaci|motivaci|clima|amor|amistad|familia|aniversario/i.test(full)) {
                descriptor = 'collaborative executive teamwork, authentic professional interaction, and inspiring corporate culture in a bright contemporary workplace';
            }
            // 5. Negocios, Crecimiento, Ventas, Finanzas y Clientes
            else if (/negocio|venta|comercial|cliente|financ|inversi|rentabil|mercado|crecimiento/i.test(full)) {
                descriptor = 'high-impact business growth, commercial strategy, client partnership, and executive negotiation';
            }
            // 6. Desarrollo Profesional, Aprendizaje y Mentalidad
            else if (/aprendi|educaci|h[aá]bito|mentalidad|desarrollo|carrera|disciplina|prop[oó]sito/i.test(full)) {
                descriptor = 'continuous professional development, strategic mindset, and intellectual growth';
            }
            // 7. Seguridad en el Trabajo / SST (SOLO si el texto menciona explícitamente términos de seguridad)
            else if (/seguridad.*trabajo|sst|sg-sst|salud.*trabajo|salud ocupacional|prevenci[oó]n.*riesgo|riesgo laboral|epp/i.test(full)) {
                descriptor = 'proactive workplace safety management, risk prevention culture, and occupational health';
            } else {
                descriptor = 'executive thought-leadership, strategic insights, and professional excellence';
            }

            return `the core theme "${cleanTopic}" (${descriptor})`;
        }

        // --- Mapeo Corporativo ÁLACOR (Seguridad Industrial y EPP) ---
        let corpDescriptor = '';
        if (/amor|amistad|familia|compañer|cultura|retorno|hogar|fecha[s]?\s+especial|celebraci[oó]n|aniversario/i.test(full)) {
            corpDescriptor = 'camaraderie, mutual care, and strong safety culture among industrial workers in a modern plant';
        } else if (/arn[eé]s|ca[íi]da|l[íi]nea de vida|suspensi[oó]n|trabajo.*altura/i.test(full)) {
            corpDescriptor = 'certified fall protection full-body harness, shock-absorbing lanyard, and industrial safety lifelines';
        } else if (/bota|calzado|diel[eé]ctric|puntera/i.test(full)) {
            corpDescriptor = 'certified ergonomic steel-toe dielectric safety work boots with slip-resistant polyurethane soles';
        } else if (/guante|corte|qu[íi]mic|protecci[oó]n.*man/i.test(full)) {
            corpDescriptor = 'heavy-duty certified cut-resistant and chemical-resistant industrial safety gloves';
        } else if (/casco|craneal|barbuquejo|cabeza/i.test(full)) {
            corpDescriptor = 'ANSI Z89.1 certified industrial safety hard hat with 4-point chin strap';
        } else if (/gafa|monogafa|careta|facial|ocular/i.test(full)) {
            corpDescriptor = 'ANSI Z87.1 clear anti-fog industrial safety glasses with high-impact side shields';
        } else if (/respirador|mascarilla|vapor|polvo|part[íi]cula/i.test(full)) {
            corpDescriptor = 'NIOSH-approved industrial particulate respirator mask with dual chemical cartridges';
        } else if (/espacio[s]?\s+confinad|confinad|pozo|alcantarill|detector.*gas/i.test(full)) {
            corpDescriptor = 'confined space entry safety equipment with calibrated multi-gas detector and rescue tripod';
        } else if (/andamio|torre\s+m[oó]vil|estructura.*altura/i.test(full)) {
            corpDescriptor = 'certified modular scaffolding system with safety toe-boards, guardrails, and anchorage points';
        } else if (/fuego|extintor|brigada|evacuaci[oó]n|incendio/i.test(full)) {
            corpDescriptor = 'industrial emergency brigade gear with certified multipurpose ABC fire extinguisher';
        } else if (/ergonom|postur|pausa\s+activ|salud\s+laboral/i.test(full)) {
            corpDescriptor = 'ergonomic workplace safety practices, correct lifting posture, and health prevention';
        } else if (/auditor|norma|resoluci[oó]n|0312|est[aá]ndar\s+m[íi]nim|decreto\s+1072/i.test(full)) {
            corpDescriptor = 'occupational health and safety compliance inspection with structured safety protocol verification';
        } else {
            corpDescriptor = 'industrial safety solutions, certified personal protective equipment, and operational compliance';
        }

        return `the publication topic "${cleanTopic}" (${corpDescriptor})`;
    }

    /**
     * Construye un prompt de imagen optimizado según la herramienta destino.
     */
    function formatImagePrompt(engine, params) {
        const { topic, block, baseText, style, ratio, channelType, authorName } = params;
        const persona = EditorialPersonaProvider.getPersona(channelType, authorName);
        const isPersonal = persona.isPersonal;
        const visualSubject = mapTopicToVisualConcept(topic, block, baseText, isPersonal);

        const ratioMap = {
            '1:1': { ar: '--ar 1:1', tag: '1:1 Square', dim: '1080x1080' },
            '4:5': { ar: '--ar 4:5', tag: '4:5 Vertical', dim: '1080x1350' },
            '16:9': { ar: '--ar 16:9', tag: '16:9 Widescreen', dim: '1920x1080' }
        };
        const r = ratioMap[ratio] || ratioMap['1:1'];

        let styleCore = '';
        let cameraCore = '';

        if (isPersonal) {
            // Estilos para Perfil Personal (Thought Leadership, Ingeniería, Negocios, Liderazgo)
            if (style === 'PRODUCTO_ESTUDIO') {
                styleCore = `High-end minimalist studio product photography illustrating ${visualSubject}. Clean neutral backdrop, softbox studio lighting, macro focus highlighting sleek industrial design, tactile materials, and premium craftsmanship.`;
                cameraCore = 'Shot on Hasselblad H6D-100c with 100mm macro lens, f/5.6, hyper-clean commercial presentation.';
            } else if (style === 'INFOGRAFIA_TECNICA') {
                styleCore = `Clean modern editorial infographic illustration and conceptual architectural breakdown about ${visualSubject}. High-contrast modern palette (deep slate blue, crisp cyan, warm amber accents), clean geometric vector draftsmanship, structured visual hierarchy for LinkedIn thought-leadership.`;
                cameraCore = 'Contemporary SaaS design system aesthetic, pristine isometric perspective, architectural clarity.';
            } else if (style === 'RENDER_3D') {
                styleCore = `Ultra-modern 3D conceptual render visualizing ${visualSubject}. Minimalist architectural composition, polished translucent glass, matte titanium surfaces, sophisticated ambient illumination, and tech-forward executive aesthetic.`;
                cameraCore = 'Cinema 4D and Octane Render aesthetic, subtle raytraced reflections, elegant executive presentation.';
            } else {
                // FOTOGRAFIA_REALISTA Personal
                styleCore = `High-end authentic editorial photography illustrating ${visualSubject}. A confident professional leader in a modern architectural workplace or conference setting, engaging in thoughtful work, natural genuine expressions, and inspiring professional atmosphere.`;
                cameraCore = 'Shot on Canon EOS R5 with 50mm f/1.8 lens, natural ambient daylight, shallow depth of field, photorealistic skin textures, accurate human anatomy, perfectly formed hands.';
            }
        } else {
            // Estilos para ÁLACOR Corporativo (Soluciones Industriales y EPP)
            if (style === 'PRODUCTO_ESTUDIO') {
                let productSubject = visualSubject;
                if (/camaraderie|culture|human|care|prevention|family|worker|people/i.test(visualSubject)) {
                    productSubject = 'certified industrial PPE gear, safety hard hat, ergonomic high-visibility vest, and safety boots representing workplace protection';
                }
                styleCore = `High-end commercial catalog product photography of ${productSubject}. Clean minimalist studio setup, soft neutral light-grey backdrop, professional three-point studio lighting, sharp macro focus highlighting reinforced stitching, authentic certified buckles, and premium technical textures.`;
                cameraCore = 'Shot on Hasselblad H6D-100c with 100mm macro lens, f/5.6, hyper-detailed commercial catalog presentation.';
            } else if (style === 'INFOGRAFIA_TECNICA') {
                styleCore = `Clean modern technical infographic illustration and isometric diagram about ${visualSubject}. High-contrast modern palette (deep slate blue, safety cyan, vibrant amber accents), clean geometric vector draftsmanship, exploded view showing protective components and safety flow for corporate occupational safety compliance.`;
                cameraCore = 'Contemporary SaaS design system aesthetic, pristine isometric perspective, architectural precision.';
            } else if (style === 'RENDER_3D') {
                styleCore = `Ultra-modern 3D conceptual render visualizing industrial safety engineering and corporate brand protection for ${visualSubject}. Minimalist architectural composition, polished translucent glass, matte titanium, vibrant cyan and amber accents, volumetric studio lighting.`;
                cameraCore = 'Cinema 4D and Octane Render aesthetic, raytraced reflections, elegant tech-forward corporate look.';
            } else {
                // FOTOGRAFIA_REALISTA Corporativo
                const isTeamOrCulture = /camaraderie|culture|team|workers|people|compañer|familia/i.test(visualSubject);
                const workersDesc = isTeamOrCulture
                    ? 'industrial workers wearing authentic certified PPE (safety hard hats, safety glasses, high-visibility vests with reflective bands, heavy-duty gloves, and steel-toe work boots) actively collaborating'
                    : 'an industrial technician wearing authentic certified PPE (hard hat, safety glasses, high-visibility vest, safety gloves, and steel-toe work boots)';
                styleCore = `Photorealistic documentary industrial photograph illustrating ${visualSubject}. ${workersDesc} in an authentic modern industrial workplace.`;
                cameraCore = 'Shot on Canon EOS R5 with 85mm f/2.8 lens, natural daylight, atmospheric industrial lighting, photorealistic skin textures, accurate human anatomy, perfectly formed hands and fingers.';
            }
        }

        // 1. Midjourney v6.1 (Tags CLI)
        if (engine === 'MIDJOURNEY') {
            return `${styleCore} ${cameraCore} ${r.ar} --v 6.1 --style raw --no text, words, letters, font, typography, watermark, logo, cartoon, illustration, deformed limbs, extra fingers, blurry`;
        }

        // 2. Flux 1.1 / SDXL
        if (engine === 'FLUX') {
            return `${styleCore} ${cameraCore} Aspect ratio: ${r.tag}. Volumetric lighting, photorealistic textures, zero on-screen text, no watermarks, perfectly formed hands with five distinct fingers.`;
        }

        // 3. Google Flow / Imagen 3
        if (engine === 'GOOGLE_IMAGEN') {
            return `35mm photorealistic image of ${visualSubject}. ${styleCore} ${cameraCore} Format: ${r.tag}. Strict quality directives: Zero on-screen text, no watermark, no distorted anatomy, perfectly formed hands with 5 fingers.`;
        }

        // 4. Default: ChatGPT (DALL-E 3)
        const criticalSafetyDirective = isPersonal
            ? '- Composition: Elegant, authentic, modern professional atmosphere reflecting the theme.'
            : '- The equipment must strictly conform to certified real-world industrial safety standards.';

        return `Create a high-end visual piece: ${styleCore} ${cameraCore} Format: ${r.tag} (${r.dim}).

CRITICAL COMPOSITION DIRECTIVES:
- Do NOT include any text, letters, words, numbers, watermarks, or logos anywhere in the image.
- Ensure strict human anatomical accuracy with perfectly formed hands (five natural fingers per hand, natural grip).
${criticalSafetyDirective}
${persona.aestheticDirective}`;
    }

    /**
     * Construye un prompt de video optimizado según la herramienta destino (Google Flow, Runway, Luma, Kling).
     */
    function formatVideoPrompt(params) {
        const { topic, block, baseText, style, ratio, duration, camera, env, light, flowMode, hasRef, refRole, tool, channelType, authorName } = params;
        const persona = EditorialPersonaProvider.getPersona(channelType, authorName);
        const isPersonal = persona.isPersonal;
        const visualSubject = mapTopicToVisualConcept(topic, block, baseText, isPersonal);
        const activeTool = tool || 'GOOGLE_FLOW_VEO';

        const durationMap = { '6s': '6 seconds', '8s': '8 seconds', '15s': '15 seconds' };
        const durEn = durationMap[duration] || '8 seconds';

        const ratioMap = {
            '9:16': { tag: 'Vertical 9:16', label: '9:16 Vertical (Reels/Stories)' },
            '1:1': { tag: 'Square 1:1', label: '1:1 Cuadrado (Feed)' },
            '16:9': { tag: 'Widescreen 16:9', label: '16:9 Horizontal (Web/LinkedIn)' }
        };
        const r = ratioMap[ratio] || ratioMap['9:16'];

        let camDir = 'Smooth slow dolly-in towards the subject, cinematic depth of field with 50mm f/2.0 lens.';
        if (camera === 'DYNAMIC_TRACKING') {
            camDir = 'Dynamic handheld tracking shot following the subject smoothly at eye-level, high-end gimbal stabilization.';
        } else if (camera === 'AERIAL_DRONE') {
            camDir = 'Cinematic aerial drone shot slowly descending and revealing the scene with atmospheric morning light.';
        } else if (camera === 'STATIC_MACRO') {
            camDir = 'Static tripod macro shot with extreme sharp focus on technical details, tactile surfaces, and textures.';
        }

        let envDir = isPersonal
            ? 'in an inspiring contemporary executive setting or modern architectural workplace with natural light.'
            : 'in an authentic heavy industrial plant setting with realistic atmospheric daylight.';

        if (env === 'TRABAJO_ALTURAS') envDir = 'at a high-altitude scaffold worksite with certified safety lifelines, anchor points, and safety nets.';
        else if (env === 'LOGISTICA') envDir = 'inside a modern logistics distribution center with clean aisles, industrial racking, and safe pathways.';
        else if (env === 'ESTUDIO_NEUTRO') envDir = 'in a clean minimalist commercial studio setting with a smooth soft neutral grey backdrop.';

        let lightDir = 'natural daylight illumination with soft realistic shadows.';
        if (light === 'GOLDEN_HOUR') lightDir = 'warm golden hour sunlight with rich orange flares and long cinematic shadows.';
        else if (light === 'REFLECTORES') lightDir = 'high-intensity floodlights casting crisp dramatic contrast.';
        else if (light === 'ESTUDIO_3P') lightDir = 'commercial three-point softbox studio lighting highlighting surface textures.';

        // Modo Image-to-Video
        if (flowMode === 'IMAGE_TO_VIDEO' && hasRef) {
            return `IMAGE-TO-VIDEO CONDITIONING DIRECTIVE:
Animate the attached reference image into a fluid 4K commercial video clip, ${durEn} duration, aspect ratio ${r.tag}.
Strict Subject Preservation: Keep the core elements, colors, and textures of the reference image intact without warping or morphing.
Motion Directives: Introduce realistic physical dynamics, natural subtle movement. ${camDir}
Environment: ${envDir} Lighting: ${lightDir}
Quality: 35mm cinematic film look, 60fps smooth temporal coherence. No text, no distorted branding, no cartoon artifacts.`;
        }

        // Modo Subject-Guided
        if (hasRef && refRole === 'PRODUCT_IDENTITY') {
            return `REFERENCE-GUIDED GENERATION DIRECTIVE:
Use the attached reference image as strict subject conditioning regarding ${visualSubject}.
Subject Identity: Faithfully reproduce the key elements seen in the reference image.
Scene: Professional context ${envDir}
Lighting: ${lightDir}
Camera: ${camDir}
Duration: ${durEn}, Aspect Ratio: ${r.tag}. 4K photorealistic cinematography, lifelike human anatomy, perfectly formed hands. No extra text, no watermarks.`;
        }

        // Adaptadores según herramienta de Video:
        if (activeTool === 'RUNWAY_GEN3') {
            return `[Camera: ${camDir}] Cinematic 4K shot of ${visualSubject} ${envDir}. Commercial film grading, lighting: ${lightDir}. Photorealistic textures, realistic momentum. No on-screen text, zero watermarks, anatomically accurate hands with five fingers. --duration ${durEn}`;
        }

        if (activeTool === 'LUMA_DREAM') {
            return `Cinematic high-resolution footage, ${visualSubject}. Dynamic camera movement: ${camDir}. Authentic environment: ${envDir}. Natural lighting: ${lightDir}. Photorealistic human motion, zero morphing, perfectly formed hands, clean composition without text or logos.`;
        }

        if (activeTool === 'KLING_AI') {
            return `Cinematic 4K realistic scene: ${visualSubject} ${envDir}. Camera: ${camDir}. Lighting: ${lightDir}. Authentic atmosphere, natural human kinetics, 5-finger hands. Negative prompt: text, watermark, cartoon, deformed limbs, morphing.`;
        }

        // Default: Google Flow (Veo 3)
        let sceneDir = '';
        if (isPersonal) {
            if (style === 'DEMOSTRACION_PRODUCTO' || style === 'PRODUCTO_ESTUDIO') {
                sceneDir = `Commercial demonstration video showcasing ${visualSubject}. Smooth slow camera movement, clean neutral illumination ${envDir}`;
            } else if (style === 'MOTION_CORPORATIVO' || style === 'RENDER_3D') {
                sceneDir = `Sleek futuristic 3D motion design video visualizing ${visualSubject}. Floating minimalist geometric elements, polished glass, and refined translucent accents.`;
            } else if (style === 'INFOGRAFIA_TECNICA') {
                sceneDir = `Dynamic motion graphics video explaining ${visualSubject} with clean kinetic diagrams and sleek transition effects.`;
            } else {
                sceneDir = `Cinematic documentary scene illustrating executive leadership and strategic insight for ${visualSubject}. A confident professional engaging in high-level collaboration ${envDir}`;
            }
        } else {
            if (style === 'DEMOSTRACION_PRODUCTO' || style === 'PRODUCTO_ESTUDIO') {
                sceneDir = `Commercial product demonstration video showcasing ${visualSubject}. Close-up to medium shot demonstrating durable materials, ergonomic adjustment, and robust construction ${envDir}`;
            } else if (style === 'MOTION_CORPORATIVO' || style === 'RENDER_3D') {
                sceneDir = `Sleek futuristic 3D motion design video visualizing safety engineering for ${visualSubject}. Floating holographic protective gear elements, polished titanium, and translucent cyan glass components.`;
            } else if (style === 'INFOGRAFIA_TECNICA') {
                sceneDir = `Dynamic motion graphics video explaining industrial safety protocols for ${visualSubject} with clean kinetic diagrams and ISO compliant safety icons.`;
            } else {
                sceneDir = `Cinematic 4K documentary B-roll footage showing industrial workers executing safety protocols for ${visualSubject} ${envDir}`;
            }
        }

        return `GOOGLE FLOW (VEO 3) CINEMATIC VIDEO PROMPT:
${sceneDir}
Camera Dynamics: ${camDir}
Lighting & Tone: ${lightDir}
Technical Specifications: 4K resolution, 60fps cinematic fluidity, duration: ${durEn}, aspect ratio: ${r.tag} (${r.label}).
Composition Directives: Absolutely zero text overlays, no on-screen words, no subtitles, no watermarks, perfectly formed hands, anatomically correct human kinetics.`;
    }

    // Exportación pública en window
    window.PromptEngineCore = {
        AI_IMAGE_TOOLS,
        AI_VIDEO_TOOLS,
        EditorialPersonaProvider,
        sanitizePromptTopic,
        mapTopicToVisualConcept,
        mapSstContextToEnglish: mapTopicToVisualConcept,
        formatImagePrompt,
        formatVideoPrompt
    };

})(window);
