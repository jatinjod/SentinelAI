export async function render(container) {
    const storedFix = localStorage.getItem(
        "sentinelai_last_fix"
    );

    container.innerHTML = `
        <section class="panel">

            <div class="panel-header">
                <div>
                    <h2>AI Fixes</h2>
                    <p>
                        Review, approve and apply SentinelAI fixes.
                    </p>
                </div>
            </div>

            <div
                id="fixContainer"
                style="padding: 20px;"
            ></div>

        </section>
    `;

    if (!storedFix) {
        document.getElementById(
            "fixContainer"
        ).innerHTML = `
            <div class="empty-state">
                <h3>No fix available</h3>
                <p>
                    Generate an AI fix from the Vulnerabilities page first.
                </p>
            </div>
        `;

        return;
    }

    let fix;

    try {
        fix = JSON.parse(storedFix);
    } catch (error) {
        console.error(error);

        document.getElementById(
            "fixContainer"
        ).innerHTML = `
            <div class="empty-state">
                <h3>Invalid fix data</h3>
                <p>
                    Please generate the fix again.
                </p>
            </div>
        `;

        return;
    }

    renderFix(fix);
}


function renderFix(fix) {
    const container =
        document.getElementById(
            "fixContainer"
        );

    let actionButtons = "";

    if (fix.status === "pending") {
        actionButtons = `
            <button
                id="approveFixButton"
                class="primary-button"
            >
                Approve Fix
            </button>

            <button
                id="rejectFixButton"
                class="secondary-button"
            >
                Reject Fix
            </button>
        `;
    }

    else if (fix.status === "approved") {
        actionButtons = `
            <button
                id="applyFixButton"
                class="primary-button"
            >
                Apply Fix & Create PR
            </button>
        `;
    }

    else if (fix.status === "rejected") {
        actionButtons = `
            <div class="empty-state">
                This fix has been rejected.
            </div>
        `;
    }

    else if (fix.status === "pr_created") {
        actionButtons = `
            <div class="empty-state">
                Pull Request has already been created for this fix.
            </div>
        `;
    }

    container.innerHTML = `
        <div class="repository-card">

            <div class="repository-card-header">

                <div>
                    <h3>
                        Fix #${escapeHtml(fix.id)}
                    </h3>

                    <p>
                        Vulnerability #${escapeHtml(
                            fix.vulnerability_id
                        )}
                    </p>
                </div>

                <strong>
                    ${escapeHtml(
                        String(
                            fix.status || "pending"
                        ).toUpperCase()
                    )}
                </strong>

            </div>


            <div style="margin-top: 20px;">

                <h4>Current Code</h4>

                <pre
                    style="
                        margin-top: 8px;
                        padding: 14px;
                        background: #080b12;
                        border: 1px solid #273142;
                        border-radius: 10px;
                        overflow-x: auto;
                        white-space: pre-wrap;
                    "
                >${escapeHtml(
                    fix.old_code || ""
                )}</pre>


                <h4 style="margin-top: 18px;">
                    Suggested Code
                </h4>

                <pre
                    style="
                        margin-top: 8px;
                        padding: 14px;
                        background: #080b12;
                        border: 1px solid #273142;
                        border-radius: 10px;
                        overflow-x: auto;
                        white-space: pre-wrap;
                    "
                >${escapeHtml(
                    fix.new_code ||
                    fix.suggested_code ||
                    ""
                )}</pre>


                <h4 style="margin-top: 18px;">
                    Explanation
                </h4>

                <p style="margin-top: 8px;">
                    ${escapeHtml(
                        fix.explanation || ""
                    )}
                </p>

            </div>


            <div
                class="repository-actions"
                style="margin-top: 20px;"
            >
                ${actionButtons}
            </div>

        </div>
    `;

    setupFixActions(fix);
}


function setupFixActions(fix) {
    const approveButton =
        document.getElementById(
            "approveFixButton"
        );

    if (approveButton) {
        approveButton.addEventListener(
            "click",
            () => approveFixAction(fix)
        );
    }


    const rejectButton =
        document.getElementById(
            "rejectFixButton"
        );

    if (rejectButton) {
        rejectButton.addEventListener(
            "click",
            () => rejectFixAction(fix)
        );
    }


    const applyButton =
        document.getElementById(
            "applyFixButton"
        );

    if (applyButton) {
        applyButton.addEventListener(
            "click",
            () => applyFixAction(fix)
        );
    }
}


async function approveFixAction(fix) {
    try {
        const result =
            await window.approveFix(
                fix.id
            );

        fix.status = result.status;

        localStorage.setItem(
            "sentinelai_last_fix",
            JSON.stringify(fix)
        );

        renderFix(fix);

        window.showToast(
            "Fix approved successfully.",
            "success"
        );

    } catch (error) {
        console.error(error);

        window.showToast(
            `Approval failed: ${error.message}`,
            "error"
        );
    }
}


async function rejectFixAction(fix) {
    try {
        const result =
            await window.rejectFix(
                fix.id
            );

        fix.status = result.status;

        localStorage.setItem(
            "sentinelai_last_fix",
            JSON.stringify(fix)
        );

        renderFix(fix);

        window.showToast(
            "Fix rejected.",
            "success"
        );

    } catch (error) {
        console.error(error);

        window.showToast(
            `Rejection failed: ${error.message}`,
            "error"
        );
    }
}


async function applyFixAction(fix) {
    const button =
        document.getElementById(
            "applyFixButton"
        );

    try {
        button.disabled = true;
        button.textContent = "Creating PR...";

        const result =
            await window.applyFix(
                fix.id
            );

        fix.status = "pr_created";

        localStorage.setItem(
            "sentinelai_last_fix",
            JSON.stringify(fix)
        );

        if (result.pull_request) {
            localStorage.setItem(
                "sentinelai_last_pr",
                JSON.stringify(
                    result.pull_request
                )
            );
        }

        window.showToast(
            "Pull Request created successfully.",
            "success"
        );

        await window.loadPage(
            "pull_requests"
        );

    } catch (error) {
        console.error(error);

        button.disabled = false;
        button.textContent =
            "Apply Fix & Create PR";

        window.showToast(
            `Could not create PR: ${error.message}`,
            "error"
        );
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