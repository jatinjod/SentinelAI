const pageConfig = {
    dashboard: {
        title: "Dashboard",
        description: "Monitor your repositories and security."
    },
    repositories: {
        title: "Repositories",
        description: "Manage your connected GitHub repositories."
    },
    scans: {
        title: "Scans",
        description: "Run and monitor repository security scans."
    },
    vulnerabilities: {
        title: "Vulnerabilities",
        description: "Review security issues detected by SentinelAI."
    },
    fixes: {
        title: "Fixes",
        description: "Review, approve and apply AI-generated fixes."
    },
    pull_requests: {
        title: "Pull Requests",
        description: "Track SentinelAI pull requests on GitHub."
    },
    settings: {
        title: "Settings",
        description: "Manage your SentinelAI configuration."
    }
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


document.addEventListener("DOMContentLoaded", () => {
    setupLoginScreen();
    setupNavigation();
    setupTopbar();
    setupBackButton();
    bootstrapAuth();
});


/* =========================
   AUTHENTICATION GATE
========================= */

async function bootstrapAuth() {
    showAuthScreen("Checking your session...");

    try {
        const session = await window.getCurrentUser();

        if (session?.authenticated && session.user) {
            currentUser = session.user;
            showApplication();
            updateSessionUI(session);
            await loadPage("dashboard", false);
            return;
        }

        currentUser = null;
        showAuthScreen();
    } catch (error) {
        console.error("Session check failed:", error);
        currentUser = null;
        showAuthScreen();
    }
}

function showAuthScreen(message) {
    document.body.classList.add("auth-mode");
    const authScreen = document.getElementById("authScreen");
    const app = document.getElementById("app");
    const messageElement = document.getElementById("authMessage");
    const loginButton = document.getElementById("loginGithubButton");

    if (app) {
        app.hidden = true;
    }

    if (authScreen) {
        authScreen.hidden = false;
    }

    if (messageElement && message) {
        messageElement.textContent = message;
    } else if (messageElement) {
        messageElement.textContent =
            "Connect your GitHub account to scan repositories, generate AI fixes, and create pull requests.";
    }

    if (loginButton) {
        loginButton.disabled = false;
        loginButton.innerHTML = `
            <span class="github-mark" aria-hidden="true">↗</span>
            <span>Continue with GitHub</span>
        `;
    }
}

function showApplication() {
    document.body.classList.remove("auth-mode");
    const authScreen = document.getElementById("authScreen");
    const app = document.getElementById("app");

    if (authScreen) {
        authScreen.hidden = true;
    }

    if (app) {
        app.hidden = false;
    }
}

function setupLoginScreen() {
    const loginButton = document.getElementById("loginGithubButton");

    if (!loginButton) {
        return;
    }

    loginButton.addEventListener("click", () => {
        loginButton.disabled = true;
        loginButton.innerHTML = `
            <span class="auth-spinner" aria-hidden="true"></span>
            <span>Connecting to GitHub...</span>
        `;

        window.connectGitHub();
    });
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

    if (addToHistory && currentPage !== page) {
        pageHistory.push(currentPage);
    }

    currentPage = page;
    updateActiveNavigation(page);
    updatePageHeader(page);
    updateBackButton();

    const pageContent = document.getElementById("pageContent");
    if (!pageContent) return;

    pageContent.innerHTML = `
        <div class="loading-state">
            Loading ${escapeHtml(pageConfig[page].title)}...
        </div>
    `;

    try {
        const module = await import(
            `${pageModules[page]}?v=${Date.now()}`
        );

        if (typeof module.render !== "function") {
            throw new Error(`${page}.js does not export render().`);
        }

        await module.render(pageContent);
    } catch (error) {
        console.error(error);
        pageContent.innerHTML = `
            <div class="empty-state">
                <h3>Unable to load page</h3>
                <p>${escapeHtml(error.message)}</p>
            </div>
        `;
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

    if (connectButton) {
        connectButton.addEventListener("click", () => {
            if (!connectButton.disabled) {
                window.connectGitHub();
            }
        });
    }

    if (refreshButton) {
        refreshButton.addEventListener("click", async () => {
            await bootstrapAuth();
        });
    }
}

function updateSessionUI(session) {
    const connectButton = document.getElementById("connectGithubButton");
    const usernameElement = document.getElementById("githubUsername");

    if (!connectButton) return;

    if (session?.authenticated && session.user) {
        connectButton.textContent = `✓ @${session.user.username}`;
        connectButton.disabled = true;
        connectButton.style.opacity = "0.75";
        connectButton.style.cursor = "default";

        if (usernameElement) {
            usernameElement.textContent = `@${session.user.username}`;
        }
    } else {
        connectButton.textContent = "Connect GitHub";
        connectButton.disabled = false;
        connectButton.style.opacity = "1";
        connectButton.style.cursor = "pointer";

        if (usernameElement) {
            usernameElement.textContent = "Not connected";
        }
    }
}

async function logoutAndShowLogin() {
    try {
        await window.logout();
    } catch (error) {
        console.error("Logout failed:", error);
    }

    currentUser = null;
    pageHistory = [];
    currentPage = "dashboard";

    showAuthScreen("You are signed out. Continue with GitHub to start a new SentinelAI session.");
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


/* =========================
   GLOBAL FUNCTIONS
========================= */

window.loadPage = loadPage;
window.showToast = showToast;
window.escapeHtml = escapeHtml;
window.updateSessionUI = updateSessionUI;
window.logoutAndShowLogin = logoutAndShowLogin;
window.goBack = goBack;
