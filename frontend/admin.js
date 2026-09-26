const API_BASE_URL = "https://sentinelai-backend-pwur.onrender.com";
const TOKEN_KEY = "sentinelai_session_token";
const state = { users: [], search: "" };

function getToken() {
    return (
        sessionStorage.getItem(TOKEN_KEY) ||
        localStorage.getItem(TOKEN_KEY) ||
        ""
    );
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
    const headers = {
        Accept: "application/json",
        ...(options.headers || {})
    };

    const token = getToken();

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    if (options.body) {
        headers["Content-Type"] = "application/json";
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers,
        credentials: "include"
    });

    let data = {};

    try {
        data = await response.json();
    } catch {
        data = {};
    }

    if (!response.ok) {
        throw new Error(
            data?.detail ||
            `Request failed (${response.status})`
        );
    }

    return data;
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
                <input
                    id="adminEmail"
                    type="email"
                    autocomplete="email"
                    placeholder="you@example.com"
                    required
                />
                <span id="adminEmailError" class="field-error"></span>

                <label for="adminPassword">Password</label>
                <div class="admin-password-wrap">
                    <input
                        id="adminPassword"
                        type="password"
                        autocomplete="current-password"
                        placeholder="Your password"
                        required
                    />
                    <button id="adminPasswordToggle" type="button" class="password-toggle">Show</button>
                </div>
                <span id="adminPasswordError" class="field-error"></span>

                <div id="adminLoginMessage" class="admin-login-message" role="alert">${escapeHtml(message)}</div>

                <button id="adminLoginSubmit" class="primary-admin-button" type="submit">
                    Sign in to Admin Panel
                </button>
            </form>

            <div class="admin-login-note">
                Administrator access is controlled by your SentinelAI account role or the configured ADMIN_EMAIL.
            </div>
        </section>
    `;

    const form = document.getElementById("adminLoginForm");
    const toggle = document.getElementById("adminPasswordToggle");
    const password = document.getElementById("adminPassword");

    form?.addEventListener("submit", handleAdminLogin);
    toggle?.addEventListener("click", () => {
        if (!password) return;
        const visible = password.type === "text";
        password.type = visible ? "password" : "text";
        toggle.textContent = visible ? "Show" : "Hide";
    });
}

async function handleAdminLogin(event) {
    event.preventDefault();

    const emailInput = document.getElementById("adminEmail");
    const passwordInput = document.getElementById("adminPassword");
    const emailError = document.getElementById("adminEmailError");
    const passwordError = document.getElementById("adminPasswordError");
    const message = document.getElementById("adminLoginMessage");
    const submit = document.getElementById("adminLoginSubmit");

    const email = String(emailInput?.value || "").trim();
    const password = String(passwordInput?.value || "");

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
        submit.textContent = "Signing in...";
    }

    try {
        const result = await api("/api/v1/auth/login", {
            method: "POST",
            body: JSON.stringify({ email, password })
        });

        setToken(result.session_token);

        const admin = await api("/api/v1/admin/me");

        if (!admin.is_admin) {
            clearToken();
            throw new Error("Administrator access required for this account.");
        }

        renderDashboard();
    } catch (error) {
        console.error("Admin login failed:", error);

        const text = error.message || "Unable to sign in.";

        if (/invalid email or password/i.test(text)) {
            if (message) message.textContent = "Incorrect email or password.";
        } else if (/administrator access required/i.test(text)) {
            if (message) message.textContent = "This account does not have administrator access.";
            clearToken();
        } else {
            if (message) message.textContent = text;
        }
    } finally {
        if (submit) {
            submit.disabled = false;
            submit.textContent = "Sign in to Admin Panel";
        }
    }
}

async function bootstrap() {
    const token = getToken();

    if (!token) {
        renderAdminLogin();
        return;
    }

    try {
        const me = await api("/api/v1/admin/me");

        if (!me.is_admin) {
            clearToken();
            renderAdminLogin("This account does not have administrator access.");
            return;
        }

        await renderDashboard();
    } catch (error) {
        console.warn("Admin session check failed:", error);
        clearToken();
        renderAdminLogin();
    }
}

async function renderDashboard() {
    const content = document.getElementById("content");

    if (!content) return;

    content.innerHTML = `
        <div id="stats" class="stats"></div>
        <div class="grid-2">
            <section class="card">
                <div class="card-header">
                    <div>
                        <h2>User management</h2>
                        <p>Control access, roles and GitHub connections.</p>
                    </div>
                    <input id="userSearch" class="search" type="search" placeholder="Search users" />
                </div>
                <div id="users" class="users">Loading…</div>
            </section>
            <section class="card">
                <div class="card-header">
                    <div>
                        <h2>Security posture</h2>
                        <p>Platform-wide finding severity.</p>
                    </div>
                </div>
                <div id="security" class="security">Loading…</div>
            </section>
        </div>
        <div class="grid-bottom">
            <section class="card">
                <div class="card-header">
                    <div><h2>Recent scans</h2><p>Latest scan activity.</p></div>
                </div>
                <div id="scans" class="activity">Loading…</div>
            </section>
            <section class="card">
                <div class="card-header">
                    <div><h2>Recent pull requests</h2><p>Latest GitHub remediation activity.</p></div>
                </div>
                <div id="prs" class="activity">Loading…</div>
            </section>
        </div>
    `;

    document.getElementById("userSearch")?.addEventListener(
        "input",
        debounce(async (event) => {
            state.search = event.target.value.trim();
            await loadUsers();
        }, 250)
    );

    try {
        await loadOverview();
        await loadUsers();
    } catch (error) {
        content.innerHTML = `
            <div class="denied">
                <h2>Unable to load admin data</h2>
                <p>${escapeHtml(error.message)}</p>
                <button id="retryAdmin" class="denied-button" type="button">Retry</button>
            </div>
        `;
        document.getElementById("retryAdmin")?.addEventListener("click", bootstrap);
    }
}

async function loadOverview() {
    const data = await api("/api/v1/admin/overview");
    const s = data.stats || {};

    const cards = [
        ["Users", s.total_users, "total accounts"],
        ["Active", s.active_users, "enabled accounts"],
        ["GitHub", s.github_users, "connected accounts"],
        ["Repositories", s.repositories, "connected repos"],
        ["Scans", s.scans, `${s.completed_scans ?? 0} completed`],
        ["Findings", s.vulnerabilities, "security findings"],
        ["AI Fixes", s.fixes, `${s.applied_fixes ?? 0} applied`],
        ["Pull Requests", s.pull_requests, `${s.merged_prs ?? 0} merged`]
    ];

    document.getElementById("stats").innerHTML = cards.map(
        ([label, value, meta]) => `
            <div class="stat">
                <span>${escapeHtml(label)}</span>
                <strong>${value ?? 0}</strong>
                <small>${escapeHtml(meta)}</small>
            </div>
        `
    ).join("");

    const severity = data.severity || {};
    const max = Math.max(...Object.values(severity).map(Number), 1);

    document.getElementById("security").innerHTML = [
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

    document.getElementById("scans").innerHTML = renderActivity(
        data.recent_scans,
        "scan"
    );

    document.getElementById("prs").innerHTML = renderActivity(
        data.recent_pull_requests,
        "pr"
    );
}

function renderActivity(items = [], type) {
    if (!items.length) {
        return `<div class="empty">No activity yet.</div>`;
    }

    return items.map((item) => {
        const title = type === "scan" ? item.repository : item.title;
        const meta = type === "scan"
            ? `${item.user} · ${item.status}`
            : `${item.repository} · ${item.user}`;
        const status = item.status;

        return `
            <div class="activity-row">
                <div>
                    <strong>${escapeHtml(title)}</strong>
                    <small>${escapeHtml(meta)}</small>
                </div>
                <span class="pill ${status === "merged" || status === "completed" ? "active" : "disabled"}">
                    ${escapeHtml(status)}
                </span>
            </div>
        `;
    }).join("");
}

async function loadUsers() {
    const list = document.getElementById("users");
    if (!list) return;

    list.textContent = "Loading…";

    try {
        const data = await api(
            `/api/v1/admin/users${state.search ? `?search=${encodeURIComponent(state.search)}` : ""}`
        );

        state.users = data.users || [];

        if (!state.users.length) {
            list.innerHTML = `<div class="empty">No users found.</div>`;
            return;
        }

        list.innerHTML = state.users.map(renderUser).join("");
        list.querySelectorAll("[data-action]").forEach((button) => {
            button.addEventListener("click", handleAction);
        });
    } catch (error) {
        list.innerHTML = `<div class="empty">${escapeHtml(error.message)}</div>`;
    }
}

function renderUser(user) {
    const initial = escapeHtml(
        String(user.name || "S").trim().charAt(0).toUpperCase()
    );

    return `
        <article class="user ${user.is_active ? "" : "disabled"}">
            <div class="user-main">
                <div class="avatar">${initial}</div>
                <div>
                    <div class="user-name">
                        <strong>${escapeHtml(user.name)}</strong>
                        ${user.is_admin ? '<span class="pill admin">Admin</span>' : ''}
                        <span class="pill ${user.is_active ? "active" : "disabled"}">
                            ${user.is_active ? "Active" : "Disabled"}
                        </span>
                    </div>
                    <div class="user-line">${escapeHtml(user.email || user.username)}</div>
                    <div class="user-meta">
                        <span>${user.github_connected ? `GitHub @${escapeHtml(user.username)}` : "GitHub not connected"}</span>
                        <span>${user.repository_count} repos</span>
                        <span>${user.scan_count} scans</span>
                    </div>
                </div>
            </div>
            <div class="actions">
                <button class="action" data-action="status" data-id="${user.id}" data-value="${user.is_active}">
                    ${user.is_active ? "Disable" : "Enable"}
                </button>
                <button class="action" data-action="role" data-id="${user.id}" data-value="${user.is_admin}">
                    ${user.is_admin ? "Remove admin" : "Make admin"}
                </button>
                ${user.github_connected ? `<button class="action danger" data-action="github" data-id="${user.id}">Revoke GitHub</button>` : ""}
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
            await api(`/api/v1/admin/users/${id}/status`, {
                method: "PATCH",
                body: JSON.stringify({ is_active: next })
            });
        }

        if (action === "role") {
            const next = button.dataset.value !== "true";
            if (!confirm(next ? "Grant administrator access?" : "Remove administrator access?")) return;
            await api(`/api/v1/admin/users/${id}/role`, {
                method: "PATCH",
                body: JSON.stringify({ is_admin: next })
            });
        }

        if (action === "github") {
            if (!confirm("Revoke this user's GitHub connection?")) return;
            await api(`/api/v1/admin/users/${id}/github`, {
                method: "DELETE"
            });
        }

        showToast("Admin action completed.");
        await loadOverview();
        await loadUsers();
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
    window.__toastTimer = setTimeout(() => {
        toast.hidden = true;
    }, 3200);
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
        try {
            await api("/api/v1/auth/logout", { method: "POST" });
        } catch {}
        clearToken();
        renderAdminLogin("You have been signed out.");
    });

    bootstrap();
});
