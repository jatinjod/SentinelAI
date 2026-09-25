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

                    <p style="margin-top: 8px;">
                        SentinelAI is connected to your GitHub account.
                    </p>

                    <div style="margin-top: 18px;">

                        <p>
                            <strong>Username:</strong>
                            @jatinjod
                        </p>

                        <p style="margin-top: 10px;">
                            <strong>User ID:</strong>
                            4
                        </p>

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
                            Local Development
                        </p>

                        <p style="margin-top: 10px;">
                            <strong>Backend:</strong>
                            http://127.0.0.1:8000
                        </p>

                        <p style="margin-top: 10px;">
                            <strong>Frontend:</strong>
                            http://127.0.0.1:3000
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