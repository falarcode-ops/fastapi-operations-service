// ─── CURRENCY MASKING & FORMATTING HELPERS (COP) ───
function parseCurrency(val) {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'number') return val;
    const cleaned = String(val).replace(/[^0-9]/g, '');
    return cleaned ? parseFloat(cleaned) : 0;
}

function formatCurrency(val) {
    const num = parseCurrency(val);
    if (!num && num !== 0) return '';
    return '$ ' + num.toLocaleString('es-CO');
}

function handleCurrencyInputEvent(e) {
    const el = e.target;
    const rawNum = parseCurrency(el.value);
    const selStart = el.selectionStart;
    const prevLen = el.value.length;
    
    if (!rawNum && rawNum !== 0) {
        el.value = '';
    } else {
        el.value = '$ ' + rawNum.toLocaleString('es-CO');
    }
    
    // Trigger any calculation handlers
    if (typeof calcOfferAnnual === 'function') {
        calcOfferAnnual();
    }
}

function attachCurrencyMask(elOrId) {
    const el = typeof elOrId === 'string' ? document.getElementById(elOrId) : elOrId;
    if (!el) return;
    el.type = 'text';
    el.setAttribute('inputmode', 'numeric');
    el.removeEventListener('input', handleCurrencyInputEvent);
    el.addEventListener('input', handleCurrencyInputEvent);
    if (el.value) {
        const num = parseCurrency(el.value);
        el.value = num ? '$ ' + num.toLocaleString('es-CO') : '$ 0';
    }
}


function toggleUnifiedItemSelection() {
    const chkImpl = document.getElementById('chk-item-impl')?.checked ?? true;
    const chkMonthly = document.getElementById('chk-item-monthly')?.checked ?? true;
    const chkVisit = document.getElementById('chk-item-visit')?.checked ?? false;

    const implInput = document.getElementById('of-impl-price');
    if (implInput) {
        implInput.closest('.form-group').style.opacity = chkImpl ? '1' : '0.4';
        implInput.disabled = !chkImpl;
    }

    const monthlyInput = document.getElementById('of-monthly-price');
    if (monthlyInput) {
        monthlyInput.closest('.form-group').style.opacity = chkMonthly ? '1' : '0.4';
        monthlyInput.disabled = !chkMonthly;
    }

    const visitZoneRow = document.getElementById('un-visit-zone-row');
    if (visitZoneRow) {
        visitZoneRow.style.display = chkVisit ? 'grid' : 'none';
    }

    calcOfferAnnual();
}

