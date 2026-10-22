# Prepared Parent Document Review API

Private, zero-retention document-analysis service for The Prepared Parent Project.

## Security model
- Raw uploaded files are held only in process memory for the request.
- No uploaded document is written to GitHub, disk, analytics, or application logs.
- The public site must first obtain a short-lived HMAC-signed review token.
- CORS is restricted to the configured Prepared Parent website origin.
- Uploads are limited by MIME type, file count, and file size.
- Returned data is structured; raw extracted document text is not returned.
- Legal filing categories remain **LEGAL REVIEW REQUIRED** unless a separately verified Alabama-authority layer clears them.
- No automatic filing, service, signature, payment, or deadline calculation.

## Required production environment
- `REVIEW_TOKEN_SECRET`: at least 32 random bytes, server-side only.
- `ALLOWED_ORIGIN`: e.g. `https://steelcityintrgrators.github.io`
- `PORT`: optional, defaults to 8080.
- `ENABLE_OCR`: set to `false` only if image OCR must be disabled.

## Endpoints
- `GET /api/health`
- `GET /api/token` — returns a 10-minute upload token to an allowed browser origin.
- `POST /api/review` — multipart upload, up to 5 files, 8 MB each.
- `DELETE /api/review/:id` — confirms zero-retention deletion semantics.

The service does not yet verify current Alabama legal authority by network retrieval. Until that separate authority-verification layer is connected, all legal filing suggestions remain gated.
