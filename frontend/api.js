const API_BASE_URL = "https://sentinelai-backend-pwur.onrender.com";

const CURRENT_USER_ID = 4;

async function apiRequest(
    endpoint,
    options = {}
) {
    const response = await fetch(
        `${API_BASE_URL}${endpoint}`,
        {
            headers: {
                "Content-Type": "application/json",
                ...(options.headers || {})
            },
            ...options
        }
    );

    let data;

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
}


/* =========================
   GITHUB
========================= */

async function connectGitHub() {
    window.location.href =
        `${API_BASE_URL}/api/v1/github/login`;
}


async function getGitHubRepositories() {
    return apiRequest(
        `/api/v1/github/repositories?user_id=${CURRENT_USER_ID}`
    );
}


async function syncGitHubRepositories() {
    return apiRequest(
        `/api/v1/github/repositories/sync?user_id=${CURRENT_USER_ID}`,
        {
            method: "POST"
        }
    );
}


/* =========================
   REPOSITORIES
========================= */

async function getRepositories() {
    return apiRequest(
        `/api/v1/repositories/?user_id=${CURRENT_USER_ID}`
    );
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

async function getVulnerabilitySource(
    vulnerabilityId
) {
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

async function getPullRequestStatus(
    pullRequestId
) {
    return apiRequest(
        `/api/v1/pull-requests/${pullRequestId}`
    );
}

window.getRepositories = getRepositories;
window.createScan = createScan;
window.apiRequest = apiRequest;
window.getScanVulnerabilities = getScanVulnerabilities;
window.createFix = createFix;
window.approveFix = approveFix;
window.rejectFix = rejectFix;
window.applyFix = applyFix;
window.getPullRequestStatus = getPullRequestStatus;
window.connectGitHub = connectGitHub;