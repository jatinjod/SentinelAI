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

    pageContent.innerHTML = `
        <div class="loading-state">
            Loading ${pageConfig[page].title}...
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

    document.getElementById(
        "pageTitle"
    ).textContent = config.title;

    document.getElementById(
        "pageDescription"
    ).textContent = config.description;
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
        connectButton.addEventListener(
            "click",
            () => {
                if (
                    typeof window.connectGitHub ===
                    "function"
                ) {
                    window.connectGitHub();
                } else {
                    window.location.href =
                        "http://127.0.0.1:8000/api/v1/github/login";
                }
            }
        );
    }

    if (refreshButton) {
        refreshButton.addEventListener(
            "click",
            () => {
                loadPage(currentPage);
            }
        );
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