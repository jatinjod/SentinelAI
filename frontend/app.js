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


const API_BASE_URL =
    "https://sentinelai-backend-pwur.onrender.com";

const CURRENT_USER_ID = 1;

let currentPage = "dashboard";


document.addEventListener("DOMContentLoaded", () => {
    setupNavigation();
    setupTopbar();
    loadPage("dashboard");
});


/* =========================
   NAVIGATION
========================= */

function setupNavigation() {
    const navLinks =
        document.querySelectorAll(".nav-link");

    navLinks.forEach((link) => {
        link.addEventListener("click", () => {
            const page = link.dataset.page;

            if (!page) {
                return;
            }

            loadPage(page);
        });
    });
}


async function loadPage(page) {
    if (!pageModules[page]) {
        showToast(
            "Requested page was not found.",
            "error"
        );

        return;
    }

    currentPage = page;

    updateActiveNavigation(page);
    updatePageHeader(page);

    const pageContent =
        document.getElementById("pageContent");

    if (!pageContent) {
        return;
    }

    pageContent.innerHTML = `
        <div class="loading-state">
            Loading ${escapeHtml(
                pageConfig[page].title
            )}...
        </div>
    `;

    try {
        const module =
            await import(
                `${pageModules[page]}?v=${Date.now()}`
            );

        if (
            typeof module.render !== "function"
        ) {
            throw new Error(
                `${page}.js does not export render().`
            );
        }

        await module.render(pageContent);

    } catch (error) {
        console.error(error);

        pageContent.innerHTML = `
            <div class="empty-state">
                <h3>Unable to load page</h3>
                <p>
                    ${escapeHtml(error.message)}
                </p>
            </div>
        `;

        showToast(
            "Could not load the page.",
            "error"
        );
    }
}


/* =========================
   NAVIGATION UI
========================= */

function updateActiveNavigation(page) {
    document
        .querySelectorAll(".nav-link")
        .forEach((link) => {
            link.classList.toggle(
                "active",
                link.dataset.page === page
            );
        });
}


function updatePageHeader(page) {
    const config = pageConfig[page];

    const pageTitle =
        document.getElementById("pageTitle");

    const pageDescription =
        document.getElementById(
            "pageDescription"
        );

    if (pageTitle) {
        pageTitle.textContent = config.title;
    }

    if (pageDescription) {
        pageDescription.textContent =
            config.description;
    }
}


/* =========================
   TOPBAR
========================= */

function setupTopbar() {
    const connectButton =
        document.getElementById(
            "connectGithubButton"
        );

    const refreshButton =
        document.getElementById(
            "refreshButton"
        );

    if (connectButton) {
        updateGithubButton(connectButton);

        connectButton.addEventListener(
            "click",
            () => {
                if (connectButton.disabled) {
                    return;
                }

                if (
                    typeof window.connectGitHub ===
                    "function"
                ) {
                    window.connectGitHub();
                    return;
                }

                window.location.href =
                    `${API_BASE_URL}/api/v1/github/login?user_id=${CURRENT_USER_ID}`;
            }
        );
    }

    if (refreshButton) {
        refreshButton.addEventListener(
            "click",
            () => {
                loadPage(currentPage);
                updateGithubButton(connectButton);
            }
        );
    }
}


/* =========================
   GITHUB CONNECTION STATUS
========================= */

async function updateGithubButton(button) {
    if (!button) {
        return;
    }

    button.disabled = true;
    button.textContent = "Checking GitHub...";

    try {
        const response =
            await fetch(
                `${API_BASE_URL}/api/v1/github/repositories?user_id=${CURRENT_USER_ID}`,
                {
                    method: "GET",
                    headers: {
                        "Accept": "application/json"
                    }
                }
            );

        if (response.ok) {
            button.textContent =
                "✓ GitHub Connected";

            button.disabled = true;
            button.style.opacity = "0.7";
            button.style.cursor = "default";

            return;
        }

        button.textContent =
            "Connect GitHub";

        button.disabled = false;
        button.style.opacity = "1";
        button.style.cursor = "pointer";

    } catch (error) {
        console.error(
            "GitHub connection check failed:",
            error
        );

        button.textContent =
            "Connect GitHub";

        button.disabled = false;
        button.style.opacity = "1";
        button.style.cursor = "pointer";
    }
}


/* =========================
   TOAST
========================= */

function showToast(
    message,
    type = "success"
) {
    const container =
        document.getElementById(
            "toastContainer"
        );

    if (!container) {
        return;
    }

    const toast =
        document.createElement("div");

    toast.className = `toast ${type}`;

    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3500);
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
window.updateGithubButton = updateGithubButton;