// ─────────────────────────────────────────────────────────────────────────────
// PAGINATION & MATRIX SCROLL HELPER (Coralis CRM v12.3.0)
// Universal pagination state management and UI toolbar renderer
// ─────────────────────────────────────────────────────────────────────────────

function createPaginationState(initialOptions = {}) {
    return {
        currentPage: initialOptions.currentPage || 1,
        pageSize: initialOptions.pageSize || 30, // 10, 30, 50, 100, or 0 (All)
        totalRecords: 0,
        totalPages: 1,
        pageSizeOptions: [10, 30, 50, 100, 0]
    };
}

function getPagedSlice(items, state) {
    if (!Array.isArray(items)) return [];
    state.totalRecords = items.length;
    
    if (state.pageSize === 0) { // 0 means 'Todos' (All)
        state.totalPages = 1;
        state.currentPage = 1;
        return items;
    }

    state.totalPages = Math.max(1, Math.ceil(state.totalRecords / state.pageSize));
    if (state.currentPage > state.totalPages) {
        state.currentPage = state.totalPages;
    }
    if (state.currentPage < 1) {
        state.currentPage = 1;
    }

    const startIdx = (state.currentPage - 1) * state.pageSize;
    const endIdx = startIdx + state.pageSize;
    return items.slice(startIdx, endIdx);
}

function renderPaginationBar(containerId, state, onPageChange, onPageSizeChange) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!state || state.totalRecords === 0) {
        container.innerHTML = '';
        container.style.display = 'none';
        return;
    }

    container.style.display = 'flex';

    const startRecord = state.pageSize === 0 ? 1 : Math.min((state.currentPage - 1) * state.pageSize + 1, state.totalRecords);
    const endRecord = state.pageSize === 0 ? state.totalRecords : Math.min(state.currentPage * state.pageSize, state.totalRecords);

    // Build page number pills (window of up to 5 surrounding pages)
    let pageButtonsHtml = '';
    if (state.pageSize !== 0 && state.totalPages > 1) {
        const startPage = Math.max(1, state.currentPage - 2);
        const endPage = Math.min(state.totalPages, state.currentPage + 2);

        if (startPage > 1) {
            pageButtonsHtml += `<button type="button" class="page-pill" onclick="window['${onPageChange}'](1)">1</button>`;
            if (startPage > 2) pageButtonsHtml += `<span class="page-ellipsis">…</span>`;
        }

        for (let p = startPage; p <= endPage; p++) {
            const isActive = p === state.currentPage ? 'active' : '';
            pageButtonsHtml += `<button type="button" class="page-pill ${isActive}" onclick="window['${onPageChange}'](${p})">${p}</button>`;
        }

        if (endPage < state.totalPages) {
            if (endPage < state.totalPages - 1) pageButtonsHtml += `<span class="page-ellipsis">…</span>`;
            pageButtonsHtml += `<button type="button" class="page-pill" onclick="window['${onPageChange}'](${state.totalPages})">${state.totalPages}</button>`;
        }
    }

    const isFirstDisabled = state.currentPage <= 1 || state.pageSize === 0 ? 'disabled' : '';
    const isLastDisabled = state.currentPage >= state.totalPages || state.pageSize === 0 ? 'disabled' : '';

    const sizeOptionsHtml = state.pageSizeOptions.map(opt => {
        const label = opt === 0 ? 'Todos' : `${opt} por hoja`;
        const selected = state.pageSize === opt ? 'selected' : '';
        return `<option value="${opt}" ${selected}>${label}</option>`;
    }).join('');

    container.innerHTML = `
    <div class="matrix-pagination-wrapper">
        <div class="matrix-pagination-info">
            <span class="records-badge"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px; margin-right:4px;"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>${state.totalRecords} registros</span>
            <span class="records-range">Mostrando <strong>${startRecord}-${endRecord}</strong> de <strong>${state.totalRecords}</strong></span>
            ${state.pageSize !== 0 ? `<span class="page-indicator">· Página <strong>${state.currentPage}</strong> de <strong>${state.totalPages}</strong></span>` : ''}
        </div>

        <div class="matrix-pagination-controls">
            <div class="matrix-page-size-selector">
                <label style="font-size:0.78rem; color:var(--text-muted); margin-right:6px;">Ver:</label>
                <select class="page-size-select" onchange="window['${onPageSizeChange}'](parseInt(this.value))">
                    ${sizeOptionsHtml}
                </select>
            </div>

            ${state.totalPages > 1 && state.pageSize !== 0 ? `
            <div class="matrix-nav-buttons">
                <button type="button" class="page-nav-btn" title="Primera Página" ${isFirstDisabled} onclick="window['${onPageChange}'](1)">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="11 17 6 12 11 7"></polyline><polyline points="18 17 13 12 18 7"></polyline></svg>
                </button>
                <button type="button" class="page-nav-btn" title="Página Anterior" ${isFirstDisabled} onclick="window['${onPageChange}'](${state.currentPage - 1})">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                </button>
                <div class="page-pills-group">${pageButtonsHtml}</div>
                <button type="button" class="page-nav-btn" title="Página Siguiente" ${isLastDisabled} onclick="window['${onPageChange}'](${state.currentPage + 1})">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </button>
                <button type="button" class="page-nav-btn" title="Última Página" ${isLastDisabled} onclick="window['${onPageChange}'](${state.totalPages})">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="13 17 18 12 13 7"></polyline><polyline points="6 17 11 12 6 7"></polyline></svg>
                </button>
            </div>
            ` : ''}
        </div>
    </div>`;
}
