export async function render(container) {
    container.innerHTML = `
        <section class="panel">

            <div class="panel-header">
                <div>
                    <h2>GitHub Repositories</h2>
                    <p>
                        Repositories connected to your SentinelAI account.
                    </p>
                </div>

                <button
                    id="repositoryRefreshButton"
                    class="secondary-button"
                >
                    Refresh
                </button>
            </div>

            <div
                id="repositoryList"
                class="repository-grid"
            >
                <div class="loading-state">
                    Loading repositories...
                </div>
            </div>

        </section>
    `;

    document
        .getElementById("repositoryRefreshButton")
        .addEventListener(
            "click",
            loadRepositories
        );

    await loadRepositories();
}


async function loadRepositories() {
    const container =
        document.getElementById(
            "repositoryList"
        );

    container.innerHTML = `
        <div class="loading-state">
            Loading repositories...
        </div>
    `;

    try {
        const result =
            await window.getRepositories();

        if (
            !result.repositories ||
            result.repositories.length === 0
        ) {
            container.innerHTML = `
                <div class="empty-state">
                    No repositories found.
                </div>
            `;

            return;
        }

        container.innerHTML =
            result.repositories
                .map(
                    (repository) =>
                        createRepositoryCard(repository)
                )
                .join("");

        setupRepositoryActions();

    } catch (error) {
        console.error(error);

        container.innerHTML = `
            <div class="empty-state">
                <h3>Unable to load data</h3>
                <p>
                    ${escapeHtml(error.message)}
                </p>
            </div>
        `;

        window.showToast(
            "Could not load repositories.",
            "error"
        );
    }
}


function createRepositoryCard(repository) {
    const githubUrl =
        `https://github.com/${repository.full_name}`;

    return `
        <div class="repository-card">

            <div class="repository-card-header">

                <div>
                    <h3>
                        ${escapeHtml(repository.name)}
                    </h3>

                    <p>
                        ${escapeHtml(repository.full_name)}
                    </p>
                </div>

            </div>

            <p style="margin-top: 12px;">
                Repository ID:
                ${escapeHtml(repository.github_repo_id)}
            </p>

            <div class="repository-actions">

                <button
                    class="primary scan-repository-button"
                    data-repository-id="${repository.id}"
                >
                    Scan Repository
                </button>

                <button
                    class="open-github-button"
                    data-url="${githubUrl}"
                >
                    GitHub
                </button>

            </div>

        </div>
    `;
}


function setupRepositoryActions() {
    document
        .querySelectorAll(
            ".scan-repository-button"
        )
        .forEach((button) => {
            button.addEventListener(
                "click",
                () => {
                    scanRepository(
                        Number(
                            button.dataset.repositoryId
                        ),
                        button
                    );
                }
            );
        });

    document
        .querySelectorAll(
            ".open-github-button"
        )
        .forEach((button) => {
            button.addEventListener(
                "click",
                () => {
                    const url =
                        button.dataset.url;

                    window.open(
                        url,
                        "_blank",
                        "noopener,noreferrer"
                    );
                }
            );
        });
}


async function scanRepository(
    repositoryId,
    button
) {
    const oldText =
        button.textContent;

    try {
        button.disabled = true;
        button.textContent = "Scanning...";

        const result =
            await window.createScan(
                repositoryId
            );

        window.showToast(
            `Scan completed: ${result.finding_count} finding(s) detected.`,
            result.finding_count > 0
                ? "error"
                : "success"
        );

        // Go to Scans page after successful scan.
        if (typeof window.loadPage === "function") {
            window.loadPage("scans");
        }

    } catch (error) {
        console.error(error);

        window.showToast(
            `Scan failed: ${error.message}`,
            "error"
        );

        button.disabled = false;
        button.textContent = oldText;
    }
}