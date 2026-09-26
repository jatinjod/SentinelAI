const API_BASE_URL = "https://sentinelai-backend-pwur.onrender.com";
const TOKEN_KEY = "sentinelai_session_token";
const state = { users: [], search: "" };

function token() {
    return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY) || "";
}

async function api(path, options = {}) {
    const headers = { Accept: "application/json", ...(options.headers || {}) };
    const session = token();
    if (session) headers.Authorization = `Bearer ${session}`;
    if (options.body) headers["Content-Type"] = "application/json";

    const response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers,
        credentials: "include"
    });

    let data = {};
    try { data = await response.json(); } catch {}
    if (!response.ok) {
        throw new Error(data?.detail || `Request failed (${response.status})`);
    }
    return data;
}

async function bootstrap() {
    try {
        const me = await api("/api/v1/admin/me");
        if (!me.is_admin) throw new Error("Administrator access required.");
        await renderDashboard();
    } catch (error) {
        document.getElementById("content").innerHTML = `
            <div class="denied">
                <h2>Admin access required</h2>
                <p>${escapeHtml(error.message)}</p>
                <p class="auth-help">Open SentinelAI, sign in, then return to Admin Panel.</p>
                <a href="index.html">Sign in to SentinelAI</a>
            </div>`;
    }
}

async function renderDashboard() {
    document.getElementById("content").innerHTML = `
        <div id="stats" class="stats"></div>
        <div class="grid-2">
            <section class="card">
                <div class="card-header">
                    <div><h2>User management</h2><p>Control access, roles and GitHub connections.</p></div>
                    <input id="userSearch" class="search" type="search" placeholder="Search users" />
                </div>
                <div id="users" class="users">Loading…</div>
            </section>
            <section class="card">
                <div class="card-header"><div><h2>Security posture</h2><p>Platform-wide finding severity.</p></div></div>
                <div id="security" class="security">Loading…</div>
            </section>
        </div>
        <div class="grid-bottom">
            <section class="card"><div class="card-header"><div><h2>Recent scans</h2><p>Latest scan activity.</p></div></div><div id="scans" class="activity">Loading…</div></section>
            <section class="card"><div class="card-header"><div><h2>Recent pull requests</h2><p>Latest GitHub remediation activity.</p></div></div><div id="prs" class="activity">Loading…</div></section>
        </div>
    `;

    document.getElementById("userSearch")?.addEventListener("input", debounce(async (event) => {
        state.search = event.target.value.trim();
        await loadUsers();
    }, 250));

    await loadOverview();
    await loadUsers();
}

async function loadOverview() {
    const data = await api("/api/v1/admin/overview");
    const s = data.stats || {};
    const cards = [
        ["Users", s.total_users, "total accounts"],
        ["Active", s.active_users, "enabled accounts"],
        ["GitHub", s.github_users, "connected accounts"],
        ["Repositories", s.repositories, "connected repos"],
        ["Scans", s.scans, `${s.completed_scans} completed`],
        ["Findings", s.vulnerabilities, "security findings"],
        ["AI Fixes", s.fixes, `${s.applied_fixes} applied`],
        ["Pull Requests", s.pull_requests, `${s.merged_prs} merged`]
    ];
    document.getElementById("stats").innerHTML = cards.map(([label,value,meta]) => `
        <div class="stat"><span>${label}</span><strong>${value ?? 0}</strong><small>${meta}</small></div>
    `).join("");

    const sev = data.severity || {};
    const max = Math.max(...Object.values(sev).map(Number), 1);
    document.getElementById("security").innerHTML = [
        ["Critical", sev.critical || 0, "critical"],
        ["High", sev.high || 0, "high"],
        ["Medium", sev.medium || 0, "medium"],
        ["Low", sev.low || 0, "low"]
    ].map(([label,value,cls]) => `
        <div class="meter ${cls}"><div class="meter-head"><span>${label}</span><strong>${value}</strong></div><div class="bar"><i style="width:${Math.max(4, Math.round((Number(value)/max)*100))}%"></i></div></div>
    `).join("");

    document.getElementById("scans").innerHTML = renderActivity(data.recent_scans, "scan");
    document.getElementById("prs").innerHTML = renderActivity(data.recent_pull_requests, "pr");
}

function renderActivity(items = [], type) {
    if (!items.length) return `<div class="empty">No activity yet.</div>`;
    return items.map((item) => {
        const title = type === "scan" ? item.repository : item.title;
        const meta = type === "scan" ? `${item.user} · ${item.status}` : `${item.repository} · ${item.user}`;
        const status = type === "scan" ? item.status : item.status;
        return `<div class="activity-row"><div><strong>${escapeHtml(title)}</strong><small>${escapeHtml(meta)}</small></div><span class="pill ${status === "merged" || status === "completed" ? "active" : "disabled"}">${escapeHtml(status)}</span></div>`;
    }).join("");
}

async function loadUsers() {
    const list = document.getElementById("users");
    list.textContent = "Loading…";
    try {
        const data = await api(`/api/v1/admin/users${state.search ? `?search=${encodeURIComponent(state.search)}` : ""}`);
        state.users = data.users || [];
        if (!state.users.length) {
            list.innerHTML = `<div class="empty">No users found.</div>`;
            return;
        }
        list.innerHTML = state.users.map(renderUser).join("");
        list.querySelectorAll("[data-action]").forEach((button) => button.addEventListener("click", handleAction));
    } catch (error) {
        list.innerHTML = `<div class="empty">${escapeHtml(error.message)}</div>`;
    }
}

function renderUser(user) {
    const initial = escapeHtml(String(user.name || "S").trim().charAt(0).toUpperCase());
    return `
        <article class="user ${user.is_active ? "" : "disabled"}">
            <div class="user-main">
                <div class="avatar">${initial}</div>
                <div>
                    <div class="user-name"><strong>${escapeHtml(user.name)}</strong>${user.is_admin ? '<span class="pill admin">Admin</span>' : ''}<span class="pill ${user.is_active ? 'active' : 'disabled'}">${user.is_active ? 'Active' : 'Disabled'}</span></div>
                    <div class="user-line">${escapeHtml(user.email || user.username)}</div>
                    <div class="user-meta"><span>${user.github_connected ? `GitHub @${escapeHtml(user.username)}` : 'GitHub not connected'}</span><span>${user.repository_count} repos</span><span>${user.scan_count} scans</span></div>
                </div>
            </div>
            <div class="actions">
                <button class="action" data-action="status" data-id="${user.id}" data-value="${user.is_active}">${user.is_active ? 'Disable' : 'Enable'}</button>
                <button class="action" data-action="role" data-id="${user.id}" data-value="${user.is_admin}">${user.is_admin ? 'Remove admin' : 'Make admin'}</button>
                ${user.github_connected ? `<button class="action danger" data-action="github" data-id="${user.id}">Revoke GitHub</button>` : ''}
            </div>
        </article>`;
}

async function handleAction(event) {
    const b = event.currentTarget;
    const id = Number(b.dataset.id);
    const action = b.dataset.action;
    try {
        if (action === "status") {
            const next = b.dataset.value !== "true";
            if (!confirm(next ? "Enable this account?" : "Disable this account?")) return;
            await api(`/api/v1/admin/users/${id}/status`, { method:"PATCH", body:JSON.stringify({is_active: next}) });
        }
        if (action === "role") {
            const next = b.dataset.value !== "true";
            if (!confirm(next ? "Grant administrator access?" : "Remove administrator access?")) return;
            await api(`/api/v1/admin/users/${id}/role`, { method:"PATCH", body:JSON.stringify({is_admin: next}) });
        }
        if (action === "github") {
            if (!confirm("Revoke this user's GitHub connection?")) return;
            await api(`/api/v1/admin/users/${id}/github`, { method:"DELETE" });
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
    toast.textContent = message;
    toast.hidden = false;
    toast.style.borderLeft = `3px solid ${error ? "var(--danger)" : "var(--success)"}`;
    clearTimeout(window.__toastTimer);
    window.__toastTimer = setTimeout(() => toast.hidden = true, 3200);
}

function escapeHtml(value) {
    return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function debounce(fn, delay) {
    let timer;
    return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); };
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("logoutButton")?.addEventListener("click", async () => {
        try { await api("/api/v1/auth/logout", { method:"POST" }); } catch {}
        sessionStorage.removeItem(TOKEN_KEY); localStorage.removeItem(TOKEN_KEY);
        window.location.href = "index.html";
    });
    bootstrap();
});
