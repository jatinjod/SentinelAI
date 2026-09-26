const API_BASE_URL = "https://sentinelai-backend-pwur.onrender.com";
const TOKEN_KEY = "sentinelai_session_token";
const state = { users: [], search: "" };

function getToken() {
    return sessionStorage.getItem(TOKEN_KEY)
        || localStorage.getItem(TOKEN_KEY)
        || "";
}

function setToken(value) {
    if (!value) return;
    sessionStorage.setItem(TOKEN_KEY, value);
    localStorage.setItem(TOKEN_KEY, value);
}

function clearToken() {
    sessionStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_KEY);
}

async function api(path, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);
    const headers = {
        Accept: "application/json",
        ...(options.headers || {})
    };

    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    if (options.body) headers["Content-Type"] = "application/json";

    try {
        const response = await fetch(`${API_BASE_URL}${path}`, {
            ...options,
            headers,
            credentials: "include",
            signal: controller.signal
        });

        let data = {};
        try { data = await response.json(); } catch { data = {}; }

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                const detail = String(data?.detail || "");
                if (/authentication required|administrator access required/i.test(detail)) {
                    throw new Error(detail || "Administrator access required.");
                }
            }
            throw new Error(data?.detail || `Request failed (${response.status})`);
        }

        return data;
    } catch (error) {
        if (error.name === "AbortError") {
            throw new Error("Admin data request timed out.");
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
}

function renderAdminLogin(message = "") {
    const content = document.getElementById("content");
    if (!content) return;

    content.innerHTML = `
        <section class="admin-login-card">
            <div class="admin-login-mark">S</div>
            <span class="eyebrow">SECURE ADMIN AREA</span>
            <h2>Admin sign in</h2>
            <p>Sign in with your SentinelAI administrator account to access the control center.</p>
            <form id="adminLoginForm" class="admin-login-form" novalidate>
                <label for="adminEmail">Email</label>
                <input id="adminEmail" type="email" autocomplete="email" placeholder="you@example.com" required />
                <span id="adminEmailError" class="field-error"></span>
                <label for="adminPassword">Password</label>
                <div class="admin-password-wrap">
                    <input id="adminPassword" type="password" autocomplete="current-password" placeholder="Your password" required />
                    <button id="adminPasswordToggle" type="button" class="password-toggle">Show</button>
                </div>
                <span id="adminPasswordError" class="field-error"></span>
                <div id="adminLoginMessage" class="admin-login-message" role="alert">${escapeHtml(message)}</div>
                <button id="adminLoginSubmit" class="primary-admin-button" type="submit">Sign in to Admin Panel</button>
            </form>
            <div class="admin-login-note">
                Administrator access is controlled by your SentinelAI account role or the configured ADMIN_EMAIL.
            </div>
        </section>
    `;

    document.getElementById("adminLoginForm")?.addEventListener("submit", handleAdminLogin);
    document.getElementById("adminPasswordToggle")?.addEventListener("click", () => {
        const input = document.getElementById("adminPassword");
        const button = document.getElementById("adminPasswordToggle");
        if (!input || !button) return;
        const visible = input.type === "text";
        input.type = visible ? "password" : "text";
        button.textContent = visible ? "Show" : "Hide";
    });
}

async function handleAdminLogin(event) {
    event.preventDefault();
    const email = String(document.getElementById("adminEmail")?.value || "").trim();
    const password = String(document.getElementById("adminPassword")?.value || "");
    const emailError = document.getElementById("adminEmailError");
    const passwordError = document.getElementById("adminPasswordError");
    const message = document.getElementById("adminLoginMessage");
    const submit = document.getElementById("adminLoginSubmit");

    if (emailError) emailError.textContent = "";
    if (passwordError) passwordError.textContent = "";
    if (message) message.textContent = "";

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        if (emailError) emailError.textContent = "Invalid email address.";
        return;
    }
    if (!password) {
        if (passwordError) passwordError.textContent = "Enter your password.";
        return;
    }

    if (submit) {
        submit.disabled = true;
        submit.textContent = "Signing in…";
    }

    try {
        const result = await api("/api/v1/auth/login", {
            method: "POST",
            body: JSON.stringify({ email, password })
        });
        setToken(result.session_token);

        const admin = await api("/api/v1/admin/me");
        if (!admin?.is_admin) {
            clearToken();
            throw new Error("This account does not have administrator access.");
        }

        await bootstrap(true);
    } catch (error) {
        console.error("Admin login failed:", error);
        const text = error.message || "Unable to sign in.";
        if (message) {
            message.textContent = /invalid email or password/i.test(text)
                ? "Incorrect email or password."
                : text;
        }
    } finally {
        if (submit) {
            submit.disabled = false;
            submit.textContent = "Sign in to Admin Panel";
        }
    }
}

function renderDashboardShell() {
    const content = document.getElementById("content");
    if (!content) return;

    content.innerHTML = `
        <div class="admin-quick-actions">
            <button class="ghost-button" type="button" data-scroll="usersSection">Manage Users</button>
            <button class="ghost-button" type="button" data-scroll="securitySection">Security</button>
            <button class="ghost-button" type="button" data-scroll="scansSection">Scans</button>
            <button class="ghost-button" type="button" data-scroll="prsSection">Pull Requests</button>
            <button id="refreshAdmin" class="ghost-button" type="button">Refresh</button>
        </div>

        <div id="stats" class="stats">
            ${statCard("Users", "total accounts")}
            ${statCard("Active", "enabled accounts")}
            ${statCard("GitHub", "connected accounts")}
            ${statCard("Repositories", "connected repos")}
            ${statCard("Scans", "security scans")}
            ${statCard("Findings", "security findings")}
            ${statCard("AI Fixes", "generated fixes")}
            ${statCard("Pull Requests", "GitHub remediation")}
        </div>

        <div id="overviewNotice" class="admin-data-notice" hidden></div>

        <div class="grid-2">
            <section class="card" id="usersSection">
                <div class="card-header">
                    <div><h2>User management</h2><p>Control access, roles and GitHub connections.</p></div>
                    <input id="userSearch" class="search" type="search" placeholder="Search users" />
                </div>
                <div class="users-loading" id="usersLoading">Loading users…</div>
                <div id="usersList" class="users" hidden></div>
            </section>

            <section class="card" id="securitySection">
                <div class="card-header"><div><h2>Security posture</h2><p>Platform-wide finding severity.</p></div></div>
                <div id="securityContent" class="security">
                    <div class="loading-card">Loading security data…</div>
                </div>
            </section>
        </div>

        <div class="grid-bottom">
            <section class="card" id="scansSection">
                <div class="card-header"><div><h2>Recent scans</h2><p>Latest scan activity.</p></div></div>
                <div id="scansContent" class="activity"><div class="loading-card">Loading scans…</div></div>
            </section>
            <section class="card" id="prsSection">
                <div class="card-header"><div><h2>Recent pull requests</h2><p>Latest GitHub remediation activity.</p></div></div>
                <div id="prsContent" class="activity"><div class="loading-card">Loading pull requests…</div></div>
            </section>
        </div>
    `;

    document.querySelectorAll("[data-scroll]").forEach((button) => {
        button.addEventListener("click", () => {
            document.getElementById(button.dataset.scroll)?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
    });

    document.getElementById("refreshAdmin")?.addEventListener("click", refreshAdminData);
    document.getElementById("userSearch")?.addEventListener("input", debounce(async (event) => {
        state.search = event.target.value.trim();
        await loadUsers();
    }, 220));
}

function statCard(label, meta) {
    return `
        <div class="stat">
            <span>${escapeHtml(label)}</span>
            <strong data-stat="${escapeHtml(label)}">—</strong>
            <small>${escapeHtml(meta)}</small>
        </div>
    `;
}

async function bootstrap(alreadyAuthenticated = false) {
    const token = getToken();
    if (!token) {
        renderAdminLogin();
        return;
    }

    // Show the complete admin shell immediately. API data fills in without
    // replacing the page, so there is no blank 0.5s transition.
    renderDashboardShell();

    try {
        const me = alreadyAuthenticated
            ? { is_admin: true }
            : await api("/api/v1/admin/me");

        if (!me?.is_admin) {
            throw new Error("This account does not have administrator access.");
        }

        await refreshAdminData();
    } catch (error) {
        console.warn("Admin session check failed:", error);
        clearToken();
        renderAdminLogin(/administrator access/i.test(error.message || "")
            ? error.message
            : "Authentication required. Please sign in.");
    }
}

async function refreshAdminData() {
    const notice = document.getElementById("overviewNotice");
    if (notice) {
        notice.hidden = true;
        notice.textContent = "";
    }

    const results = await Promise.allSettled([
        loadOverview(),
        loadUsers()
    ]);

    const failures = results
        .filter((result) => result.status === "rejected")
        .map((result) => result.reason?.message || "Some admin data could not be loaded.");

    if (failures.length && notice) {
        notice.textContent = failures.join(" · ");
        notice.hidden = false;
    }
}

function setStat(label, value) {
    const target = document.querySelector(`[data-stat="${CSS.escape(label)}"]`);
    if (target) target.textContent = value ?? 0;
}

async function loadOverview() {
    const data = await api("/api/v1/admin/overview");
    const stats = data.stats || {};

    setStat("Users", stats.total_users);
    setStat("Active", stats.active_users);
    setStat("GitHub", stats.github_users);
    setStat("Repositories", stats.repositories);
    setStat("Scans", stats.scans);
    setStat("Findings", stats.vulnerabilities);
    setStat("AI Fixes", stats.fixes);
    setStat("Pull Requests", stats.pull_requests);

    const severity = data.severity || {};
    const max = Math.max(...Object.values(severity).map(Number), 1);
    const security = document.getElementById("securityContent");
    if (security) {
        security.innerHTML = [
            ["Critical", severity.critical || 0, "critical"],
            ["High", severity.high || 0, "high"],
            ["Medium", severity.medium || 0, "medium"],
            ["Low", severity.low || 0, "low"]
        ].map(([label, value, cls]) => `
            <div class="meter ${cls}">
                <div class="meter-head"><span>${label}</span><strong>${value}</strong></div>
                <div class="bar"><i style="width:${Math.max(4, Math.round((Number(value) / max) * 100))}%"></i></div>
            </div>
        `).join("");
    }

    const scans = document.getElementById("scansContent");
    const prs = document.getElementById("prsContent");
    if (scans) scans.innerHTML = renderActivity(data.recent_scans || [], "scan");
    if (prs) prs.innerHTML = renderActivity(data.recent_pull_requests || [], "pr");
}

function renderActivity(items = [], type) {
    if (!items.length) return `<div class="empty">No activity yet.</div>`;
    return items.map((item) => {
        const title = type === "scan" ? item.repository : item.title;
        const meta = type === "scan"
            ? `${item.user} · ${item.status}`
            : `${item.repository} · ${item.user}`;
        const status = item.status;
        return `
            <div class="activity-row">
                <div><strong>${escapeHtml(title || "Untitled")}</strong><small>${escapeHtml(meta)}</small></div>
                <span class="pill ${status === "merged" || status === "completed" ? "active" : "disabled"}">${escapeHtml(status || "unknown")}</span>
            </div>
        `;
    }).join("");
}

async function loadUsers() {
    const list = document.getElementById("usersList");
    const loading = document.getElementById("usersLoading");
    if (!list) return;

    if (loading) {
        loading.hidden = false;
        loading.textContent = "Loading users…";
    }
    list.hidden = true;

    try {
        const data = await api(`/api/v1/admin/users${state.search ? `?search=${encodeURIComponent(state.search)}` : ""}`);
        state.users = data.users || [];

        if (!state.users.length) {
            list.innerHTML = `<div class="empty">No users found.</div>`;
        } else {
            list.innerHTML = state.users.map(renderUser).join("");
            list.querySelectorAll("[data-action]").forEach((button) => {
                button.addEventListener("click", handleAction);
            });
        }

        list.hidden = false;
        if (loading) loading.hidden = true;
    } catch (error) {
        if (loading) loading.hidden = true;
        list.innerHTML = `<div class="empty">${escapeHtml(error.message)}</div>`;
        list.hidden = false;
        throw error;
    }
}

function renderUser(user) {
    const initial = escapeHtml(String(user.name || "S").trim().charAt(0).toUpperCase());
    return `
        <article class="user ${user.is_active ? "" : "disabled"}">
            <div class="user-main">
                <div class="avatar">${initial}</div>
                <div>
                    <div class="user-name"><strong>${escapeHtml(user.name || user.username)}</strong>${user.is_admin ? '<span class="pill admin">Admin</span>' : ''}<span class="pill ${user.is_active ? 'active' : 'disabled'}">${user.is_active ? 'Active' : 'Disabled'}</span></div>
                    <div class="user-line">${escapeHtml(user.email || user.username)}</div>
                    <div class="user-meta"><span>${user.github_connected ? `GitHub @${escapeHtml(user.username)}` : 'GitHub not connected'}</span><span>${user.repository_count || 0} repos</span><span>${user.scan_count || 0} scans</span></div>
                </div>
            </div>
            <div class="actions">
                <button class="action" data-action="status" data-id="${user.id}" data-value="${user.is_active}">${user.is_active ? 'Disable' : 'Enable'}</button>
                <button class="action" data-action="role" data-id="${user.id}" data-value="${user.is_admin}">${user.is_admin ? 'Remove admin' : 'Make admin'}</button>
                ${user.github_connected ? `<button class="action danger" data-action="github" data-id="${user.id}">Revoke GitHub</button>` : ''}
            </div>
        </article>
    `;
}

async function handleAction(event) {
    const button = event.currentTarget;
    const id = Number(button.dataset.id);
    const action = button.dataset.action;

    try {
        if (action === "status") {
            const next = button.dataset.value !== "true";
            if (!confirm(next ? "Enable this account?" : "Disable this account?")) return;
            await api(`/api/v1/admin/users/${id}/status`, { method: "PATCH", body: JSON.stringify({ is_active: next }) });
        } else if (action === "role") {
            const next = button.dataset.value !== "true";
            if (!confirm(next ? "Grant administrator access?" : "Remove administrator access?")) return;
            await api(`/api/v1/admin/users/${id}/role`, { method: "PATCH", body: JSON.stringify({ is_admin: next }) });
        } else if (action === "github") {
            if (!confirm("Revoke this user's GitHub connection?")) return;
            await api(`/api/v1/admin/users/${id}/github`, { method: "DELETE" });
        }
        showToast("Admin action completed.");
        await refreshAdminData();
    } catch (error) {
        showToast(error.message, true);
    }
}

function showToast(message, error = false) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.hidden = false;
    toast.style.borderLeft = `3px solid ${error ? "var(--danger)" : "var(--success)"}`;
    clearTimeout(window.__toastTimer);
    window.__toastTimer = setTimeout(() => { toast.hidden = true; }, 3200);
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function debounce(fn, delay) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("logoutButton")?.addEventListener("click", async () => {
        try { await api("/api/v1/auth/logout", { method: "POST" }); } catch {}
        clearToken();
        renderAdminLogin("You have been signed out.");
    });

    bootstrap();
});
