# Secure Document Review — Deployment Handoff

The public site and backend code are complete. The private API is intentionally **not enabled** until a real backend URL passes its health check.

## Production container
The repository publishes:
`ghcr.io/steelcityintrgrators/prepared-parent-document-review:latest`

Use any Docker-capable host that supports HTTPS and environment variables.

## Required server-side environment
Set these **inside the host**, not in the public website:
- `NODE_ENV=production`
- `PORT=8080` (or the port required by the host)
- `ALLOWED_ORIGIN=https://steelcityintrgrators.github.io`
- `REVIEW_TOKEN_SECRET=<at least 32 random characters>`
- `ENABLE_OCR=true`

Generate `REVIEW_TOKEN_SECRET` in the hosting provider or a password manager. Do not paste it into the Prepared Parent website or commit it to GitHub.

## Health check
After deployment, the host must return JSON from:
`https://YOUR-BACKEND/api/health`

Required values:
- `ok: true`
- `zeroRetention: true`
- `legalAuthorityGate: "ENFORCED"`

## Connect the public site
1. Add a GitHub Actions repository secret named `DOCUMENT_REVIEW_API_URL` containing only the public HTTPS backend base URL.
2. Run the GitHub Action **Enable Secure Document Review Frontend**.
3. That workflow checks the backend health endpoint before changing the public site.
4. If health verification fails, secure mode stays disabled.

## Current privacy architecture
- Files are kept in memory for the duration of a request.
- Raw files and extracted text are not persisted by the application.
- No user document is committed to GitHub.
- Logs contain request ID, file count, MIME types, and status only.
- PDF/DOCX/TXT and image OCR are supported by the backend code.
- Legal suggestions remain `LEGAL REVIEW REQUIRED`.
- No derived deadlines are calculated.
- No automatic filing, service, signature, or payment exists.

## AI semantic layer
No AI provider credential is currently configured. The deployed backend therefore uses deterministic document extraction/classification and fail-closed legal gates. A future semantic model may be added behind the backend only after its credentials and legal-review contract are configured; the frontend must never hold those credentials.
