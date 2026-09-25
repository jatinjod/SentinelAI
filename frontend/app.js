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


document.addEventListener("DOMContentLoaded", () => {
    setupNavigation();
    setupTopbar();
    setupBackButton();
    loadPage("dashboard", false);
    updateSessionUI();
});

function setupNavigation() {
    document.querySelectorAll(".nav-link").forEach((link) => {
        link.addEventListener("click", () => {
            const page = link.dataset.page;
            if (page) {
                loadPage(page, true);
            }
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
    if (!pageContent) {
        return;
    }

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
            throw new Error(
                `${page}.js does not export render().`
            );
        }

        // Never block page rendering on session probing.
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

function setupBackButton() {
    const pageHeading = document.querySelector(".page-heading");
    if (!pageHeading) {
        return;
    }

    let backButton = document.getElementById("backButton");
    if (backButton) {
        updateBackButton();
        return;
    }

    backButton = document.createElement("button");
    backButton.id = "backButton";
    backButton.className = "secondary-button";
    backButton.textContent = "← Back";
    backButton.title = "Go to previous page";
    backButton.setAttribute("aria-label", "Go to previous page");
    backButton.style.marginBottom = "10px";
    backButton.style.padding = "8px 12px";
    backButton.style.fontSize = "12px";
    backButton.style.width = "fit-content";

    pageHeading.prepend(backButton);
    backButton.addEventListener("click", goBack);
    updateBackButton();
}

function goBack() {
    if (!pageHistory.length) {
        return;
    }

    const previousPage = pageHistory.pop();
    loadPage(previousPage, false);
}

function updateBackButton() {
    const backButton = document.getElementById("backButton");
    if (!backButton) {
        return;
    }

    const enabled = pageHistory.length > 0;
    backButton.disabled = !enabled;
    backButton.style.opacity = enabled ? "1" : "0.45";
    backButton.style.cursor = enabled ? "pointer" : "default";
}

async function updateSessionUI() {
    const connectButton =
        document.getElementById("connectGithubButton");
    const usernameElement =
        document.getElementById("githubUsername");

    if (!connectButton) {
        return;
    }

    connectButton.disabled = true;
    connectButton.textContent = "Checking GitHub...";

    try {
        const session = await Promise.race([
            window.getCurrentUser(),
            new Promise((_, reject) =>
                setTimeout(
                    () => reject(new Error("Session check timed out.")),
                    6000
                )
            )
        ]);

        if (session?.authenticated && session.user) {
            connectButton.textContent = "✓ GitHub Connected";
            connectButton.disabled = true;
            connectButton.style.opacity = "0.7";
            connectButton.style.cursor = "default";

            if (usernameElement) {
                usernameElement.textContent =
                    `@${session.user.username}`;
            }
            return;
        }
    } catch (error) {
        console.warn("Session check failed:", error);
    }

    connectButton.textContent = "Connect GitHub";
    connectButton.disabled = false;
    connectButton.style.opacity = "1";
    connectButton.style.cursor = "pointer";

    if (usernameElement) {
        usernameElement.textContent = "Not connected";
    }
}

function setupTopbar() {
    const connectButton =
        document.getElementById("connectGithubButton");
    const refreshButton =
        document.getElementById("refreshButton");

    if (connectButton) {
        connectButton.addEventListener("click", () => {
            if (!connectButton.disabled) {
                window.connectGitHub();
            }
        });
    }

    if (refreshButton) {
        refreshButton.addEventListener("click", () => {
            loadPage(currentPage, false);
            updateSessionUI();
        });
    }
}

function showToast(message, type = "success") {
    const container = document.getElementById("toastContainer");
    if (!container) {
        return;
    }

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => toast.remove(), 3500);
}

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
window.goBack = goBack;
