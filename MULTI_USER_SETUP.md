# SentinelAI multi-user setup

This version replaces the hard-coded `user_id=1` flow with GitHub OAuth-backed sessions.

## What changed

- GitHub OAuth now creates/selects the SentinelAI user and issues a signed session cookie.
- All protected API routes derive the current user from the session cookie.
- Repositories are isolated per user.
- The database migration changes repository uniqueness from global GitHub-repo uniqueness to `(user_id, github_repo_id)` uniqueness.
- Login redirects back to the frontend after OAuth.
- Settings includes logout and shows the current GitHub user.
- Frontend requests send credentials so the session cookie is used.

## Deploy

1. Replace the project files with this version.
2. Keep your existing Render environment variables. `GITHUB_ENCRYPTION_KEY` is already usable as a fallback signing secret, but setting a separate production `SECRET_KEY` is recommended.
3. Keep the existing GitHub callback URL:
   `https://sentinelai-backend-pwur.onrender.com/api/v1/github/callback`
4. Push to `main`:

```powershell
git add .
git commit -m "Make SentinelAI multi-user"
git push
```

5. Render will redeploy the backend and frontend.
6. On first use after deployment, click **Connect GitHub**. The OAuth callback will create the session cookie and return to the live frontend.
7. Open **Settings → Logout** to switch to another GitHub account.

## Optional production variable

Recommended on the backend service:

```text
SECRET_KEY=<long random secret>
```

The current code falls back to `GITHUB_ENCRYPTION_KEY` so a separate `SECRET_KEY` is not strictly required for the existing deployment.
