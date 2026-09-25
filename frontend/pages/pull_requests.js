export async function render(container) {
    const storedPR = localStorage.getItem(
        "sentinelai_last_pr"
    );

    container.innerHTML = `
        <section class="panel">

            <div class="panel-header">
                <div>
                    <h2>Pull Requests</h2>
                    <p>
                        Pull Requests created by SentinelAI.
                    </p>
                </div>

                <button
                    id="refreshPRButton"
                    class="secondary-button"
                >
                    Refresh
                </button>
            </div>

            <div
                id="pullRequestContainer"
                style="padding: 20px;"
            >
                <div class="loading-state">
                    Loading Pull Request...
                </div>
            </div>

        </section>
    `;

    document
        .getElementById("refreshPRButton")
        .addEventListener(
            "click",
            loadPullRequest
        );

    await loadPullRequest(storedPR);
}


async function loadPullRequest(storedPR = null) {
    const container =
        document.getElementById(
            "pullRequestContainer"
        );

    try {
        let pullRequest = null;

        if (storedPR) {
            pullRequest = JSON.parse(storedPR);
        }

        if (!pullRequest) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>No Pull Request found</h3>
                    <p>
                        Create a Pull Request from an approved fix first.
                    </p>
                </div>
            `;

            return;
        }

        const result =
            await window.getPullRequestStatus(
                pullRequest.id
            );

        renderPullRequest(result);

    } catch (error) {
        console.error(error);

        container.innerHTML = `
            <div class="empty-state">
                <h3>Unable to load Pull Request</h3>
                <p>
                    ${escapeHtml(error.message)}
                </p>
            </div>
        `;
    }
}


function renderPullRequest(pullRequest) {
    const container =
        document.getElementById(
            "pullRequestContainer"
        );

    const status =
        String(
            pullRequest.status || "unknown"
        ).toUpperCase();

    container.innerHTML = `
        <div class="repository-card">

            <div class="repository-card-header">

                <div>
                    <h3>
                        ${escapeHtml(
                            pullRequest.title
                        )}
                    </h3>

                    <p>
                        ${escapeHtml(
                            pullRequest.repository
                        )}
                    </p>
                </div>

                <strong>
                    ${escapeHtml(status)}
                </strong>

            </div>


            <div style="margin-top: 18px;">

                <p>
                    <strong>GitHub PR:</strong>
                    #${escapeHtml(
                        pullRequest.github_pr_id
                    )}
                </p>

                <p style="margin-top: 10px;">
                    <strong>Merged:</strong>
                    ${pullRequest.merged ? "Yes" : "No"}
                </p>

                <p style="margin-top: 10px;">
                    <strong>Mergeable:</strong>
                    ${
                        pullRequest.mergeable === null
                            ? "Checking..."
                            : pullRequest.mergeable
                                ? "Yes"
                                : "No"
                    }
                </p>

            </div>


            <div
                class="repository-actions"
                style="margin-top: 20px;"
            >

                <button
                    id="openPRButton"
                    class="primary-button"
                >
                    Open GitHub PR
                </button>

            </div>

        </div>
    `;

    document
        .getElementById("openPRButton")
        .addEventListener(
            "click",
            () => {
                window.open(
                    pullRequest.url,
                    "_blank",
                    "noopener,noreferrer"
                );
            }
        );
}


function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}