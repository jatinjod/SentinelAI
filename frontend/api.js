const API_BASE_URL = "https://sentinelai-backend-pwur.onrender.com";
const API_TIMEOUT_MS = 15000;
const SESSION_TOKEN_KEY = "sentinelai_session_token";


(function captureOAuthToken() {
    const hash = window.location.hash || "";

    if (!hash.startsWith("#")) {
        return;
    }

    const params = new URLSearchParams(hash.slice(1));
    const token = params.get("auth");

    if (!token) {
        return;
    }

    sessionStorage.setItem(SESSION_TOKEN_KEY, token);

    window.history.replaceState(
        null,
        document.title,
        window.location.pathname + window.location.search
    );
})();


function getSessionToken() {
    return sessionStorage.getItem(SESSION_TOKEN_KEY);
}


function setSessionToken(token) {
    if (token) {
        sessionStorage.setItem(SESSION_TOKEN_KEY, token);
    }
}


function clearSessionToken() {
    sessionStorage.removeItem(SESSION_TOKEN_KEY);
}


async function apiRequest(endpoint, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(
        () => controller.abort(),
        API_TIMEOUT_MS
    );

    const method = (options.method || "GET").toUpperCase();
    const headers = {
        Accept: "application/json",
        ...(options.headers || {})
    };

    if (
        options.body &&
        method !== "GET" &&
        method !== "HEAD"
    ) {
        headers["Content-Type"] = "application/json";
    }

    const token = getSessionToken();
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    try {
        const response = await fetch(
            `${API_BASE_URL}${endpoint}`,
            {
                ...options,
                method,
                credentials: "include",
                headers,
                signal: controller.signal
            }
        );

        let data = {};
        try {
            data = await response.json();
        } catch {
            data = {};
        }

        if (!response.ok) {
            if (response.status === 401) {
                clearSessionToken();
            }

            const error = new Error(
                data?.detail ||
                `Request failed with status ${response.status}`
            );
            error.status = response.status;
            error.code = data?.code;
            throw error;
        }

        return data;
    } catch (error) {
        if (error.name === "AbortError") {
            throw new Error(
                "Backend request timed out. Please try again."
            );
        }

        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
}


/* =========================
   AUTHENTICATION
========================= */

async function getCurrentUser() {
    return apiRequest("/api/v1/auth/me");
}


async function registerAccount({
    name,
    email,
    password,
    confirmPassword
}) {
    const data = await apiRequest(
        "/api/v1/auth/register",
        {
            method: "POST",
            body: JSON.stringify({
                name,
                email,
                password,
                confirm_password: confirmPassword
            })
        }
    );

    setSessionToken(data.session_token);
    return data;
}


async function loginAccount({
    email,
    password
}) {
    const data = await apiRequest(
        "/api/v1/auth/login",
        {
            method: "POST",
            body: JSON.stringify({
                email,
                password
            })
        }
    );

    setSessionToken(data.session_token);
    return data;
}


async function logout() {
    try {
        return await apiRequest(
            "/api/v1/auth/logout",
            {
                method: "POST"
            }
        );
    } finally {
        clearSessionToken();
    }
}


/* =========================
   GITHUB
========================= */

function connectGitHub() {
    window.location.href =
        `${API_BASE_URL}/api/v1/github/login`;
}


async function getGitHubRepositories() {
    return apiRequest(
        "/api/v1/github/repositories"
    );
}


async function syncGitHubRepositories() {
    return apiRequest(
        "/api/v1/github/repositories/sync",
        {
            method: "POST"
        }
    );
}


/* =========================
   REPOSITORIES
========================= */

async function getRepositories() {
    return apiRequest("/api/v1/repositories/");
}


/* =========================
   SCANS
========================= */

async function createScan(repositoryId) {
    return apiRequest(
        "/api/v1/scans/",
        {
            method: "POST",
            body: JSON.stringify({
                repository_id: repositoryId
            })
        }
    );
}


async function getScanVulnerabilities(scanId) {
    return apiRequest(
        `/api/v1/scans/${scanId}/vulnerabilities`
    );
}


/* =========================
   VULNERABILITIES
========================= */

async function getVulnerabilitySource(vulnerabilityId) {
    return apiRequest(
        `/api/v1/fixes/vulnerabilities/${vulnerabilityId}/source`
    );
}


/* =========================
   FIXES
========================= */

async function createFix(vulnerabilityId) {
    return apiRequest(
        "/api/v1/fixes/",
        {
            method: "POST",
            body: JSON.stringify({
                vulnerability_id: vulnerabilityId
            })
        }
    );
}


async function approveFix(fixId) {
    return apiRequest(
        `/api/v1/fixes/${fixId}/approve`,
        {
            method: "PATCH"
        }
    );
}


async function rejectFix(fixId) {
    return apiRequest(
        `/api/v1/fixes/${fixId}/reject`,
        {
            method: "PATCH"
        }
    );
}


async function applyFix(fixId) {
    return apiRequest(
        `/api/v1/fixes/${fixId}/apply`,
        {
            method: "POST"
        }
    );
}


/* =========================
   PULL REQUESTS
========================= */

async function getPullRequestStatus(pullRequestId) {
    return apiRequest(
        `/api/v1/pull-requests/${pullRequestId}`
    );
}


window.apiRequest = apiRequest;
window.getCurrentUser = getCurrentUser;
window.registerAccount = registerAccount;
window.loginAccount = loginAccount;
window.logout = logout;
window.connectGitHub = connectGitHub;
window.getGitHubRepositories = getGitHubRepositories;
window.syncGitHubRepositories = syncGitHubRepositories;
window.getRepositories = getRepositories;
window.createScan = createScan;
window.getScanVulnerabilities = getScanVulnerabilities;
window.getVulnerabilitySource = getVulnerabilitySource;
window.createFix = createFix;
window.approveFix = approveFix;
window.rejectFix = rejectFix;
window.applyFix = applyFix;
window.getPullRequestStatus = getPullRequestStatus;
