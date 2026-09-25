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
    updateSessionUI();
    loadPage("dashboard", false);
});


/* =========================
   NAVIGATION
========================= */

function setupNavigation() {
    document
        .querySelectorAll(".nav-link")
        .forEach((link) => {
            link.addEventListener("click", () => {
                const page = link.dataset.page;

                if (!page) {
                    return;
                }

                loadPage(page, true);
            });
        });
}


async function loadPage(
    page,
    addToHistory = true
) {
    if (!pageModules[page]) {
        showToast(
            "Requested page was not found.",
            "error"
        );
        return;
    }

    if (
        addToHistory &&
        currentPage !== page
    ) {
        pageHistory.push(currentPage);
    }

    currentPage = page;

    updateActiveNavigation(page);
    updatePageHeader(page);
    updateBackButton();

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

    updateBackButton();
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
        document.getElementById(
            "pageTitle"
        );

    const pageDescription =
        document.getElementById(
            "pageDescription"
        );

    if (pageTitle) {
        pageTitle.textContent =
            config.title;
    }

    if (pageDescription) {
        pageDescription.textContent =
            config.description;
    }
}


/* =========================
   BACK BUTTON
========================= */

function setupBackButton() {
    const pageHeading =
        document.querySelector(
            ".page-heading"
        );

    if (!pageHeading) {
        return;
    }

    let button =
        document.getElementById(
            "backButton"
        );

    if (button) {
        updateBackButton();
        return;
    }

    button =
        document.createElement("button");

    button.id = "backButton";
    button.className =
        "secondary-button";

    button.textContent = "← Back";

    button.style.marginBottom = "10px";

    pageHeading.prepend(button);

    button.addEventListener(
        "click",
        () => {
            if (!pageHistory.length) {
                return;
            }

            const previousPage =
                pageHistory.pop();

            loadPage(
                previousPage,
                false
            );
        }
    );

    updateBackButton();
}


function updateBackButton() {
    const button =
        document.getElementById(
            "backButton"
        );

    if (!button) {
        return;
    }

    const enabled =
        pageHistory.length > 0;

    button.disabled =
        !enabled;

    button.style.opacity =
        enabled ? "1" : "0.45";

    button.style.cursor =
        enabled
            ? "pointer"
            : "default";
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
                    connectButton.disabled
                ) {
                    return;
                }

                if (
                    typeof window.connectGitHub ===
                    "function"
                ) {
                    window.connectGitHub();
                } else {
                    showToast(
                        "GitHub connection is unavailable. Please refresh the page.",
                        "error"
                    );
                }
            }
        );
    }

    if (refreshButton) {
        refreshButton.addEventListener(
            "click",
            () => {
                updateSessionUI();
                loadPage(
                    currentPage,
                    false
                );
            }
        );
    }
}


/* =========================
   SESSION / GITHUB STATUS
========================= */

async function updateSessionUI() {
    const connectButton =
        document.getElementById(
            "connectGithubButton"
        );

    const usernameElement =
        document.getElementById(
            "githubUsername"
        );

    if (!connectButton) {
        return;
    }

    try {
        if (
            typeof window.getCurrentUser !==
            "function"
        ) {
            return;
        }

        const session =
            await window.getCurrentUser();

        if (
            session &&
            session.authenticated &&
            session.user
        ) {
            connectButton.textContent =
                "✓ GitHub Connected";

            connectButton.disabled = true;
            connectButton.style.opacity =
                "0.7";

            connectButton.style.cursor =
                "default";

            if (usernameElement) {
                usernameElement.textContent =
                    `@${session.user.username}`;
            }

            return;
        }

        connectButton.textContent =
            "Connect GitHub";

        connectButton.disabled = false;
        connectButton.style.opacity =
            "1";

        connectButton.style.cursor =
            "pointer";

        if (usernameElement) {
            usernameElement.textContent =
                "Not connected";
        }

    } catch (error) {
        console.error(
            "Session check failed:",
            error
        );

        connectButton.textContent =
            "Connect GitHub";

        connectButton.disabled = false;
        connectButton.style.opacity =
            "1";

        connectButton.style.cursor =
            "pointer";
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

    toast.className =
        `toast ${type}`;

    toast.textContent =
        message;

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
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );
}


/* =========================
   GLOBAL FUNCTIONS
========================= */

window.loadPage =
    loadPage;

window.showToast =
    showToast;

window.escapeHtml =
    escapeHtml;

window.updateSessionUI =
    updateSessionUI;

window.goBack = () => {
    if (!pageHistory.length) {
        return;
    }

    const previousPage =
        pageHistory.pop();

    loadPage(
        previousPage,
        false
    );
};