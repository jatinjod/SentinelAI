const SETTINGS_STYLE_ID = "sentinel-settings-styles";


export async function render(container) {
    injectSettingsStyles();

    container.innerHTML = `
        <section class="settings-page">
            <div class="settings-hero">
                <div>
                    <span class="settings-eyebrow">SETTINGS</span>
                    <h2>Account Control Center</h2>
                    <p>
                        Manage your profile, security, GitHub connection,
                        preferences and account data from one place.
                    </p>
                </div>
                <div class="settings-hero-badge">
                    <span class="settings-status-dot"></span>
                    Account active
                </div>
            </div>

            <div class="settings-grid">
                <aside class="settings-nav-card">
                    <button class="settings-tab active" data-settings-tab="profile">
                        <span>👤</span>
                        <span>
                            <strong>Profile</strong>
                            <small>Personal details</small>
                        </span>
                    </button>

                    <button class="settings-tab" data-settings-tab="security">
                        <span>🔐</span>
                        <span>
                            <strong>Security</strong>
                            <small>Password & access</small>
                        </span>
                    </button>

                    <button class="settings-tab" data-settings-tab="github">
                        <span>⌘</span>
                        <span>
                            <strong>GitHub</strong>
                            <small>Repositories & OAuth</small>
                        </span>
                    </button>

                    <button class="settings-tab" data-settings-tab="preferences">
                        <span>⚙</span>
                        <span>
                            <strong>Preferences</strong>
                            <small>Appearance & behavior</small>
                        </span>
                    </button>

                    <button class="settings-tab" data-settings-tab="data">
                        <span>🗂</span>
                        <span>
                            <strong>Data & Privacy</strong>
                            <small>Export & account</small>
                        </span>
                    </button>

                    <button class="settings-tab settings-admin-tab" data-settings-tab="admin" hidden style="display:none" aria-hidden="true">
                        <span>🛡</span>
                        <span>
                            <strong>Admin Panel</strong>
                            <small>Platform controls</small>
                        </span>
                    </button>
                </aside>

                <div class="settings-content">
                    <section class="settings-section active" data-settings-section="profile">
                        <div class="settings-section-head">
                            <div>
                                <h3>Profile</h3>
                                <p>Keep your SentinelAI identity and contact details up to date.</p>
                            </div>
                        </div>

                        <div id="settingsProfileState" class="settings-state-card">
                            Loading account details...
                        </div>

                        <form id="settingsProfileForm" class="settings-form" novalidate>
                            <div class="settings-two-col">
                                <label class="settings-field">
                                    <span>Display name</span>
                                    <input id="settingsName" type="text" maxlength="100" autocomplete="name" placeholder="Your name">
                                    <small id="settingsNameError" class="settings-error"></small>
                                </label>

                                <label class="settings-field">
                                    <span>Email address</span>
                                    <input id="settingsEmail" type="email" maxlength="255" autocomplete="email" placeholder="you@example.com">
                                    <small id="settingsEmailError" class="settings-error"></small>
                                </label>
                            </div>

                            <div class="settings-readonly-grid">
                                <div class="settings-readonly-item">
                                    <span>SentinelAI username</span>
                                    <strong id="settingsUsername">—</strong>
                                </div>
                                <div class="settings-readonly-item">
                                    <span>Account created</span>
                                    <strong id="settingsCreatedAt">—</strong>
                                </div>
                                <div class="settings-readonly-item">
                                    <span>Account ID</span>
                                    <strong id="settingsAccountId">—</strong>
                                </div>
                            </div>

                            <div class="settings-actions">
                                <button type="submit" class="primary-button" id="saveProfileButton">
                                    Save changes
                                </button>
                                <button type="button" class="secondary-button" id="resetProfileButton">
                                    Reset
                                </button>
                            </div>
                        </form>
                    </section>

                    <section class="settings-section" data-settings-section="security">
                        <div class="settings-section-head">
                            <div>
                                <h3>Security</h3>
                                <p>Update your password without ever exposing the current password.</p>
                            </div>
                        </div>

                        <div id="settingsPasswordNotice" class="settings-info-card"></div>

                        <form id="settingsPasswordForm" class="settings-form" novalidate>
                            <label class="settings-field" id="currentPasswordField">
                                <span>Current password</span>
                                <div class="settings-password-wrap">
                                    <input id="currentPassword" type="password" autocomplete="current-password" placeholder="Enter current password">
                                    <button type="button" class="settings-eye" data-toggle-password="currentPassword">Show</button>
                                </div>
                                <small id="currentPasswordError" class="settings-error"></small>
                            </label>

                            <div class="settings-two-col">
                                <label class="settings-field">
                                    <span>New password</span>
                                    <div class="settings-password-wrap">
                                        <input id="newPassword" type="password" autocomplete="new-password" placeholder="At least 8 characters">
                                        <button type="button" class="settings-eye" data-toggle-password="newPassword">Show</button>
                                    </div>
                                    <small id="newPasswordError" class="settings-error"></small>
                                </label>

                                <label class="settings-field">
                                    <span>Confirm new password</span>
                                    <div class="settings-password-wrap">
                                        <input id="confirmPassword" type="password" autocomplete="new-password" placeholder="Repeat new password">
                                        <button type="button" class="settings-eye" data-toggle-password="confirmPassword">Show</button>
                                    </div>
                                    <small id="confirmPasswordError" class="settings-error"></small>
                                </label>
                            </div>

                            <div class="settings-actions">
                                <button type="submit" class="primary-button" id="changePasswordButton">
                                    Update password
                                </button>
                                <button type="button" class="secondary-button" id="clearPasswordFormButton">
                                    Clear
                                </button>
                            </div>
                        </form>

                        <div class="settings-security-cards">
                            <div class="settings-mini-card">
                                <strong>Session protection</strong>
                                <p>Your session is protected by an authenticated SentinelAI session.</p>
                                <span class="settings-pill success">Active</span>
                            </div>
                            <div class="settings-mini-card">
                                <strong>Password visibility</strong>
                                <p>SentinelAI never shows your actual stored password. Only masked input fields are used.</p>
                                <span class="settings-pill">Protected</span>
                            </div>
                        </div>
                    </section>

                    <section class="settings-section" data-settings-section="github">
                        <div class="settings-section-head">
                            <div>
                                <h3>GitHub</h3>
                                <p>Manage the GitHub account that powers scanning, fixes and pull requests.</p>
                            </div>
                        </div>

                        <div id="settingsGithubCard" class="settings-github-card"></div>

                        <div class="settings-info-card">
                            <strong>What GitHub access is used for?</strong>
                            <p>
                                SentinelAI uses your authorized GitHub connection to read repositories,
                                run scans, create AI-generated fixes and open pull requests on your behalf.
                            </p>
                        </div>
                    </section>

                    <section class="settings-section" data-settings-section="preferences">
                        <div class="settings-section-head">
                            <div>
                                <h3>Preferences</h3>
                                <p>Customize how SentinelAI looks and behaves on your device.</p>
                            </div>
                        </div>

                        <div class="settings-preference-list">
                            <div class="settings-preference-row">
                                <div>
                                    <strong>Theme</strong>
                                    <p>Choose the interface appearance.</p>
                                </div>
                                <select id="themePreference" class="settings-select">
                                    <option value="dark">Dark</option>
                                    <option value="light">Light</option>
                                    <option value="system">System</option>
                                </select>
                            </div>

                            <div class="settings-preference-row">
                                <div>
                                    <strong>Compact layout</strong>
                                    <p>Reduce spacing for more information on screen.</p>
                                </div>
                                <label class="settings-switch">
                                    <input id="compactPreference" type="checkbox">
                                    <span></span>
                                </label>
                            </div>

                            <div class="settings-preference-row">
                                <div>
                                    <strong>Confirm security actions</strong>
                                    <p>Ask for confirmation before applying a security fix.</p>
                                </div>
                                <label class="settings-switch">
                                    <input id="confirmFixPreference" type="checkbox">
                                    <span></span>
                                </label>
                            </div>

                            <div class="settings-preference-row">
                                <div>
                                    <strong>Reduce motion</strong>
                                    <p>Minimize interface animations and transitions.</p>
                                </div>
                                <label class="settings-switch">
                                    <input id="reduceMotionPreference" type="checkbox">
                                    <span></span>
                                </label>
                            </div>

                            <div class="settings-preference-row">
                                <div>
                                    <strong>Remember last workspace</strong>
                                    <p>Return to the last selected area after sign-in.</p>
                                </div>
                                <label class="settings-switch">
                                    <input id="rememberWorkspacePreference" type="checkbox">
                                    <span></span>
                                </label>
                            </div>
                        </div>

                        <div class="settings-actions">
                            <button type="button" class="secondary-button" id="resetPreferencesButton">
                                Reset preferences
                            </button>
                        </div>
                    </section>

                    <section class="settings-section" data-settings-section="data">
                        <div class="settings-section-head">
                            <div>
                                <h3>Data & Privacy</h3>
                                <p>Control your local preferences, export your account data or leave SentinelAI.</p>
                            </div>
                        </div>

                        <div class="settings-data-actions">
                            <div class="settings-data-card">
                                <div>
                                    <strong>Download my data</strong>
                                    <p>Export your SentinelAI profile and connected repository list as JSON.</p>
                                </div>
                                <button type="button" class="secondary-button" id="exportDataButton">
                                    Export data
                                </button>
                            </div>

                            <div class="settings-data-card">
                                <div>
                                    <strong>Sign out</strong>
                                    <p>End your current SentinelAI session on this device.</p>
                                </div>
                                <button type="button" class="secondary-button" id="settingsLogoutButton">
                                    Sign out
                                </button>
                            </div>
                        </div>

                        <div class="settings-danger-zone">
                            <div>
                                <span class="settings-danger-label">DANGER ZONE</span>
                                <h4>Delete account</h4>
                                <p>
                                    Permanently delete your Account active and stored application data.
                                    This does not delete your actual GitHub repositories.
                                </p>
                            </div>
                            <button type="button" class="settings-danger-button" id="deleteAccountButton">
                                Delete account
                            </button>
                        </div>
                    </section>

                    <section class="settings-section" data-settings-section="admin" hidden style="display:none" aria-hidden="true">
                        <div class="settings-section-head">
                            <div>
                                <h3>Admin Control Center</h3>
                                <p>Manage SentinelAI users, security activity, repositories and platform operations.</p>
                            </div>
                            <span class="settings-pill success">Administrator</span>
                        </div>

                        <div class="settings-data-card settings-admin-card">
                            <div>
                                <strong>SentinelAI Admin Panel</strong>
                                <p>
                                    Open the dedicated control center to manage platform-wide
                                    users, GitHub connections, scans, vulnerabilities, AI fixes and pull requests.
                                </p>
                            </div>

                            <a
                                class="primary-button settings-admin-open"
                                href="admin.html"
                            >
                                Open Admin Panel →
                            </a>
                        </div>

                        <div class="settings-info-card">
                            <strong>Administrator access</strong>
                            <p>
                                This area is visible only to verified administrator accounts.
                                Normal users cannot access the admin controls.
                            </p>
                        </div>
                    </section>
                </div>
            </div>
        </section>
    `;

    bindSettingsNavigation();
    bindPasswordToggles();
    // Resolve admin visibility immediately from the already-authenticated app state.
    // Do not make the settings page wait for account-data/network requests.
    loadAdminAccess();
    loadSettingsData().catch((error) => {
        console.warn("Settings data load failed:", error);
    });
    bindSettingsActions();
    loadPreferences();
}


async function loadAdminAccess() {
    const adminTab = document.querySelector(
        '.settings-admin-tab[data-settings-tab="admin"]'
    );

    const adminSection = document.querySelector(
        '[data-settings-section="admin"]'
    );

    if (!adminTab || !adminSection) {
        return;
    }

    const hideAdminUi = () => {
        adminTab.hidden = true;
        adminTab.style.display = "none";
        adminTab.setAttribute("aria-hidden", "true");
        adminSection.hidden = true;
        adminSection.style.display = "none";
        adminSection.setAttribute("aria-hidden", "true");
        if (adminTab.classList.contains("active")) {
            adminTab.classList.remove("active");
        }
    };

    const showAdminUi = () => {
        adminTab.hidden = false;
        adminTab.style.display = "flex";
        adminTab.setAttribute("aria-hidden", "false");
        adminSection.hidden = false;
        adminSection.style.display = "none";
        adminSection.setAttribute("aria-hidden", "false");
    };

    // No network wait for the first paint. The main app stores this flag only
    // after /auth/me has confirmed the current account. The admin endpoint
    // below still verifies the role in the background.
    const localAdminHint = localStorage.getItem("sentinelai_is_admin") === "1";
    const currentUserAdmin = window.__sentinelUser?.is_admin === true;

    if (localAdminHint || currentUserAdmin) {
        showAdminUi();
    } else {
        hideAdminUi();
    }

    try {
        const API_BASE_URL =
            window.API_BASE_URL ||
            "https://sentinelai-backend-pwur.onrender.com";

        const token =
            sessionStorage.getItem("sentinelai_session_token") ||
            localStorage.getItem("sentinelai_session_token") ||
            "";

        const headers = { Accept: "application/json" };
        if (token) headers.Authorization = `Bearer ${token}`;

        const response = await fetch(
            `${API_BASE_URL}/api/v1/admin/me`,
            {
                method: "GET",
                headers,
                credentials: "include",
                cache: "no-store"
            }
        );

        if (!response.ok) {
            hideAdminUi();
            return;
        }

        const data = await response.json();
        if (data?.is_admin === true) {
            showAdminUi();
            localStorage.setItem("sentinelai_is_admin", "1");
        } else {
            hideAdminUi();
            localStorage.setItem("sentinelai_is_admin", "0");
        }
    } catch (error) {
        console.warn("Admin access check failed:", error);
        // Keep a server-confirmed admin hint through transient network issues,
        // but never reveal the controls for accounts without the hint.
        if (!(localAdminHint || currentUserAdmin)) {
            hideAdminUi();
        }
    }
}


function bindSettingsNavigation() {
    document.querySelectorAll("[data-settings-tab]").forEach((button) => {
        button.addEventListener("click", () => {
            const tab = button.dataset.settingsTab;

            document.querySelectorAll("[data-settings-tab]").forEach((item) => {
                item.classList.toggle("active", item === button);
            });

            document.querySelectorAll("[data-settings-section]").forEach((section) => {
                section.classList.toggle(
                    "active",
                    section.dataset.settingsSection === tab
                );
            });
        });
    });
}


function bindPasswordToggles() {
    document.querySelectorAll("[data-toggle-password]").forEach((button) => {
        button.addEventListener("click", () => {
            const targetId = button.dataset.togglePassword;
            const input = document.getElementById(targetId);

            if (!input) return;

            const visible = input.type === "text";
            input.type = visible ? "password" : "text";
            button.textContent = visible ? "Show" : "Hide";
        });
    });
}


async function loadSettingsData() {
    try {
        const session = await window.getCurrentUser();

        if (!session.authenticated || !session.user) {
            throw new Error("Your SentinelAI session is no longer active.");
        }

        const user = session.user;

        document.getElementById("settingsName").value = user.name || user.username || "";
        document.getElementById("settingsEmail").value = user.email || "";
        document.getElementById("settingsUsername").textContent = `@${user.username || "—"}`;
        document.getElementById("settingsAccountId").textContent = String(user.id ?? "—");
        document.getElementById("settingsCreatedAt").textContent = formatDate(user.created_at);

        document.getElementById("settingsProfileState").innerHTML = `
            <div class="settings-profile-summary">
                <div class="settings-avatar">
                    ${(user.name || user.username || "S").charAt(0).toUpperCase()}
                </div>
                <div>
                    <strong>${escapeHtml(user.name || user.username || "SentinelAI user")}</strong>
                    <span>${escapeHtml(user.email || "No email added")}</span>
                </div>
                <span class="settings-pill success">Signed in</span>
            </div>
        `;

        document.getElementById("settingsPasswordNotice").innerHTML = user.has_password
            ? `
                <strong>Password login is enabled.</strong>
                <p>Keep your password private. You can change it below at any time.</p>
            `
            : `
                <strong>Password login is not enabled yet.</strong>
                <p>You signed in with GitHub. Set a password below to enable email + password login as a backup method.</p>
            `;

        const currentPasswordField = document.getElementById("currentPasswordField");
        if (user.has_password) {
            currentPasswordField.style.display = "block";
        } else {
            currentPasswordField.style.display = "none";
        }

        renderGithubCard(session);
    } catch (error) {
        document.getElementById("settingsProfileState").innerHTML = `
            <div class="settings-error-state">
                <strong>Unable to load account details.</strong>
                <span>${escapeHtml(error.message)}</span>
            </div>
        `;
    }
}


function renderGithubCard(session) {
    const element = document.getElementById("settingsGithubCard");

    if (!session.github_connected) {
        element.innerHTML = `
            <div class="settings-github-main">
                <div class="settings-github-icon">⌘</div>
                <div>
                    <strong>GitHub is not connected</strong>
                    <p>Connect GitHub to scan repositories, generate fixes and create pull requests.</p>
                </div>
                <button type="button" class="primary-button" id="settingsConnectGithubButton">
                    Connect GitHub
                </button>
            </div>
        `;

        document.getElementById("settingsConnectGithubButton")?.addEventListener(
            "click",
            () => window.connectGitHub()
        );
        return;
    }

    const githubUsername = session.user?.github_username || session.user?.username || "Connected";

    element.innerHTML = `
        <div class="settings-github-main">
            <div class="settings-github-icon">✓</div>
            <div>
                <strong>GitHub connected</strong>
                <p>@${escapeHtml(githubUsername)} is connected to this Account active.</p>
            </div>
            <span class="settings-pill success">Connected</span>
        </div>
        <div class="settings-github-actions">
            <button type="button" class="secondary-button" id="settingsSyncGithubButton">
                Sync repositories
            </button>
            <button type="button" class="settings-danger-outline" id="settingsDisconnectGithubButton">
                Disconnect GitHub
            </button>
        </div>
        <p class="settings-note">
            You must have an email/password login method enabled before disconnecting GitHub.
        </p>
    `;

    document.getElementById("settingsSyncGithubButton")?.addEventListener(
        "click",
        syncGithub
    );

    document.getElementById("settingsDisconnectGithubButton")?.addEventListener(
        "click",
        disconnectGithub
    );
}


function bindSettingsActions() {
    document.getElementById("settingsProfileForm")?.addEventListener(
        "submit",
        saveProfile
    );

    document.getElementById("resetProfileButton")?.addEventListener(
        "click",
        loadSettingsData
    );

    document.getElementById("settingsPasswordForm")?.addEventListener(
        "submit",
        changePassword
    );

    document.getElementById("clearPasswordFormButton")?.addEventListener(
        "click",
        () => {
            document.getElementById("settingsPasswordForm").reset();
            clearFieldErrors();
        }
    );

    document.getElementById("resetPreferencesButton")?.addEventListener(
        "click",
        resetPreferences
    );

    document.getElementById("exportDataButton")?.addEventListener(
        "click",
        exportData
    );

    document.getElementById("settingsLogoutButton")?.addEventListener(
        "click",
        logoutUser
    );

    document.getElementById("deleteAccountButton")?.addEventListener(
        "click",
        deleteAccount
    );

    [
        ["themePreference", applyPreferences],
        ["compactPreference", applyPreferences],
        ["confirmFixPreference", applyPreferences],
        ["reduceMotionPreference", applyPreferences],
        ["rememberWorkspacePreference", applyPreferences]
    ].forEach(([id, handler]) => {
        document.getElementById(id)?.addEventListener("change", handler);
    });
}


async function saveProfile(event) {
    event.preventDefault();
    clearFieldErrors();

    const name = document.getElementById("settingsName").value.trim();
    const email = document.getElementById("settingsEmail").value.trim();

    let invalid = false;

    if (name.length < 2) {
        setFieldError("settingsNameError", "Enter your name.");
        invalid = true;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setFieldError("settingsEmailError", "Enter a valid email address.");
        invalid = true;
    }

    if (invalid) return;

    const button = document.getElementById("saveProfileButton");
    button.disabled = true;
    button.textContent = "Saving...";

    try {
        const result = await window.apiRequest(
            "/api/v1/auth/profile",
            {
                method: "PATCH",
                body: JSON.stringify({ name, email })
            }
        );

        window.showToast(result.message || "Profile updated successfully.", "success");
        await loadSettingsData();
    } catch (error) {
        const message = error.message || "Unable to update profile.";

        if (message.toLowerCase().includes("email")) {
            setFieldError("settingsEmailError", message);
        } else {
            window.showToast(message, "error");
        }
    } finally {
        button.disabled = false;
        button.textContent = "Save changes";
    }
}


async function changePassword(event) {
    event.preventDefault();
    clearFieldErrors();

    const currentPassword = document.getElementById("currentPassword").value;
    const newPassword = document.getElementById("newPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    if (currentPassword === "" && document.getElementById("currentPasswordField").style.display !== "none") {
        setFieldError("currentPasswordError", "Enter your current password.");
        return;
    }

    if (newPassword.length < 8) {
        setFieldError("newPasswordError", "Password must be at least 8 characters.");
        return;
    }

    if (newPassword !== confirmPassword) {
        setFieldError("confirmPasswordError", "Passwords do not match.");
        return;
    }

    const button = document.getElementById("changePasswordButton");
    button.disabled = true;
    button.textContent = "Updating...";

    try {
        const result = await window.apiRequest(
            "/api/v1/auth/password",
            {
                method: "PATCH",
                body: JSON.stringify({
                    current_password: currentPassword || null,
                    new_password: newPassword,
                    confirm_password: confirmPassword
                })
            }
        );

        window.showToast(result.message || "Password updated successfully.", "success");
        document.getElementById("settingsPasswordForm").reset();
        await loadSettingsData();
    } catch (error) {
        const message = error.message || "Unable to update password.";

        if (message.toLowerCase().includes("current password")) {
            setFieldError("currentPasswordError", message);
        } else if (message.toLowerCase().includes("match")) {
            setFieldError("confirmPasswordError", message);
        } else {
            setFieldError("newPasswordError", message);
        }
    } finally {
        button.disabled = false;
        button.textContent = "Update password";
    }
}


async function syncGithub() {
    const button = document.getElementById("settingsSyncGithubButton");
    if (!button) return;

    button.disabled = true;
    button.textContent = "Syncing...";

    try {
        const result = await window.syncGitHubRepositories();
        window.showToast(
            result.message || "GitHub repositories synced successfully.",
            "success"
        );
    } catch (error) {
        window.showToast(error.message, "error");
    } finally {
        button.disabled = false;
        button.textContent = "Sync repositories";
    }
}


async function disconnectGithub() {
    const confirmed = window.confirm(
        "Disconnect GitHub from this Account active? Your GitHub repositories will no longer be available until you connect again."
    );

    if (!confirmed) return;

    try {
        const result = await window.apiRequest(
            "/api/v1/auth/github",
            { method: "DELETE" }
        );

        window.showToast(result.message, "success");
        await loadSettingsData();
    } catch (error) {
        window.showToast(error.message, "error");
    }
}


function loadPreferences() {
    const preferences = JSON.parse(
        localStorage.getItem("sentinelai_preferences") || "{}"
    );

    document.getElementById("themePreference").value = preferences.theme || "dark";
    document.getElementById("compactPreference").checked = Boolean(preferences.compact);
    document.getElementById("confirmFixPreference").checked = preferences.confirmFix !== false;
    document.getElementById("reduceMotionPreference").checked = Boolean(preferences.reduceMotion);
    document.getElementById("rememberWorkspacePreference").checked = preferences.rememberWorkspace !== false;

    applyPreferences();
}


function applyPreferences() {
    const preferences = {
        theme: document.getElementById("themePreference")?.value || "dark",
        compact: Boolean(document.getElementById("compactPreference")?.checked),
        confirmFix: document.getElementById("confirmFixPreference")?.checked !== false,
        reduceMotion: Boolean(document.getElementById("reduceMotionPreference")?.checked),
        rememberWorkspace: document.getElementById("rememberWorkspacePreference")?.checked !== false
    };

    localStorage.setItem(
        "sentinelai_preferences",
        JSON.stringify(preferences)
    );

    applyGlobalPreferences(preferences);
}


function applyGlobalPreferences(preferences) {
    const root = document.documentElement;

    let theme = preferences.theme;
    if (theme === "system") {
        theme = window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light";
    }

    root.dataset.theme = theme;
    document.body.classList.toggle(
        "sentinel-compact",
        Boolean(preferences.compact)
    );
    document.body.classList.toggle(
        "sentinel-reduce-motion",
        Boolean(preferences.reduceMotion)
    );
}


function resetPreferences() {
    localStorage.removeItem("sentinelai_preferences");
    loadPreferences();
    window.showToast("Preferences reset to defaults.", "success");
}


async function exportData() {
    try {
        const [session, repositories] = await Promise.all([
            window.getCurrentUser(),
            window.getRepositories()
        ]);

        const payload = {
            exported_at: new Date().toISOString(),
            account: session.user,
            github_connected: session.github_connected,
            repositories: repositories.repositories || repositories.data || repositories
        };

        const blob = new Blob(
            [JSON.stringify(payload, null, 2)],
            { type: "application/json" }
        );

        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = "sentinelai-account-data.json";
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);

        window.showToast("Your account data was exported.", "success");
    } catch (error) {
        window.showToast(error.message, "error");
    }
}


async function logoutUser() {
    const button = document.getElementById("settingsLogoutButton");
    if (!button) return;

    button.disabled = true;
    button.textContent = "Signing out...";

    try {
        await window.logout();

        if (typeof window.logoutAndShowLogin === "function") {
            window.logoutAndShowLogin();
        } else {
            window.location.reload();
        }
    } catch (error) {
        button.disabled = false;
        button.textContent = "Sign out";
        window.showToast(error.message, "error");
    }
}


async function deleteAccount() {
    const confirmation = window.prompt(
        'This permanently deletes your Account active data. Type DELETE to continue.'
    );

    if (confirmation !== "DELETE") {
        return;
    }

    const session = await window.getCurrentUser();
    let password = null;

    if (session.user?.has_password) {
        password = window.prompt(
            "Enter your current password to confirm account deletion."
        );

        if (!password) return;
    }

    const button = document.getElementById("deleteAccountButton");
    button.disabled = true;
    button.textContent = "Deleting...";

    try {
        const result = await window.apiRequest(
            "/api/v1/auth/account",
            {
                method: "DELETE",
                body: JSON.stringify({
                    confirmation: "DELETE",
                    password
                })
            }
        );

        window.showToast(result.message, "success");

        if (typeof window.logoutAndShowLogin === "function") {
            window.logoutAndShowLogin();
        } else {
            window.location.reload();
        }
    } catch (error) {
        button.disabled = false;
        button.textContent = "Delete account";
        window.showToast(error.message, "error");
    }
}


function clearFieldErrors() {
    document.querySelectorAll(".settings-error").forEach((element) => {
        element.textContent = "";
    });
}


function setFieldError(id, message) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = message;
    }
}


function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return String(value);
    }

    return date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric"
    });
}


function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function injectSettingsStyles() {
    if (document.getElementById(SETTINGS_STYLE_ID)) {
        return;
    }

    const style = document.createElement("style");
    style.id = SETTINGS_STYLE_ID;
    style.textContent = `
        .settings-page {
            display: flex;
            flex-direction: column;
            gap: 18px;
        }

        .settings-hero {
            display: flex;
            justify-content: space-between;
            gap: 18px;
            align-items: flex-start;
            padding: 24px;
            background: linear-gradient(135deg, rgba(109,124,255,.13), rgba(40,194,129,.06));
            border: 1px solid var(--border);
            border-radius: 18px;
        }

        .settings-eyebrow {
            display: inline-block;
            margin-bottom: 8px;
            color: var(--primary);
            font-size: 10px;
            font-weight: 800;
            letter-spacing: .16em;
        }

        .settings-hero h2 {
            margin: 0;
            font-size: 28px;
        }

        .settings-hero p {
            max-width: 740px;
            margin-top: 8px;
            color: var(--muted);
            line-height: 1.6;
            font-size: 13px;
        }

        .settings-hero-badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            white-space: nowrap;
            padding: 9px 12px;
            border: 1px solid var(--border);
            border-radius: 999px;
            background: var(--surface-2);
            color: var(--muted);
            font-size: 11px;
        }

        .settings-status-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: var(--success);
            box-shadow: 0 0 9px rgba(40,194,129,.55);
        }

        .settings-grid {
            display: grid;
            grid-template-columns: 230px minmax(0, 1fr);
            gap: 16px;
            align-items: start;
        }

        .settings-nav-card,
        .settings-section,
        .settings-data-card,
        .settings-github-card,
        .settings-info-card,
        .settings-state-card {
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 14px;
        }

        .settings-nav-card {
            position: sticky;
            top: 20px;
            padding: 8px;
        }

        .settings-tab {
            width: 100%;
            display: flex;
            align-items: center;
            gap: 10px;
            text-align: left;
            padding: 11px 12px;
            margin: 2px 0;
            border-radius: 10px;
            background: transparent;
            color: var(--muted);
            cursor: pointer;
        }

        .settings-tab:hover,
        .settings-tab.active {
            background: rgba(109,124,255,.10);
            color: var(--text);
        }

        .settings-tab > span:first-child {
            width: 28px;
            display: grid;
            place-items: center;
            font-size: 15px;
        }

        .settings-tab strong,
        .settings-tab small {
            display: block;
        }

        .settings-tab strong {
            font-size: 12px;
        }

        .settings-tab small {
            margin-top: 2px;
            color: var(--muted);
            font-size: 10px;
        }

        .settings-admin-tab {
            border: 1px solid rgba(109,124,255,.24);
        }

        .settings-admin-card {
            align-items: center;
        }

        .settings-admin-open {
            text-decoration: none;
            white-space: nowrap;
        }

        .settings-content {
            min-width: 0;
        }

        .settings-section {
            display: none;
            padding: 22px;
        }

        .settings-section.active {
            display: block;
        }

        .settings-section-head {
            margin-bottom: 18px;
        }

        .settings-section-head h3 {
            font-size: 18px;
        }

        .settings-section-head p {
            margin-top: 5px;
            color: var(--muted);
            font-size: 12px;
            line-height: 1.5;
        }

        .settings-state-card,
        .settings-info-card {
            padding: 15px;
            color: var(--muted);
            font-size: 12px;
        }

        .settings-info-card {
            margin-top: 16px;
        }

        .settings-info-card strong {
            color: var(--text);
            font-size: 13px;
        }

        .settings-info-card p {
            margin-top: 6px;
            line-height: 1.55;
        }

        .settings-profile-summary {
            display: flex;
            align-items: center;
            gap: 12px;
            flex-wrap: wrap;
        }

        .settings-avatar {
            width: 42px;
            height: 42px;
            display: grid;
            place-items: center;
            border-radius: 12px;
            background: var(--primary);
            color: white;
            font-weight: 800;
        }

        .settings-profile-summary strong,
        .settings-profile-summary span {
            display: block;
        }

        .settings-profile-summary strong {
            color: var(--text);
            font-size: 13px;
        }

        .settings-profile-summary span:not(.settings-pill) {
            margin-top: 2px;
            color: var(--muted);
            font-size: 11px;
        }

        .settings-form {
            margin-top: 16px;
        }

        .settings-two-col {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 14px;
        }

        .settings-field {
            display: flex;
            flex-direction: column;
            gap: 7px;
        }

        .settings-field + .settings-field {
            margin-top: 0;
        }

        .settings-field > span {
            font-size: 11px;
            color: var(--muted);
            font-weight: 650;
        }

        .settings-field input,
        .settings-select {
            width: 100%;
            min-height: 44px;
            padding: 10px 12px;
            border: 1px solid var(--border);
            border-radius: 10px;
            background: var(--surface-2);
            color: var(--text);
            outline: none;
        }

        .settings-field input:focus,
        .settings-select:focus {
            border-color: var(--primary);
        }

        .settings-password-wrap {
            display: grid;
            grid-template-columns: 1fr auto;
            align-items: stretch;
            border: 1px solid var(--border);
            border-radius: 10px;
            background: var(--surface-2);
            overflow: hidden;
        }

        .settings-password-wrap input {
            min-width: 0;
            border: 0;
            background: transparent;
            border-radius: 0;
        }

        .settings-eye {
            padding: 0 12px;
            background: transparent;
            color: var(--primary);
            font-size: 11px;
            font-weight: 700;
        }

        .settings-error {
            min-height: 14px;
            color: var(--danger);
            font-size: 10px;
        }

        .settings-readonly-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 10px;
            margin-top: 14px;
        }

        .settings-readonly-item {
            padding: 12px;
            background: var(--surface-2);
            border: 1px solid var(--border);
            border-radius: 10px;
        }

        .settings-readonly-item span,
        .settings-readonly-item strong {
            display: block;
        }

        .settings-readonly-item span {
            color: var(--muted);
            font-size: 9px;
        }

        .settings-readonly-item strong {
            margin-top: 5px;
            color: var(--text);
            font-size: 11px;
            overflow-wrap: anywhere;
        }

        .settings-actions {
            display: flex;
            flex-wrap: wrap;
            gap: 9px;
            margin-top: 16px;
        }

        .settings-security-cards {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
            margin-top: 16px;
        }

        .settings-mini-card {
            padding: 15px;
            border: 1px solid var(--border);
            border-radius: 12px;
            background: var(--surface-2);
        }

        .settings-mini-card strong {
            font-size: 12px;
        }

        .settings-mini-card p {
            margin-top: 6px;
            color: var(--muted);
            font-size: 11px;
            line-height: 1.5;
        }

        .settings-pill {
            display: inline-flex;
            align-items: center;
            width: fit-content;
            margin-top: 9px;
            padding: 5px 8px;
            border-radius: 999px;
            background: rgba(109,124,255,.10);
            color: var(--primary);
            font-size: 9px;
            font-weight: 700;
        }

        .settings-pill.success {
            background: rgba(40,194,129,.11);
            color: var(--success);
        }

        .settings-github-card {
            padding: 16px;
        }

        .settings-github-main {
            display: flex;
            align-items: center;
            gap: 12px;
            flex-wrap: wrap;
        }

        .settings-github-icon {
            width: 42px;
            height: 42px;
            display: grid;
            place-items: center;
            border-radius: 12px;
            background: rgba(109,124,255,.12);
            color: var(--primary);
            font-weight: 800;
        }

        .settings-github-main > div:nth-child(2) {
            flex: 1;
            min-width: 180px;
        }

        .settings-github-main strong {
            font-size: 13px;
        }

        .settings-github-main p {
            margin-top: 4px;
            color: var(--muted);
            font-size: 11px;
            line-height: 1.5;
        }

        .settings-github-actions {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 16px;
        }

        .settings-danger-outline,
        .settings-danger-button {
            padding: 10px 14px;
            border-radius: 10px;
            font-weight: 650;
            font-size: 11px;
            cursor: pointer;
        }

        .settings-danger-outline {
            background: rgba(255,92,112,.07);
            border: 1px solid rgba(255,92,112,.35);
            color: var(--danger);
        }

        .settings-note {
            margin-top: 10px;
            color: var(--muted);
            font-size: 10px;
            line-height: 1.45;
        }

        .settings-preference-list {
            display: flex;
            flex-direction: column;
            gap: 1px;
            border: 1px solid var(--border);
            border-radius: 12px;
            overflow: hidden;
        }

        .settings-preference-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 14px;
            padding: 15px;
            background: var(--surface-2);
        }

        .settings-preference-row + .settings-preference-row {
            border-top: 1px solid var(--border);
        }

        .settings-preference-row strong {
            font-size: 12px;
        }

        .settings-preference-row p {
            margin-top: 4px;
            color: var(--muted);
            font-size: 10px;
            line-height: 1.45;
        }

        .settings-select {
            width: 130px;
        }

        .settings-switch {
            position: relative;
            flex: 0 0 auto;
            width: 44px;
            height: 24px;
        }

        .settings-switch input {
            opacity: 0;
            width: 0;
            height: 0;
        }

        .settings-switch span {
            position: absolute;
            inset: 0;
            cursor: pointer;
            background: var(--surface-3);
            border: 1px solid var(--border);
            border-radius: 999px;
            transition: .2s ease;
        }

        .settings-switch span::before {
            content: "";
            position: absolute;
            width: 16px;
            height: 16px;
            left: 3px;
            top: 3px;
            border-radius: 50%;
            background: var(--muted);
            transition: .2s ease;
        }

        .settings-switch input:checked + span {
            background: rgba(109,124,255,.25);
            border-color: rgba(109,124,255,.55);
        }

        .settings-switch input:checked + span::before {
            transform: translateX(19px);
            background: var(--primary);
        }

        .settings-data-actions {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .settings-data-card {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            padding: 15px;
        }

        .settings-data-card strong {
            font-size: 12px;
        }

        .settings-data-card p {
            margin-top: 4px;
            color: var(--muted);
            font-size: 10px;
            line-height: 1.45;
        }

        .settings-danger-zone {
            display: flex;
            justify-content: space-between;
            gap: 16px;
            align-items: center;
            margin-top: 18px;
            padding: 18px;
            border: 1px solid rgba(255,92,112,.30);
            border-radius: 14px;
            background: rgba(255,92,112,.045);
        }

        .settings-danger-label {
            color: var(--danger);
            font-size: 9px;
            font-weight: 800;
            letter-spacing: .14em;
        }

        .settings-danger-zone h4 {
            margin-top: 5px;
            font-size: 14px;
        }

        .settings-danger-zone p {
            max-width: 620px;
            margin-top: 5px;
            color: var(--muted);
            font-size: 10px;
            line-height: 1.5;
        }

        .settings-danger-button {
            flex: 0 0 auto;
            background: var(--danger);
            color: #fff;
        }

        .settings-error-state {
            display: flex;
            flex-direction: column;
            gap: 5px;
        }

        .settings-error-state strong {
            color: var(--danger);
        }

        html[data-theme="light"] {
            --bg: #f4f7fb;
            --surface: #ffffff;
            --surface-2: #f6f8fc;
            --surface-3: #edf2f8;
            --border: #d8e0eb;
            --text: #172033;
            --muted: #6c778a;
        }

        body.sentinel-compact .settings-section {
            padding: 16px;
        }

        body.sentinel-compact .settings-preference-row,
        body.sentinel-compact .settings-data-card {
            padding: 11px 13px;
        }

        body.sentinel-reduce-motion *,
        body.sentinel-reduce-motion *::before,
        body.sentinel-reduce-motion *::after {
            animation-duration: 0.001ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.001ms !important;
            scroll-behavior: auto !important;
        }

        @media (max-width: 900px) {
            .settings-grid {
                grid-template-columns: 1fr;
            }

            .settings-nav-card {
                position: static;
                display: grid;
                grid-template-columns: repeat(6, minmax(0, 1fr));
                overflow-x: auto;
            }

            .settings-tab {
                min-width: 130px;
                flex-direction: column;
                align-items: flex-start;
                gap: 6px;
            }
        }

        @media (max-width: 680px) {
            .settings-hero,
            .settings-danger-zone,
            .settings-data-card {
                flex-direction: column;
                align-items: stretch;
            }

            .settings-two-col,
            .settings-readonly-grid,
            .settings-security-cards {
                grid-template-columns: 1fr;
            }

            .settings-section {
                padding: 16px;
            }

            .settings-nav-card {
                grid-template-columns: repeat(6, 155px);
            }

            .settings-preference-row {
                align-items: flex-start;
            }
        }
    `;

    document.head.appendChild(style);
}
