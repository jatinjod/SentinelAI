export async function render(container) {
    const scanId = localStorage.getItem(
        "sentinelai_last_scan_id"
    );

    container.innerHTML = `
        <section class="panel">

            <div class="panel-header">
                <div>
                    <h2>Vulnerabilities</h2>
                    <p>
                        Security issues detected by SentinelAI.
                    </p>
                </div>

                <span id="vulnerabilityCountLabel">
                    —
                </span>
            </div>

            <div
                id="vulnerabilityList"
                style="
                    padding: 20px;
                    display: flex;
                    flex-direction: column;
                    gap: 14px;
                "
            >
                <div class="loading-state">
                    Loading vulnerabilities...
                </div>
            </div>

        </section>
    `;

    if (!scanId) {
        document.getElementById(
            "vulnerabilityList"
        ).innerHTML = `
            <div class="empty-state">
                <h3>No scan selected</h3>
                <p>
                    Go to Scans and run a repository scan first.
                </p>
            </div>
        `;

        return;
    }

    await loadVulnerabilities(Number(scanId));
}


async function loadVulnerabilities(scanId) {
    const container =
        document.getElementById(
            "vulnerabilityList"
        );

    try {
        const result =
            await window.getScanVulnerabilities(scanId);

        document.getElementById(
            "vulnerabilityCountLabel"
        ).textContent =
            `${result.count} finding(s)`;

        if (!result.vulnerabilities?.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>No vulnerabilities found</h3>
                    <p>
                        This scan did not detect any security issues.
                    </p>
                </div>
            `;

            return;
        }

        container.innerHTML =
            result.vulnerabilities
                .map(
                    (vulnerability) =>
                        createVulnerabilityCard(vulnerability)
                )
                .join("");

        document
            .querySelectorAll(".generate-fix-button")
            .forEach((button) => {
                button.addEventListener(
                    "click",
                    () => {
                        generateFix(
                            Number(
                                button.dataset.vulnerabilityId
                            ),
                            button
                        );
                    }
                );
            });

    } catch (error) {
        console.error(error);

        container.innerHTML = `
            <div class="empty-state">
                <h3>Unable to load vulnerabilities</h3>
                <p>
                    ${escapeHtml(error.message)}
                </p>
            </div>
        `;
    }
}


function createVulnerabilityCard(vulnerability) {
    return `
        <div class="repository-card">

            <div class="repository-card-header">

                <div>
                    <h3>
                        ${escapeHtml(
                            vulnerability.title
                        )}
                    </h3>

                    <p>
                        ${escapeHtml(
                            vulnerability.file
                        )}
                        :${vulnerability.line}
                    </p>
                </div>

                <strong>
                    ${escapeHtml(
                        String(vulnerability.severity)
                    ).toUpperCase()}
                </strong>

            </div>

            <p style="margin-top: 12px;">
                ${escapeHtml(
                    vulnerability.description
                )}
            </p>

            <div class="repository-actions">

                <button
                    class="primary generate-fix-button"
                    data-vulnerability-id="${vulnerability.id}"
                >
                    Generate AI Fix
                </button>

            </div>

        </div>
    `;
}


async function generateFix(
    vulnerabilityId,
    button
) {
    const oldText = button.textContent;

    try {
        button.disabled = true;
        button.textContent = "Generating...";

        const result =
            await window.createFix(
                vulnerabilityId
            );

        localStorage.setItem(
            "sentinelai_last_fix",
            JSON.stringify(result)
        );

        localStorage.setItem(
            "sentinelai_last_fix_id",
            String(result.id)
        );

        window.showToast(
            "AI fix generated successfully.",
            "success"
        );

        await window.loadPage("fixes");

    } catch (error) {
        console.error(error);

        window.showToast(
            `Fix generation failed: ${error.message}`,
            "error"
        );

        button.disabled = false;
        button.textContent = oldText;
    }
}


function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}