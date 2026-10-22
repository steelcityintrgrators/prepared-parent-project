# OpenEdit integration

This directory is the adapter boundary between Prepared Parent's verified-content pipeline and OpenEdit-class autonomous video generation.

## Safety architecture
1. Only records that pass the existing publication/legal gates may become a video brief.
2. The brief contains locked factual copy, source URLs, branding, scene intent, platform target and media-license requirements.
3. The generator may improve presentation but MUST NOT invent or alter factual/legal claims.
4. Generated media remains DRAFT until technical QC and visual review pass.
5. Buffer publication remains downstream of QC.

## Runtime
The repository does not assume a paid hosted video API. The adapter emits a portable production brief so an OpenEdit-compatible/local renderer can consume it. Existing FFmpeg rendering remains the deterministic fallback.
