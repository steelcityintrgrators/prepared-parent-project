# Prepared Parent Social Media Gateway

One control layer for publishing, verification and analytics across Prepared Parent channels.

## Phase 1
- Meta: Facebook + Instagram
- YouTube
- Buffer: scheduling/distribution fallback

## Security
Secrets are environment variables/GitHub Actions secrets only. Never commit tokens.

## State model
DRAFT -> VERIFIED -> READY -> PUBLISHING -> PUBLISHED -> VERIFIED_LIVE
Failures become FAILED and retain provider response/error metadata without secrets.

## Required secrets
- BUFFER_ACCESS_TOKEN (already configured)
- META_ACCESS_TOKEN
- META_FACEBOOK_PAGE_ID
- META_INSTAGRAM_ACCOUNT_ID
- YOUTUBE_CLIENT_ID
- YOUTUBE_CLIENT_SECRET
- YOUTUBE_REFRESH_TOKEN

OAuth identity authorization must be completed by the account owner. The gateway code does not bypass platform consent.
