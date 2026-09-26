export async function render(container) {
    container.innerHTML = `
        <section class="panel">

            <div class="panel-header">
                <div>
                    <h2>Settings</h2>
                    <p>
                        Manage your SentinelAI connection and application settings.
                    </p>
                </div>
            </div>

            <div style="padding: 20px;">

                <div class="repository-card">

                    <h3>GitHub Connection</h3>

                    <p
                        id="settingsConnectionMessage"
                        style="margin-top: 8px;"
                    >
                        Loading connection...
                    </p>

                    <div
                        id="settingsUserDetails"
                        style="margin-top: 18px;"
                    ></div>

                    <div style="margin-top: 20px;">
                        <button
                            id="logoutButton"
                            class="secondary-button"
                        >
                            Logout
                        </button>
                    </div>

                </div>

                <div
                    class="repository-card"
                    style="margin-top: 16px;"
                >

                    <h3>Application</h3>

                    <div style="margin-top: 18px;">

                        <p>
                            <strong>Platform:</strong>
                            SentinelAI
                        </p>

                        <p style="margin-top: 10px;">
                            <strong>Environment:</strong>
                            Production
                        </p>

                        <p style="margin-top: 10px;">
                            <strong>Backend:</strong>
                            sentinelai-backend-pwur.onrender.com
                        </p>

                        <p style="margin-top: 10px;">
                            <strong>Frontend:</strong>
                            sentinelai-frontend-t31x.onrender.com
                        </p>

                    </div>

                </div>

                <div
                    class="repository-card"
                    style="margin-top: 16px;"
                >

                    <h3>Repository Statistics</h3>

                    <div
                        id="settingsRepositoryCount"
                        style="margin-top: 15px;"
                    >
                        Loading...
                    </div>

                </div>

            </div>

        </section>
    `;

    await loadSettings();
}


async function loadSettings() {
    const connectionMessage =
        document.getElementById(
            "settingsConnectionMessage"
        );

    const userDetails =
        document.getElementById(
            "settingsUserDetails"
        );

    const logoutButton =
        document.getElementById(
            "logoutButton"
        );

    try {
        const session =
            await window.getCurrentUser();

        if (!session.authenticated) {
            connectionMessage.textContent =
                "No GitHub account is connected.";
            userDetails.innerHTML = "";
        } else {
            connectionMessage.textContent =
                "SentinelAI is connected to your GitHub account.";

            userDetails.innerHTML = `
                <p>
                    <strong>Username:</strong>
                    @${escapeHtml(session.user.username)}
                </p>

                <p style="margin-top: 10px;">
                    <strong>User ID:</strong>
                    ${escapeHtml(session.user.id)}
                </p>
            `;
        }
    } catch (error) {
        connectionMessage.textContent =
            "Unable to load connection information.";
    }

    logoutButton.addEventListener(
        "click",
        async () => {
            try {
                logoutButton.disabled = true;
                logoutButton.textContent =
                    "Logging out...";

                await window.logout();

                localStorage.removeItem(
                    "sentinelai_last_scan_id"
                );
                localStorage.removeItem(
                    "sentinelai_last_vulnerability_id"
                );
                localStorage.removeItem(
                    "sentinelai_last_fix_id"
                );
                localStorage.removeItem(
                    "sentinelai_last_pr"
                );

                if (typeof window.logoutAndShowLogin === "function") {
                    window.logoutAndShowLogin();
                } else {
                    window.location.reload();
                }

            } catch (error) {
                logoutButton.disabled = false;
                logoutButton.textContent = "Logout";

                window.showToast(
                    `Logout failed: ${error.message}`,
                    "error"
                );
            }
        }
    );

    await loadRepositoryStats();
}


async function loadRepositoryStats() {
    const element =
        document.getElementById(
            "settingsRepositoryCount"
        );

    try {
        const result =
            await window.getRepositories();

        element.textContent =
            `${result.count ?? 0} repository(s) connected.`;

    } catch (error) {
        console.error(error);

        element.textContent =
            "Unable to load repository statistics.";
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
