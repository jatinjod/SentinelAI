let lastScanResult = null;

export async function render(container) {
    container.innerHTML = `
        <section class="panel">

            <div class="panel-header">
                <div>
                    <h2>Security Scans</h2>
                    <p>
                        Run SentinelAI security scans on your repositories.
                    </p>
                </div>

                <button
                    id="refreshScanRepositories"
                    class="secondary-button"
                >
                    Refresh
                </button>
            </div>

            <div style="padding: 22px;">

                <div
                    style="
                        display: flex;
                        gap: 12px;
                        align-items: center;
                    "
                >

                    <select
                        id="scanRepositorySelect"
                        style="
                            flex: 1;
                            padding: 12px;
                            background: #151b26;
                            color: #f3f6fb;
                            border: 1px solid #273142;
                            border-radius: 10px;
                        "
                    >
                        <option value="">
                            Select a repository
                        </option>
                    </select>

                    <button
                        id="startScanButton"
                        class="primary-button"
                    >
                        Start Security Scan
                    </button>

                </div>

                <div
                    id="scanResult"
                    style="margin-top: 20px;"
                >
                    <div class="empty-state">
                        Select a repository and start a scan.
                    </div>
                </div>

            </div>

        </section>
    `;

    document
        .getElementById("refreshScanRepositories")
        .addEventListener(
            "click",
            loadRepositories
        );

    document
        .getElementById("startScanButton")
        .addEventListener(
            "click",
            startScan
        );

    await loadRepositories();
}


async function loadRepositories() {
    const select =
        document.getElementById(
            "scanRepositorySelect"
        );

    select.innerHTML = `
        <option value="">
            Loading repositories...
        </option>
    `;

    try {
        const result =
            await window.getRepositories();

        select.innerHTML = `
            <option value="">
                Select a repository
            </option>
        `;

        (result.repositories || [])
            .forEach((repository) => {
                const option =
                    document.createElement("option");

                option.value = repository.id;

                option.textContent =
                    repository.full_name;

                select.appendChild(option);
            });

    } catch (error) {
        console.error(error);

        select.innerHTML = `
            <option value="">
                Unable to load repositories
            </option>
        `;

        window.showToast(
            `Could not load repositories: ${error.message}`,
            "error"
        );
    }
}


async function startScan() {
    const select =
        document.getElementById(
            "scanRepositorySelect"
        );

    const button =
        document.getElementById(
            "startScanButton"
        );

    const resultContainer =
        document.getElementById(
            "scanResult"
        );

    const repositoryId =
        Number(select.value);

    if (!repositoryId) {
        window.showToast(
            "Please select a repository.",
            "error"
        );

        return;
    }

    const originalText =
        button.textContent;

    try {
        button.disabled = true;
        button.textContent = "Scanning...";

        resultContainer.innerHTML = `
            <div class="loading-state">
                Scanning repository...
                <br><br>
                This may take a little while.
            </div>
        `;

        const result =
            await window.createScan(
                repositoryId
            );

        lastScanResult = result;

        localStorage.setItem(
            "sentinelai_last_scan_id",
            String(result.scan_id)
        );

        renderScanResult(result);

        window.showToast(
            `Scan completed. ${result.finding_count} finding(s) detected.`,
            result.finding_count > 0
                ? "error"
                : "success"
        );

    } catch (error) {
        console.error(error);

        resultContainer.innerHTML = `
            <div class="empty-state">
                <h3>Scan failed</h3>
                <p>
                    ${window.escapeHtml(
                        error.message
                    )}
                </p>
            </div>
        `;

        window.showToast(
            "Security scan failed.",
            "error"
        );

    } finally {
        button.disabled = false;
        button.textContent = originalText;
    }
}


function renderScanResult(result) {
    const container =
        document.getElementById(
            "scanResult"
        );

    const findings =
        result.findings || [];

    if (!findings.length) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>No vulnerabilities detected</h3>
                <p>
                    SentinelAI completed the scan successfully.
                </p>
            </div>
        `;

        return;
    }

    container.innerHTML = `
        <div class="panel">

            <div class="panel-header">
                <div>
                    <h2>Scan Results</h2>
                    <p>
                        ${window.escapeHtml(
                            result.repository
                        )}
                    </p>
                </div>

                <strong>
                    ${result.finding_count} finding(s)
                </strong>
            </div>

            <div
                style="
                    padding: 18px;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                "
            >

                ${findings
                    .map(
                        (finding) => `
                            <div
                                class="repository-card"
                            >

                                <div
                                    class="repository-card-header"
                                >

                                    <div>
                                        <h3>
                                            ${window.escapeHtml(
                                                finding.type
                                            )}
                                        </h3>

                                        <p>
                                            ${window.escapeHtml(
                                                finding.file
                                            )}
                                        </p>
                                    </div>

                                    <strong>
                                        ${window.escapeHtml(
                                            finding.severity
                                        )}
                                    </strong>

                                </div>

                                <p
                                    style="
                                        margin-top: 12px;
                                    "
                                >
                                    Line:
                                    ${window.escapeHtml(
                                        finding.line
                                    )}
                                </p>

                                <p
                                    style="
                                        margin-top: 8px;
                                    "
                                >
                                    ${window.escapeHtml(
                                        finding.message
                                    )}
                                </p>

                            </div>
                        `
                    )
                    .join("")}

            </div>

        </div>
    `;
}