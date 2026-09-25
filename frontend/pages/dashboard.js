let lastRepositories = [];


export async function render(container) {
    container.innerHTML = `
        <div class="stats-grid">

            <div class="stat-card">
                <span>Total Repositories</span>
                <strong id="dashboardRepoCount">—</strong>
                <small>Connected GitHub repositories</small>
            </div>

            <div class="stat-card">
                <span>Total Scans</span>
                <strong id="dashboardScanCount">0</strong>
                <small>Scans performed in this session</small>
            </div>

            <div class="stat-card">
                <span>Vulnerabilities</span>
                <strong id="dashboardVulnerabilityCount">0</strong>
                <small>Findings from current session</small>
            </div>

            <div class="stat-card">
                <span>Pull Requests</span>
                <strong id="dashboardPrCount">0</strong>
                <small>PRs created by SentinelAI</small>
            </div>

        </div>


        <section class="panel">

            <div class="panel-header">

                <div>
                    <h2>Repositories</h2>
                    <p>Select a repository to start a security scan.</p>
                </div>

                <button
                    id="syncReposButton"
                    class="secondary-button"
                >
                    Sync GitHub
                </button>

            </div>

            <div
                id="dashboardRepositories"
                class="repository-grid"
            >
                <div class="loading-state">
                    Loading repositories...
                </div>
            </div>

        </section>


        <section class="panel">

            <div class="panel-header">

                <div>
                    <h2>Recent Activity</h2>
                    <p>Latest actions performed by SentinelAI.</p>
                </div>

            </div>

            <div
                id="dashboardActivity"
                class="activity-list"
            >
                <div class="empty-state">
                    No activity yet.
                </div>
            </div>

        </section>
    `;

    await loadDashboardData();

    document
        .getElementById("syncReposButton")
        .addEventListener(
            "click",
            syncRepositories
        );
}


async function loadDashboardData() {
    const repositoryContainer =
        document.getElementById(
            "dashboardRepositories"
        );

    try {
        const result =
            await window.getRepositories();

        lastRepositories =
            result.repositories || [];

        document.getElementById(
            "dashboardRepoCount"
        ).textContent =
            result.count ?? 0;

        if (!lastRepositories.length) {
            repositoryContainer.innerHTML = `
                <div class="empty-state">
                    No repositories found.
                </div>
            `;

            return;
        }

        repositoryContainer.innerHTML =
            lastRepositories
                .map(
                    (repository) =>
                        createRepositoryCard(
                            repository
                        )
                )
                .join("");

        setupScanButtons();

    } catch (error) {
        console.error(error);

        repositoryContainer.innerHTML = `
            <div class="empty-state">
                Unable to load repositories.
                <br><br>
                ${escapeHtml(error.message)}
            </div>
        `;

        window.showToast(
            "Could not load repositories.",
            "error"
        );
    }
}


function createRepositoryCard(repository) {
    const visibility =
        repository.private
            ? "Private"
            : "Public";

    return `
        <div class="repository-card">

            <div class="repository-card-header">

                <div>
                    <h3>
                        ${escapeHtml(
                            repository.name
                        )}
                    </h3>

                    <p>
                        ${escapeHtml(
                            repository.full_name
                        )}
                    </p>
                </div>

                <span class="repo-visibility">
                    ${visibility}
                </span>

            </div>

            <div class="repository-actions">

                <button
                    class="primary scan-button"
                    data-repository-id="${repository.id}"
                >
                    Scan Repository
                </button>

                <button
                    class="repo-link-button"
                    data-url="${repository.html_url || ""}"
                >
                    GitHub
                </button>

            </div>

        </div>
    `;
}


function setupScanButtons() {
    document
        .querySelectorAll(".scan-button")
        .forEach((button) => {
            button.addEventListener(
                "click",
                () => {
                    const repositoryId =
                        Number(
                            button.dataset.repositoryId
                        );

                    scanRepository(
                        repositoryId,
                        button
                    );
                }
            );
        });

    document
        .querySelectorAll(".repo-link-button")
        .forEach((button) => {
            button.addEventListener(
                "click",
                () => {
                    const url =
                        button.dataset.url;

                    if (url) {
                        window.open(
                            url,
                            "_blank",
                            "noopener,noreferrer"
                        );
                    }
                }
            );
        });
}


async function scanRepository(
    repositoryId,
    button
) {
    const originalText =
        button.textContent;

    try {
        button.disabled = true;
        button.textContent = "Scanning...";

        const result =
            await window.createScan(
                repositoryId
            );

        document.getElementById(
            "dashboardScanCount"
        ).textContent =
            Number(
                document.getElementById(
                    "dashboardScanCount"
                ).textContent
            ) + 1;

        document.getElementById(
            "dashboardVulnerabilityCount"
        ).textContent =
            result.finding_count ?? 0;

        addActivity(
            "Security scan completed",
            `${result.repository} — ${result.finding_count} finding(s)`
        );

        window.showToast(
            `Scan completed. ${result.finding_count} finding(s) detected.`,
            result.finding_count > 0
                ? "error"
                : "success"
        );

    } catch (error) {
        console.error(error);

        window.showToast(
            `Scan failed: ${error.message}`,
            "error"
        );

    } finally {
        button.disabled = false;
        button.textContent = originalText;
    }
}


async function syncRepositories() {
    const button =
        document.getElementById(
            "syncReposButton"
        );

    try {
        button.disabled = true;
        button.textContent = "Syncing...";

        const result =
            await apiRequest(
                "/api/v1/github/repositories/sync",
                {
                    method: "POST"
                }
            );

        addActivity(
            "Repositories synchronized",
            `${result.github_repository_count} repositories found`
        );

        window.showToast(
            "GitHub repositories synchronized.",
            "success"
        );

        await loadDashboardData();

    } catch (error) {
        window.showToast(
            `Sync failed: ${error.message}`,
            "error"
        );
    } finally {
        button.disabled = false;
        button.textContent = "Sync GitHub";
    }
}


function addActivity(
    title,
    description
) {
    const activity =
        document.getElementById(
            "dashboardActivity"
        );

    const empty =
        activity.querySelector(
            ".empty-state"
        );

    if (empty) {
        empty.remove();
    }

    const item =
        document.createElement("div");

    item.className =
        "activity-item";

    item.innerHTML = `
        <div class="activity-icon">
            ✓
        </div>

        <div>
            <strong>
                ${escapeHtml(title)}
            </strong>

            <small>
                ${escapeHtml(description)}
            </small>
        </div>
    `;

    activity.prepend(item);
}