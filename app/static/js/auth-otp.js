// ─── FORGOT PASSWORD FUNCTIONS (SECURE 2-STEP OTP VIA EMAIL) ─────────────
function showForgotPasswordForm(event) {
    if (event) event.preventDefault();
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('change-pwd-form').style.display = 'none';
    document.getElementById('forgot-pwd-form').style.display = 'block';
    
    // Reset steps
    document.getElementById('otp-step-1').style.display = 'block';
    document.getElementById('otp-step-2').style.display = 'none';
    document.getElementById('forgot-pwd-error-msg').style.display = 'none';
    document.getElementById('otp-verify-error-msg').style.display = 'none';
}

function showLoginForm() {
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('change-pwd-form').style.display = 'none';
    document.getElementById('forgot-pwd-form').style.display = 'none';
}

let _otpResetEmail = '';

async function handleRequestResetOtp(event) {
    event.preventDefault();
    const email = document.getElementById('forgot-email').value.trim();
    const errorEl = document.getElementById('forgot-pwd-error-msg');
    const submitBtn = document.getElementById('forgot-pwd-btn');

    errorEl.style.display = 'none';
    if (!email) return;

    submitBtn.disabled = true;

    try {
        const response = await window.fetch(`${API_BASE}/auth/request-password-reset`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || 'Error solicitando código de verificación.');

        _otpResetEmail = email;
        document.getElementById('otp-step-1').style.display = 'none';
        document.getElementById('otp-step-2').style.display = 'block';
        document.getElementById('otp-step-2-info').innerHTML = `<span style="display:inline-flex; align-items:center; gap:6px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg> ${data.message}</span>`;
    } catch (err) {
        errorEl.innerText = err.message;
        errorEl.style.display = 'block';
    } finally {
        submitBtn.disabled = false;
    }
}

async function handleVerifyResetOtp() {
    const otp = document.getElementById('otp-code').value.trim();
    const newPassword = document.getElementById('otp-new-pwd').value;
    const confirmPassword = document.getElementById('otp-confirm-pwd').value;
    const errorEl = document.getElementById('otp-verify-error-msg');
    const verifyBtn = document.getElementById('otp-verify-btn');

    errorEl.style.display = 'none';

    if (!otp || otp.length < 6) {
        errorEl.innerText = 'Ingrese el código de verificación de 6 dígitos.';
        errorEl.style.display = 'block';
        return;
    }
    if (!newPassword || newPassword.length < 6) {
        errorEl.innerText = 'La nueva contraseña debe tener al menos 6 caracteres.';
        errorEl.style.display = 'block';
        return;
    }
    if (newPassword !== confirmPassword) {
        errorEl.innerText = 'Las contraseñas no coinciden.';
        errorEl.style.display = 'block';
        return;
    }

    verifyBtn.disabled = true;

    try {
        const response = await window.fetch(`${API_BASE}/auth/verify-reset-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: _otpResetEmail,
                otp: otp,
                new_password: newPassword
            })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || 'Error al verificar código.');

        // Success - log user in
        localStorage.setItem('token', data.token);
        localStorage.setItem('username', data.user.username);
        localStorage.setItem('full_name', data.user.full_name);
        localStorage.setItem('role', data.user.role);

        showToast('Contraseña restablecida exitosamente.', 'success');
        checkAuthSession();
    } catch (err) {
        errorEl.innerText = err.message;
        errorEl.style.display = 'block';
    } finally {
        verifyBtn.disabled = false;
    }
}

