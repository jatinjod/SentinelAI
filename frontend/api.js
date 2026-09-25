const API_BASE_URL = "https://sentinelai-backend-pwur.onrender.com";
const API_TIMEOUT_MS = 15000;

async function apiRequest(endpoint, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(
        () => controller.abort(),
        API_TIMEOUT_MS
    );

    const method = (options.method || "GET").toUpperCase();
    const headers = {
        "Accept": "application/json",
        ...(options.headers || {})
    };

    if (
        options.body &&
        method !== "GET" &&
        method !== "HEAD"
    ) {
        headers["Content-Type"] = "application/json";
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
            const message =
                data?.detail ||
                `Request failed with status ${response.status}`;
            throw new Error(message);
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

async function getCurrentUser() {
    return apiRequest("/api/v1/auth/me");
}

async function logout() {
    return apiRequest("/api/v1/auth/logout", {
        method: "POST"
    });
}

function connectGitHub() {
    window.location.href =
        `${API_BASE_URL}/api/v1/github/login`;
}

async function getGitHubRepositories() {
    return apiRequest("/api/v1/github/repositories");
}

async function syncGitHubRepositories() {
    return apiRequest(
        "/api/v1/github/repositories/sync",
        { method: "POST" }
    );
}

async function getRepositories() {
    return apiRequest("/api/v1/repositories/");
}

async function createScan(repositoryId) {
    return apiRequest("/api/v1/scans/", {
        method: "POST",
        body: JSON.stringify({
            repository_id: repositoryId
        })
    });
}

async function getScanVulnerabilities(scanId) {
    return apiRequest(
        `/api/v1/scans/${scanId}/vulnerabilities`
    );
}

async function getVulnerabilitySource(vulnerabilityId) {
    return apiRequest(
        `/api/v1/fixes/vulnerabilities/${vulnerabilityId}/source`
    );
}

async function createFix(vulnerabilityId) {
    return apiRequest("/api/v1/fixes/", {
        method: "POST",
        body: JSON.stringify({
            vulnerability_id: vulnerabilityId
        })
    });
}

async function approveFix(fixId) {
    return apiRequest(
        `/api/v1/fixes/${fixId}/approve`,
        { method: "PATCH" }
    );
}

async function rejectFix(fixId) {
    return apiRequest(
        `/api/v1/fixes/${fixId}/reject`,
        { method: "PATCH" }
    );
}

async function applyFix(fixId) {
    return apiRequest(
        `/api/v1/fixes/${fixId}/apply`,
        { method: "POST" }
    );
}

async function getPullRequestStatus(pullRequestId) {
    return apiRequest(
        `/api/v1/pull-requests/${pullRequestId}`
    );
}

window.apiRequest = apiRequest;
window.getCurrentUser = getCurrentUser;
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
