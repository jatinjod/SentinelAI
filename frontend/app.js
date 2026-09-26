const pageConfig = {
    dashboard: { title: "Dashboard", description: "Monitor your repositories and security." },
    repositories: { title: "Repositories", description: "Manage your connected GitHub repositories." },
    scans: { title: "Scans", description: "Run and monitor repository security scans." },
    vulnerabilities: { title: "Vulnerabilities", description: "Review security issues detected by SentinelAI." },
    fixes: { title: "Fixes", description: "Review, approve and apply AI-generated fixes." },
    pull_requests: { title: "Pull Requests", description: "Track SentinelAI pull requests on GitHub." },
    settings: { title: "Settings", description: "Manage your SentinelAI configuration." }
};

const pageModules = {
    dashboard: "./pages/dashboard.js",
    repositories: "./pages/repositories.js",
    scans: "./pages/scans.js",
    vulnerabilities: "./pages/vulnerabilities.js",
    fixes: "./pages/fixes.js",
    pull_requests: "./pages/pull_requests.js",
    settings: "./pages/settings.js"
};

let currentPage = "dashboard";
let pageHistory = [];
let currentUser = null;
let authMode = "login";


document.addEventListener("DOMContentLoaded", () => {
    setupAuthExperience();
    setupNavigation();
    setupTopbar();
    setupBackButton();
    bootstrapAuth();
});


/* =========================
   AUTH EXPERIENCE
========================= */

function setupAuthExperience() {
    const form = document.getElementById("emailAuthForm");
    const switchButton = document.getElementById("authSwitchButton");
    const githubButton = document.getElementById("loginGithubButton");

    form?.addEventListener("submit", handleEmailAuthSubmit);
    switchButton?.addEventListener("click", () => {
        authMode = authMode === "login" ? "register" : "login";
        updateAuthMode();
    });

    document.querySelectorAll(".password-toggle").forEach((button) => {
        button.addEventListener("click", () => {
            const input = document.getElementById(button.dataset.target);
            if (!input) return;
            const isPassword = input.type === "password";
            input.type = isPassword ? "text" : "password";
            button.textContent = isPassword ? "Hide" : "Show";
            button.setAttribute("aria-label", isPassword ? "Hide password" : "Show password");
        });
    });

    githubButton?.addEventListener("click", () => {
        githubButton.disabled = true;
        githubButton.innerHTML = `<span class="auth-spinner" aria-hidden="true"></span><span>Connecting to GitHub...</span>`;
        window.connectGitHub();
    });

    updateAuthMode();
}


function updateAuthMode() {
    const register = authMode === "register";
    const nameGroup = document.getElementById("nameFieldGroup");
    const confirmGroup = document.getElementById("confirmPasswordGroup");
    const nameInput = document.getElementById("authName");
    const confirmInput = document.getElementById("authConfirmPassword");
    const submit = document.getElementById("emailAuthSubmit");
    const switchText = document.getElementById("authSwitchText");
    const switchButton = document.getElementById("authSwitchButton");
    const message = document.getElementById("authFormMessage");
    const passwordInput = document.getElementById("authPassword");

    if (nameGroup) nameGroup.hidden = !register;
    if (confirmGroup) confirmGroup.hidden = !register;
    if (nameInput) nameInput.required = register;
    if (confirmInput) confirmInput.required = register;
    if (submit) submit.textContent = register ? "Create account" : "Sign in";
    if (switchText) switchText.textContent = register ? "Already have an account?" : "New to SentinelAI?";
    if (switchButton) switchButton.textContent = register ? "Sign in" : "Create account";
    clearAuthFieldErrors();
    if (passwordInput) passwordInput.autocomplete = register ? "new-password" : "current-password";
}


function clearAuthFieldErrors() {
    document.querySelectorAll(".auth-field-error").forEach((element) => {
        element.textContent = "";
        element.hidden = true;
    });

    document.querySelectorAll(".auth-field input").forEach((input) => {
        input.removeAttribute("aria-invalid");
        input.classList.remove("input-error");
    });

    const message = document.getElementById("authFormMessage");
    if (message) message.textContent = "";
}


function setAuthFieldError(field, message) {
    const idMap = {
        name: "authName",
        email: "authEmail",
        password: "authPassword",
        confirmPassword: "authConfirmPassword"
    };

    const input = document.getElementById(idMap[field]);
    const error = document.getElementById(`${field}FieldError`);

    if (input) {
        input.setAttribute("aria-invalid", "true");
        input.classList.add("input-error");
        input.focus();
    }

    if (error) {
        error.textContent = message;
        error.hidden = false;
    }
}


function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}


async function handleEmailAuthSubmit(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const submit = document.getElementById("emailAuthSubmit");

    const data = new FormData(form);
    const name = String(data.get("name") || "").trim();
    const email = String(data.get("email") || "").trim();
    const password = String(data.get("password") || "");
    const confirmPassword = String(data.get("confirmPassword") || "");

    clearAuthFieldErrors();

    let hasClientError = false;

    if (!email) {
        setAuthFieldError("email", "Enter your email address.");
        hasClientError = true;
    } else if (!isValidEmail(email)) {
        setAuthFieldError("email", "Invalid email address.");
        hasClientError = true;
    }

    if (!password) {
        setAuthFieldError("password", "Enter your password.");
        hasClientError = true;
    } else if (authMode === "register" && password.length < 8) {
        setAuthFieldError("password", "Password must be at least 8 characters.");
        hasClientError = true;
    }

    if (authMode === "register") {
        if (!name) {
            setAuthFieldError("name", "Enter your name.");
            hasClientError = true;
        }

        if (!confirmPassword) {
            setAuthFieldError("confirmPassword", "Confirm your password.");
            hasClientError = true;
        } else if (password !== confirmPassword) {
            setAuthFieldError("confirmPassword", "Passwords do not match.");
            hasClientError = true;
        }
    }

    if (hasClientError) {
        return;
    }

    if (submit) {
        submit.disabled = true;
        submit.textContent = authMode === "register" ? "Creating account..." : "Signing in...";
    }

    try {
        if (authMode === "register") {
            const result = await window.registerAccount({
                name,
                email,
                password,
                confirmPassword
            });
            currentUser = result.user;
            showToast("Account created successfully.");
        } else {
            const result = await window.loginAccount({
                email,
                password
            });
            currentUser = result.user;
            showToast("Welcome back.");
        }

        form.reset();
        await bootstrapAuth();
    } catch (error) {
        console.error(error);

        const status = error.status;
        const message = String(error.message || "");

        if (authMode === "register" && status === 409) {
            setAuthFieldError(
                "email",
                "An account with this email already exists. Sign in instead."
            );
        } else if (authMode === "login" && status === 401) {
            // Avoid account enumeration: keep login failure non-specific.
            setAuthFieldError(
                "password",
                "Incorrect email or password."
            );
        } else if (status === 422) {
            const lower = message.toLowerCase();
            if (lower.includes("password")) {
                setAuthFieldError("password", message);
            } else if (lower.includes("email")) {
                setAuthFieldError("email", message);
            } else if (lower.includes("name")) {
                setAuthFieldError("name", message);
            } else if (lower.includes("confirm")) {
                setAuthFieldError("confirmPassword", message);
            } else {
                const formMessage = document.getElementById("authFormMessage");
                if (formMessage) formMessage.textContent = message;
            }
        } else {
            const formMessage = document.getElementById("authFormMessage");
            if (formMessage) formMessage.textContent = message;
        }
    } finally {
        if (submit) {
            submit.disabled = false;
            submit.textContent = authMode === "register" ? "Create account" : "Sign in";
        }
    }
}


function finishAppBoot() {
    document.body.classList.remove("app-booting");
    const bootScreen = document.getElementById("appBootScreen");
    if (bootScreen) bootScreen.hidden = true;
}


async function bootstrapAuth() {
    // Keep both the auth screen and application hidden until the session
    // check completes. This prevents the login screen from flashing on
    // every hard refresh for already-authenticated users.
    try {
        const session = await window.getCurrentUser();

        if (session?.authenticated && session.user) {
            currentUser = session.user;
            window.__sentinelUser = currentUser;
            localStorage.setItem("sentinelai_is_admin", currentUser?.is_admin === true ? "1" : "0");
            showApplication();
            updateSessionUI(session);
            await loadPage("dashboard", false);
            return;
        }

        currentUser = null;
        window.__sentinelUser = null;
        localStorage.removeItem("sentinelai_is_admin");
        showAuthScreen();
    } catch (error) {
        console.error("Session check failed:", error);
        currentUser = null;
        window.__sentinelUser = null;
        localStorage.removeItem("sentinelai_is_admin");
        showAuthScreen();
    }
}


function showAuthScreen(message) {
    finishAppBoot();
    document.body.classList.add("auth-mode");

    const authScreen = document.getElementById("authScreen");
    const app = document.getElementById("app");
    const messageElement = document.getElementById("authMessage");
    const githubButton = document.getElementById("loginGithubButton");

    if (app) app.hidden = true;
    if (authScreen) authScreen.hidden = false;

    if (messageElement) {
        messageElement.textContent = message ||
            "Use GitHub or your SentinelAI account to scan repositories, generate AI fixes, and create pull requests.";
    }

    if (githubButton) {
        githubButton.disabled = false;
        githubButton.innerHTML = `
            <svg class="github-mark" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="currentColor" d="M12 .67a12 12 0 0 0-3.79 23.39c.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.74.08-.74 1.21.09 1.85 1.24 1.85 1.24 1.07 1.84 2.81 1.31 3.5 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.34-5.47-5.95 0-1.32.47-2.39 1.24-3.24-.13-.3-.54-1.53.12-3.18 0 0 1.01-.32 3.3 1.24A11.5 11.5 0 0 1 12 7.93c1.02 0 2.04.14 2.99.42 2.29-1.56 3.29-1.24 3.29-1.24.66 1.65.25 2.88.12 3.18.77.85 1.24 1.92 1.24 3.24 0 4.62-2.81 5.65-5.49 5.95.43.37.81 1.1.81 2.22v3.29c0 .32.22.69.83.57A12 12 0 0 0 12 .67Z"/>
            </svg>
            <span>Continue with GitHub</span>
            <span class="button-arrow">↗</span>
        `;
    }

    updateAuthMode();
}


function showApplication() {
    finishAppBoot();
    document.body.classList.remove("auth-mode");
    const authScreen = document.getElementById("authScreen");
    const app = document.getElementById("app");
    if (authScreen) authScreen.hidden = true;
    if (app) app.hidden = false;
}


/* =========================
   NAVIGATION
========================= */

function setupNavigation() {
    document.querySelectorAll(".nav-link").forEach((link) => {
        link.addEventListener("click", () => {
            const page = link.dataset.page;
            if (!page) return;
            loadPage(page, true);
        });
    });
}


async function loadPage(page, addToHistory = true) {
    if (!pageModules[page]) {
        showToast("Requested page was not found.", "error");
        return;
    }

    if (addToHistory && currentPage !== page) pageHistory.push(currentPage);

    currentPage = page;
    updateActiveNavigation(page);
    updatePageHeader(page);
    updateBackButton();

    const pageContent = document.getElementById("pageContent");
    if (!pageContent) return;

    pageContent.innerHTML = `<div class="loading-state">Loading ${escapeHtml(pageConfig[page].title)}...</div>`;

    try {
        const module = await import(`${pageModules[page]}?v=${Date.now()}`);
        if (typeof module.render !== "function") {
            throw new Error(`${page}.js does not export render().`);
        }
        await module.render(pageContent);
    } catch (error) {
        console.error(error);
        pageContent.innerHTML = `<div class="empty-state"><h3>Unable to load page</h3><p>${escapeHtml(error.message)}</p></div>`;
        showToast("Could not load the page.", "error");
    }

    updateBackButton();
}


function updateActiveNavigation(page) {
    document.querySelectorAll(".nav-link").forEach((link) => {
        link.classList.toggle("active", link.dataset.page === page);
    });
}


function updatePageHeader(page) {
    const config = pageConfig[page];
    const pageTitle = document.getElementById("pageTitle");
    const pageDescription = document.getElementById("pageDescription");
    if (pageTitle) pageTitle.textContent = config.title;
    if (pageDescription) pageDescription.textContent = config.description;
}


/* =========================
   BACK NAVIGATION
========================= */

function setupBackButton() {
    const pageHeading = document.querySelector(".page-heading");
    if (!pageHeading || document.getElementById("backButton")) return;

    const button = document.createElement("button");
    button.id = "backButton";
    button.className = "secondary-button back-button";
    button.textContent = "← Back";
    button.type = "button";
    button.addEventListener("click", goBack);
    pageHeading.prepend(button);
    updateBackButton();
}


function goBack() {
    if (!pageHistory.length) return;
    const previousPage = pageHistory.pop();
    loadPage(previousPage, false);
}


function updateBackButton() {
    const button = document.getElementById("backButton");
    if (!button) return;
    const enabled = pageHistory.length > 0;
    button.disabled = !enabled;
    button.style.opacity = enabled ? "1" : "0.45";
    button.style.cursor = enabled ? "pointer" : "default";
}


/* =========================
   TOPBAR / SESSION
========================= */

function setupTopbar() {
    const connectButton = document.getElementById("connectGithubButton");
    const refreshButton = document.getElementById("refreshButton");

    connectButton?.addEventListener("click", () => {
        if (!connectButton.disabled) window.connectGitHub();
    });

    refreshButton?.addEventListener("click", async () => {
        await bootstrapAuth();
    });
}


function updateSessionUI(session) {
    const connectButton = document.getElementById("connectGithubButton");
    const usernameElement = document.getElementById("githubUsername");
    const statusTitle = document.getElementById("githubStatusTitle");

    if (!connectButton) return;

    const connected = Boolean(session?.github_connected);
    const user = session?.user;

    if (connected && user) {
        connectButton.textContent = `✓ @${user.username}`;
        connectButton.disabled = true;
        connectButton.style.opacity = "0.75";
        connectButton.style.cursor = "default";
        if (statusTitle) statusTitle.textContent = "GitHub Connected";
        if (usernameElement) usernameElement.textContent = `@${user.username}`;
    } else {
        connectButton.textContent = "Connect GitHub";
        connectButton.disabled = false;
        connectButton.style.opacity = "1";
        connectButton.style.cursor = "pointer";
        if (statusTitle) statusTitle.textContent = "Account";
        if (usernameElement) usernameElement.textContent = user?.email || "Email account";
    }
}


async function logoutAndShowLogin() {
    try {
        await window.logout();
    } catch (error) {
        console.error("Logout failed:", error);
    }

    localStorage.removeItem("sentinelai_last_scan_id");
    localStorage.removeItem("sentinelai_last_vulnerability_id");
    localStorage.removeItem("sentinelai_last_fix_id");
    localStorage.removeItem("sentinelai_last_pr");

    currentUser = null;
    window.__sentinelUser = null;
    localStorage.removeItem("sentinelai_is_admin");
    pageHistory = [];
    currentPage = "dashboard";
    showAuthScreen("You are signed out. Sign in again to return to your SentinelAI workspace.");
}


/* =========================
   TOAST
========================= */

function showToast(message, type = "success") {
    const container = document.getElementById("toastContainer");
    if (!container) return;
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
}


/* =========================
   HTML SAFETY
========================= */

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


window.loadPage = loadPage;
window.showToast = showToast;
window.escapeHtml = escapeHtml;
window.updateSessionUI = updateSessionUI;
window.logoutAndShowLogin = logoutAndShowLogin;
window.goBack = goBack;
