// ──────────────────────────────────────────────────────────
// Company (Customer) CRUD Operations
// ──────────────────────────────────────────────────────────

let compEmployeesList = [];

function openCompanyFormModal(nit = null) {
    const title = document.getElementById('company-modal-title');
    const nitField = document.getElementById('comp-nit-field');
    const nameField = document.getElementById('comp-name-field');
    const statusField = document.getElementById('comp-status-field');
    const typeField = document.getElementById('comp-type-field');
    const sectorField = document.getElementById('comp-sector-field');
    const cityField = document.getElementById('comp-city-field');
    const addressField = document.getElementById('comp-address-field');
    const deptoField = document.getElementById('comp-depto-field');
    const userField = document.getElementById('comp-user-field');
    const obsField = document.getElementById('comp-obs-field');

    // Populate employees dropdown (only active employees)
    apiFetch(`${API_BASE}/employees?active_only=true`)
        .then(r => r.json())
        .then(employees => {
            compEmployeesList = employees;
            const activeList = (employees || []).filter(e => e.is_active !== false && e.is_active !== 0);
            userField.innerHTML = '<option value="">-- Sin asignar --</option>';
            activeList.forEach(emp => {
                const opt = document.createElement('option');
                opt.value = emp.username;
                opt.textContent = `${emp.full_name} (${emp.role})`;
                userField.appendChild(opt);
            });


            // If editing
            if (nit) {
                const cust = customersList.find(c => c.nit === nit);
                if (cust) {
                    title.innerText = 'Editar Empresa / Cliente';
                    nitField.value = cust.nit;
                    nitField.readOnly = true;
                    nitField.classList.add('readonly-input');
                    nameField.value = cust.company_name || '';
                    statusField.value = cust.status || 'PROSPECTO';
                    typeField.value = cust.customer_type || 'JURIDICA';
                    sectorField.value = cust.sector || '';
                    cityField.value = cust.city || '';
                    addressField.value = cust.address || '';
                    deptoField.value = cust.department || '';
                    userField.value = cust.assigned_user || '';
                    obsField.value = cust.observations || '';
                }
            } else {
                title.innerText = 'Nueva Empresa / Cliente';
                nitField.value = '';
                nitField.readOnly = false;
                nitField.classList.remove('readonly-input');
                nameField.value = '';
                statusField.value = 'PROSPECTO';
                typeField.value = 'JURIDICA';
                sectorField.value = '';
                cityField.value = '';
                addressField.value = '';
                deptoField.value = '';
                userField.value = '';
                obsField.value = '';
            }

            // Aplicar restricción de rol en el selector de asignación
            const role = localStorage.getItem('role');
            const currentUsername = localStorage.getItem('username');
            if (role === 'USER') {
                userField.value = currentUsername;
                userField.disabled = true;
            } else {
                userField.disabled = false;
            }
        });

    document.getElementById('company-form-modal').classList.add('active');
}

function closeCompanyFormModal() {
    document.getElementById('company-form-modal').classList.remove('active');
}

async function submitCompanyForm(event) {
    event.preventDefault();
    const nit = document.getElementById('comp-nit-field').value;
    const isEdit = document.getElementById('comp-nit-field').readOnly;

    const payload = {
        nit: nit,
        company_name: document.getElementById('comp-name-field').value,
        status: document.getElementById('comp-status-field').value,
        customer_type: document.getElementById('comp-type-field').value,
        sector: document.getElementById('comp-sector-field').value || null,
        address: document.getElementById('comp-address-field').value || null,
        city: document.getElementById('comp-city-field').value || null,
        department: document.getElementById('comp-depto-field').value || null,
        assigned_user: document.getElementById('comp-user-field').value || null,
        observations: document.getElementById('comp-obs-field').value || null
    };

    const url = isEdit ? `${API_BASE}/customers/${nit}` : `${API_BASE}/customers`;
    const method = isEdit ? 'PUT' : 'POST';

    try {
        const res = await apiFetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.detail || 'Fallo al guardar cliente');
        }

        closeCompanyFormModal();
        // Refresh local cache and list
        await loadCustomers();
        if (isEdit) {
            // Refresh detail modal
            openCustomerModal(nit);
        }
    } catch (e) {
        alert('Error: ' + e.message);
    }
}

async function deleteCustomer(nit) {
    if (!confirm('¿Está seguro de eliminar permanentemente esta empresa y todos sus contactos y gestiones asociadas? Esta acción no se puede deshacer. (Paso 1/2)')) return;
    const secondConfirm = prompt(`Para confirmar la eliminación, escriba el NIT exacto del cliente: "${nit}" (Paso 2/2):`);
    if (secondConfirm !== nit) {
        alert('Eliminación cancelada. El NIT no coincide.');
        return;
    }
    try {
        const res = await apiFetch(`${API_BASE}/customers/${nit}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Error al eliminar cliente');
        const modal = document.getElementById('customer-modal');
        if (modal && modal.classList.contains('active')) {
            closeCustomerModal();
        }
        await loadCustomers();
    } catch (e) {
        alert(e.message);
    }
}


// ──────────────────────────────────────────────────────────
// Commercial Log (Gestión) CRUD Operations
// ──────────────────────────────────────────────────────────

