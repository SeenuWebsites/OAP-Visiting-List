/* ============================================================
   Auth Module — Login, Signup, Forgot Password, Admin
   ============================================================ */

// ---- ADMIN CREDENTIALS (validated against Supabase Auth) ----
// Admin logs in with their Supabase email (admin@oap.local) and role='admin'
// The hardcoded check is: Username=Admin, Password=5566
// We map this to the admin Supabase account
const ADMIN_USERNAME = 'Admin';
const ADMIN_PASSWORD = '5566';
// Admin's Supabase email (you create this in Supabase Auth after setup)
const ADMIN_EMAIL = 'admin@oap-visit.local';

// ---- LOGIN ----
document.addEventListener('DOMContentLoaded', () => {
    // Check if already logged in → redirect
    checkAuthAndRedirect();

    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await doLogin();
        });
    }

    // Signup form
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await doSignup();
        });
    }

    // Forgot form
    const forgotForm = document.getElementById('forgotForm');
    if (forgotForm) {
        forgotForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await doForgotStep();
        });
    }
});

async function checkAuthAndRedirect() {
    // Only run on index.html
    if (!document.getElementById('loginForm')) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
        if (profile?.role === 'admin') {
            window.location.href = 'admin.html';
        } else {
            window.location.href = 'dashboard.html';
        }
    }
}

async function doLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const keepLogged = document.getElementById('keepLoggedIn').checked;
    const btn = document.getElementById('loginBtn');
    const spinner = document.getElementById('loginSpinner');
    const btnText = document.getElementById('loginBtnText');
    const errEl = document.getElementById('loginGeneralErr');

    // Clear errors
    errEl.classList.add('hidden');
    clearFieldError('loginEmail', 'loginEmailErr');
    clearFieldError('loginPassword', 'loginPassErr');

    // Validate
    if (!email) { setFieldError('loginEmail', 'loginEmailErr', 'Email is required'); return; }
    if (!validateEmail(email)) { setFieldError('loginEmail', 'loginEmailErr', 'Enter a valid email address'); return; }
    if (!password) { setFieldError('loginPassword', 'loginPassErr', 'Password is required'); return; }

    btn.disabled = true;
    btnText.textContent = 'Logging in...';
    spinner.classList.remove('hidden');

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email.toLowerCase(),
            password: password
        });

        if (error) {
            showError(errEl, 'Invalid email or password. Please try again.');
            return;
        }

        // Update session persistence
        if (!keepLogged) {
            // Set short expiry by signing out on tab close
            window.addEventListener('beforeunload', async () => {
                await supabase.auth.signOut();
            });
        }

        // Log login action
        await logUserAction('login', { email: data.user.email });

        // Check role → redirect
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single();
        if (profile?.role === 'admin') {
            window.location.href = 'admin.html';
        } else {
            window.location.href = 'dashboard.html';
        }
    } catch (err) {
        showError(errEl, 'Connection error. Please check your internet.');
    } finally {
        btn.disabled = false;
        btnText.textContent = 'Login';
        spinner.classList.add('hidden');
    }
}

// ---- ADMIN LOGIN (hardcoded check) ----
async function doAdminLogin() {
    const username = document.getElementById('adminUser').value.trim();
    const password = document.getElementById('adminPass').value;
    const errEl = document.getElementById('adminLoginErr');
    errEl.classList.add('hidden');

    if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
        errEl.textContent = '❌ Invalid admin credentials';
        errEl.classList.remove('hidden');
        return;
    }

    // Login via Supabase with admin email
    const { data, error } = await supabase.auth.signInWithPassword({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD
    });

    if (error) {
        errEl.innerHTML = `❌ Admin account not set up yet.<br><small>Please create admin user in Supabase Auth first. See README.</small>`;
        errEl.classList.remove('hidden');
        return;
    }

    await logUserAction('admin_login');
    window.location.href = 'admin.html';
}

// ---- SIGNUP ----
async function doSignup() {
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const phone = document.getElementById('signupPhone').value.trim();
    const password = document.getElementById('signupPassword').value;
    const confirm = document.getElementById('signupConfirm').value;
    const sq1 = document.getElementById('sq1').value.trim();
    const sa1 = document.getElementById('sa1').value.trim();
    const sq2 = document.getElementById('sq2').value.trim();
    const sa2 = document.getElementById('sa2').value.trim();
    const sq3 = document.getElementById('sq3').value.trim();
    const sa3 = document.getElementById('sa3').value.trim();

    const btn = document.getElementById('signupBtn');
    const spinner = document.getElementById('signupSpinner');
    const btnText = document.getElementById('signupBtnText');
    const errEl = document.getElementById('signupGeneralErr');
    errEl.classList.add('hidden');

    // Validations
    let valid = true;
    if (!name) { setFieldError('signupName', 'signupNameErr', 'Name is required'); valid = false; }
    if (!validateEmail(email)) { setFieldError('signupEmail', 'signupEmailErr', 'Enter a valid Gmail address'); valid = false; }
    if (!/^[6-9]\d{9}$/.test(phone)) { setFieldError('signupPhone', 'signupPhoneErr', 'Enter a valid 10-digit Indian mobile number'); valid = false; }
    if (password.length < 6) { setFieldError('signupPassword', 'signupPassErr', 'Password must be at least 6 characters'); valid = false; }
    if (password !== confirm) { setFieldError('signupConfirm', 'signupConfirmErr', 'Passwords do not match'); valid = false; }
    if (!sq1 || !sa1) { setFieldError('sq1', 'sq1Err', 'Please fill in security question 1 and its answer'); valid = false; }
    if (!sq2 || !sa2 || !sq3 || !sa3) { showError(errEl, 'Please fill in all 3 security questions and answers'); valid = false; }
    if (!valid) return;

    btn.disabled = true;
    btnText.textContent = 'Creating account...';
    spinner.classList.remove('hidden');

    try {
        const { data, error } = await supabase.auth.signUp({
            email: email.toLowerCase(),
            password: password,
            options: {
                data: { full_name: name, phone: phone }
            }
        });

        if (error) {
            showError(errEl, error.message);
            return;
        }

        if (!data.user) {
            showError(errEl, 'Signup failed. Please try again.');
            return;
        }

        // Save extra profile data (security questions)
        const { error: profileErr } = await supabase.from('profiles').upsert({
            id: data.user.id,
            email: email.toLowerCase(),
            full_name: sanitize(name),
            phone: phone,
            role: 'user',
            security_q1: sanitize(sq1),
            security_a1: sanitize(sa1).toLowerCase(),
            security_q2: sanitize(sq2),
            security_a2: sanitize(sa2).toLowerCase(),
            security_q3: sanitize(sq3),
            security_a3: sanitize(sa3).toLowerCase()
        });

        if (profileErr) {
            console.warn('[Auth] Profile save error:', profileErr.message);
        }

        showToast('Account created! Please check your email to confirm.', 'success', 6000);
        showTab('login');
        document.getElementById('loginEmail').value = email;
    } catch (err) {
        showError(errEl, 'Signup failed. Please check your connection.');
    } finally {
        btn.disabled = false;
        btnText.textContent = 'Create Account';
        spinner.classList.add('hidden');
    }
}

// ---- FORGOT PASSWORD ----
let forgotUserData = null;
let forgotStep = 1;

async function doForgotStep() {
    const emailInput = document.getElementById('forgotEmail');
    const errEl = document.getElementById('forgotErr');
    const successEl = document.getElementById('forgotSuccess');
    errEl.classList.add('hidden');
    successEl.classList.add('hidden');

    if (forgotStep === 1) {
        const email = emailInput.value.trim();
        if (!validateEmail(email)) {
            showError(errEl, 'Enter a valid email address');
            return;
        }

        // Fetch user profile from DB
        const { data: profiles, error } = await supabase
            .from('profiles')
            .select('id,security_q1,security_a1,security_q2,security_a2,security_q3,security_a3')
            .eq('email', email.toLowerCase())
            .single();

        if (error || !profiles) {
            showError(errEl, 'No account found with this email address.');
            return;
        }

        forgotUserData = profiles;
        // Show Step 2
        const qDisplay = document.getElementById('forgotQuestionsDisplay');
        const qs = [
            { q: profiles.security_q1, num: 1 },
            { q: profiles.security_q2, num: 2 },
            { q: profiles.security_q3, num: 3 }
        ];
        qDisplay.innerHTML = qs.map(({ q, num }) => `
            <div class="form-group">
                <label>Q${num}: ${escapeHtml(q)}</label>
                <input type="text" id="forgotAnswer${num}" class="form-control" placeholder="Your answer">
            </div>
        `).join('');

        document.getElementById('forgotStep2').classList.remove('hidden');
        document.getElementById('forgotBtnText').textContent = 'Reset Password';
        emailInput.setAttribute('readonly', true);
        forgotStep = 2;
    } else {
        // Validate answers — any ONE match is enough
        const a1 = (document.getElementById('forgotAnswer1')?.value || '').trim().toLowerCase();
        const a2 = (document.getElementById('forgotAnswer2')?.value || '').trim().toLowerCase();
        const a3 = (document.getElementById('forgotAnswer3')?.value || '').trim().toLowerCase();
        const newPass = document.getElementById('forgotNewPass').value;
        const confirmPass = document.getElementById('forgotConfirmPass').value;

        const matched = (a1 && a1 === forgotUserData.security_a1) ||
            (a2 && a2 === forgotUserData.security_a2) ||
            (a3 && a3 === forgotUserData.security_a3);

        if (!matched) {
            showError(errEl, 'None of the answers match. Please try again.');
            return;
        }
        if (newPass.length < 6) {
            showError(errEl, 'New password must be at least 6 characters.');
            return;
        }
        if (newPass !== confirmPass) {
            showError(errEl, 'Passwords do not match.');
            return;
        }

        // Use Supabase admin API to update password
        // Since we can't update another user's password from client without session,
        // we trigger password reset email AND show a message
        const { error } = await supabase.auth.resetPasswordForEmail(
            document.getElementById('forgotEmail').value.trim().toLowerCase(),
            { redirectTo: window.location.origin + '/OAP-Visiting-List/index.html' }
        );

        if (error) {
            showError(errEl, 'Failed to send reset email: ' + error.message);
            return;
        }

        successEl.innerHTML = '✅ Security answer verified! A password reset email has been sent to your inbox. Check your email to set the new password.';
        successEl.classList.remove('hidden');
        document.getElementById('forgotBtnText').textContent = 'Done';
        forgotStep = 1;
    }
}

// ---- AUTH GUARD (for dashboard & admin pages) ----
async function requireAuth(requiredRole = 'user') {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) {
        window.location.href = 'index.html';
        return null;
    }
    if (requiredRole === 'admin') {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
        if (profile?.role !== 'admin') {
            showToast('Access denied. Admin only.', 'error');
            setTimeout(() => window.location.href = 'dashboard.html', 1500);
            return null;
        }
    }
    return session.user;
}

// ---- HELPERS ----
function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function setFieldError(fieldId, errId, msg) {
    document.getElementById(fieldId)?.classList.add('error');
    const errEl = document.getElementById(errId);
    if (errEl) { errEl.textContent = '⚠ ' + msg; errEl.classList.remove('hidden'); }
}

function clearFieldError(fieldId, errId) {
    document.getElementById(fieldId)?.classList.remove('error');
    document.getElementById(errId)?.classList.add('hidden');
}

function showError(el, msg) {
    el.innerHTML = '❌ ' + escapeHtml(msg);
    el.classList.remove('hidden');
}
